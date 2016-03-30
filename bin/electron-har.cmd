@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "%~dp0electron-har" %*
) ELSE (
  @SETLOCAL
  @SET PATHEXT=%PATHEXT:;.JS;=;%
  node  "%~dp0electron-har" %*
)
