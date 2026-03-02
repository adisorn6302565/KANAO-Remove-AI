using System.IO;
using System.Management.Automation;
using System.Management.Automation.Runspaces;
using System.Reflection;
using System.Text;

namespace KanaoRemoveAI.Services;

public class PowerShellRunner
{
    public event Action<string>? OutputReceived;
    public event Action<string>? ErrorReceived;
    public event Action<string>? StatusChanged;
    public event Action? ExecutionCompleted;

    private string? _scriptContent;

    public PowerShellRunner()
    {
        LoadScript();
    }

    private void LoadScript()
    {
        var assembly = Assembly.GetExecutingAssembly();
        var resourceName = assembly.GetManifestResourceNames()
            .FirstOrDefault(n => n.EndsWith("RemoveWindowsAi.ps1"));

        if (resourceName != null)
        {
            using var stream = assembly.GetManifestResourceStream(resourceName);
            if (stream != null)
            {
                using var reader = new StreamReader(stream, Encoding.UTF8);
                _scriptContent = reader.ReadToEnd();
            }
        }

        if (string.IsNullOrEmpty(_scriptContent))
        {
            var exeDir = AppDomain.CurrentDomain.BaseDirectory;
            var scriptPath = Path.Combine(exeDir, "RemoveWindowsAi.ps1");
            if (File.Exists(scriptPath))
            {
                _scriptContent = File.ReadAllText(scriptPath, Encoding.UTF8);
            }
        }
    }

    public bool IsScriptLoaded => !string.IsNullOrEmpty(_scriptContent);

    public async Task ExecuteAsync(
        IEnumerable<string> selectedFunctions,
        bool revertMode,
        bool backupMode,
        CancellationToken cancellationToken = default)
    {
        if (!IsScriptLoaded)
        {
            ErrorReceived?.Invoke("Engine script not found! Please place RemoveWindowsAi.ps1 next to the executable.");
            return;
        }

        await Task.Run(() =>
        {
            try
            {
                StatusChanged?.Invoke("Initializing KANAO Engine...");

                var optionsList = new List<string>();
                foreach (var func in selectedFunctions)
                {
                    var optionName = MapFunctionToOption(func);
                    if (!string.IsNullOrEmpty(optionName))
                        optionsList.Add(optionName);
                }

                if (optionsList.Count == 0)
                {
                    OutputReceived?.Invoke("No options selected.");
                    return;
                }

                StatusChanged?.Invoke("Terminating AI processes...");
                KillAIProcesses();

                using var ps = PowerShell.Create();

                ps.AddScript(_scriptContent);
                ps.AddParameter("nonInteractive");
                ps.AddParameter("Options", optionsList.ToArray());

                if (revertMode)
                    ps.AddParameter("revertMode");
                if (backupMode)
                    ps.AddParameter("backupMode");

                ps.Streams.Information.DataAdded += (s, e) =>
                {
                    if (s is PSDataCollection<InformationRecord> records && e.Index < records.Count)
                        OutputReceived?.Invoke(records[e.Index].MessageData?.ToString() ?? "");
                };

                ps.Streams.Warning.DataAdded += (s, e) =>
                {
                    if (s is PSDataCollection<WarningRecord> records && e.Index < records.Count)
                        OutputReceived?.Invoke($"⚠ {records[e.Index].Message}");
                };

                ps.Streams.Error.DataAdded += (s, e) =>
                {
                    if (s is PSDataCollection<ErrorRecord> records && e.Index < records.Count)
                        ErrorReceived?.Invoke($"❌ {records[e.Index].Exception?.Message ?? records[e.Index].ToString()}");
                };

                ps.Streams.Verbose.DataAdded += (s, e) =>
                {
                    if (s is PSDataCollection<VerboseRecord> records && e.Index < records.Count)
                        OutputReceived?.Invoke(records[e.Index].Message);
                };

                var outputCollection = new PSDataCollection<PSObject>();
                outputCollection.DataAdded += (s, e) =>
                {
                    if (s is PSDataCollection<PSObject> data && e.Index < data.Count)
                    {
                        var output = data[e.Index]?.ToString();
                        if (!string.IsNullOrWhiteSpace(output))
                            OutputReceived?.Invoke(output);
                    }
                };

                StatusChanged?.Invoke($"Processing {optionsList.Count} operations...");

                var results = ps.Invoke();

                foreach (var result in results)
                {
                    if (result != null)
                        OutputReceived?.Invoke(result.ToString() ?? "");
                }

                if (ps.HadErrors)
                {
                    foreach (var error in ps.Streams.Error)
                        ErrorReceived?.Invoke($"❌ {error.Exception?.Message ?? error.ToString()}");
                }

                StatusChanged?.Invoke("Complete!");
                OutputReceived?.Invoke("✅ Operation completed successfully!");
            }
            catch (Exception ex)
            {
                ErrorReceived?.Invoke($"Error: {ex.Message}");
                StatusChanged?.Invoke("Error occurred!");
            }
            finally
            {
                ExecutionCompleted?.Invoke();
            }
        }, cancellationToken);
    }

    public async Task ExecuteClassicAppInstallAsync(
        IEnumerable<string> apps,
        CancellationToken cancellationToken = default)
    {
        if (!IsScriptLoaded)
        {
            ErrorReceived?.Invoke("Engine script not found!");
            return;
        }

        await Task.Run(() =>
        {
            try
            {
                StatusChanged?.Invoke("Installing classic apps...");

                using var ps = PowerShell.Create();
                ps.AddScript(_scriptContent);
                ps.AddParameter("nonInteractive");
                ps.AddParameter("InstallClassicApps", apps.ToArray());

                var results = ps.Invoke();

                foreach (var result in results)
                {
                    if (result != null)
                        OutputReceived?.Invoke(result.ToString() ?? "");
                }

                StatusChanged?.Invoke("Classic apps installed!");
                OutputReceived?.Invoke("✅ Classic apps installation completed!");
            }
            catch (Exception ex)
            {
                ErrorReceived?.Invoke($"Error: {ex.Message}");
            }
            finally
            {
                ExecutionCompleted?.Invoke();
            }
        }, cancellationToken);
    }

    private string MapFunctionToOption(string functionName)
    {
        return functionName switch
        {
            "Disable-Registry-Keys" => "DisableRegKeys",
            "Prevent-AI-Package-Reinstall" => "PreventAIPackageReinstall",
            "Disable-Copilot-Policies" => "DisableCopilotPolicies",
            "Remove-AI-Appx-Packages" => "RemoveAppxPackages",
            "Remove-Recall-Optional-Feature" => "RemoveRecallFeature",
            "Remove-AI-CBS-Packages" => "RemoveCBSPackages",
            "Remove-AI-Files" => "RemoveAIFiles",
            "Hide-AI-Components" => "HideAIComponents",
            "Disable-Notepad-Rewrite" => "DisableRewrite",
            "Remove-Recall-Tasks" => "RemoveRecallTasks",
            _ => ""
        };
    }

    private void KillAIProcesses()
    {
        var aiProcesses = new[]
        {
            "ai", "Copilot", "aihost", "aicontext", "ClickToDo",
            "aixhost", "WorkloadsSessionHost", "WebViewHost", "aimgr", "AppActions"
        };

        foreach (var procName in aiProcesses)
        {
            try
            {
                foreach (var proc in System.Diagnostics.Process.GetProcessesByName(procName))
                {
                    try { proc.Kill(); } catch { }
                }
            }
            catch { }
        }
    }
}
