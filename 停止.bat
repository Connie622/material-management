@echo off
chcp 65001 >nul
title Stop Material Management
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"
echo.
echo Service on port 3100 stopped.
