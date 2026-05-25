# QuantumFab AI - Setup Script for Windows
# Run this once to install all dependencies

Write-Host ""
Write-Host "  ██████╗ ██╗   ██╗ █████╗ ███╗   ██╗████████╗██╗   ██╗███╗   ███╗" -ForegroundColor Cyan
Write-Host "  ██╔═══██╗██║   ██║██╔══██╗████╗  ██║╚══██╔══╝██║   ██║████╗ ████║" -ForegroundColor Cyan
Write-Host "  ██║   ██║██║   ██║███████║██╔██╗ ██║   ██║   ██║   ██║██╔████╔██║" -ForegroundColor Cyan
Write-Host "  ██║▄▄ ██║██║   ██║██╔══██║██║╚██╗██║   ██║   ██║   ██║██║╚██╔╝██║" -ForegroundColor Cyan
Write-Host "  ╚██████╔╝╚██████╔╝██║  ██║██║ ╚████║   ██║   ╚██████╔╝██║ ╚═╝ ██║" -ForegroundColor Cyan
Write-Host "   ╚══▀▀═╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝    ╚═════╝ ╚═╝     ╚═╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  QuantumFab AI — Quantum Chip Design Assistant" -ForegroundColor White
Write-Host "  Powered by GLM via ThinkByte LiteLLM Proxy" -ForegroundColor Gray
Write-Host ""

# Step 1: Set API key
$apiKey = Read-Host "  Enter your GLM API Key"
if (-not $apiKey) {
    Write-Host "  ERROR: API key is required." -ForegroundColor Red
    exit 1
}

$envContent = @"
ANTHROPIC_BASE_URL=https://stg-devbyte-litellm.thinkbyte.ai
ANTHROPIC_AUTH_TOKEN=$apiKey
ANTHROPIC_DEFAULT_SONNET_MODEL=glm-4-7
ANTHROPIC_DEFAULT_HAIKU_MODEL=glm-4-7-flash
ANTHROPIC_DEFAULT_OPUS_MODEL=glm-5
PORT=3001
"@

Set-Content -Path "backend\.env" -Value $envContent
Write-Host "  [OK] API key saved to backend\.env" -ForegroundColor Green

# Step 2: Install backend
Write-Host ""
Write-Host "  Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "  ERROR: npm install failed in backend" -ForegroundColor Red; exit 1 }
Set-Location ..
Write-Host "  [OK] Backend dependencies installed" -ForegroundColor Green

# Step 3: Install frontend
Write-Host ""
Write-Host "  Installing frontend dependencies (this takes 3-5 minutes)..." -ForegroundColor Yellow
Set-Location frontend
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "  ERROR: npm install failed in frontend" -ForegroundColor Red; exit 1 }
Set-Location ..
Write-Host "  [OK] Frontend dependencies installed" -ForegroundColor Green

Write-Host ""
Write-Host "  ════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  SETUP COMPLETE! To start QuantumFab AI:" -ForegroundColor White
Write-Host "  ════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  1. Run START.bat (double-click it)" -ForegroundColor Yellow
Write-Host "     OR manually:" -ForegroundColor Gray
Write-Host "     Window 1: cd backend  && node server.js" -ForegroundColor Gray
Write-Host "     Window 2: cd frontend && npm start" -ForegroundColor Gray
Write-Host ""
