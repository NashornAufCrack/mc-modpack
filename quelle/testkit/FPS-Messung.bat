@echo off
chcp 65001 >nul
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Die Messung braucht Administratorrechte. Bitte im naechsten Fenster mit Ja bestaetigen.
  powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
cd /d "%~dp0"
set PM=PresentMon-2.6.0-x64.exe
if not exist "%PM%" (
  echo PresentMon wird einmalig von GitHub geladen ...
  curl -L -o "%PM%" https://github.com/GameTechDev/PresentMon/releases/download/v2.6.0/PresentMon-2.6.0-x64.exe
)
echo.
echo 1. Minecraft laufen lassen, in der Testwelt sein.
echo 2. Im Spiel: /function bench:start  und  /sparkc profiler start --timeout 180
echo 3. Dann hier eine Taste druecken. Gemessen wird 3 Minuten.
pause >nul
"%PM%" --process_name javaw.exe --output_file "%~dp0fps.csv" --timed 180 --terminate_after_timed --no_console_stats --stop_existing_session
echo.
echo Fertig. Die Datei fps.csv liegt in diesem Ordner. Lade sie auf der Website unter "Testen" hoch.
pause
