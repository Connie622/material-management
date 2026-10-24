# 用 Git 把本项目推送到 GitHub（Windows）
# 前置条件：已安装 Git（https://git-scm.com/download/win）
# 用法：powershell -ExecutionPolicy Bypass -File .\scripts\push-to-github.ps1 -RepoUrl https://github.com/你的用户名/仓库名.git
param(
  [Parameter(Mandatory = $true)][string]$RepoUrl,
  [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw 'Git not found. Install it first: https://git-scm.com/download/win'
}

# 安全闸门：确认敏感文件不会被提交
$secret = '.admin-password.local.txt'
if (Test-Path -LiteralPath (Join-Path $root $secret)) {
  git check-ignore -q $secret
  if ($LASTEXITCODE -ne 0) {
    throw "$secret is NOT ignored by .gitignore. Aborting to avoid leaking the admin password."
  }
  Write-Host "OK: $secret is ignored"
}
foreach ($dir in @('node_modules', 'data', 'uploads', 'public/qrcodes', 'frontend/dist')) {
  if (Test-Path -LiteralPath (Join-Path $root $dir)) {
    git check-ignore -q $dir
    if ($LASTEXITCODE -ne 0) { throw "$dir is NOT ignored. Aborting." }
  }
}

if (-not (Test-Path -LiteralPath (Join-Path $root '.git'))) {
  Write-Host 'Initializing repository...'
  git init
  git branch -M $Branch
}

git add -A
$pending = (git status --porcelain)
if ($pending) {
  git -c user.name=$env:USERNAME -c user.email="$env:USERNAME@users.noreply.github.com" commit -m 'Update material management system'
  Write-Host 'Committed changes.'
} else {
  Write-Host 'Nothing new to commit.'
}

$remotes = (git remote)
if ($remotes -notcontains 'origin') {
  git remote add origin $RepoUrl
} else {
  git remote set-url origin $RepoUrl
}

Write-Host "Pushing to $RepoUrl ($Branch)..."
git push -u origin $Branch
Write-Host 'Done. Open your repository page to verify.'
