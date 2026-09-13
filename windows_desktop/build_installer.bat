@echo off
REM =========================================================================
REM TARDIS: One-Click Windows 11 Build & Installer Script
REM Generates: dist\TARDIS.exe and dist_installer\TARDIS-Setup.exe
REM =========================================================================

echo [1/4] Installing Python Build Dependencies...
pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to install Python dependencies.
    pause
    exit /b 1
)

echo.
echo [2/4] Compiling Standalone Windows Executable via PyInstaller...
pyinstaller --clean tardis.spec
if %ERRORLEVEL% NEQ 0 (
    echo Error: PyInstaller build failed.
    pause
    exit /b 1
)

echo.
echo [3/4] Checking for Inno Setup Compiler (ISCC.exe)...
set "ISCC_PATH=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if not exist "%ISCC_PATH%" (
    set "ISCC_PATH=C:\Program Files\Inno Setup 6\ISCC.exe"
)

if exist "%ISCC_PATH%" (
    echo Compiling Windows 11 Installer: dist_installer\TARDIS-Setup.exe...
    "%ISCC_PATH%" installer.iss
    echo.
    echo =========================================================================
    echo [SUCCESS] Standalone Windows 11 Installer created:
    echo dist_installer\TARDIS-Setup.exe
    echo =========================================================================
) else (
    echo.
    echo Note: Inno Setup 6 was not found in Program Files.
    echo The standalone binary is ready at: dist\TARDIS.exe
    echo To build TARDIS-Setup.exe, install Inno Setup 6 and re-run this script.
)

pause
