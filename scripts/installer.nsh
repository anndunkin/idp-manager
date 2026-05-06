; installer.nsh — Custom NSIS macros for IDP Manager
; Sets the default installation directory to the folder containing the installer EXE.

!macro preInit
  ; Get the directory of the installer EXE itself
  ; $EXEDIR is the directory from which the installer was launched
  StrCpy $INSTDIR "$EXEDIR\IDP Manager"
!macroend

!macro customInstall
  ; Nothing additional needed
!macroend

!macro customUnInstall
  ; Nothing additional needed
!macroend
