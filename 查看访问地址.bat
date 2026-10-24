@echo off
chcp 65001 >nul
title Share address
echo ==========================================
echo   Material system - share addresses
echo ==========================================
echo.
echo This computer (local):
echo   http://127.0.0.1:3100/
echo.
echo For others on the SAME Wi-Fi / LAN:
powershell -NoProfile -Command "$ips = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' }; foreach ($ip in $ips) { Write-Host ('   http://' + $ip.IPAddress + ':3100/') -ForegroundColor Green }"
echo.
echo Notes:
echo   1. The service must stay running (launch with 启动.bat).
echo   2. If others cannot open it, allow TCP port 3100 in Windows Firewall.
echo   3. The address changes when you switch networks.
echo.
pause
