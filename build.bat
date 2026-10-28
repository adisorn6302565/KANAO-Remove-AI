@echo off
setlocal
title KANAO Remove AI - Build Script
echo ==============================================
echo       KANAO Remove AI - Build System
echo       Rust + React + TypeScript + Tauri
echo ==============================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js ^(https://nodejs.org^)
    pause
    exit /b 1
)

where cargo >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Rust / Cargo is not installed or not in PATH.
    echo Please install Rust ^(https://rustup.rs^)
    pause
    exit /b 1
)

echo [1/3] Installing NPM dependencies...
call npm ci
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install NPM packages.
    pause
    exit /b 1
)

echo.
echo [2/3] Building React + TypeScript frontend...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed.
    pause
    exit /b 1
)

echo.
echo [3/3] Compiling Rust + Tauri release binary...
call npx tauri build --bundles nsis
if %errorlevel% neq 0 (
    echo [ERROR] Tauri build failed.
    pause
    exit /b 1
)

echo.
echo Copying executable and installer to project root...
copy /y "src-tauri\target\release\kanao-remove-ai.exe" "KanaoRemoveAI.exe" >nul
if %errorlevel% neq 0 (
    echo [ERROR] Could not copy the release executable.
    pause
    exit /b 1
)

set "SETUP_FILE="
for %%F in ("src-tauri\target\release\bundle\nsis\*-setup.exe") do set "SETUP_FILE=%%F"
if not defined SETUP_FILE (
    echo [ERROR] NSIS installer was not found in src-tauri\target\release\bundle\nsis.
    pause
    exit /b 1
)
copy /y "%SETUP_FILE%" "KANAO-Remove-AI-Setup.exe" >nul
if %errorlevel% neq 0 (
    echo [ERROR] Could not copy the installer.
    pause
    exit /b 1
)

echo.
echo ==============================================
echo [SUCCESS] Build completed successfully!
echo Executable located at: KanaoRemoveAI.exe
echo Installer located at: KANAO-Remove-AI-Setup.exe
echo ==============================================
pause
