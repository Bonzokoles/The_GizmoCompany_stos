# Update Cloudflare Pages Secrets from .env
# Usage: .\update-cf-secrets.ps1

$envFile = "U:\WWW_Zen_BRo_wser_org3\.workspace_meta\secrets\.env"
$projectName = "zeno-browser-web"

# Read .env file and extract keys
$envContent = Get-Content $envFile -Raw

function Extract-EnvValue {
    param($key)
    if ($envContent -match "$key=(.+?)(\r?\n|$)") {
        return $matches[1].Trim()
    }
    return $null
}

# Extract all API keys (in order)
$secrets = [ordered]@{
    "DEEPSEEK_API_KEY"   = Extract-EnvValue "DEEPSEEK_API_KEY"
    "OPENROUTER_API_KEY" = Extract-EnvValue "OPENROUTER_API_KEY"
    "ANTHROPIC_API_KEY"  = Extract-EnvValue "ANTHROPIC_API_KEY"
    "OPENAI_API_KEY"     = Extract-EnvValue "OPENAI_API_KEY"
    "GEMINI_API_KEY"     = Extract-EnvValue "GEMINI_API_KEY"
    "PERPLEXITY_API_KEY" = Extract-EnvValue "PERPLEXITY_API_KEY"
    "TOGETHER_API_KEY"   = Extract-EnvValue "TOGETHER_API_KEY"
}

Write-Host "=== Updating Cloudflare Pages Secrets ===" -ForegroundColor Cyan
Write-Host "Project: $projectName" -ForegroundColor Yellow
Write-Host ""

foreach ($secret in $secrets.GetEnumerator()) {
    if ($secret.Value) {
        Write-Host "Updating: $($secret.Key)..." -ForegroundColor Green -NoNewline
        
        # Create temp process with stdin redirect
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = "npx"
        $psi.Arguments = "wrangler pages secret put $($secret.Key) --project-name $projectName"
        $psi.UseShellExecute = $false
        $psi.RedirectStandardInput = $true
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $psi
        $process.Start() | Out-Null
        
        # Write secret value to stdin
        $process.StandardInput.WriteLine($secret.Value)
        $process.StandardInput.Close()
        
        # Wait and capture output
        $output = $process.StandardOutput.ReadToEnd()
        $process.WaitForExit()
        
        if ($process.ExitCode -eq 0) {
            Write-Host " ✓ OK" -ForegroundColor Green
        }
        else {
            Write-Host " ✗ FAILED" -ForegroundColor Red
            Write-Host $output -ForegroundColor Yellow
        }
        
        Start-Sleep -Milliseconds 800
    }
    else {
        Write-Host "Skipping: $($secret.Key) (not found in .env)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Done! ===" -ForegroundColor Green
Write-Host "Test with: https://zenbrowsers.org/api/ai/providers" -ForegroundColor Cyan
