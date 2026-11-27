@echo off
rem Fotora source launcher
setlocal
cd /d "%~dp0"

if not exist "node_modules\electron\package.json" (
  echo First run: installing project dependencies...
  call npm.cmd install
  if errorlevel 1 goto :failed
)

call npm.cmd start
if errorlevel 1 goto :failed
exit /b 0

:failed
echo.
echo Startup failed. See the error above.
pause
exit /b 1
