using System.Diagnostics;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Threading;
using KanaoRemoveAI.Models;
using KanaoRemoveAI.Services;

namespace KanaoRemoveAI;

public partial class MainWindow : Window
{
    private readonly PowerShellRunner _psRunner;
    private readonly List<FeatureItem> _features = new();
    private readonly List<FeatureItem> _classicApps = new();
    private readonly Dictionary<string, CheckBox> _checkboxMap = new();
    private bool _isProcessing;

    public MainWindow()
    {
        InitializeComponent();
        _psRunner = new PowerShellRunner();

        if (!AdminHelper.IsRunningAsAdmin())
        {
            AdminStatusText.Text = "⚠ Not Admin";
            AdminStatusText.Foreground = FindResource("AccentRedBrush") as Brush;
        }

        _psRunner.OutputReceived += msg => Dispatcher.Invoke(() => AppendLog(msg));
        _psRunner.ErrorReceived += msg => Dispatcher.Invoke(() => AppendLog(msg, isError: true));
        _psRunner.StatusChanged += msg => Dispatcher.Invoke(() => UpdateStatus(msg));
        _psRunner.ExecutionCompleted += () => Dispatcher.Invoke(OnExecutionCompleted);

        InitializeFeatures();
        BuildFeatureCards();
    }

    private void InitializeFeatures()
    {
        // ── Core AI Removal ──
        _features.Add(new FeatureItem
        {
            Name = "Disable AI Registry Keys",
            Description = "Disables Copilot, Recall, Input Insights, AI Actions, Voice Access, AI Voice Effects, Gaming AI, Office AI, and AI in Settings Search via comprehensive registry modifications for all users.",
            FunctionName = "Disable-Registry-Keys",
            Category = "Core",
            Icon = "🔑"
        });
        _features.Add(new FeatureItem
        {
            Name = "Disable Copilot Policies",
            Description = "Modifies IntegratedServicesRegionPolicySet.json to disable all Copilot-related policies, preventing region-based AI feature activation.",
            FunctionName = "Disable-Copilot-Policies",
            Category = "Core",
            Icon = "📜"
        });
        _features.Add(new FeatureItem
        {
            Name = "Hide AI Components",
            Description = "Hides the 'AI Components' settings page from Windows Settings, preventing users from accidentally enabling AI features.",
            FunctionName = "Hide-AI-Components",
            Category = "Core",
            Icon = "👁️"
        });

        // ── Package Removal ──
        _features.Add(new FeatureItem
        {
            Name = "Remove AI Appx Packages",
            Description = "Removes all AI-related Appx packages including Non-removable and Inbox packages using advanced system exploits (EndOfLife, Deprovisioning, SetNonRemovableAppsPolicy).",
            FunctionName = "Remove-AI-Appx-Packages",
            Category = "Package",
            Icon = "📦"
        });
        _features.Add(new FeatureItem
        {
            Name = "Remove AI CBS Packages",
            Description = "Removes hidden and locked AI packages in the Component-Based Servicing store by modifying visibility keys and removing owner/update references.",
            FunctionName = "Remove-AI-CBS-Packages",
            Category = "Package",
            Icon = "🗄️"
        });
        _features.Add(new FeatureItem
        {
            Name = "Prevent AI Reinstall",
            Description = "Installs a custom Windows Update blocker package that makes Windows think a newer version of AI packages is already installed, preventing re-download.",
            FunctionName = "Prevent-AI-Package-Reinstall",
            Category = "Package",
            Icon = "🚫"
        });

        // ── Deep Clean ──
        _features.Add(new FeatureItem
        {
            Name = "Remove AI Files & Folders",
            Description = "Full system cleanup: removes Appx install locations, Machine Learning DLLs, hidden Copilot installers, and all remaining AI registry keys and package files.",
            FunctionName = "Remove-AI-Files",
            Category = "Deep",
            Icon = "🗑️"
        });
        _features.Add(new FeatureItem
        {
            Name = "Remove Recall Feature",
            Description = "Completely disables and removes the Windows Recall optional feature, achieving DisabledWithPayloadRemoved state to prevent any data collection.",
            FunctionName = "Remove-Recall-Optional-Feature",
            Category = "Deep",
            Icon = "🔍"
        });
        _features.Add(new FeatureItem
        {
            Name = "Remove Recall Tasks",
            Description = "Uses system-level privileges to forcibly delete all Recall scheduled tasks, including their registry entries and task files.",
            FunctionName = "Remove-Recall-Tasks",
            Category = "Deep",
            Icon = "⏰"
        });

        // ── App Specific ──
        _features.Add(new FeatureItem
        {
            Name = "Disable Notepad AI Rewrite",
            Description = "Disables the AI-powered Rewrite feature in Windows Notepad via both settings.dat modification and Group Policy enforcement.",
            FunctionName = "Disable-Notepad-Rewrite",
            Category = "App",
            Icon = "📝"
        });

        // ── Classic Apps ──
        _classicApps.Add(new FeatureItem
        {
            Name = "Classic Photo Viewer",
            Description = "Restores the classic Windows Photo Viewer as the default image viewer.",
            FunctionName = "Install-Classic-Photoviewer",
            Category = "Classic",
            Icon = "🖼️"
        });
        _classicApps.Add(new FeatureItem
        {
            Name = "Classic Paint",
            Description = "Replaces the AI-enhanced Paint with the classic mspaint.exe extracted from Windows Server 2025.",
            FunctionName = "Install-Classic-Mspaint",
            Category = "Classic",
            Icon = "🎨"
        });
        _classicApps.Add(new FeatureItem
        {
            Name = "Classic Snipping Tool",
            Description = "Replaces the modern AI Snipping Tool with the classic version from Windows Server 2025.",
            FunctionName = "Install-Classic-SnippingTool",
            Category = "Classic",
            Icon = "✂️"
        });
        _classicApps.Add(new FeatureItem
        {
            Name = "Classic Notepad",
            Description = "Replaces the modern Notepad (with AI Rewrite) with the classic ad-free Notepad.",
            FunctionName = "Install-Classic-Notepad",
            Category = "Classic",
            Icon = "📄"
        });
        _classicApps.Add(new FeatureItem
        {
            Name = "Photos Legacy",
            Description = "Installs the legacy Microsoft Photos app (UWP store version without AI features).",
            FunctionName = "Install-Photos-Legacy",
            Category = "Classic",
            Icon = "📷"
        });
    }

    private void BuildFeatureCards()
    {
        foreach (var feature in _features)
        {
            var panel = feature.Category switch
            {
                "Core" => CoreAIPanel,
                "Package" => PackagePanel,
                "Deep" => DeepCleanPanel,
                "App" => AppSpecificPanel,
                _ => CoreAIPanel
            };
            panel.Children.Add(CreateFeatureCard(feature));
        }

        foreach (var app in _classicApps)
        {
            ClassicAppsPanel.Children.Add(CreateFeatureCard(app));
        }
    }

    private Border CreateFeatureCard(FeatureItem feature)
    {
        var card = new Border
        {
            Background = FindResource("BgCardBrush") as Brush,
            BorderBrush = FindResource("BorderGlowBrush") as Brush,
            BorderThickness = new Thickness(1),
            CornerRadius = new CornerRadius(10),
            Padding = new Thickness(16, 12, 16, 12),
            Margin = new Thickness(0, 0, 0, 6),
            Cursor = System.Windows.Input.Cursors.Hand
        };

        card.MouseEnter += (s, e) =>
        {
            card.Background = FindResource("BgCardHoverBrush") as Brush;
            card.BorderBrush = new SolidColorBrush(Color.FromRgb(0x40, 0x40, 0x5A));
        };
        card.MouseLeave += (s, e) =>
        {
            card.Background = FindResource("BgCardBrush") as Brush;
            card.BorderBrush = FindResource("BorderGlowBrush") as Brush;
        };

        var grid = new Grid();
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(36) });
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

        var iconText = new TextBlock
        {
            Text = feature.Icon,
            FontSize = 18,
            VerticalAlignment = VerticalAlignment.Center,
            HorizontalAlignment = HorizontalAlignment.Center
        };
        Grid.SetColumn(iconText, 0);
        grid.Children.Add(iconText);

        var textPanel = new StackPanel { VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(8, 0, 12, 0) };
        textPanel.Children.Add(new TextBlock
        {
            Text = feature.Name,
            FontSize = 13,
            FontWeight = FontWeights.SemiBold,
            Foreground = FindResource("TextPrimaryBrush") as Brush
        });
        textPanel.Children.Add(new TextBlock
        {
            Text = feature.Description.Length > 80
                ? feature.Description[..80] + "..."
                : feature.Description,
            FontSize = 11,
            Foreground = FindResource("TextMutedBrush") as Brush,
            TextWrapping = TextWrapping.NoWrap,
            TextTrimming = TextTrimming.CharacterEllipsis,
            MaxWidth = 380
        });
        Grid.SetColumn(textPanel, 1);
        grid.Children.Add(textPanel);

        var infoBtn = new Button
        {
            Content = "?",
            Width = 24,
            Height = 24,
            FontSize = 12,
            FontWeight = FontWeights.Bold,
            Foreground = Brushes.White,
            Background = new SolidColorBrush(Color.FromRgb(0x30, 0x30, 0x50)),
            BorderThickness = new Thickness(0),
            Cursor = System.Windows.Input.Cursors.Hand,
            VerticalAlignment = VerticalAlignment.Center,
            Margin = new Thickness(0, 0, 12, 0),
            ToolTip = feature.Description
        };
        infoBtn.Template = CreateRoundButtonTemplate(12);
        infoBtn.Click += (s, e) =>
        {
            MessageBox.Show(feature.Description, feature.Name,
                MessageBoxButton.OK, MessageBoxImage.Information);
        };
        Grid.SetColumn(infoBtn, 2);
        grid.Children.Add(infoBtn);

        var toggle = new CheckBox
        {
            Style = FindResource("ToggleSwitchCheckBox") as Style,
            IsChecked = feature.IsSelected,
            VerticalAlignment = VerticalAlignment.Center,
            Tag = feature
        };
        toggle.Checked += (s, e) => feature.IsSelected = true;
        toggle.Unchecked += (s, e) => feature.IsSelected = false;
        _checkboxMap[feature.FunctionName] = toggle;
        Grid.SetColumn(toggle, 3);
        grid.Children.Add(toggle);

        card.MouseLeftButtonUp += (s, e) =>
        {
            if (e.OriginalSource is not Button)
                toggle.IsChecked = !toggle.IsChecked;
        };

        card.Child = grid;
        return card;
    }

    private ControlTemplate CreateRoundButtonTemplate(double radius)
    {
        var xaml = $@"
<ControlTemplate xmlns=""http://schemas.microsoft.com/winfx/2006/xaml/presentation""
                 TargetType=""Button"">
    <Border Background=""{{TemplateBinding Background}}""
            BorderBrush=""{{TemplateBinding BorderBrush}}""
            BorderThickness=""{{TemplateBinding BorderThickness}}""
            CornerRadius=""{radius}"">
        <ContentPresenter HorizontalAlignment=""Center"" VerticalAlignment=""Center""/>
    </Border>
</ControlTemplate>";
        return (ControlTemplate)System.Windows.Markup.XamlReader.Parse(xaml);
    }

    // ═══════════════ EVENT HANDLERS ═══════════════

    private void RevertModeToggle_Checked(object sender, RoutedEventArgs e)
        => BackupModeToggle.IsChecked = false;

    private void RevertModeToggle_Unchecked(object sender, RoutedEventArgs e) { }

    private void BackupModeToggle_Checked(object sender, RoutedEventArgs e)
        => RevertModeToggle.IsChecked = false;

    private void BackupModeToggle_Unchecked(object sender, RoutedEventArgs e) { }

    private void SelectAll_Click(object sender, RoutedEventArgs e)
    {
        foreach (var cb in _checkboxMap.Values)
            cb.IsChecked = true;
    }

    private void DeselectAll_Click(object sender, RoutedEventArgs e)
    {
        foreach (var cb in _checkboxMap.Values)
            cb.IsChecked = false;
    }

    private async void Apply_Click(object sender, RoutedEventArgs e)
    {
        if (_isProcessing) return;

        var selectedFeatures = _features.Where(f => f.IsSelected).ToList();
        var selectedClassicApps = _classicApps.Where(f => f.IsSelected).ToList();

        if (selectedFeatures.Count == 0 && selectedClassicApps.Count == 0)
        {
            MessageBox.Show("No options selected.\nPlease toggle at least one feature.", "KANAO Remove AI",
                MessageBoxButton.OK, MessageBoxImage.Information);
            return;
        }

        var revertMode = RevertModeToggle.IsChecked == true;
        var backupMode = BackupModeToggle.IsChecked == true;

        var total = selectedFeatures.Count + selectedClassicApps.Count;
        var modeText = revertMode ? "REVERT" : "APPLY";
        var confirmMsg = $"KANAO Remove AI will {modeText} {total} operation(s).\n\n";
        if (revertMode) confirmMsg += "⚠ Revert Mode — Previously disabled features will be re-enabled.\n";
        if (backupMode) confirmMsg += "💾 Backup Mode — A system restore point will be created first.\n";
        confirmMsg += "\nProceed?";

        var result = MessageBox.Show(confirmMsg, "KANAO Remove AI — Confirm",
            MessageBoxButton.YesNo, MessageBoxImage.Question);
        if (result != MessageBoxResult.Yes) return;

        _isProcessing = true;
        ApplyButton.IsEnabled = false;
        ShowProcessingOverlay(true);
        ClearLog();

        try
        {
            if (selectedFeatures.Count > 0)
            {
                var funcNames = selectedFeatures.Select(f => f.FunctionName);
                await _psRunner.ExecuteAsync(funcNames, revertMode, backupMode);
            }

            if (selectedClassicApps.Count > 0)
            {
                var appNames = selectedClassicApps.Select(f => f.FunctionName switch
                {
                    "Install-Classic-Photoviewer" => "photoviewer",
                    "Install-Classic-Mspaint" => "mspaint",
                    "Install-Classic-SnippingTool" => "snippingtool",
                    "Install-Classic-Notepad" => "notepad",
                    "Install-Photos-Legacy" => "photoslegacy",
                    _ => ""
                }).Where(n => !string.IsNullOrEmpty(n));

                await _psRunner.ExecuteClassicAppInstallAsync(appNames);
            }

            var restartResult = MessageBox.Show(
                "KANAO Remove AI — All operations completed!\n\nRestart your computer now to apply all changes?",
                "KANAO Remove AI", MessageBoxButton.YesNo, MessageBoxImage.Question);

            if (restartResult == MessageBoxResult.Yes)
            {
                Process.Start("shutdown", "/r /t 5 /c \"Restarting — KANAO Remove AI\"");
                Close();
            }
        }
        catch (Exception ex)
        {
            AppendLog($"Error: {ex.Message}", isError: true);
            MessageBox.Show($"An error occurred:\n{ex.Message}", "KANAO Remove AI — Error",
                MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void OnExecutionCompleted()
    {
        _isProcessing = false;
        ApplyButton.IsEnabled = true;
        ShowProcessingOverlay(false);
    }

    private void Discord_Click(object sender, RoutedEventArgs e)
        => Process.Start(new ProcessStartInfo("https://discord.gg/VsC7XS5vgA") { UseShellExecute = true });

    private void GitHub_Click(object sender, RoutedEventArgs e)
        => Process.Start(new ProcessStartInfo("https://github.com/zoicware/RemoveWindowsAI") { UseShellExecute = true });

    // ═══════════════ UI HELPERS ═══════════════

    private void AppendLog(string message, bool isError = false)
    {
        if (string.IsNullOrWhiteSpace(message)) return;

        if (LogTextBlock.Text == "KANAO Remove AI — Ready")
            LogTextBlock.Text = "";

        var timestamp = DateTime.Now.ToString("HH:mm:ss");
        var prefix = isError ? "❌" : "▸";
        LogTextBlock.Text += $"\n[{timestamp}] {prefix} {message}";

        if (LogTextBlock.Parent is ScrollViewer sv)
            sv.ScrollToEnd();
    }

    private void ClearLog()
        => LogTextBlock.Text = "";

    private void UpdateStatus(string status)
    {
        StatusText.Text = status;
        OverlayDetailText.Text = status;
    }

    private void ShowProcessingOverlay(bool show)
    {
        ProcessingOverlay.Visibility = show ? Visibility.Visible : Visibility.Collapsed;

        if (show)
        {
            var animation = new DoubleAnimation
            {
                From = 0,
                To = 360,
                Duration = TimeSpan.FromSeconds(1.5),
                RepeatBehavior = RepeatBehavior.Forever
            };
            SpinnerRotation.BeginAnimation(System.Windows.Media.RotateTransform.AngleProperty, animation);
        }
        else
        {
            SpinnerRotation.BeginAnimation(System.Windows.Media.RotateTransform.AngleProperty, null);
        }
    }
}