@echo off
rem Builds publish\KanaoRemoveAI.exe (self-contained, no .NET needed on the target PC)
where dotnet >nul 2>nul || (echo .NET 8 SDK not found: https://dotnet.microsoft.com/download/dotnet/8.0 & pause & exit /b 1)
dotnet publish "%~dp0RemoveWindowsAI.csproj" -c Release -o "%~dp0publish" || (pause & exit /b 1)
echo.
echo Done: %~dp0publish\KanaoRemoveAI.exe
pause
