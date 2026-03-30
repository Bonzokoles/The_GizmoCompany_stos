<#
.SYNOPSIS
  Synchronizuje klucze API z .workspace_meta/secrets/api-keys.md do .env
.DESCRIPTION
  Czyta plik api-keys.md, wyciąga pary KEY=VALUE i zapisuje do .env
  Plik .env jest gitignored — bezpieczny do użytku lokalnego
.EXAMPLE
  .\scripts\sync-env.ps1
#>

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$SecretsFile = Join-Path $ProjectRoot ".workspace_meta\secrets\api-keys.md"
$EnvFile = Join-Path $ProjectRoot ".env"

if (-not (Test-Path $SecretsFile)) {
    Write-Error "Brak pliku secrets: $SecretsFile"
    exit 1
}

Write-Host "🔑 Synchronizacja kluczy API..." -ForegroundColor Cyan
Write-Host "   Źródło: .workspace_meta/secrets/api-keys.md" -ForegroundColor DarkGray
Write-Host "   Cel:    .env" -ForegroundColor DarkGray

$header = @"
# ============================================================
# ZENO Browser — Local Environment Variables
# ============================================================
# UWAGA: Ten plik jest gitignored. NIE commituj go do repozytorium.
# Wygenerowany automatycznie: $(Get-Date -Format 'yyyy-MM-dd HH:mm')
# Źródło: .workspace_meta/secrets/api-keys.md
# ============================================================

"@

$lines = Get-Content $SecretsFile -Encoding UTF8
$envEntries = @()
$count = 0

foreach ($line in $lines) {
    # Match lines like KEY=VALUE (skip comments, headers, empty lines)
    if ($line -match '^\s*([A-Z][A-Z0-9_]+)\s*=\s*(.+)\s*$') {
        $key = $Matches[1]
        $value = $Matches[2].Trim()
        $envEntries += "$key=$value"
        $count++
    }
}

# Add development defaults
$envEntries += ""
$envEntries += "# --- Development ---"
$envEntries += "ENVIRONMENT=development"
$envEntries += "DEBUG=true"
$envEntries += "LOG_LEVEL=debug"

$content = $header + ($envEntries -join "`n") + "`n"
Set-Content -Path $EnvFile -Value $content -Encoding UTF8 -NoNewline

Write-Host "✅ Zsynchronizowano $count kluczy API do .env" -ForegroundColor Green
Write-Host ""

# Verify .gitignore includes .env
$gitignore = Join-Path $ProjectRoot ".gitignore"
if (Test-Path $gitignore) {
    $gitignoreContent = Get-Content $gitignore -Raw
    if ($gitignoreContent -match '\.env') {
        Write-Host "🔒 .env jest w .gitignore — OK" -ForegroundColor Green
    }
    else {
        Write-Warning ".env NIE jest w .gitignore! Dodaj '.env' do .gitignore."
    }
}
