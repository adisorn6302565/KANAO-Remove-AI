use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use chrono::Local;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};

const SCRIPT_NAME: &str = "RemoveWindowsAi.ps1";
const EMBEDDED_SCRIPT: &str = include_str!("../resources/RemoveWindowsAi.ps1");
const CREATE_NO_WINDOW: u32 = 0x08000000;

const SECURITY_BUILTIN_DOMAIN_RID: u32 = 0x00000020;
const DOMAIN_ALIAS_RID_ADMINS: u32 = 0x00000220;

#[derive(Default)]
pub struct EngineState {
    pub child_pid: Arc<Mutex<Option<u32>>>,
    pub active_log_path: Arc<Mutex<Option<PathBuf>>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LogMessage {
    pub line: String,
    pub is_error: bool,
    pub timestamp: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct StatusUpdate {
    pub status: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct EngineRunResult {
    pub success: bool,
    pub exit_code: i32,
    pub error_count: usize,
    pub cancelled: bool,
    pub log_file: String,
}

struct StepResult {
    pub exit_code: i32,
    pub error_count: usize,
}

/// Checks whether current process is running with Administrator privileges
#[tauri::command]
fn check_admin() -> bool {
    #[cfg(windows)]
    {
        use windows_sys::Win32::Foundation::BOOL;
        use windows_sys::Win32::Security::{
            AllocateAndInitializeSid, CheckTokenMembership, FreeSid, PSID,
            SID_IDENTIFIER_AUTHORITY,
        };

        unsafe {
            let mut nt_authority = SID_IDENTIFIER_AUTHORITY {
                Value: [0, 0, 0, 0, 0, 5],
            };
            let mut admin_group: PSID = std::ptr::null_mut();
            let ok = AllocateAndInitializeSid(
                &mut nt_authority,
                2,
                SECURITY_BUILTIN_DOMAIN_RID,
                DOMAIN_ALIAS_RID_ADMINS,
                0,
                0,
                0,
                0,
                0,
                0,
                &mut admin_group,
            );
            if ok == 0 {
                return false;
            }
            let mut is_member: BOOL = 0;
            let res = CheckTokenMembership(std::ptr::null_mut(), admin_group, &mut is_member);
            FreeSid(admin_group);
            res != 0 && is_member != 0
        }
    }
    #[cfg(not(windows))]
    {
        false
    }
}

/// Restarts the application with elevated Administrator rights
#[tauri::command]
fn restart_as_admin() -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::ffi::OsStr;
        use std::os::windows::ffi::OsStrExt;
        use windows_sys::Win32::UI::Shell::ShellExecuteW;
        use windows_sys::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

        let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
        let path_wide: Vec<u16> = current_exe.as_os_str().encode_wide().chain(Some(0)).collect();
        let verb: Vec<u16> = OsStr::new("runas").encode_wide().chain(Some(0)).collect();

        unsafe {
            let res = ShellExecuteW(
                std::ptr::null_mut(),
                verb.as_ptr(),
                path_wide.as_ptr(),
                std::ptr::null(),
                std::ptr::null(),
                SW_SHOWNORMAL,
            );
            if res as usize > 32 {
                std::process::exit(0);
            } else {
                Err(format!("UAC elevation cancelled or failed (code {})", res as usize))
            }
        }
    }
    #[cfg(not(windows))]
    {
        Err("Unsupported operating system".into())
    }
}

/// Gets the directory where logs and extracted scripts are stored: %TEMP%\KanaoRemoveAI
fn get_work_dir() -> PathBuf {
    std::env::temp_dir().join("KanaoRemoveAI")
}

/// Returns the current or latest log file path
#[tauri::command]
fn get_log_path(state: State<EngineState>) -> String {
    if let Some(ref path) = *state.active_log_path.lock().unwrap() {
        if path.exists() {
            return path.to_string_lossy().to_string();
        }
    }

    let work_dir = get_work_dir();
    if let Ok(entries) = fs::read_dir(&work_dir) {
        let mut logs: Vec<PathBuf> = entries
            .filter_map(|e| e.ok().map(|e| e.path()))
            .filter(|p| {
                p.extension().and_then(|ext| ext.to_str()) == Some("txt")
                    && p.file_name()
                        .and_then(|n| n.to_str())
                        .map_or(false, |name| name.starts_with("log-"))
            })
            .collect();
        logs.sort();
        if let Some(latest) = logs.last() {
            return latest.to_string_lossy().to_string();
        }
    }

    work_dir.to_string_lossy().to_string()
}

/// Opens the log file or logs folder in default application / Notepad
#[tauri::command]
fn open_log_file(state: State<EngineState>) -> Result<(), String> {
    let path = get_log_path(state);
    let log_path = Path::new(&path);
    if log_path.exists() {
        Command::new("explorer.exe")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        let work_dir = get_work_dir();
        fs::create_dir_all(&work_dir).map_err(|e| e.to_string())?;
        Command::new("explorer.exe")
            .arg(work_dir.to_string_lossy().to_string())
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

/// Triggers Windows restart
#[tauri::command]
fn restart_system() -> Result<(), String> {
    Command::new("shutdown")
        .args(["/r", "/t", "5", "/c", "Restarting — KANAO Remove AI"])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Terminates AI processes before cleaning
fn kill_ai_processes() {
    let ai_processes = [
        "ai.exe",
        "Copilot.exe",
        "aihost.exe",
        "aicontext.exe",
        "ClickToDo.exe",
        "aixhost.exe",
        "WorkloadsSessionHost.exe",
        "WebViewHost.exe",
        "aimgr.exe",
        "AppActions.exe",
    ];

    for proc in ai_processes {
        let _ = Command::new("taskkill")
            .args(["/F", "/IM", proc])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
    }
}

/// Cancels current running engine execution
#[tauri::command]
fn cancel_engine(state: State<EngineState>) -> Result<(), String> {
    if let Some(pid) = *state.child_pid.lock().unwrap() {
        let _ = Command::new("taskkill")
            .args(["/F", "/T", "/PID", &pid.to_string()])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        Ok(())
    } else {
        Err("No active operation to cancel".into())
    }
}

fn append_to_log_file(log_path: &Path, line: &str) {
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(log_path) {
        let timestamp = Local::now().format("%H:%M:%S").to_string();
        let _ = writeln!(file, "[{}] {}", timestamp, line);
    }
}

fn execute_step(
    app: &AppHandle,
    state: &EngineState,
    log_path: &Path,
    script_str: &str,
    work_dir: &Path,
    args_cmd: &str,
    status_text: &str,
) -> Result<StepResult, String> {
    let powershell_exe = PathBuf::from(r"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe");

    let _ = app.emit("engine-status", StatusUpdate { status: status_text.into() });
    append_to_log_file(log_path, &format!("> powershell.exe {}", args_cmd));

    let command_line = format!(
        "[Console]::OutputEncoding=[Text.Encoding]::UTF8; & '{}' {}; if ($?) {{ exit 0 }} else {{ exit 1 }}",
        script_str.replace('\'', "''"),
        args_cmd
    );

    let mut child = Command::new(&powershell_exe)
        .args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", &command_line])
        .current_dir(work_dir)
        .creation_flags(CREATE_NO_WINDOW)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn PowerShell: {}", e))?;

    let pid = child.id();
    *state.child_pid.lock().unwrap() = Some(pid);

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    let app_out = app.clone();
    let log_path_out = log_path.to_path_buf();
    let out_thread = std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().flatten() {
            let trimmed = line.trim();
            if !trimmed.is_empty() {
                append_to_log_file(&log_path_out, trimmed);
                let _ = app_out.emit("engine-log", LogMessage {
                    line: trimmed.to_string(),
                    is_error: false,
                    timestamp: Local::now().format("%H:%M:%S").to_string(),
                });
            }
        }
    });

    let app_err = app.clone();
    let log_path_err = log_path.to_path_buf();
    let err_thread = std::thread::spawn(move || {
        let mut err_count = 0;
        let reader = BufReader::new(stderr);
        for line in reader.lines().flatten() {
            let trimmed = line.trim();
            if !trimmed.is_empty() {
                err_count += 1;
                append_to_log_file(&log_path_err, &format!("ERROR: {}", trimmed));
                let _ = app_err.emit("engine-log", LogMessage {
                    line: trimmed.to_string(),
                    is_error: true,
                    timestamp: Local::now().format("%H:%M:%S").to_string(),
                });
            }
        }
        err_count
    });

    let status = child.wait().map_err(|e| e.to_string())?;
    *state.child_pid.lock().unwrap() = None;

    let _ = out_thread.join();
    let error_count = err_thread.join().unwrap_or(0);

    let code = status.code().unwrap_or(-1);
    append_to_log_file(log_path, &format!("Exit code: {}", code));

    Ok(StepResult {
        exit_code: code,
        error_count,
    })
}

/// Executes the PowerShell engine script with specified parameters and streams output
#[tauri::command]
async fn run_engine(
    app: AppHandle,
    options: Vec<String>,
    classic_apps: Vec<String>,
    revert_mode: bool,
    backup_mode: bool,
) -> Result<EngineRunResult, String> {
    // Keep blocking process waits off the async runtime so UI and cancel stay responsive.
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<EngineState>();
        run_engine_blocking(&app, &state, options, classic_apps, revert_mode, backup_mode)
    })
    .await
    .map_err(|e| format!("Engine worker failed: {}", e))?
}

fn run_engine_blocking(
    app: &AppHandle,
    state: &EngineState,
    options: Vec<String>,
    classic_apps: Vec<String>,
    revert_mode: bool,
    backup_mode: bool,
) -> Result<EngineRunResult, String> {
    let work_dir = get_work_dir();
    fs::create_dir_all(&work_dir).map_err(|e| e.to_string())?;

    let now_str = Local::now().format("%Y%m%d-%H%M%S").to_string();
    let log_filename = format!("log-{}.txt", now_str);
    let log_path = work_dir.join(log_filename);
    *state.active_log_path.lock().unwrap() = Some(log_path.clone());

    // Resolve script: Check next to exe first, fallback to embedded
    let script_content: String = if let Ok(exe_path) = std::env::current_exe() {
        let local_script = exe_path.parent().unwrap_or(Path::new("")).join(SCRIPT_NAME);
        if local_script.exists() {
            fs::read_to_string(&local_script).unwrap_or_else(|_| EMBEDDED_SCRIPT.to_string())
        } else {
            EMBEDDED_SCRIPT.to_string()
        }
    } else {
        EMBEDDED_SCRIPT.to_string()
    };

    let target_script_path = work_dir.join(SCRIPT_NAME);
    // Write UTF-8 with BOM for Windows PowerShell 5.1
    let bom = [0xEF, 0xBB, 0xBF];
    let mut file = fs::File::create(&target_script_path).map_err(|e| e.to_string())?;
    file.write_all(&bom).map_err(|e| e.to_string())?;
    file.write_all(script_content.as_bytes()).map_err(|e| e.to_string())?;
    drop(file);

    // Step 1: Kill AI processes
    let _ = app.emit("engine-status", StatusUpdate { status: "Terminating AI processes...".into() });
    let _ = app.emit("engine-log", LogMessage {
        line: "Terminating AI background processes...".into(),
        is_error: false,
        timestamp: Local::now().format("%H:%M:%S").to_string(),
    });
    kill_ai_processes();

    let script_str = target_script_path.to_string_lossy().to_string();
    let mut total_errors: usize = 0;
    let mut last_exit_code: i32 = 0;
    let was_cancelled = false;

    // Run AI options if any
    if !options.is_empty() {
        let mut opt_args = format!("-nonInteractive -Options {}", options.join(","));
        if revert_mode {
            opt_args.push_str(" -revertMode");
        }
        if backup_mode {
            opt_args.push_str(" -backupMode");
        }

        match execute_step(&app, &state, &log_path, &script_str, &work_dir, &opt_args, "Removing AI features...") {
            Ok(step_res) => {
                last_exit_code = step_res.exit_code;
                total_errors += step_res.error_count;
            }
            Err(e) => {
                total_errors += 1;
                append_to_log_file(&log_path, &format!("Exception: {}", e));
                let _ = app.emit("engine-log", LogMessage {
                    line: format!("Error: {}", e),
                    is_error: true,
                    timestamp: Local::now().format("%H:%M:%S").to_string(),
                });
            }
        }
    }

    // Run Classic Apps if any and not cancelled
    if !classic_apps.is_empty() && !was_cancelled {
        let app_args = format!("-nonInteractive -InstallClassicApps {}", classic_apps.join(","));
        match execute_step(&app, &state, &log_path, &script_str, &work_dir, &app_args, "Installing classic apps...") {
            Ok(step_res) => {
                if last_exit_code == 0 {
                    last_exit_code = step_res.exit_code;
                }
                total_errors += step_res.error_count;
            }
            Err(e) => {
                total_errors += 1;
                append_to_log_file(&log_path, &format!("Exception: {}", e));
                let _ = app.emit("engine-log", LogMessage {
                    line: format!("Error: {}", e),
                    is_error: true,
                    timestamp: Local::now().format("%H:%M:%S").to_string(),
                });
            }
        }
    }

    let success = !was_cancelled && last_exit_code == 0 && total_errors == 0;
    let final_status = if was_cancelled {
        "Cancelled"
    } else if success {
        "Complete"
    } else {
        "Finished with errors"
    };

    let _ = app.emit("engine-status", StatusUpdate { status: final_status.into() });

    Ok(EngineRunResult {
        success,
        exit_code: last_exit_code,
        error_count: total_errors,
        cancelled: was_cancelled,
        log_file: log_path.to_string_lossy().to_string(),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(EngineState::default())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            check_admin,
            restart_as_admin,
            get_log_path,
            open_log_file,
            restart_system,
            run_engine,
            cancel_engine,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
