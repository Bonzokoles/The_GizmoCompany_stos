# Update Cloudflare Pages Secrets via REST API
# Usage: .\update-cf-secrets-api.ps1

$envFile = "U:\WWW_Zen_BRo_wser_org3\.workspace_meta\secrets\.env"
$projectName = "zeno-browser-web"

# Read .env file
$envContent = Get-Content $envFile -Raw

function Extract-EnvValue {
    param($key)
    if ($envContent -match "$key=(.+?)(\r?\n|$)") {
        return $matches[1].Trim()
    }
    return $null
}

# Get CF credentials
$accountId = Extract-EnvValue "CLOUDFLARE_ACCOUNT_ID"
$apiToken = Extract-EnvValue "CLOUDFLARE_API_TOKEN"

if (-not $accountId -or -not $apiToken) {
    Write-Host "ERROR: Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN in .env" -ForegroundColor Red
    exit 1
}

# Extract secrets to update
$secrets = [ordered]@{
    "DEEPSEEK_API_KEY"   = Extract-EnvValue "DEEPSEEK_API_KEY"
    "OPENROUTER_API_KEY" = Extract-EnvValue "OPENROUTER_API_KEY"
    "ANTHROPIC_API_KEY"  = Extract-EnvValue "ANTHROPIC_API_KEY"
    "OPENAI_API_KEY"     = Extract-EnvValue "OPENAI_API_KEY"
    "GEMINI_API_KEY"     = Extract-EnvValue "GEMINI_API_KEY"
    "PERPLEXITY_API_KEY" = Extract-EnvValue "PERPLEXITY_API_KEY"
    "TOGETHER_API_KEY"   = Extract-EnvValue "TOGETHER_API_KEY"
    "ADMIN_USER"         = Extract-EnvValue "ADMIN_USER"
    "ADMIN_PASS"         = Extract-EnvValue "ADMIN_PASS"
}

Write-Host "=== Updating Cloudflare Pages Secrets via API ===" -ForegroundColor Cyan
Write-Host "Project: $projectName" -ForegroundColor Yellow
Write-Host "Account: $accountId" -ForegroundColor Yellow
Write-Host ""

# CF Pages API endpoint
$apiUrl = "https://api.cloudflare.com/client/v4/accounts/$accountId/pages/projects/$projectName"

Write-Host "Fetching current project config..." -ForegroundColor Cyan

$headers = @{
    "Authorization" = "Bearer $apiToken"
    "Content-Type"  = "application/json"
}

try {
    # Get current project config
    $response = Invoke-RestMethod -Uri $apiUrl -Headers $headers -Method GET
    
    if (-not $response.success) {
        Write-Host "✗ Failed to fetch project:" -ForegroundColor Red
        Write-Host ($response.errors | ConvertTo-Json) -ForegroundColor Yellow
        exit 1
    }
    
    # Get existing env vars
    $existingVars = $response.result.deployment_configs.production.env_vars
    
    # Create updated env vars array
    $updatedVars = @()
    
    # Keep existing vars that we're not updating
    foreach ($var in $existingVars) {
        if (-not $secrets.Contains($var.name)) {
            $updatedVars += $var
        }
    }
    
    # Add new/updated secrets
    foreach ($secret in $secrets.GetEnumerator()) {
        if ($secret.Value) {
            Write-Host "Adding: $($secret.Key)" -ForegroundColor Green
            $updatedVars += @{
                name  = $secret.Key
                value = $secret.Value
                type  = "secret_text"
            }
        }
    }
    
    # Prepare PATCH body
    $body = @{
        deployment_configs = @{
            production = @{
                env_vars = $updatedVars
            }
        }
    } | ConvertTo-Json -Depth 10
    
    Write-Host ""
    Write-Host "Sending PATCH request..." -ForegroundColor Cyan
    
    # Update project
    $updateResponse = Invoke-RestMethod -Uri $apiUrl -Headers $headers -Method PATCH -Body $body
    
    if ($updateResponse.success) {
        Write-Host "✓ All secrets updated successfully!" -ForegroundColor Green
    }
    else {
        Write-Host "✗ Update failed:" -ForegroundColor Red
        Write-Host ($updateResponse.errors | ConvertTo-Json) -ForegroundColor Yellow
        exit 1
    }
}
catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Yellow
    }
    exit 1
}

Write-Host ""
Write-Host "=== Done! ===" -ForegroundColor Green
Write-Host "Wait ~10 seconds for propagation, then test:" -ForegroundColor Cyan
Write-Host "https://zenbrowsers.org/api/ai/providers" -ForegroundColor White
