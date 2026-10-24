# Local start script for the material management system (Windows)
# Usage: powershell -ExecutionPolicy Bypass -File .\start-local.ps1
# ASCII-only on purpose: Windows PowerShell 5.1 parses BOM-less UTF-8 as ANSI.
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

$bundledNode = 'C:\Users\YX0EK\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'
if (Test-Path -LiteralPath $bundledNode) {
  $node = $bundledNode
} elseif (Get-Command node -ErrorAction SilentlyContinue) {
  $node = 'node'
} else {
  throw 'Node.js not found. This project requires Node.js 22.5 or newer.'
}

if (-not $env:PORT) { $env:PORT = '3100' }
if (-not $env:ADMIN_USERNAME) { $env:ADMIN_USERNAME = 'admin' }
if (-not $env:ADMIN_PASSWORD) {
  $pwFile = Join-Path $PSScriptRoot '.admin-password.local.txt'
  if (Test-Path -LiteralPath $pwFile) {
    $env:ADMIN_PASSWORD = (Get-Content -LiteralPath $pwFile -Raw).Trim()
  } else {
    throw 'Missing .admin-password.local.txt, or set the ADMIN_PASSWORD environment variable first.'
  }
}
if (-not $env:APP_BASE_URL) { $env:APP_BASE_URL = "http://127.0.0.1:$($env:PORT)" }

Write-Host "Front desk (no login) : http://127.0.0.1:$($env:PORT)/"
Write-Host "Admin console         : http://127.0.0.1:$($env:PORT)/admin"
& $node server.js
