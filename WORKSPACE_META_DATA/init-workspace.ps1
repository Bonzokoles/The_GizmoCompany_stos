#!/usr/bin/env pwsh
# ═══════════════════════════════════════════════════════════════════════
#  init-workspace.ps1 — GIT_HOOB_catalogi Workspace Initializer
#  Uruchom w folderze projektu: .\init-workspace.ps1
#  Lub z parametrami: .\init-workspace.ps1 -ProjectName "MójProjekt" -Repo "https://github.com/..."
# ═══════════════════════════════════════════════════════════════════════
param(
    [string]$ProjectName  = "",
    [string]$ProjectRepo  = "",
    [string]$TemplatePath = "C:\WORKSPACE_META_TEMPLATE\GIT_HOOB_catalogi",
    [string]$TargetDir    = $PWD.Path
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  ⚡ GIT_HOOB_catalogi — INIT WORKSPACE   ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# --- Auto-detect project name from folder ---
if (-not $ProjectName) {
    $ProjectName = (Split-Path $TargetDir -Leaf)
    Write-Host "📁 Auto-wykryto nazwę projektu: " -NoNewline -ForegroundColor Gray
    Write-Host $ProjectName -ForegroundColor Yellow
} else {
    Write-Host "📁 Projekt: $ProjectName" -ForegroundColor Yellow
}

# --- Auto-detect git repo ---
if (-not $ProjectRepo) {
    try {
        $gitRemote = git remote get-url origin 2>$null
        if ($gitRemote) {
            $ProjectRepo = $gitRemote.Trim()
            Write-Host "🔀 Auto-wykryto repo: " -NoNewline -ForegroundColor Gray
            Write-Host $ProjectRepo -ForegroundColor Yellow
        }
    } catch {}
}

# --- Target catalog path ---
$catalogTarget = Join-Path $TargetDir "GIT_HOOB_catalogi"

# --- Check if already initialized ---
if (Test-Path (Join-Path $catalogTarget "workspace.json")) {
    $existing = Get-Content (Join-Path $catalogTarget "workspace.json") -Raw | ConvertFrom-Json
    Write-Host ""
    Write-Host "⚠️  Katalog już istnieje dla projektu: " -NoNewline -ForegroundColor Yellow
    Write-Host $existing.project_name -ForegroundColor White
    $resp = Read-Host "Nadpisać? (t/N)"
    if ($resp -notmatch "^[tTyY]") {
        Write-Host "❌ Anulowano." -ForegroundColor Red
        exit 0
    }
}

# --- Copy template ---
Write-Host ""
Write-Host "📂 Kopiowanie szablonu katalogu..." -ForegroundColor Cyan
if (-not (Test-Path $TemplatePath)) {
    Write-Host "❌ Szablon nie znaleziony: $TemplatePath" -ForegroundColor Red
    exit 1
}

New-Item -ItemType Directory -Force -Path $catalogTarget | Out-Null
Copy-Item -Recurse -Force "$TemplatePath\*" "$catalogTarget\"

# --- Fill workspace.json ---
$wsFile = Join-Path $catalogTarget "workspace.json"
$wsContent = @{
    "_description"    = "Workspace config — auto-filled by init-workspace.ps1"
    "_ai_instructions"= "Ten plik identyfikuje projekt. Odczytaj project_name. Statusy narzędzi zapisuj do ai_updates_file."
    "project_name"    = $ProjectName
    "project_path"    = $TargetDir
    "project_repo"    = $ProjectRepo
    "catalog_path"    = $catalogTarget
    "ai_updates_file" = Join-Path $catalogTarget "ai-status-updates.json"
    "catalog_html"    = Join-Path $catalogTarget "tools-catalog.html"
    "catalog_json"    = Join-Path $catalogTarget "index.json"
    "initialized_at"  = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    "template_version"= "2.1.0"
}
$wsContent | ConvertTo-Json -Depth 5 | Set-Content $wsFile -Encoding UTF8
Write-Host "✅ workspace.json wypełniony" -ForegroundColor Green

# --- Reset ai-status-updates.json ---
$updatesContent = @{
    "_description"      = "AI Status Update Queue — dopisuj tutaj aktualizacje statusów narzędzi"
    "_project"          = $ProjectName
    "_valid_statuses"   = @("todo","priority","deploy","reject")
    "_status_meaning"   = @{
        "todo"     = "W oczekiwaniu — narzędzie znane, nie użyte"
        "priority" = "Zaplanowane do użycia"
        "deploy"   = "Użyte/Dodane — wdrożone w projekcie"
        "reject"   = "Odrzucone — nie pasuje do projektu"
    }
    "updates"           = @()
}
$updatesContent | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $catalogTarget "ai-status-updates.json") -Encoding UTF8
Write-Host "✅ ai-status-updates.json zresetowany" -ForegroundColor Green

# --- Inject project name into tools-catalog.html ---
$htmlFile = Join-Path $catalogTarget "tools-catalog.html"
if (Test-Path $htmlFile) {
    $html = Get-Content $htmlFile -Raw -Encoding UTF8
    $escaped = [System.Text.RegularExpressions.Regex]::Escape($ProjectName)
    # Replace project info bar placeholder
    $html = $html -replace "GIT_HOOB_catalogi v2\.0", "GIT_HOOB_catalogi v2.1 — $ProjectName"
    # Inject workspace.json path as data attribute on body for JS to read
    $html = $html -replace "<body>", "<body data-project=`"$ProjectName`" data-project-path=`"$($TargetDir -replace '\\','\\')`">"
    Set-Content $htmlFile -Value $html -Encoding UTF8
    Write-Host "✅ tools-catalog.html zaktualizowany" -ForegroundColor Green
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ Katalog zainicjalizowany dla: $($ProjectName.PadRight(22-$ProjectName.Length)) ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Następne kroki:" -ForegroundColor Cyan
Write-Host "   1. Otwórz: $htmlFile" -ForegroundColor White
Write-Host "   2. Używaj 🔗 Auto-fetch aby dodawać narzędzia" -ForegroundColor White
Write-Host "   3. AI aktualizuje statusy przez: " -NoNewline -ForegroundColor White
Write-Host ".\GIT_HOOB_catalogi\update-tool-status.ps1 -ToolName X -Status deploy" -ForegroundColor Yellow
Write-Host ""
