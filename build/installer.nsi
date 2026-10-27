; Movie Royal installer / updater / uninstaller (NSIS)
; Built by scripts/build-win.mjs — run with -DVER=x.y.z -DSRC=<win-unpacked dir> -DOUT=<setup.exe>
Unicode true
SetCompressor /SOLID lzma

!define APP "Movie Royal"
!define EXE "MovieRoyal.exe"
!define UNINST "Uninstall Movie Royal.exe"
; older versions used a misspelled name; these are only used to clean that copy up
!define OLDNAME "Movie Royale"
!define OLDEXE "MovieRoyale.exe"
!define OLDREGKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\MovieRoyale"
!define REGKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\MovieRoyal"

Name "${APP}"
OutFile "${OUT}"
InstallDir "$LOCALAPPDATA\Programs\Movie Royal"
InstallDirRegKey HKCU "${REGKEY}" "InstallLocation"
RequestExecutionLevel user
BrandingText "Movie Royal ${VER}"

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
!define MUI_WELCOMEPAGE_TITLE "Welcome to Movie Royal"
!define MUI_WELCOMEPAGE_TEXT "This installs Movie Royal ${VER} — the battle royal movie wheel for your stream.$\r$\n$\r$\nIf you already have Movie Royal, this updates it. Your lists, history and settings are kept.$\r$\n$\r$\nClick Next to continue."
!define MUI_FINISHPAGE_TITLE "Movie Royal is ready"
!define MUI_FINISHPAGE_TEXT "Movie Royal ${VER} is installed and opening now.$\r$\n$\r$\nClick Finish to close this window."

; in-app updates (/UPDATE): skip the questions and just show the progress bar, then close by itself
Var IsUpdate
!define MUI_PAGE_CUSTOMFUNCTION_PRE SkipOnUpdate
!insertmacro MUI_PAGE_WELCOME
!define MUI_PAGE_CUSTOMFUNCTION_PRE SkipOnUpdate
!insertmacro MUI_PAGE_DIRECTORY
!define MUI_INSTFILESPAGE_FINISHHEADER_TEXT "Movie Royal is updated"
!define MUI_INSTFILESPAGE_FINISHHEADER_SUBTEXT "Opening Movie Royal again…"
!insertmacro MUI_PAGE_INSTFILES
!define MUI_PAGE_CUSTOMFUNCTION_PRE SkipOnUpdate
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Function SkipOnUpdate
  StrCmp $IsUpdate "1" 0 +2
  Abort
FunctionEnd

Function .onInit
  StrCpy $IsUpdate "0"
  ${GetParameters} $R0
  ClearErrors
  ${GetOptions} $R0 "/UPDATE" $R1
  IfErrors +3 0
  StrCpy $IsUpdate "1"
  SetAutoClose true
  ; close a running copy so its files can be replaced (updates)
  nsExec::Exec 'taskkill /F /IM "${EXE}"'
  nsExec::Exec 'taskkill /F /IM "${OLDEXE}"'
  Sleep 700
FunctionEnd

Section "Movie Royal" SecMain
  SetOutPath "$INSTDIR"
  ; replace the old program files (your data lives in %APPDATA%\Movie Royal and is never touched)
  RMDir /r "$INSTDIR\resources"
  RMDir /r "$INSTDIR\locales"
  File /r "${SRC}\*.*"
  File "/oname=icon.ico" "icon.ico"
  WriteUninstaller "$INSTDIR\${UNINST}"

  ; older versions were installed under a misspelled name: remove that copy, its shortcuts and its Apps entry
  Delete "$SMPROGRAMS\${OLDNAME}.lnk"
  Delete "$DESKTOP\${OLDNAME}.lnk"
  RMDir /r "$LOCALAPPDATA\Programs\${OLDNAME}"
  DeleteRegKey HKCU "${OLDREGKEY}"
  CreateShortCut "$SMPROGRAMS\Movie Royal.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\icon.ico" 0
  CreateShortCut "$DESKTOP\Movie Royal.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\icon.ico" 0
  ; 🛡️ the backup bots app (same program, started with --backup)
  CreateShortCut "$SMPROGRAMS\Movie Royal Backup Bots.lnk" "$INSTDIR\${EXE}" "--backup" "$INSTDIR\icon.ico" 0

  ; shows up in Windows Settings > Apps so it can be uninstalled like any program
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

  ; always reopen the app when the install/update is done (in-app silent updates and the normal installer)
  SetOutPath "$INSTDIR"
  Exec '"$INSTDIR\${EXE}"'
SectionEnd

Section "Uninstall"
  nsExec::Exec 'taskkill /F /IM "${EXE}"'
  Sleep 500
  Delete "$DESKTOP\Movie Royal.lnk"
  Delete "$SMPROGRAMS\Movie Royal.lnk"
  Delete "$SMPROGRAMS\Movie Royal Backup Bots.lnk"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Movie Royal Backup Bots"
  Delete "$DESKTOP\${OLDNAME}.lnk"
  Delete "$SMPROGRAMS\${OLDNAME}.lnk"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${REGKEY}"
  MessageBox MB_YESNO|MB_ICONQUESTION "Also delete your Movie Royal data?$\r$\n$\r$\n(lists, odds, history, Discord picks and settings)$\r$\n$\r$\nChoose No to keep it in case you install Movie Royal again." /SD IDNO IDNO keep
    RMDir /r "$APPDATA\Movie Royal"
    RMDir /r "$APPDATA\Movie Royal Backup"
    RMDir /r "$APPDATA\${OLDNAME}"
  keep:
SectionEnd
