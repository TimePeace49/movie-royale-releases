; Movie Royal Backup Bots: its own installer / uninstaller (NSIS)
; Same program files as Movie Royal, but the program is called MovieRoyalBackup.exe, which always starts as the backup app.
; Built by scripts/build-win.mjs — run with -DVER=x.y.z -DSRC=<win-unpacked dir> -DOUT=<setup.exe>
Unicode true
SetCompressor /SOLID lzma

!define APP "Movie Royal Backup Bots"
!define EXE "MovieRoyalBackup.exe"
!define UNINST "Uninstall Movie Royal Backup Bots.exe"
!define REGKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\MovieRoyalBackupBots"

Name "${APP}"
OutFile "${OUT}"
InstallDir "$LOCALAPPDATA\Programs\Movie Royal Backup Bots"
InstallDirRegKey HKCU "${REGKEY}" "InstallLocation"
RequestExecutionLevel user
BrandingText "Movie Royal Backup Bots ${VER}"

VIProductVersion "${VER}.0"
VIAddVersionKey "ProductName" "${APP}"
VIAddVersionKey "FileDescription" "${APP} Setup"
VIAddVersionKey "FileVersion" "${VER}"
VIAddVersionKey "ProductVersion" "${VER}"
VIAddVersionKey "LegalCopyright" "Movie Royal"

!include "MUI2.nsh"
!include "FileFunc.nsh"
!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Welcome to Movie Royal Backup Bots"
!define MUI_WELCOMEPAGE_TEXT "This installs Movie Royal Backup Bots ${VER}.$\r$\n$\r$\nIt runs Discord bots as a backup (yours and friends') when the 24/7 cloud bot has problems, and keeps Twitch chat stats while Movie Royal is closed. It starts with Windows, hidden in the tray by the clock.$\r$\n$\r$\nIt doesn't change Movie Royal. If you already have the backup app, this updates it and keeps your bots.$\r$\n$\r$\nClick Next to continue."
!define MUI_FINISHPAGE_TITLE "Movie Royal Backup Bots is ready"
!define MUI_FINISHPAGE_TEXT "Movie Royal Backup Bots ${VER} is installed and opening now.$\r$\n$\r$\nIt's in your Start menu and on your desktop. Click Finish to close this window."
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Function .onInit
  ; close a running backup app so its files can be replaced (Movie Royal itself is left alone)
  nsExec::Exec 'taskkill /F /IM "${EXE}"'
  Sleep 700
FunctionEnd

Section "Movie Royal Backup Bots"
  SetOutPath "$INSTDIR"
  RMDir /r "$INSTDIR\resources"
  RMDir /r "$INSTDIR\locales"
  File /r "${SRC}\*.*"
  ; the program is renamed so it always opens as the backup (and Movie Royal's updates don't close it)
  Delete "$INSTDIR\${EXE}"
  Rename "$INSTDIR\MovieRoyal.exe" "$INSTDIR\${EXE}"
  File "/oname=icon.ico" "icon.ico"
  WriteUninstaller "$INSTDIR\${UNINST}"
  CreateShortCut "$SMPROGRAMS\Movie Royal Backup Bots.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\icon.ico" 0
  CreateShortCut "$DESKTOP\Movie Royal Backup Bots.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\icon.ico" 0

  WriteRegStr HKCU "${REGKEY}" "DisplayName" "${APP}"
  WriteRegStr HKCU "${REGKEY}" "DisplayVersion" "${VER}"
  WriteRegStr HKCU "${REGKEY}" "Publisher" "Movie Royal"
  WriteRegStr HKCU "${REGKEY}" "DisplayIcon" "$INSTDIR\icon.ico"
  WriteRegStr HKCU "${REGKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${REGKEY}" "UninstallString" '"$INSTDIR\${UNINST}"'
  WriteRegStr HKCU "${REGKEY}" "QuietUninstallString" '"$INSTDIR\${UNINST}" /S'
  WriteRegDWORD HKCU "${REGKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${REGKEY}" "NoRepair" 1
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKCU "${REGKEY}" "EstimatedSize" "$0"

  ; open it (it then sets itself to start with Windows)
  Exec '"$INSTDIR\${EXE}"'
SectionEnd

Section "Uninstall"
  nsExec::Exec 'taskkill /F /IM "${EXE}"'
  Sleep 500
  Delete "$SMPROGRAMS\Movie Royal Backup Bots.lnk"
  Delete "$DESKTOP\Movie Royal Backup Bots.lnk"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Movie Royal Backup Bots"
  Delete "$APPDATA\Movie Royal Backup\running.json"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${REGKEY}"
  MessageBox MB_YESNO|MB_ICONQUESTION "Also delete the backup app's settings?$\r$\n$\r$\n(the bots you added and the chat it saved)$\r$\n$\r$\nChoose No to keep them in case you install it again." /SD IDNO IDNO keep
    RMDir /r "$APPDATA\Movie Royal Backup"
  keep:
SectionEnd
