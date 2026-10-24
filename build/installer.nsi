; Movie Royale installer / updater / uninstaller (NSIS)
; Built by scripts/build-win.mjs — run with -DVER=x.y.z -DSRC=<win-unpacked dir> -DOUT=<setup.exe>
Unicode true
SetCompressor /SOLID lzma

!define APP "Movie Royale"
!define EXE "MovieRoyale.exe"
!define UNINST "Uninstall Movie Royale.exe"
!define REGKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\MovieRoyale"

Name "${APP}"
OutFile "${OUT}"
InstallDir "$LOCALAPPDATA\Programs\Movie Royale"
InstallDirRegKey HKCU "${REGKEY}" "InstallLocation"
RequestExecutionLevel user
BrandingText "Movie Royale ${VER}"

VIProductVersion "${VER}.0"
VIAddVersionKey "ProductName" "${APP}"
VIAddVersionKey "FileDescription" "${APP} Setup"
VIAddVersionKey "FileVersion" "${VER}"
VIAddVersionKey "ProductVersion" "${VER}"
VIAddVersionKey "LegalCopyright" "Movie Royale"

!include "MUI2.nsh"
!include "FileFunc.nsh"
!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Welcome to Movie Royale"
!define MUI_WELCOMEPAGE_TEXT "This installs Movie Royale ${VER} — the battle royale movie wheel for your stream.$\r$\n$\r$\nIf you already have Movie Royale, this updates it. Your lists, history and settings are kept.$\r$\n$\r$\nClick Next to continue."
!define MUI_FINISHPAGE_RUN "$INSTDIR\${EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Open Movie Royale now"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Function .onInit
  ; close a running copy so its files can be replaced (updates)
  nsExec::Exec 'taskkill /F /IM "${EXE}"'
  Sleep 700
FunctionEnd

Section "Movie Royale" SecMain
  SetOutPath "$INSTDIR"
  ; replace the old program files (your data lives in %APPDATA%\Movie Royale and is never touched)
  RMDir /r "$INSTDIR\resources"
  RMDir /r "$INSTDIR\locales"
  File /r "${SRC}\*.*"
  File "/oname=icon.ico" "icon.ico"
  WriteUninstaller "$INSTDIR\${UNINST}"

  CreateShortCut "$SMPROGRAMS\Movie Royale.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\icon.ico" 0
  CreateShortCut "$DESKTOP\Movie Royale.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\icon.ico" 0

  ; shows up in Windows Settings > Apps so it can be uninstalled like any program
  WriteRegStr HKCU "${REGKEY}" "DisplayName" "${APP}"
  WriteRegStr HKCU "${REGKEY}" "DisplayVersion" "${VER}"
  WriteRegStr HKCU "${REGKEY}" "Publisher" "Movie Royale"
  WriteRegStr HKCU "${REGKEY}" "DisplayIcon" "$INSTDIR\icon.ico"
  WriteRegStr HKCU "${REGKEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${REGKEY}" "UninstallString" '"$INSTDIR\${UNINST}"'
  WriteRegStr HKCU "${REGKEY}" "QuietUninstallString" '"$INSTDIR\${UNINST}" /S'
  WriteRegDWORD HKCU "${REGKEY}" "NoModify" 1
  WriteRegDWORD HKCU "${REGKEY}" "NoRepair" 1
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  IntFmt $0 "0x%08X" $0
  WriteRegDWORD HKCU "${REGKEY}" "EstimatedSize" "$0"

  ; in-app updates run this installer silently: reopen the app when done
  IfSilent 0 +2
    Exec '"$INSTDIR\${EXE}"'
SectionEnd

Section "Uninstall"
  nsExec::Exec 'taskkill /F /IM "${EXE}"'
  Sleep 500
  Delete "$DESKTOP\Movie Royale.lnk"
  Delete "$SMPROGRAMS\Movie Royale.lnk"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${REGKEY}"
  MessageBox MB_YESNO|MB_ICONQUESTION "Also delete your Movie Royale data?$\r$\n$\r$\n(lists, odds, history, Discord picks and settings)$\r$\n$\r$\nChoose No to keep it in case you install Movie Royale again." /SD IDNO IDNO keep
    RMDir /r "$APPDATA\Movie Royale"
  keep:
SectionEnd
