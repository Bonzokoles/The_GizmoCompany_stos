#!/usr/bin/env pwsh
# ═══════════════════════════════════════════════════════════════════
#  update-tool-status.ps1 — AI Tool Status Updater
#  Użycie: .\update-tool-status.ps1 -ToolName "nazwa" -Status "deploy" -Note "opis" -Agent "Jimbo"
#  Statusy: todo | priority | deploy | reject
# ═══════════════════════════════════════════════════════════════════
param(
    [Parameter(Mandatory=$true)]  [string]$ToolName,
    [Parameter(Mandatory=$true)]  [ValidateSet("todo","priority","deploy","reject")] [string]$Status,
    [Parameter(Mandatory=$false)] [string]$Note = "",
    [Parameter(Mandatory=$false)] [string]$Agent = "AI-Agent",
    [Parameter(Mandatory=$false)] [string]$CatalogPath = $PSScriptRoot
)

$updatesFile = Join-Path $CatalogPath "ai-status-updates.json"
$indexFile   = Join-Path $CatalogPath "index.json"

# Status emoji map
$statusMap = @{
    "todo"     = "📋 W oczekiwaniu"
    "priority" = "⭐ Zaplanowane"
    "deploy"   = "✅ Użyte/Wdrożone"
    "reject"   = "❌ Odrzucone"
}

Write-Host "⚡ GIT_HOOB_catalogi Status Updater" -ForegroundColor Cyan
Write-Host "   Narzędzie : $ToolName"            -ForegroundColor White
Write-Host "   Nowy status: $($statusMap[$Status])" -ForegroundColor Yellow
Write-Host "   Notatka   : $Note"               -ForegroundColor Gray

# --- Wczytaj / utwórz plik aktualizacji ---
if (Test-Path $updatesFile) {
    $data = Get-Content $updatesFile -Raw -Encoding UTF8 | ConvertFrom-Json
} else {
    $data = [PSCustomObject]@{
        _description = "AI Status Update Queue"
        updates = @()
    }
}

# --- Utwórz nowy wpis ---
$newUpdate = [PSCustomObject]@{
    tool_name  = $ToolName
    new_status = $Status
    note       = $Note
    updated_by = $Agent
    updated_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
}

# Dodaj do listy
$updatesList = @($data.updates) + $newUpdate
$data.updates = $updatesList

# Zapisz
$data | ConvertTo-Json -Depth 10 | Set-Content $updatesFile -Encoding UTF8

Write-Host "✅ Zapisano w: $updatesFile" -ForegroundColor Green

# --- Zaktualizuj też index.json jeśli istnieje ---
if (Test-Path $indexFile) {
    $index = Get-Content $indexFile -Raw -Encoding UTF8 | ConvertFrom-Json
    $toolEntry = $index.tools | Where-Object { $_.name -eq $ToolName } | Select-Object -First 1
    if ($toolEntry) {
        $toolEntry.status = $Status
        $index | ConvertTo-Json -Depth 10 | Set-Content $indexFile -Encoding UTF8
        Write-Host "✅ Zaktualizowano też index.json" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  Narzędzie '$ToolName' nie znalezione w index.json (pomijam)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "📋 Otwórz tools-catalog.html i kliknij '🤖 Wczytaj AI Updates' aby zastosować." -ForegroundColor Cyan
