; Inno Setup Script for Bulk Certificate Generator
#define MyAppName "Bulk Certificate Generator"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Narayanapurapu Ganesh"
#define MyAppURL "https://github.com/NarayanapurapuGanesh/BulkCertificateGeneration"
#define MyAppExeName "BulkCertificateGenerator.exe"

[Setup]
AppId={{E5B6A820-91C4-4A82-8451-9C80D7751DF0}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
SetupIconFile=app_icon.ico
UninstallDisplayIcon={app}\app_icon.ico
DisableProgramGroupPage=yes
OutputBaseFilename=BulkCertificateGenerator_Setup
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
OutputDir=dist_installer
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "dist_app\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "app_icon.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app_icon.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app_icon.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
