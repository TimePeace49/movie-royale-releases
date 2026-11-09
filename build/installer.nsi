; Movie Royal installer / updater / uninstaller (NSIS)
; Built by scripts/build-win.mjs — run with -DVER=x.y.z -DSRC=<win-unpacked dir> -DOUT=<setup.exe>
Unicode true
SetCompressor /SOLID lzma

!define APP "Movie Royal"
; BRAND = the name people see (-DBRAND=..., the edition's own). Folders, the program file and the registry key keep the old name.
!ifndef BRAND
!define BRAND "Movie Royal"
!endif
!define EXE "MovieRoyal.exe"
!define UNINST "Uninstall Movie Royal.exe"
; older versions used a misspelled name; these are only used to clean that copy up
!define OLDNAME "Movie Royale"
!define OLDEXE "MovieRoyale.exe"
!define OLDREGKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\MovieRoyale"
!define REGKEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\MovieRoyal"

Name "${BRAND}"
OutFile "${OUT}"
InstallDir "$LOCALAPPDATA\Programs\Movie Royal"
InstallDirRegKey HKCU "${REGKEY}" "InstallLocation"
RequestExecutionLevel user
BrandingText "${BRAND} ${VER}"

VIProductVersion "${VER}.0"
VIAddVersionKey "ProductName" "${BRAND}"
VIAddVersionKey "FileDescription" "${BRAND} Setup"
VIAddVersionKey "FileVersion" "${VER}"
VIAddVersionKey "ProductVersion" "${VER}"
VIAddVersionKey "LegalCopyright" "Movie Royal"

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"
!include "Sections.nsh"
!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Welcome to ${BRAND}"
!define MUI_WELCOMEPAGE_TEXT "This installs ${BRAND} ${VER} for your stream.$\r$\n$\r$\nIf you already have it (it used to be called Movie Royal), this updates it. Your lists, history and settings are kept.$\r$\n$\r$\nClick Next to continue."
!define MUI_FINISHPAGE_TITLE "${BRAND} is ready"
!define MUI_FINISHPAGE_TEXT "${BRAND} ${VER} is installed and opening now.$\r$\n$\r$\nClick Finish to close this window."

; in-app updates (/UPDATE): skip the questions and just show the progress bar, then close by itself
Var IsUpdate
!define MUI_PAGE_CUSTOMFUNCTION_PRE SkipOnUpdate
!insertmacro MUI_PAGE_WELCOME
!define MUI_PAGE_CUSTOMFUNCTION_PRE SkipOnUpdate
!insertmacro MUI_PAGE_DIRECTORY
!define MUI_INSTFILESPAGE_FINISHHEADER_TEXT "${BRAND} is updated"
!define MUI_INSTFILESPAGE_FINISHHEADER_SUBTEXT "Opening ${BRAND} again…"
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
  ; the shortcuts carry the name people see; the ones from before the rename are taken away
  Delete "$SMPROGRAMS\Movie Royal.lnk"
  Delete "$DESKTOP\Movie Royal.lnk"
  CreateShortCut "$SMPROGRAMS\${BRAND}.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\icon.ico" 0
  CreateShortCut "$DESKTOP\${BRAND}.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\icon.ico" 0

  ; shows up in Windows Settings > Apps so it can be uninstalled like any program
  WriteRegStr HKCU "${REGKEY}" "DisplayName" "${BRAND}"
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

SectionEnd

Section "-finish"
  ; always reopen the app when the install/update is done (in-app silent updates and the normal installer)
  SetOutPath "$INSTDIR"
  Exec '"$INSTDIR\${EXE}"'
SectionEnd


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

Section "Uninstall"
  nsExec::Exec 'taskkill /F /IM "${EXE}"'
  Sleep 500
  Delete "$DESKTOP\Movie Royal.lnk"
  Delete "$SMPROGRAMS\Movie Royal.lnk"
  Delete "$DESKTOP\${BRAND}.lnk"
  Delete "$SMPROGRAMS\${BRAND}.lnk"
  ; (Movie Royal Backup Bots has its own installer and uninstaller now: left alone)
  Delete "$DESKTOP\${OLDNAME}.lnk"
  Delete "$SMPROGRAMS\${OLDNAME}.lnk"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${REGKEY}"
  MessageBox MB_YESNO|MB_ICONQUESTION "Also delete your Movie Royal data?$\r$\n$\r$\n(lists, odds, history, Discord picks and settings)$\r$\n$\r$\nChoose No to keep it in case you install Movie Royal again." /SD IDNO IDNO keep
    RMDir /r "$APPDATA\Movie Royal"
    RMDir /r "$APPDATA\${OLDNAME}"
  keep:
SectionEnd
