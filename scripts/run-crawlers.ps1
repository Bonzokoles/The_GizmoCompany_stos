# ============================================================
# run-crawlers.ps1 — Knowledge Crawler Scheduler
# ============================================================
# Uruchamia knowledge-crawler.mjs co 30 minut
# Zatrzymaj: Ctrl+C
#
# Użycie:
#   .\scripts\run-crawlers.ps1
#   .\scripts\run-crawlers.ps1 -DryRun          # próbny przebieg
#   .\scripts\run-crawlers.ps1 -MaxRuns 5        # max 5 uruchomień
#   .\scripts\run-crawlers.ps1 -IntervalMin 60   # co 60 minut
# ============================================================

param(
    [switch]$DryRun = $false,
    [int]$MaxRuns = 20,      # 20 rund × 30min = 10 godzin
    [int]$IntervalMin = 30,
    [int]$TimeoutMin = 8,       # watchdog kill po N minutach
    [int]$MaxRetries = 2        # retry po crash
)

$ROOT = Split-Path -Parent $PSScriptRoot
$SCRIPT = Join-Path $ROOT "scripts\knowledge-crawler.mjs"
$LOG_DIR = Join-Path $ROOT "logs"
$CRAWLER_LOG = Join-Path $ROOT "ai-hub\js\data\crawler-log.json"
$TODAY = Get-Date -Format "yyyy-MM-dd"
$LOG_FILE = Join-Path $LOG_DIR "crawler-$TODAY.log"

# ─── Upewnij się że katalog logów istnieje
if (-not (Test-Path $LOG_DIR)) { New-Item -ItemType Directory -Path $LOG_DIR | Out-Null }

# ─── Banner
Clear-Host
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   KNOWLEDGE CRAWLER SCHEDULER                            ║" -ForegroundColor Cyan
Write-Host "║   Wieloźródłowy crawler wiedzy z oceną AI                ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Interwał:    $IntervalMin minut ($([int]($IntervalMin * $MaxRuns / 60)) godz. sesja)" -ForegroundColor Yellow
Write-Host "  Max rund:    $MaxRuns" -ForegroundColor Yellow
Write-Host "  Timeout:     ${TimeoutMin}min/rundę | Retry: $MaxRetries" -ForegroundColor Yellow
Write-Host "  Tryb:        $(if ($DryRun) { 'DRY-RUN (bez zapisu)' } else { 'PRODUKCJA' })" -ForegroundColor $(if ($DryRun) { 'Magenta' } else { 'Green' })
Write-Host "  Log:         $LOG_FILE" -ForegroundColor Gray
Write-Host "  Crawler log: $CRAWLER_LOG" -ForegroundColor Gray
Write-Host ""
Write-Host "  [Ctrl+C] aby zatrzymać" -ForegroundColor DarkGray
Write-Host ""

$runCount = 0
$startTime = Get-Date
$intervalSec = $IntervalMin * 60
$timeoutSec = $TimeoutMin * 60
$sessionEnd = $startTime.AddMinutes($MaxRuns * $IntervalMin)

# ─── Funkcja wyświetlania statystyk z logu
function Show-Stats {
    if (-not (Test-Path $CRAWLER_LOG)) { return }
    try {
        $log = Get-Content $CRAWLER_LOG -Raw | ConvertFrom-Json
        $today = Get-Date -Format "yyyy-MM-dd"
        $daily = $log.stats.daily.$today

        Write-Host ""
        Write-Host "  📊 Statystyki dzisiejsze:" -ForegroundColor Cyan
        if ($daily) {
            Write-Host "     Tavily kredyty:  $($daily.tavily)/80" -ForegroundColor White
            Write-Host "     Brave zapytania: $($daily.brave)/400" -ForegroundColor White
            Write-Host "     Rundy:           $($daily.runs)" -ForegroundColor White
            Write-Host "     Auto-approved:   $($daily.auto_approved)" -ForegroundColor Green
            Write-Host "     Pending:         $($daily.pending)" -ForegroundColor Yellow
        }
        else {
            Write-Host "     (brak danych na dziś)" -ForegroundColor DarkGray
        }

        Write-Host ""
        Write-Host "  📈 Łącznie:" -ForegroundColor Cyan
        Write-Host "     Wszystkich rund:  $($log.stats.total_runs)" -ForegroundColor White
        Write-Host "     Zebrano łącznie:  $($log.stats.total_found)" -ForegroundColor White
        Write-Host "     Auto-approved:    $($log.stats.total_auto_approved)" -ForegroundColor Green
        Write-Host "     Pending łącznie:  $($log.stats.total_pending)" -ForegroundColor Yellow
    }
    catch {
        Write-Host "     (błąd odczytu logu)" -ForegroundColor DarkRed
    }
}

# ─── Funkcja countdown
function Show-Countdown {
    param([int]$Seconds, [string]$Label)
    $end = (Get-Date).AddSeconds($Seconds)
    while ((Get-Date) -lt $end) {
        $remaining = [int](($end - (Get-Date)).TotalSeconds)
        $mins = [math]::Floor($remaining / 60)
        $secs = $remaining % 60
        $pct = [int](($Seconds - $remaining) / $Seconds * 100)
        $bar = "█" * [int]($pct / 5) + "░" * (20 - [int]($pct / 5))
        Write-Host -NoNewline "`r  ⏱  Następna runda za: ${mins}m ${secs}s  [$bar] $pct%   "
        Start-Sleep -Seconds 10
    }
    Write-Host ""
}

# ─── Główna pętla
while ($runCount -lt $MaxRuns) {
    $runCount++
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "  🚀 RUNDA $runCount / $MaxRuns — $timestamp" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host ""

    # Zbuduj argumenty
    $nodeArgs = @($SCRIPT)
    if ($DryRun) { $nodeArgs += "--dry-run" }

    # ─── Uruchom crawler z watchdog timeout + retry
    $attempt = 0
    $runOk = $false
    $runResult = "pending"

    while ($attempt -lt $MaxRetries -and -not $runOk) {
        $attempt++
        if ($attempt -gt 1) {
            Write-Host "  🔄 Retry $attempt/$MaxRetries po błędzie..." -ForegroundColor Magenta
            Start-Sleep -Seconds ($attempt * 15)
        }

        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = "node"
        $psi.Arguments = $nodeArgs -join " "
        $psi.UseShellExecute = $false
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.WorkingDirectory = $ROOT

        $proc = [System.Diagnostics.Process]::Start($psi)
        $deadline = (Get-Date).AddSeconds($timeoutSec)
        $timedOut = $false

        while (-not $proc.WaitForExit(5000)) {
            if ((Get-Date) -ge $deadline) {
                Write-Host "  ⏱ Timeout ${TimeoutMin}min — zabijam crawler (PID $($proc.Id))" -ForegroundColor Red
                try { $proc.Kill($true) } catch { try { Stop-Process -Id $proc.Id -Force } catch {} }
                $timedOut = $true
                break
            }
            $rem = [int](($deadline - (Get-Date)).TotalSeconds)
            Write-Host -NoNewline "`r  ⚙ Crawler działa... max ${rem}s   "
        }
        Write-Host ""

        $outText = try { $proc.StandardOutput.ReadToEnd() } catch { "" }
        $errText = try { $proc.StandardError.ReadToEnd() } catch { "" }

        # Dołącz do logu
        $ts = Get-Date -Format "HH:mm:ss"
        Add-Content -Path $LOG_FILE -Value "`n=== Runda $runCount próba $attempt — $ts ===`n$outText" -ErrorAction SilentlyContinue

        # Pokaż output
        if ($outText) {
            ($outText -split "`n") | Where-Object { $_.Trim() } | Select-Object -Last 25 |
            ForEach-Object { Write-Host "  $_" -ForegroundColor White }
        }
        if ($errText -and $errText.Trim()) {
            ($errText -split "`n") | Where-Object { $_.Trim() } | Select-Object -Last 5 |
            ForEach-Object { Write-Host "  ⚠ $_" -ForegroundColor Yellow }
        }

        if (-not $timedOut -and $proc.ExitCode -eq 0) {
            $runOk = $true
            $runResult = "success"
        }
        elseif ($timedOut) {
            $runResult = "timeout"
        }
        else {
            $runResult = "error:$($proc.ExitCode)"
        }
    }

    if ($runOk) {
        Write-Host "  ✅ OK (próba $attempt)" -ForegroundColor Green
    }
    else {
        Write-Host "  ❌ Runda $runCount nieudana po $MaxRetries próbach ($runResult)" -ForegroundColor Red
    }

    # Pokaż statystyki
    Show-Stats

    # Sprawdź czy osiągnęliśmy limit dzienny (odczyt z logu)
    if (Test-Path $CRAWLER_LOG) {
        try {
            $log = Get-Content $CRAWLER_LOG -Raw | ConvertFrom-Json
            $today = Get-Date -Format "yyyy-MM-dd"
            $tavilyToday = $log.stats.daily.$today.tavily
            if ($tavilyToday -ge 80) {
                Write-Host ""
                Write-Host "  ⛔ Dzienny limit Tavily osiągnięty ($tavilyToday/80). Czekam do jutra..." -ForegroundColor Red
                Write-Host ""
                break
            }
        }
        catch { }
    }

    # Jeśli to nie ostatnia runda — odczekaj
    if ($runCount -lt $MaxRuns) {
        $elapsed = [int]((Get-Date) - $startTime).TotalMinutes
        $estimated = $runCount * $IntervalMin

        Write-Host ""
        Write-Host "  ✅ Runda $runCount zakończona. Uruchomiono przez: ${elapsed}min" -ForegroundColor Green

        Show-Countdown -Seconds $intervalSec -Label "Następna runda"
    }
}

# ─── Podsumowanie sesji
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   SCHEDULER ZAKOŃCZONY                                   ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Łączna liczba rund: $runCount" -ForegroundColor White
Write-Host "  Czas trwania:       $([int]((Get-Date) - $startTime).TotalMinutes) minut" -ForegroundColor White
Show-Stats
Write-Host ""
Write-Host "  💡 Dashboard weryfikacji:  ai-hub\crawler-dashboard\index.html" -ForegroundColor Cyan
Write-Host "  💡 Przeproś pliki pending: ai-hub\js\data\pending\" -ForegroundColor Cyan
Write-Host ""
