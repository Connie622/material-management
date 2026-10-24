@echo off
chcp 65001 >nul
title Material Management 3100
cd /d "%~dp0"

echo ==========================================
echo   Material Management System
echo   Front desk : http://127.0.0.1:3100/
echo   Admin      : http://127.0.0.1:3100/admin
echo ==========================================
echo.
echo Keep this window open. Close it to stop.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-local.ps1"

echo.
echo Service stopped. Press any key to close...
pause >nul
