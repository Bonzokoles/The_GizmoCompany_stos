# ============================================
# ZENO HUB Watchdog v1.0
# Monitoruje: kontenery Podman, serwisy HTTP,
#             tunele cloudflared
# Uruchamiany przez start_zeno_hub.bat
# ============================================

param(
    [int]$IntervalSec = 30,
    [int]$MaxRestarts = 5
)

$ErrorActionPreference = "SilentlyContinue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$LogDir = Join-Path $ScriptDir "logs"
$LogFile = Join-Path $LogDir "watchdog.log"

if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# --- Konfiguracja kontenerow ---
$Containers = @(
    "zeno-umami-db",
    "zeno-searxng-redis",
    "zeno-umami",
    "zeno-meilisearch",
    "zeno-websurfx",
    "zeno-sist2",
    "zeno-superset",
    "plausible-db",
    "plausible-events-db",
    "plausible"
)

# --- Konfiguracja endpointow HTTP ---
$HttpEndpoints = @(
    @{ Name = "ZENO Vite"; Url = "http://localhost:5173"; Timeout = 5 },
    @{ Name = "MyBonzo Astro"; Url = "http://localhost:4321"; Timeout = 5 },
    @{ Name = "Meilisearch"; Url = "http://localhost:7700/health"; Timeout = 5 },
    @{ Name = "Umami"; Url = "http://localhost:5183"; Timeout = 5 },
    @{ Name = "Plausible"; Url = "http://localhost:8100"; Timeout = 5 },
    @{ Name = "Superset"; Url = "http://localhost:8088/health"; Timeout = 5 },
    @{ Name = "Websurfx"; Url = "http://localhost:8888"; Timeout = 5 },
    @{ Name = "sist2"; Url = "http://localhost:8085"; Timeout = 5 }
)

# --- Konfiguracja tuneli quick (trycloudflare) ---
$Tunnels = @(
    @{ Name = "ZENO"; Url = "http://localhost:5173"; Log = "tunnel_zeno.log" },
    @{ Name = "MyBonzo"; Url = "http://localhost:4321"; Log = "tunnel_mybonzo.log" }
)

# --- Named tunnels (CF Dashboard DNS) ---
$NamedTunnels = @(
    @{ Name = "umami-analytics"; DisplayName = "Analytics/Plausible/Search/Superset" }
)

$RestartCount = @{}
$lastResetTime = Get-Date

# ============================================
# FUNKCJE
# ============================================

function Write-WatchdogLog {
    param([string]$Msg, [string]$Level = "INFO")
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "$ts [$Level] $Msg"
    Add-Content -Path $LogFile -Value $line -ErrorAction SilentlyContinue
    switch ($Level) {
        "OK" { Write-Host $line -ForegroundColor Green }
        "WARN" { Write-Host $line -ForegroundColor Yellow }
        "FAIL" { Write-Host $line -ForegroundColor Red }
        "FIX" { Write-Host $line -ForegroundColor Cyan }
        default { Write-Host $line -ForegroundColor Gray }
    }
}

function Test-ContainerRunning {
    param([string]$Name)
    $state = & podman inspect $Name --format "{{.State.Status}}" 2>$null
    return ($state -eq "running")
}

function Restart-PodmanContainer {
    param([string]$Name)
    $key = "c:$Name"
    if (-not $RestartCount.ContainsKey($key)) { $RestartCount[$key] = 0 }
    if ($RestartCount[$key] -ge $MaxRestarts) {
        Write-WatchdogLog "Kontener $Name : limit restartow ($MaxRestarts/h) przekroczony" "FAIL"
        return $false
    }
    Write-WatchdogLog "Kontener $Name : restart #$($RestartCount[$key] + 1)..." "FIX"
    & podman start $Name 2>$null | Out-Null
    $RestartCount[$key]++
    Start-Sleep -Seconds 3
    if (Test-ContainerRunning $Name) {
        Write-WatchdogLog "Kontener $Name : OK po restarcie" "OK"
        return $true
    }
    Write-WatchdogLog "Kontener $Name : restart nie powiodl sie" "FAIL"
    return $false
}

function Test-HttpAlive {
    param([string]$Url, [int]$Timeout = 5)
    try {
        $r = Invoke-WebRequest -Uri $Url -TimeoutSec $Timeout -UseBasicParsing -ErrorAction Stop
        return ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500)
    }
    catch {
        return $false
    }
}

function Get-TunnelProcesses {
    Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*tunnel --url*" }
}

function Start-CloudflaredTunnel {
    param([string]$Name, [string]$TargetUrl, [string]$LogName)
    $logPath = Join-Path $LogDir $LogName
    Write-WatchdogLog "Tunel $Name : restart -> $TargetUrl" "FIX"
    Start-Process "cmd.exe" -ArgumentList "/c", "cloudflared tunnel --url $TargetUrl >""$logPath"" 2>&1" -WindowStyle Minimized
    Start-Sleep -Seconds 8
    # Wyciagnij URL tunelu z logu
    if (Test-Path $logPath) {
        $content = Get-Content $logPath -Raw
        if ($content -match '(https://[a-z0-9-]+\.trycloudflare\.com)') {
            Write-WatchdogLog "Tunel $Name URL: $($Matches[1])" "OK"
            return $true
        }
    }
    Write-WatchdogLog "Tunel $Name : uruchomiony (URL w $LogName)" "INFO"
    return $true
}

function Show-TunnelUrls {
    foreach ($t in $Tunnels) {
        $logPath = Join-Path $LogDir $t.Log
        if (Test-Path $logPath) {
            $content = Get-Content $logPath -Raw
            if ($content -match '(https://[a-z0-9-]+\.trycloudflare\.com)') {
                Write-WatchdogLog "Tunel $($t.Name) -> $($Matches[1])" "OK"
            }
        }
    }
}

# ============================================
# START WATCHDOG
# ============================================

$host.UI.RawUI.WindowTitle = "ZENO HUB Watchdog"

Write-WatchdogLog "================================================"
Write-WatchdogLog "ZENO HUB Watchdog v1.0 - START"
Write-WatchdogLog "Interwal: ${IntervalSec}s | Max restartow/h: $MaxRestarts"
Write-WatchdogLog "Monitorowanie: $($Containers.Count) kontenerow, $($HttpEndpoints.Count) endpointow, $($Tunnels.Count) tuneli"
Write-WatchdogLog "================================================"

# Poczekaj az serwisy w pelni wstana
Write-WatchdogLog "Oczekiwanie 15s na inicjalizacje serwisow..."
Start-Sleep -Seconds 15

# Pokaz URL tuneli na starcie
Show-TunnelUrls

# ============================================
# GLOWNA PETLA MONITOROWANIA
# ============================================

$cycle = 0

while ($true) {
    $cycle++
    $problems = 0

    # --- Reset licznikow restartow co godzine ---
    if (((Get-Date) - $lastResetTime).TotalHours -ge 1) {
        $RestartCount.Clear()
        $lastResetTime = Get-Date
        Write-WatchdogLog "Liczniki restartow wyzerowane (reset co-godzinny)" "INFO"
    }

    # === KONTENERY (kazdy cykl = co 30s) ===
    foreach ($name in $Containers) {
        if (-not (Test-ContainerRunning $name)) {
            $problems++
            Restart-PodmanContainer $name | Out-Null
        }
    }

    # === HTTP ENDPOINTY (co 2 cykle = co ~60s) ===
    if ($cycle % 2 -eq 0) {
        foreach ($ep in $HttpEndpoints) {
            if (-not (Test-HttpAlive $ep.Url $ep.Timeout)) {
                $problems++
                Write-WatchdogLog "$($ep.Name) ($($ep.Url)) - brak odpowiedzi" "WARN"
            }
        }
    }

    # === TUNELE CLOUDFLARED quick (co 3 cykle = co ~90s) ===
    if ($cycle % 3 -eq 0) {
        $tunnelProcs = Get-TunnelProcesses
        $expectedCount = $Tunnels.Count
        if (($tunnelProcs | Measure-Object).Count -lt $expectedCount) {
            Write-WatchdogLog "Tunele: $(($tunnelProcs | Measure-Object).Count)/$expectedCount aktywnych" "WARN"
            foreach ($t in $Tunnels) {
                $found = $tunnelProcs | Where-Object { $_.CommandLine -like "*$($t.Url)*" }
                if (-not $found) {
                    $problems++
                    Start-CloudflaredTunnel $t.Name $t.Url $t.Log | Out-Null
                }
            }
        }

        # === Named tunnels (analytics.mybonzo.com itp.) ===
        foreach ($nt in $NamedTunnels) {
            $running = Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" -ErrorAction SilentlyContinue |
            Where-Object { $_.CommandLine -like "*tunnel run*$($nt.Name)*" }
            if (-not $running) {
                $problems++
                $logOut = Join-Path $LogDir "tunnel_$($nt.Name).log"
                $logErr = Join-Path $LogDir "tunnel_$($nt.Name)_err.log"
                Write-WatchdogLog "Named tunnel $($nt.Name) ($($nt.DisplayName)) - padl, restart" "FIX"
                Start-Process "cloudflared" -ArgumentList "tunnel", "run", $nt.Name `
                    -WindowStyle Minimized `
                    -RedirectStandardOutput $logOut `
                    -RedirectStandardError $logErr
                Start-Sleep -Seconds 5
                Write-WatchdogLog "Named tunnel $($nt.Name) - uruchomiony" "OK"
            }
        }
    }

    # === STATUS (co 10 cykli = co ~5 min) ===
    if ($cycle % 10 -eq 0) {
        $runningContainers = ($Containers | Where-Object { Test-ContainerRunning $_ }).Count
        $tunnelCount = (Get-TunnelProcesses | Measure-Object).Count
        Write-WatchdogLog ("Status: kontenery {0}/{1} | tunele {2}/{3} | cykl {4}" -f `
                $runningContainers, $Containers.Count, $tunnelCount, $Tunnels.Count, $cycle) "INFO"
        Show-TunnelUrls
    }

    # === ALERTY ===
    if ($problems -gt 0) {
        Write-WatchdogLog "Cykl $cycle : wykryto $problems problemow" "WARN"
    }

    Start-Sleep -Seconds $IntervalSec
}
