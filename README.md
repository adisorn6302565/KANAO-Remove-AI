# ⚡ KANAO Remove AI

**Advanced Windows AI Feature Manager** — Disable, Remove & Clean all AI components from Windows 10/11

---

## 🔥 Features

KANAO Remove AI provides a premium GUI to manage and remove all Windows AI features with a single click.

### 🛡️ Core AI Removal
| Feature | Description |
|---------|-------------|
| Disable AI Registry Keys | Disables Copilot, Recall, Input Insights, AI Actions, Voice Access, AI Voice Effects, Gaming AI, Office AI, and AI in Settings Search |
| Disable Copilot Policies | Modifies IntegratedServicesRegionPolicySet.json to disable all Copilot-related policies |
| Hide AI Components | Hides the 'AI Components' settings page from Windows Settings |

### 📦 Package Removal
| Feature | Description |
|---------|-------------|
| Remove AI Appx Packages | Removes all AI-related Appx packages including Non-removable and Inbox packages |
| Remove AI CBS Packages | Removes hidden and locked AI packages in the Component-Based Servicing store |
| Prevent AI Reinstall | Blocks Windows Update from reinstalling AI packages |

### 🗑️ Deep Clean
| Feature | Description |
|---------|-------------|
| Remove AI Files & Folders | Full system cleanup: removes Appx installers, ML DLLs, Copilot installers, and all remaining AI files |
| Remove Recall Feature | Completely disables and removes the Windows Recall optional feature |
| Remove Recall Tasks | Forcibly deletes all Recall scheduled tasks |

### ✏️ App Specific
| Feature | Description |
|---------|-------------|
| Disable Notepad AI Rewrite | Disables the AI Rewrite feature in Windows Notepad |

### 📁 Install Classic Apps
| App | Description |
|-----|-------------|
| Classic Photo Viewer | Restores the classic Windows Photo Viewer |
| Classic Paint | Replaces AI Paint with classic mspaint.exe |
| Classic Snipping Tool | Replaces the modern AI Snipping Tool |
| Classic Notepad | Replaces the modern AI Notepad |
| Photos Legacy | Installs the legacy Microsoft Photos app |

---

## 💻 System Requirements

- **OS:** Windows 10 / Windows 11 (64-bit)
- **Runtime:** .NET 8.0 (included in single-file build)
- **Privileges:** Administrator (UAC prompt will appear on launch)

---

## 🚀 How to Use

1. **Download** `KanaoRemoveAI.exe` from the [Releases](../../releases) page
2. **Run** the executable — UAC will prompt for admin privileges
3. **Toggle** the features you want to disable/remove
4. **Click** ⚡ Apply
5. **Restart** your computer when prompted

### Modes

| Mode | Description |
|------|-------------|
| **Revert Mode** | Re-enables previously disabled features and restores removed packages |
| **Backup Mode** | Creates a system restore point before making any changes |

---

## 🛠️ Build from Source

```powershell
# Clone the repository
git clone https://github.com/YOUR_USERNAME/KanaoRemoveAI.git
cd KanaoRemoveAI

# Build
dotnet build RemoveWindowsAI.csproj -c Release

# Publish as single-file EXE
dotnet publish RemoveWindowsAI.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:EnableCompressionInSingleFile=true

# Output: bin\Release\net8.0-windows\win-x64\publish\KanaoRemoveAI.exe
```

---

## ⚠️ Warning

> **This tool modifies system registry, Windows packages, and system files.**
> - Always create a **System Restore Point** before using (enable Backup Mode)
> - Test in a **Virtual Machine** first if unsure
> - Some changes require a **PC restart** to take effect
> - Use **Revert Mode** to undo changes if needed

---

## 📋 Changelog

### v1.0.0
- Initial release
- Premium dark glassmorphism GUI
- 10 AI removal operations
- 5 classic app installations
- Revert & Backup modes
- Real-time operation logging

---

## 📄 License

This project is provided as-is for personal and educational use.

---

**Developed by KANAO** ⚡
