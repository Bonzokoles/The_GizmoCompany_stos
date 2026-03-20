<#
.SYNOPSIS
    Setup script for Weft AI Agent Board — self-hosted on Cloudflare Workers
.DESCRIPTION
    Clones the Weft repo, installs deps, creates D1 database, and prepares for deploy.
    Run from any directory — will create U:\weft-board\
#>

param(
    [string]$InstallDir = "U:\weft-board",
    [string]$Domain = "weft.mybonzo.com",
    [switch]$SkipClone,
    [switch]$DeployNow
)

$ErrorActionPreference = "Stop"

Write-Host "`n=== WEFT AI Agent Board — Setup ===" -ForegroundColor Cyan
Write-Host "Install dir: $InstallDir"
Write-Host "Domain: $Domain`n"

# ── Step 1: Clone ──
if (-not $SkipClone) {
    if (Test-Path $InstallDir) {
        Write-Host "[SKIP] Directory already exists: $InstallDir" -ForegroundColor Yellow
    }
    else {
        Write-Host "[1/6] Cloning Weft repository..." -ForegroundColor Green
        git clone https://github.com/jonesphillip/weft.git $InstallDir
    }
}

Push-Location $InstallDir

try {
    # ── Step 2: Install deps ──
    Write-Host "[2/6] Installing dependencies..." -ForegroundColor Green
    npm install

    # ── Step 3: Check wrangler ──
    Write-Host "[3/6] Checking wrangler CLI..." -ForegroundColor Green
    $wranglerVersion = npx wrangler --version 2>&1
    Write-Host "  wrangler: $wranglerVersion"

    # ── Step 4: Create D1 ──
    Write-Host "[4/6] Creating D1 database..." -ForegroundColor Green
    $d1Output = npx wrangler d1 create weft-db 2>&1 | Out-String
    Write-Host $d1Output

    # Extract database ID
    if ($d1Output -match 'database_id\s*=\s*"([^"]+)"') {
        $dbId = $matches[1]
        Write-Host "  D1 ID: $dbId" -ForegroundColor Green

        # Update wrangler.toml if exists
        $wranglerFile = Join-Path $InstallDir "wrangler.toml"
        if (Test-Path $wranglerFile) {
            $content = Get-Content $wranglerFile -Raw
            $content = $content -replace 'database_id\s*=\s*""', "database_id = `"$dbId`""
            Set-Content $wranglerFile $content
            Write-Host "  Updated wrangler.toml with database_id" -ForegroundColor Green
        }
    }

    # ── Step 5: Run migrations ──
    Write-Host "[5/6] Running D1 migrations..." -ForegroundColor Green
    $migrationsDir = Join-Path $InstallDir "migrations"
    if (Test-Path $migrationsDir) {
        Get-ChildItem $migrationsDir -Filter "*.sql" | Sort-Object Name | ForEach-Object {
            Write-Host "  Applying: $($_.Name)"
            npx wrangler d1 execute weft-db --file=$($_.FullName) 2>&1 | Out-Null
        }
    }
    else {
        Write-Host "  [SKIP] No migrations directory found" -ForegroundColor Yellow
    }

    # ── Step 6: Deploy ──
    if ($DeployNow) {
        Write-Host "[6/6] Deploying to Cloudflare..." -ForegroundColor Green
        npx wrangler deploy
        Write-Host "`n  Deployed! Add custom domain:" -ForegroundColor Cyan
        Write-Host "  npx wrangler domains add $Domain"
    }
    else {
        Write-Host "[6/6] Ready to deploy!" -ForegroundColor Yellow
        Write-Host @"

  Next steps:
  1. Set secrets:
     npx wrangler secret put OPENAI_API_KEY
     npx wrangler secret put ANTHROPIC_API_KEY
     npx wrangler secret put GITHUB_TOKEN

  2. Deploy:
     npx wrangler deploy

  3. Add custom domain:
     npx wrangler domains add $Domain
     OR: cloudflared tunnel route dns zeno-tunnel $Domain

  4. CF Access (Dashboard):
     Zero Trust > Access > Applications > Self-hosted
     Domain: $Domain
     Policy: Allow > GitHub OAuth
"@
    }

    Write-Host "`n=== Setup complete! ===" -ForegroundColor Cyan

}
finally {
    Pop-Location
}
