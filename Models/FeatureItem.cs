using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace KanaoRemoveAI.Models;

public class FeatureItem : INotifyPropertyChanged
{
    private bool _isSelected;
    private string _status = "";

    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public string FunctionName { get; set; } = "";
    public string Category { get; set; } = "";
    public string Icon { get; set; } = "⚙";

    public bool IsSelected
    {
        get => _isSelected;
        set { _isSelected = value; OnPropertyChanged(); }
    }

    public string Status
    {
        get => _status;
        set { _status = value; OnPropertyChanged(); }
    }

    public event PropertyChangedEventHandler? PropertyChanged;
    protected void OnPropertyChanged([CallerMemberName] string? name = null)
        => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
}
