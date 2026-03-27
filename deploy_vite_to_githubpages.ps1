# Skrypt PowerShell: Deploy Vite (React) build jako podstrona na GitHub Pages
# 1. Buduje projekt Vite
# 2. Kopiuje build do katalogu docelowego (np. BONZO_media_HUB)
# 3. Wypycha zmiany do repozytorium głównego

$ErrorActionPreference = 'Stop'

# Ścieżki
$projectRoot = "U:\WWW_Zen_BRo_wser_org3"
$buildDir = "$projectRoot\dist"
$targetDir = "U:\WWW_Zen_BRo_wser_org3\BONZO_media_HUB"
$repoRoot = "U:\WWW_Zen_BRo_wser_org3"

Write-Host "[1/3] Budowanie projektu Vite..."
cd $projectRoot
npm run build

Write-Host "[2/3] Czyszczenie starego deployu..."
if (Test-Path $targetDir) { Remove-Item $targetDir -Recurse -Force }

Write-Host "[2/3] Kopiowanie nowego buildu do BONZO_media_HUB..."
Copy-Item $buildDir $targetDir -Recurse

Write-Host "[3/3] Commit i push do repozytorium..."
cd $repoRoot
git add BONZO_media_HUB
$commitMsg = "deploy: aktualizacja podstrony BONZO_media_HUB (Vite build)"
git commit -m $commitMsg

# Push
Write-Host "Wypychanie zmian na GitHub..."
git push

Write-Host "Deploy zakończony! Sprawdź podstronę na GitHub Pages."
