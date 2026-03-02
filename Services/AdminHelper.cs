using System.Diagnostics;
using System.Security.Principal;

namespace KanaoRemoveAI.Services;

public static class AdminHelper
{
    public static bool IsRunningAsAdmin()
    {
        var identity = WindowsIdentity.GetCurrent();
        var principal = new WindowsPrincipal(identity);
        return principal.IsInRole(WindowsBuiltInRole.Administrator);
    }

    public static void RestartAsAdmin()
    {
        var processInfo = new ProcessStartInfo
        {
            FileName = Environment.ProcessPath ?? Process.GetCurrentProcess().MainModule?.FileName ?? "KanaoRemoveAI.exe",
            UseShellExecute = true,
            Verb = "runas"
        };

        try
        {
            Process.Start(processInfo);
            Environment.Exit(0);
        }
        catch
        {
            // User cancelled UAC
        }
    }
}
