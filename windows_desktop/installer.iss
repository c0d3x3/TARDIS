; Inno Setup 6 Script for TARDIS (Windows 11 64-bit)
; Generates standalone TARDIS-Setup.exe

#define MyAppName "TARDIS"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Tdarr Companion Community"
#define MyAppURL "https://github.com/HaveAGitGat/Tdarr"
#define MyAppExeName "TARDIS.exe"

[Setup]
; Unique application GUID
AppId={{D37F8691-3C2B-4BC2-9B38-8B4E38E5A1C0}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=dist_installer
OutputBaseFilename=TARDIS-Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
DisableProgramGroupPage=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "dist\TARDIS.exe"; DestDir: "{app}"; Flags: ignoreversion
; Create data directory in user AppData so updates never overwrite user settings or database
[Dirs]
Name: "{userappdata}\TARDIS"; Flags: uninsneveruninstall
Name: "{userappdata}\TARDIS\data"; Flags: uninsneveruninstall

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
