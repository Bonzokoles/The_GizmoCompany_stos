<#
.SYNOPSIS
  Synchronizuje lokalne sekrety do `.env` i `.dev.vars` z `.workspace_meta/secrets/api-keys.md`.
.DESCRIPTION
  Generuje dwa pliki:
  - `.env`      → szerszy zestaw kluczy dla lokalnych narzędzi, Electron i skryptów pomocniczych
  - `.dev.vars` → zawężony zestaw sekretów runtime dla Cloudflare Pages Functions / Wrangler

  Dzięki temu lokalny workflow jest bezpieczniejszy:
  - aplikacja nie ładuje całej puli sekretów do runtime Workers,
  - `wrangler pages dev` dostaje tylko to, czego faktycznie potrzebują Functions.
.EXAMPLE
  .\scripts\sync-env.ps1

.EXAMPLE
  .\scripts\sync-env.ps1 -Target Cloudflare
#>

param(
    [ValidateSet('All', 'App', 'Cloudflare')]
    [string]$Target = 'All'
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$SecretsFile = Join-Path $ProjectRoot ".workspace_meta\secrets\api-keys.md"
$EnvFile = Join-Path $ProjectRoot ".env"
$DevVarsFile = Join-Path $ProjectRoot ".dev.vars"

$AppKeys = @(
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'OPENROUTER_API_KEY',
    'DEEPSEEK_API_KEY',
    'GEMINI_API_KEY',
    'PERPLEXITY_API_KEY',
    'EDENAI_API_KEY',
    'TOGETHER_API_KEY',
    'GITHUB_TOKEN',
    'BRAVE_API_KEY',
    'TAVILY_API_KEY',
    'SERPER_API_KEY',
    'CLOUDFLARE_API_TOKEN',
    'CLOUDFLARE_ACCOUNT_ID',
    'TMDB_API_KEY',
    'TMDB_READ_TOKEN'
)

$CloudflareKeys = @(
    'DEEPSEEK_API_KEY',
    'OPENROUTER_API_KEY',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GEMINI_API_KEY',
    'TOGETHER_API_KEY',
    'PERPLEXITY_API_KEY',
    'WEBGATE_SECRET',
    'UMAMI_SITE_ID',
    'ADMIN_TOKEN',
    'TMDB_API_KEY',
    'TMDB_READ_TOKEN',
    'CF_API_TOKEN',
    'CF_ACCOUNT_ID'
)

function Get-SecretsMap {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        throw "Brak pliku secrets: $Path"
    }

    $map = @{}
    $lines = Get-Content $Path -Encoding UTF8

    foreach ($line in $lines) {
        if ($line -match '^\s*([A-Z][A-Z0-9_]+)\s*=\s*(.+)\s*$') {
            $map[$Matches[1]] = $Matches[2].Trim()
        }
    }

    return $map
}

function Write-DotEnvFile {
    param(
        [string]$Path,
        [string]$Title,
        [string[]]$Keys,
        [hashtable]$Secrets,
        [string[]]$ExtraLines
    )

    $entries = @()

    foreach ($key in $Keys) {
        if ($Secrets.ContainsKey($key) -and -not [string]::IsNullOrWhiteSpace($Secrets[$key])) {
            $entries += "$key=$($Secrets[$key])"
        }
    }

    if ($ExtraLines -and $ExtraLines.Count -gt 0) {
        $entries += ""
        $entries += $ExtraLines
    }

    $header = @"
# ============================================================
# $Title
# ============================================================
# UWAGA: Ten plik jest lokalny i gitignored. NIE commituj go do repozytorium.
# Wygenerowany automatycznie: $(Get-Date -Format 'yyyy-MM-dd HH:mm')
# Źródło: .workspace_meta/secrets/api-keys.md
# ============================================================

"@

    $content = $header + ($entries -join "`n") + "`n"
    Set-Content -Path $Path -Value $content -Encoding UTF8 -NoNewline

    return $entries.Count
}

function Test-GitignoreEntry {
    param([string]$Pattern)

    $gitignore = Join-Path $ProjectRoot ".gitignore"
    if (-not (Test-Path $gitignore)) {
        return $false
    }

    $gitignoreContent = Get-Content $gitignore -Raw
    return $gitignoreContent -match [regex]::Escape($Pattern)
}

$secrets = Get-SecretsMap -Path $SecretsFile

Write-Host "🔐 Synchronizacja sekretów dla ZENO Browser" -ForegroundColor Cyan
Write-Host "   Źródło: .workspace_meta/secrets/api-keys.md" -ForegroundColor DarkGray

if ($Target -in @('All', 'App')) {
    $envCount = Write-DotEnvFile -Path $EnvFile -Title 'ZENO Browser — Local App Environment (.env)' -Keys $AppKeys -Secrets $secrets -ExtraLines @(
        '# --- Development ---',
        'ENVIRONMENT=development',
        'DEBUG=true',
        'LOG_LEVEL=debug'
    )
    Write-Host "✅ Wygenerowano .env ($envCount wpisów)" -ForegroundColor Green
}

if ($Target -in @('All', 'Cloudflare')) {
    $devVarsCount = Write-DotEnvFile -Path $DevVarsFile -Title 'ZENO Browser — Cloudflare Local Runtime (.dev.vars)' -Keys $CloudflareKeys -Secrets $secrets -ExtraLines @(
        '# --- Runtime vars for Cloudflare Pages Functions ---',
        'ENVIRONMENT=development',
        'SITE_NAME=ZENO Browser',
        'SITE_URL=https://zenbrowsers.org',
        'SITES_JIMBO77_ORG=https://jimbo77.org',
        'SITES_MYBONZOAI_BLOG=https://mybonzoaiblog.com',
        'SITES_MYBONZO_COM=https://mybonzo.com',
        'SITES_JIMBO77_COM=https://jimbo77.com'
    )
    Write-Host "✅ Wygenerowano .dev.vars ($devVarsCount wpisów)" -ForegroundColor Green
}

if (Test-GitignoreEntry '.env') {
    Write-Host "🔒 .env jest w .gitignore — OK" -ForegroundColor Green
}
else {
    Write-Warning ".env NIE jest w .gitignore!"
}

if (Test-GitignoreEntry '.dev.vars') {
    Write-Host "🔒 .dev.vars jest w .gitignore — OK" -ForegroundColor Green
}
else {
    Write-Warning ".dev.vars NIE jest w .gitignore!"
}

Write-Host "ℹ️  Rekomendacja: do `wrangler pages dev` używaj `.dev.vars`, a `.env` zostaw dla lokalnych narzędzi i Electron." -ForegroundColor Cyan
