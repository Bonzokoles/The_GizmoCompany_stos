# ============================================================
# SYNC LOOP: U:\The_DEVz_HUB_of_work --> A:\The_DEVz_HUB_of_work
# Uruchamiany w tle przez start_zeno_hub.bat
# Synchronizuje gdy w source przybedzie >= 200 MB nowych danych
# ============================================================

$SRC            = "U:\The_DEVz_HUB_of_work"
$DST            = "A:\The_DEVz_HUB_of_work"
$LOG            = "U:\WWW_Zen_BRo_wser_org3\logs\sync_devz_hub.log"
$THRESHOLD_MB   = 200        # sync gdy przyrost >= 200 MB
$POLL_SEC       = 60         # sprawdzaj co 60 sekund

function Get-SrcSizeBytes {
    (Get-ChildItem $SRC -Recurse -File -ErrorAction SilentlyContinue |
     Measure-Object -Property Length -Sum).Sum
}

function Run-Sync {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content $LOG "[$ts] Sync start: $SRC --> $DST"

    $robArgs = @(
        $SRC, $DST,
        "/MIR", "/MT:8", "/R:2", "/W:5",
        "/XD", ".git", "chroma_db", "chroma_kb", "__pycache__", "node_modules", ".venv", "venv",
        "/XF", "*.tmp", "thumbs.db",
        "/NP", "/LOG+:$LOG"
    )

    & robocopy @robArgs | Out-Null
    $rc = $LASTEXITCODE

    $ts2 = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    if ($rc -le 3) {
        Add-Content $LOG "[$ts2] Sync OK (rc=$rc)"
    } else {
        Add-Content $LOG "[$ts2] Sync ERROR (rc=$rc)"
    }
}

Write-Host "Sync loop start - prog $THRESHOLD_MB MB -> $DST"

# Pierwsze uruchomienie od razu
Run-Sync
$baselineBytes = Get-SrcSizeBytes

# Petla - czeka az przyrost >= THRESHOLD_MB
while ($true) {
    Start-Sleep -Seconds $POLL_SEC

    $currentBytes = Get-SrcSizeBytes
    $deltaBytes   = $currentBytes - $baselineBytes
    $deltaMB      = [math]::Round($deltaBytes / 1MB, 1)

    if ($deltaMB -ge $THRESHOLD_MB) {
        $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Add-Content $LOG "[$ts] Przyrost $deltaMB MB - uruchamiam sync"
        Run-Sync
        $baselineBytes = Get-SrcSizeBytes
    }
}
