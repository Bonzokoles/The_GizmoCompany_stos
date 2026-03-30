# ============================================================
# crawler-watchdog.ps1 — Watchdog + Scheduler crawlerów
# ============================================================
# Uruchamia knowledge-crawler.mjs co 30 minut przez 10 godzin
# Watchdog: restart po crash, kill po timeout, max 3 próby/rundę
#
# Użycie:
#   .\scripts\crawler-watchdog.ps1
#   .\scripts\crawler-watchdog.ps1 -DryRun
#   .\scripts\crawler-watchdog.ps1 -Hours 5 -IntervalMin 15
#   .\scripts\crawler-watchdog.ps1 -MaxRuns 20 -IntervalMin 30
# ============================================================

param(
    [switch]$DryRun = $false,
    [int]$Hours = 10,     # czas trwania sesji w godzinach
    [int]$IntervalMin = 30,     # przerwa między rundami
    [int]$TimeoutMin = 8,      # max czas jednego uruchomienia (przed kill)
    [int]$MaxRetries = 3,      # max prób gdy crawler crashuje
    [int]$MaxRuns = 0,      # nadpisuje Hours gdy >0
    [switch]$SkipBudgetCheck = $false # pomiń limit Tavily
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

# ─── ŚCIEŻKI ──────────────────────────────────────────────────────────────────
$ROOT = Split-Path -Parent $PSScriptRoot
$SCRIPT = Join-Path $ROOT "scripts\knowledge-crawler.mjs"
$LOG_DIR = Join-Path $ROOT "logs"
$CRAWLER_LOG = Join-Path $ROOT "ai-hub\js\data\crawler-log.json"
$TODAY = Get-Date -Format "yyyy-MM-dd"
$SESSION_LOG = Join-Path $LOG_DIR "watchdog-crawler-$TODAY.log"
$PID_FILE = Join-Path $LOG_DIR "crawler-watchdog.pid"

if (-not (Test-Path $LOG_DIR)) { New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null }

# ─── KONFIGURACJA ─────────────────────────────────────────────────────────────
$totalRuns = if ($MaxRuns -gt 0) { $MaxRuns } else { [int]($Hours * 60 / $IntervalMin) }
$intervalSec = $IntervalMin * 60
$timeoutSec = $TimeoutMin * 60
$sessionStart = Get-Date
$sessionEnd = $sessionStart.AddHours($Hours)

# ─── STAN WATCHDOGA ───────────────────────────────────────────────────────────
$wdState = @{
    RunCount         = 0
    SuccessCount     = 0
    FailCount        = 0
    RetryCount       = 0
    TimeoutCount     = 0
    TotalCollected   = 0
    TotalApproved    = 0
    ConsecutiveFails = 0
}

# Zapisz PID bieżącego procesu
$PID | Out-File $PID_FILE -Encoding utf8

# ─── FUNKCJE LOGOWANIA ────────────────────────────────────────────────────────
function Log {
    param([string]$Msg, [string]$Color = "White", [string]$Level = "INFO")
    $ts = Get-Date -Format "HH:mm:ss"
    $line = "[$ts][$Level] $Msg"
    Add-Content -Path $SESSION_LOG -Value $line -ErrorAction SilentlyContinue
    Write-Host $line -ForegroundColor $Color
}

function LogOk { param([string]$M) Log $M "Green"   "OK" }
function LogWarn { param([string]$M) Log $M "Yellow"  "WARN" }
function LogFail { param([string]$M) Log $M "Red"     "FAIL" }
function LogInfo { param([string]$M) Log $M "Cyan"    "INFO" }
function LogFix { param([string]$M) Log $M "Magenta" "FIX" }

# ─── BANNER ───────────────────────────────────────────────────────────────────
Clear-Host
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🦎 CRAWLER WATCHDOG — Knowledge Base Builder               ║" -ForegroundColor Cyan
Write-Host "╠══════════════════════════════════════════════════════════════╣" -ForegroundColor DarkCyan
Write-Host "║  Źródła: Tavily + Brave + HackerNews + Dev.to               ║" -ForegroundColor Cyan
Write-Host "║  AI scoring: Gemini 2.0 Flash                               ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ⏱  Czas sesji:     $Hours godz. ($totalRuns rund × ${IntervalMin}min)" -ForegroundColor Yellow
Write-Host "  🔁  Interwał:       ${IntervalMin} minut" -ForegroundColor Yellow
Write-Host "  ⚡  Timeout/rundę:  ${TimeoutMin} minut (watchdog kill)" -ForegroundColor Yellow
Write-Host "  🔄  Max prób:       ${MaxRetries} (po crash)" -ForegroundColor Yellow
Write-Host "  📋  Log:            $SESSION_LOG" -ForegroundColor Gray
Write-Host "  🏁  Koniec sesji:   $($sessionEnd.ToString('HH:mm:ss'))" -ForegroundColor Gray
Write-Host "  🚀  Tryb:           $(if ($DryRun) { 'DRY-RUN' } else { 'PRODUKCJA' })" -ForegroundColor $(if ($DryRun) { 'Magenta' } else { 'Green' })
Write-Host ""
Write-Host "  [Ctrl+C] aby zatrzymać watchdog" -ForegroundColor DarkGray
Write-Host ""

LogInfo "Watchdog start | sesja: $Hours godz., $totalRuns rund, interwał: ${IntervalMin}min"

# ─── SPRAWDŹ CZY NODE DOSTĘPNE ────────────────────────────────────────────────
if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    LogFail "node.exe nie znaleziono w PATH! Sprawdź instalację Node.js."
    exit 1
}
if (-not (Test-Path $SCRIPT)) {
    LogFail "Brak skryptu crawlera: $SCRIPT"
    exit 1
}

# ─── ODCZYT STATYSTYK Z LOGU ─────────────────────────────────────────────────
function Get-CrawlerStats {
    if (-not (Test-Path $CRAWLER_LOG)) { return $null }
    try {
        $raw = Get-Content $CRAWLER_LOG -Raw -ErrorAction Stop
        return $raw | ConvertFrom-Json
    }
    catch { return $null }
}

function Show-Stats {
    $log = Get-CrawlerStats
    if (-not $log) {
        Write-Host "  📊 (brak logu crawlera)" -ForegroundColor DarkGray
        return
    }
    $today = Get-Date -Format "yyyy-MM-dd"
    $d = $log.stats.daily.$today

    Write-Host ""
    Write-Host "  ┌─ Statystyki dzisiejsze ─────────────────────────────────┐" -ForegroundColor DarkCyan
    if ($d) {
        $tavilyPct = if ($d.tavily) { [int]($d.tavily / 80 * 100) } else { 0 }
        $bar = "█" * [int]($tavilyPct / 5) + "░" * (20 - [int]($tavilyPct / 5))
        Write-Host "  │  Tavily:       $($d.tavily)/80  [$bar]  $tavilyPct%│" -ForegroundColor White
        Write-Host "  │  Brave:        $($d.brave)/400                          │" -ForegroundColor White
        Write-Host "  │  Rundy:        $($d.runs)                               │" -ForegroundColor White
        Write-Host "  │  Auto-approved: $($d.auto_approved) ✅  Pending: $($d.pending) ⏳       │" -ForegroundColor White
    }
    else {
        Write-Host "  │  (brak danych na dziś)                               │" -ForegroundColor DarkGray
    }
    Write-Host "  └─────────────────────────────────────────────────────────┘" -ForegroundColor DarkCyan

    # Statystyki watchdoga
    Write-Host ""
    Write-Host "  ┌─ Watchdog — ta sesja ──────────────────────────────────┐" -ForegroundColor DarkMagenta
    Write-Host "  │  Sukcesy: $($wdState.SuccessCount)  Błędy: $($wdState.FailCount)  Timeouty: $($wdState.TimeoutCount)  Retry: $($wdState.RetryCount)  │" -ForegroundColor White
    Write-Host "  └─────────────────────────────────────────────────────────┘" -ForegroundColor DarkMagenta
}

# ─── SPRAWDŹ LIMIT TAVILY ─────────────────────────────────────────────────────
function Test-TavilyBudget {
    if ($SkipBudgetCheck) { return $false }
    $log = Get-CrawlerStats
    if (-not $log) { return $false }
    $today = Get-Date -Format "yyyy-MM-dd"
    $used = $log.stats.daily.$today.tavily
    return ($used -ge 80)
}

# ─── URUCHOM JEDEN CRAWLER Z WATCHDOG ────────────────────────────────────────
function Invoke-CrawlerWithWatchdog {
    param([int]$RunNumber, [int]$AttemptNumber = 1)

    $nodeArgs = @($SCRIPT)
    if ($DryRun) { $nodeArgs += "--dry-run" }

    $runLogFile = Join-Path $LOG_DIR "crawler-run-$TODAY.log"

    LogInfo "Uruchamiam crawler (runda $RunNumber, próba $AttemptNumber)..."

    # Uruchom proces
    $proc = $null
    try {
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = "node"
        $psi.Arguments = $nodeArgs -join " "
        $psi.UseShellExecute = $false
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.WorkingDirectory = $ROOT

        $proc = [System.Diagnostics.Process]::Start($psi)

        # Polling loop z watchdog timeout
        $deadline = (Get-Date).AddSeconds($timeoutSec)
        $exited = $false

        while (-not $exited) {
            $exited = $proc.WaitForExit(5000)  # sprawdzaj co 5 sekund
            $remaining = [int](($deadline - (Get-Date)).TotalSeconds)

            if ((Get-Date) -ge $deadline) {
                # ─── TIMEOUT — kill procesu
                LogWarn "⏱ Timeout po ${TimeoutMin}min! Zabijam proces PID=$($proc.Id) (runda $RunNumber)"
                try {
                    # Zabij też dzieci node
                    Get-Process -Id $proc.Id -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
                    # Zabij wszystkie 'node' z tym samym oknem (na wszelki wypadek)
                    $proc.Kill($true)
                }
                catch {}
                $wdState.TimeoutCount++
                Add-Content -Path $SESSION_LOG -Value "[$(Get-Date -Format 'HH:mm:ss')][TIMEOUT] runda $RunNumber, próba $AttemptNumber" -ErrorAction SilentlyContinue
                return "timeout"
            }

            # Pokaż progress co 60 sekund
            if ($remaining % 60 -lt 5) {
                $mins = [math]::Floor($remaining / 60)
                $secs = $remaining % 60
                Write-Host -NoNewline "`r  ⚙  Crawler działa... pozostało max ${mins}m ${secs}s    "
            }
        }

        Write-Host ""

        # Odczytaj output
        try {
            $outText = $proc.StandardOutput.ReadToEnd()
            $errText = $proc.StandardError.ReadToEnd()
        }
        catch {
            $outText = ""
            $errText = ""
        }

        # Dołącz do logu sesji
        $ts = Get-Date -Format "HH:mm:ss"
        Add-Content -Path $runLogFile -Value "`n=== Runda $RunNumber / Próba $AttemptNumber — $ts ===`n$outText" -ErrorAction SilentlyContinue

        # Wyświetl output (ostatnie 20 linii)
        if ($outText) {
            $lines = ($outText -split "`n") | Where-Object { $_.Trim() -ne "" } | Select-Object -Last 20
            $lines | ForEach-Object { Write-Host "    $_" -ForegroundColor White }
        }
        if ($errText -and $errText.Trim() -ne "") {
            Write-Host "  ⚠ STDERR:" -ForegroundColor Yellow
            ($errText -split "`n") | Select-Object -Last 5 | ForEach-Object {
                if ($_.Trim()) { Write-Host "    $_" -ForegroundColor Yellow }
            }
            Add-Content -Path $runLogFile -Value "STDERR: $errText" -ErrorAction SilentlyContinue
        }

        # Sprawdź kod wyjścia
        if ($proc.ExitCode -eq 0) {
            LogOk "✅ Crawler zakończył się sukcesem (exit 0), runda $RunNumber"
            return "success"
        }
        else {
            LogWarn "⚠ Crawler zakończył się kodem: $($proc.ExitCode), runda $RunNumber"
            return "error"
        }
    }
    catch {
        LogFail "❌ Błąd uruchamiania crawlera: $_"
        return "exception"
    }
    finally {
        if ($proc -and -not $proc.HasExited) {
            try { $proc.Kill($true) } catch {}
        }
    }
}

# ─── COUNTDOWN ────────────────────────────────────────────────────────────────
function Show-Countdown {
    param([int]$Seconds)
    $end = (Get-Date).AddSeconds($Seconds)
    $sessionRemainingH = [math]::Round(($sessionEnd - (Get-Date)).TotalHours, 1)

    while ((Get-Date) -lt $end) {
        $remaining = [int](($end - (Get-Date)).TotalSeconds)
        $mins = [math]::Floor($remaining / 60)
        $secs = $remaining % 60
        $pct = [int](($Seconds - $remaining) / $Seconds * 100)
        $fill = [int]($pct / 4)
        $bar = "█" * $fill + "░" * (25 - $fill)
        Write-Host -NoNewline "`r  ⏳ Następna runda za: ${mins}m${secs}s  [$bar]  Sesja: ~${sessionRemainingH}h   "
        Start-Sleep -Seconds 10
    }
    Write-Host ""
}

# ─── GŁÓWNA PĘTLA WATCHDOGA ───────────────────────────────────────────────────
$wdState.RunCount = 0
$runSuccess = $false

try {
    while ($wdState.RunCount -lt $totalRuns) {

        # Sprawdź czy czas sesji nie minął
        if ((Get-Date) -ge $sessionEnd) {
            LogInfo "⏰ Czas sesji ${Hours}h wygasł. Kończę watchdog."
            break
        }

        $wdState.RunCount++
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
        Write-Host "  🚀 RUNDA $($wdState.RunCount) / $totalRuns  —  $timestamp" -ForegroundColor Cyan
        $timeLeft = [math]::Round(($sessionEnd - (Get-Date)).TotalHours, 1)
        Write-Host "  ⏱  Pozostało sesji: ~${timeLeft}h  |  Slot: $(([math]::Floor([DateTimeOffset]::UtcNow.ToUnixTimeSeconds() / 1800)) % 8)" -ForegroundColor DarkCyan
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

        # ─── Sprawdź limit Tavily
        if (Test-TavilyBudget) {
            LogWarn "⛔ Dzienny limit Tavily (80 kredytów) osiągnięty. Przerywam sesję."
            break
        }

        # ─── Uruchom crawler z retry
        $runSuccess = $false
        $attempt = 0

        while ($attempt -lt $MaxRetries -and -not $runSuccess) {
            $attempt++
            if ($attempt -gt 1) {
                $waitSec = $attempt * 15
                LogFix "🔄 Retry $attempt / $MaxRetries — czekam ${waitSec}s przed ponowną próbą..."
                Start-Sleep -Seconds $waitSec
                $wdState.RetryCount++
            }

            $result = Invoke-CrawlerWithWatchdog -RunNumber $wdState.RunCount -AttemptNumber $attempt

            switch ($result) {
                "success" {
                    $wdState.SuccessCount++
                    $wdState.ConsecutiveFails = 0
                    $runSuccess = $true
                }
                "timeout" {
                    $wdState.FailCount++
                    $wdState.ConsecutiveFails++
                    LogWarn "Timeout na rundzie $($wdState.RunCount). Próba $attempt."
                }
                default {
                    $wdState.FailCount++
                    $wdState.ConsecutiveFails++
                    LogWarn "Błąd na rundzie $($wdState.RunCount) (kod: $result). Próba $attempt."
                }
            }
        }

        if (-not $runSuccess) {
            LogFail "❌ Runda $($wdState.RunCount) NIEUDANA po $MaxRetries próbach."
        }

        # ─── Zbyt wiele crashy z rzędu?
        if ($wdState.ConsecutiveFails -ge $MaxRetries) {
            LogFail "🛑 $($wdState.ConsecutiveFails) kolejnych błędów. Zatrzymuję watchdog."
            LogFail "   Sprawdź: node $SCRIPT --dry-run"
            break
        }

        # ─── Pokaż statystyki
        Show-Stats

        # ─── Odczekaj przed następną rundą
        if ($wdState.RunCount -lt $totalRuns -and (Get-Date) -lt $sessionEnd) {
            $elapsed = [int]((Get-Date) - $sessionStart).TotalMinutes
            LogInfo "Runda $($wdState.RunCount) zakończona. Sesja trwa: ${elapsed}min"
            Show-Countdown -Seconds $intervalSec
        }
    }
}
finally {
    # Usuń plik PID
    if (Test-Path $PID_FILE) { Remove-Item $PID_FILE -ErrorAction SilentlyContinue }
}

# ─── PODSUMOWANIE SESJI ───────────────────────────────────────────────────────
$duration = [int]((Get-Date) - $sessionStart).TotalMinutes

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor $(if ($wdState.FailCount -eq 0) { "Green" } else { "Yellow" })
Write-Host "║  WATCHDOG — SESJA ZAKOŃCZONA                                ║" -ForegroundColor $(if ($wdState.FailCount -eq 0) { "Green" } else { "Yellow" })
Write-Host "╠══════════════════════════════════════════════════════════════╣" -ForegroundColor DarkGray
Write-Host "║  Rundy:       $($wdState.RunCount.ToString().PadRight(5)) (sukcesy: $($wdState.SuccessCount), błędy: $($wdState.FailCount))     ║" -ForegroundColor White
Write-Host "║  Retry:       $($wdState.RetryCount.ToString().PadRight(5)) | Timeouty: $($wdState.TimeoutCount.ToString().PadRight(5))              ║" -ForegroundColor White
Write-Host "║  Czas sesji:  ${duration} minut                                    ║" -ForegroundColor White
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  📋 Log sesji:     $SESSION_LOG" -ForegroundColor Cyan
Write-Host "  📊 Dashboard:     ai-hub\crawler-dashboard\index.html" -ForegroundColor Cyan
Write-Host "  📦 Pending:       ai-hub\js\data\pending\" -ForegroundColor Cyan
Write-Host "  💾 Zatwierdź:     node scripts\process-pending.mjs --approve-all" -ForegroundColor Cyan
Write-Host ""

LogInfo "Sesja zakończona | rundy: $($wdState.RunCount) | sukcesy: $($wdState.SuccessCount) | czas: ${duration}min"
