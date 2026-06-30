# WeekWise – Test Runner (PowerShell)
# Usage: .\run.ps1
# Runs php run.php which orchestrates all tests.

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "WeekWise Test Runner" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan
Write-Host ""

# Locate PHP: try PATH first, fall back to XAMPP
$phpExe = $null
$phpFromPath = Get-Command php -ErrorAction SilentlyContinue
if ($phpFromPath) {
    $phpExe = "php"
} elseif (Test-Path "C:\xampp\php\php.exe") {
    $phpExe = "C:\xampp\php\php.exe"
} else {
    Write-Host "ERROR: PHP not found in PATH or at C:\xampp\php\php.exe" -ForegroundColor Red
    exit 1
}

$phpVersion = & $phpExe --version 2>&1
Write-Host "PHP: $($phpVersion[0])" -ForegroundColor Gray
Write-Host ""

# Run php run.php
& $phpExe run.php
$exitCode = $LASTEXITCODE

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "ALL TESTS PASSED" -ForegroundColor Green
} else {
    Write-Host "SOME TESTS FAILED (exit code: $exitCode)" -ForegroundColor Red
}

exit $exitCode