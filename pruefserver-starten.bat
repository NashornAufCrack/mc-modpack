@echo off
chcp 65001 >nul
title Mod-Katalog Foto- & Video-Prüfserver
cd /d "%~dp0"
echo ========================================================
echo   Mod-Katalog Foto- & Video-Prüfserver
echo ========================================================
echo.
echo Der Server speichert jeden Klick automatisch auf der Festplatte.
echo Wenn du fertig bist, sag einfach im Chat "Bin fertig"!
echo.
echo Öffne Seite im Browser...
start "" "http://127.0.0.1:8765/pruefung/"
echo.
python scripts\pruef_server.py
pause
