using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Text;

namespace KanaoRemoveAI.Services;

/// <summary>Outcome of one engine run.</summary>
public sealed record RunResult(int ExitCode, int ErrorLines, bool Cancelled)
{
    public bool Success => !Cancelled && ExitCode == 0;
}

/// <summary>
/// Runs the embedded RemoveWindowsAi.ps1 engine in Windows PowerShell 5.1 (powershell.exe).
/// The engine refuses to run under PowerShell 7, so it cannot be hosted in-process.
/// </summary>
public class PowerShellRunner
{
    private const string ScriptName = "RemoveWindowsAi.ps1";

    public event Action<string>? OutputReceived;
    public event Action<string>? ErrorReceived;
    public event Action<string>? StatusChanged;

    private readonly string? _scriptContent;

    public PowerShellRunner()
    {
        _scriptContent = LoadScript();
    }

    public bool IsScriptLoaded => !string.IsNullOrEmpty(_scriptContent);

    /// <summary>Full path of the log file for the current session.</summary>
    public string LogFilePath { get; } = Path.Combine(WorkDir, $"log-{DateTime.Now:yyyyMMdd-HHmmss}.txt");

    private static string WorkDir => Path.Combine(Path.GetTempPath(), "KanaoRemoveAI");

    private static string? LoadScript()
    {
        // A file next to the exe wins, so the engine can be updated without rebuilding.
        var local = Path.Combine(AppContext.BaseDirectory, ScriptName);
        if (File.Exists(local))
            return File.ReadAllText(local, Encoding.UTF8);

        var assembly = Assembly.GetExecutingAssembly();
        var resourceName = assembly.GetManifestResourceNames().FirstOrDefault(n => n.EndsWith(ScriptName));
        if (resourceName == null) return null;

        using var stream = assembly.GetManifestResourceStream(resourceName);
        if (stream == null) return null;
        using var reader = new StreamReader(stream, Encoding.UTF8);
        return reader.ReadToEnd();
    }

    public Task<RunResult> RemoveFeaturesAsync(IEnumerable<string> options, bool revertMode, bool backupMode,
        CancellationToken cancellationToken = default)
    {
        var args = new List<string> { "-nonInteractive", "-Options", string.Join(",", options) };
        if (revertMode) args.Add("-revertMode");
        if (backupMode) args.Add("-backupMode");

        StatusChanged?.Invoke("Terminating AI processes...");
        KillAIProcesses();
        return RunEngineAsync(args, "Removing AI features...", cancellationToken);
    }

    public Task<RunResult> InstallClassicAppsAsync(IEnumerable<string> apps, CancellationToken cancellationToken = default)
    {
        var args = new List<string> { "-nonInteractive", "-InstallClassicApps", string.Join(",", apps) };
        return RunEngineAsync(args, "Installing classic apps...", cancellationToken);
    }

    private async Task<RunResult> RunEngineAsync(List<string> engineArgs, string status, CancellationToken ct)
    {
        if (!IsScriptLoaded)
        {
            ErrorReceived?.Invoke($"Engine script not found. Place {ScriptName} next to the executable.");
            return new RunResult(-1, 1, false);
        }

        Directory.CreateDirectory(WorkDir);
        var scriptPath = Path.Combine(WorkDir, ScriptName);
        // Windows PowerShell 5.1 reads BOM-less files as ANSI, so write UTF-8 *with* BOM.
        await File.WriteAllTextAsync(scriptPath, _scriptContent, new UTF8Encoding(true), ct);

        // -Options takes an array: pass "a,b,c" through -Command so PowerShell splits it.
        // $? is false when the engine exits non-zero or throws; a native command failing
        // inside the engine does not count, unlike $LASTEXITCODE.
        var command = $"& '{scriptPath.Replace("'", "''")}' {string.Join(' ', engineArgs)}";
        var psi = new ProcessStartInfo
        {
            FileName = Path.Combine(Environment.SystemDirectory, @"WindowsPowerShell\v1.0\powershell.exe"),
            Arguments = "-NoProfile -NonInteractive -ExecutionPolicy Bypass -Command " +
                        $"\"[Console]::OutputEncoding=[Text.Encoding]::UTF8; {command.Replace("\"", "\\\"")}; if ($?) {{ exit 0 }} else {{ exit 1 }}\"",
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8,
            WorkingDirectory = WorkDir
        };

        StatusChanged?.Invoke(status);
        Log($"> powershell.exe {psi.Arguments}");

        var errorLines = 0;
        using var process = new Process { StartInfo = psi, EnableRaisingEvents = true };
        process.OutputDataReceived += (_, e) =>
        {
            if (string.IsNullOrWhiteSpace(e.Data)) return;
            Log(e.Data);
            OutputReceived?.Invoke(e.Data);
        };
        process.ErrorDataReceived += (_, e) =>
        {
            if (string.IsNullOrWhiteSpace(e.Data)) return;
            Interlocked.Increment(ref errorLines);
            Log("ERROR: " + e.Data);
            ErrorReceived?.Invoke(e.Data);
        };

        try
        {
            process.Start();
        }
        catch (Exception ex)
        {
            ErrorReceived?.Invoke($"Could not start Windows PowerShell: {ex.Message}");
            return new RunResult(-1, 1, false);
        }

        process.BeginOutputReadLine();
        process.BeginErrorReadLine();

        try
        {
            await process.WaitForExitAsync(ct);
        }
        catch (OperationCanceledException)
        {
            try { process.Kill(entireProcessTree: true); } catch { /* already exited */ }
            Log("Cancelled by user.");
            return new RunResult(-1, errorLines, true);
        }

        process.WaitForExit(); // flush remaining async output
        Log($"Exit code: {process.ExitCode}");
        return new RunResult(process.ExitCode, errorLines, false);
    }

    private readonly object _logLock = new();

    private void Log(string line)
    {
        try
        {
            lock (_logLock)
            {
                Directory.CreateDirectory(WorkDir);
                File.AppendAllText(LogFilePath, $"[{DateTime.Now:HH:mm:ss}] {line}{Environment.NewLine}", Encoding.UTF8);
            }
        }
        catch { /* logging must never break a run */ }
    }

    private static void KillAIProcesses()
    {
        string[] aiProcesses =
        [
            "ai", "Copilot", "aihost", "aicontext", "ClickToDo",
            "aixhost", "WorkloadsSessionHost", "WebViewHost", "aimgr", "AppActions"
        ];

        foreach (var name in aiProcesses)
        {
            foreach (var proc in Process.GetProcessesByName(name))
            {
                try { proc.Kill(); } catch { /* access denied / already gone */ }
                finally { proc.Dispose(); }
            }
        }
    }
}
