Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AMS - Audit Management System       " -ForegroundColor Cyan
Write-Host "  Starting Application...              " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$backendPath = Join-Path $PSScriptRoot "backend"
$frontendPath = Join-Path $PSScriptRoot "frontend"

# Check MongoDB
Write-Host "[1/4] Checking MongoDB..." -ForegroundColor Yellow
$mongoRunning = $false
try {
    $mongoStatus = & mongosh --eval "db.version()" --quiet 2>$null
    if ($mongoStatus) {
        Write-Host "  MongoDB is running (v$mongoStatus)" -ForegroundColor Green
        $mongoRunning = $true
    }
} catch {
    Write-Host "  MongoDB not detected via mongosh, trying netstat..." -ForegroundColor Gray
    $portCheck = netstat -ano | Select-String ":27017" | Select-String "LISTENING"
    if ($portCheck) {
        Write-Host "  MongoDB is running on port 27017" -ForegroundColor Green
        $mongoRunning = $true
    }
}

if (-not $mongoRunning) {
    Write-Host "  WARNING: MongoDB does not appear to be running!" -ForegroundColor Red
    Write-Host "  Please start MongoDB before running the app." -ForegroundColor Red
    Write-Host "  If MongoDB is not installed, download from: https://www.mongodb.com/try/download/community" -ForegroundColor Red
    Write-Host ""
    $continue = Read-Host "  Continue anyway? (y/n)"
    if ($continue -ne "y") { exit 1 }
}

# Check node_modules
if (-not (Test-Path (Join-Path $backendPath "node_modules"))) {
    Write-Host "[2/4] Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location $backendPath
    npm install
    Set-Location $PSScriptRoot
} else {
    Write-Host "[2/4] Backend dependencies OK" -ForegroundColor Green
}

if (-not (Test-Path (Join-Path $frontendPath "node_modules"))) {
    Write-Host "[3/4] Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location $frontendPath
    npm install
    Set-Location $PSScriptRoot
} else {
    Write-Host "[3/4] Frontend dependencies OK" -ForegroundColor Green
}

# Run seed data
Write-Host "[4/4] Seeding database..." -ForegroundColor Yellow
Set-Location $backendPath
npm run seed
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete! Starting servers...   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start backend
$backendJob = Start-Process -FilePath "cmd" -ArgumentList "/c cd /d `"$backendPath`" && npm run dev" -PassThru -WindowStyle Minimized

# Start frontend
Start-Sleep -Seconds 3
$frontendJob = Start-Process -FilePath "cmd" -ArgumentList "/c cd /d `"$frontendPath`" && npm start" -PassThru -WindowStyle Minimized

Write-Host ""
Write-Host "Backend  API:  http://localhost:5000/api/v1" -ForegroundColor Green
Write-Host "Frontend App:  http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Demo Login Credentials (Employee Code / Password):" -ForegroundColor Yellow
Write-Host "  Admin:      EMP001 / admin123" -ForegroundColor White
Write-Host "  HIA:        EMP002 / hia123" -ForegroundColor White
Write-Host "  Planner:    EMP003 / planner123" -ForegroundColor White
Write-Host "  Auditor:    EMP004 / auditor123" -ForegroundColor White
Write-Host "  Branch Mgr: EMP005 / bm123" -ForegroundColor White
Write-Host "  Compliance: EMP006 / comp123" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to stop all servers"

# Cleanup
Stop-Process -Id $backendJob.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $frontendJob.Id -Force -ErrorAction SilentlyContinue
Write-Host "Servers stopped." -ForegroundColor Gray
