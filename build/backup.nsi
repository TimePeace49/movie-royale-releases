; Movie Royal Backup Bots: its own installer / uninstaller (NSIS)
; Same program files as Movie Royal, but the program is called MovieRoyalBackup.exe, which always starts as the backup app.
; Built by scripts/build-win.mjs — run with -DVER=x.y.z -DSRC=<win-unpacked dir> -DOUT=<setup.exe> -DBEXE=<MovieRoyalBackup.exe with its own icon>
Unicode true
SetCompressor /SOLID lzma

!ifndef APP
!define APP "TimePeace Chatbot Control Center"
!endif
!ifndef EXE
!define EXE "TimePeaceChatbotControlCenter.exe"
!endif
!define OLDAPP "Movie Royal Backup Bots"
!define OLDEXE "MovieRoyalBackup.exe"
!define UNINST "Uninstall ${APP}.exe"
!define REGKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\MovieRoyalBackupBots"

Name "${APP}"
OutFile "${OUT}"
InstallDir "$LOCALAPPDATA\Programs\Movie Royal Backup Bots"
InstallDirRegKey HKCU "${REGKEY}" "InstallLocation"
RequestExecutionLevel user
BrandingText "${APP} ${VER}"

VIProductVersion "${VER}.0"
VIAddVersionKey "ProductName" "${APP}"
VIAddVersionKey "FileDescription" "${APP} Setup"
VIAddVersionKey "FileVersion" "${VER}"
VIAddVersionKey "ProductVersion" "${VER}"
VIAddVersionKey "LegalCopyright" "${APP}"

!include "MUI2.nsh"
!include "FileFunc.nsh"
!define MUI_ICON "icon-backup.ico"
!define MUI_UNICON "icon-backup.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Welcome to ${APP}"
!define MUI_WELCOMEPAGE_TEXT "This installs ${APP} ${VER}.$\r$\n$\r$\nIt runs Discord bots as a backup (yours and friends') when the 24/7 cloud bot has problems, and keeps Twitch chat stats while Movie Royal is closed. It starts with Windows, hidden in the tray by the clock.$\r$\n$\r$\nIt doesn't change Movie Royal. If you already have the backup app, this updates it and keeps your bots.$\r$\n$\r$\nClick Next to continue."
!define MUI_FINISHPAGE_TITLE "${APP} is ready"
!define MUI_FINISHPAGE_TEXT "${APP} ${VER} is installed and opening now.$\r$\n$\r$\nIt's in your Start menu and on your desktop. Click Finish to close this window."
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
  nsExec::Exec 'taskkill /F /IM "${OLDEXE}"'
  nsExec::Exec 'taskkill /F /IM "TimePeaceChatbotControlCenter.exe"'
  nsExec::Exec 'taskkill /F /IM "ChatbotControlCenter.exe"'
  Sleep 700
FunctionEnd

Section "${APP}"
  SetOutPath "$INSTDIR"
  RMDir /r "$INSTDIR\resources"
  RMDir /r "$INSTDIR\locales"
  File /r "${SRC}\*.*"
  ; the program is renamed so it always opens as the backup (and Movie Royal's updates don't close it)
  ; (its own copy of the program, with the backup icon inside it, so a pinned taskbar button shows the right icon)
  Delete "$INSTDIR\${EXE}"
  Delete "$INSTDIR\MovieRoyal.exe"
  Delete "$INSTDIR\TimePeaceChatbot.exe"
  Delete "$INSTDIR\KirbChatbot.exe"
  Delete "$INSTDIR\TrueChatbot.exe"
  Delete "$INSTDIR\BirxAndJessChatbot.exe"
  ; (1.172.0) it used to be called Movie Royal Backup Bots: that program file, its shortcuts, uninstaller and start-with-Windows entry go
  Delete "$INSTDIR\${OLDEXE}"
  Delete "$INSTDIR\TimePeaceChatbotControlCenter.exe"
  Delete "$INSTDIR\ChatbotControlCenter.exe"
  Delete "$INSTDIR\Uninstall ${OLDAPP}.exe"
  Delete "$SMPROGRAMS\${OLDAPP}.lnk"
  Delete "$DESKTOP\${OLDAPP}.lnk"
  Delete "$SMPROGRAMS\TimePeace Chatbot Control Center.lnk"
  Delete "$DESKTOP\TimePeace Chatbot Control Center.lnk"
  Delete "$SMPROGRAMS\Chatbot Control Center.lnk"
  Delete "$DESKTOP\Chatbot Control Center.lnk"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${OLDAPP}"
  File "/oname=${EXE}" "${BEXE}"
  File "/oname=icon.ico" "icon-backup.ico"
  WriteUninstaller "$INSTDIR\${UNINST}"
  CreateShortCut "$SMPROGRAMS\${APP}.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\icon.ico" 0
  CreateShortCut "$DESKTOP\${APP}.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\icon.ico" 0

  WriteRegStr HKCU "${REGKEY}" "DisplayName" "${APP}"
  WriteRegStr HKCU "${REGKEY}" "DisplayVersion" "${VER}"
  WriteRegStr HKCU "${REGKEY}" "Publisher" "${APP}"
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
  Delete "$SMPROGRAMS\${APP}.lnk"
  Delete "$DESKTOP\${APP}.lnk"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${APP}"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "${OLDAPP}"
  Delete "$APPDATA\Movie Royal Backup\running.json"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${REGKEY}"
  MessageBox MB_YESNO|MB_ICONQUESTION "Also delete the backup app's settings?$\r$\n$\r$\n(the bots you added and the chat it saved)$\r$\n$\r$\nChoose No to keep them in case you install it again." /SD IDNO IDNO keep
    RMDir /r "$APPDATA\Movie Royal Backup"
  keep:
SectionEnd
