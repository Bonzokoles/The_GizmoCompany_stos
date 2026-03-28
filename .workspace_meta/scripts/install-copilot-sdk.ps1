param(
    [string]$WorkspaceRoot = (Get-Location).Path,
    [switch]$AlsoInstallCopilotCli
)

$ErrorActionPreference = 'Stop'

function Write-Info([string]$Message) {
    Write-Host "[workspace-meta] $Message" -ForegroundColor Cyan
}

function Get-PackageManager([string]$RootPath, [string]$PackageManagerField) {
    if (Test-Path (Join-Path $RootPath 'pnpm-lock.yaml')) { return 'pnpm' }
    if (Test-Path (Join-Path $RootPath 'yarn.lock')) { return 'yarn' }
    $bunLockb = Test-Path (Join-Path $RootPath 'bun.lockb')
    $bunLock = Test-Path (Join-Path $RootPath 'bun.lock')
    if ($bunLockb -or $bunLock) { return 'bun' }
    if ($PackageManagerField) {
        if ($PackageManagerField -match '^pnpm@') { return 'pnpm' }
        if ($PackageManagerField -match '^yarn@') { return 'yarn' }
        if ($PackageManagerField -match '^bun@') { return 'bun' }
        if ($PackageManagerField -match '^npm@') { return 'npm' }
    }

    return 'npm'
}

function Ensure-Command([string]$CommandName) {
    $cmd = Get-Command $CommandName -ErrorAction SilentlyContinue
    if (-not $cmd) {
        throw "Wymagane narzędzie '$CommandName' nie jest dostępne w PATH."
    }
}

$resolvedRoot = (Resolve-Path $WorkspaceRoot).Path
Write-Info "Root workspace: $resolvedRoot"

$packageJsonPath = Join-Path $resolvedRoot 'package.json'
if (-not (Test-Path $packageJsonPath)) {
    Write-Info 'Brak package.json — pomijam instalację CopilotKit (to nie jest workspace Node.js).'
    exit 0
}

$packageJson = Get-Content -Raw -Path $packageJsonPath | ConvertFrom-Json
$packageManagerField = $packageJson.packageManager

$hasReactCore = $false
$hasReactUi = $false

if ($packageJson.dependencies -and $packageJson.dependencies.'@copilotkit/react-core') { $hasReactCore = $true }
if ($packageJson.devDependencies -and $packageJson.devDependencies.'@copilotkit/react-core') { $hasReactCore = $true }

if ($packageJson.dependencies -and $packageJson.dependencies.'@copilotkit/react-ui') { $hasReactUi = $true }
if ($packageJson.devDependencies -and $packageJson.devDependencies.'@copilotkit/react-ui') { $hasReactUi = $true }

$alreadyInstalled = ($hasReactCore -and $hasReactUi)

if ($alreadyInstalled) {
    Write-Info 'Pakiety CopilotKit (@copilotkit/react-core i @copilotkit/react-ui) są już wpisane w package.json — nic do zrobienia.'
}
else {
    $pm = Get-PackageManager -RootPath $resolvedRoot -PackageManagerField $packageManagerField
    Write-Info "Wykryty package manager: $pm"

    Push-Location $resolvedRoot
    try {
        switch ($pm) {
            'pnpm' {
                Ensure-Command 'pnpm'
                & pnpm add @copilotkit/react-core @copilotkit/react-ui
            }
            'yarn' {
                Ensure-Command 'yarn'
                & yarn add @copilotkit/react-core @copilotkit/react-ui
            }
            'bun' {
                Ensure-Command 'bun'
                & bun add @copilotkit/react-core @copilotkit/react-ui
            }
            default {
                Ensure-Command 'npm'
                & npm install @copilotkit/react-core @copilotkit/react-ui
            }
        }
    }
    finally {
        Pop-Location
    }

    Write-Info 'Dodano @copilotkit/react-core oraz @copilotkit/react-ui do zależności workspace.'
}

if ($AlsoInstallCopilotCli) {
    Write-Info 'Instalacja globalna GitHub Copilot CLI (opcjonalna)...'
    Ensure-Command 'npm'
    & npm install -g @github/copilot
    Write-Info 'GitHub Copilot CLI zainstalowany globalnie.'
}

Write-Info 'Gotowe.'
