; installer.nsh — Custom NSIS macros for IDP Manager
;
; customInit runs AFTER initMultiUser sets $INSTDIR, so it correctly overrides it.
; preInit runs BEFORE initMultiUser and gets overwritten — do not use preInit for path.

!macro preInit
  ; intentionally empty — path override happens in customInit
!macroend

!macro customInit
  ; Override $INSTDIR to be a subfolder of wherever the installer EXE lives.
  ; $EXEDIR = the directory containing the installer EXE at runtime.
  StrCpy $INSTDIR "$EXEDIR\IDP Manager"
!macroend

!macro customInstall
  ; intentionally empty
!macroend

!macro customUnInstall
  ; intentionally empty
!macroend
