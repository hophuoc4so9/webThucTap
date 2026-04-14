[CmdletBinding()]
param(
    [switch]$Force,
    [string]$GoogleClientId = "YOUR_GOOGLE_CLIENT_ID_HERE"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

function Ensure-FromExample {
    param(
        [Parameter(Mandatory = $true)][string]$Destination,
        [Parameter(Mandatory = $true)][string]$Example
    )

    if ((Test-Path $Destination) -and -not $Force) {
        Write-Host "[SKIP] Exists: $Destination"
        return
    }

    if (-not (Test-Path $Example)) {
        throw "Example file not found: $Example"
    }

    New-Item -ItemType Directory -Force -Path (Split-Path $Destination -Parent) | Out-Null
    Copy-Item -Path $Example -Destination $Destination -Force
    Write-Host "[OK] Created from example: $Destination"
}

function Ensure-EnvContent {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Content
    )

    if ((Test-Path $Path) -and -not $Force) {
        Write-Host "[SKIP] Exists: $Path"
        return
    }

    New-Item -ItemType Directory -Force -Path (Split-Path $Path -Parent) | Out-Null
    Set-Content -Path $Path -Value $Content -Encoding UTF8
    Write-Host "[OK] Wrote: $Path"
}

$feEnv = Join-Path $projectRoot "fe/.env"
$feExample = Join-Path $projectRoot "fe/.env.example"
$beEnv = Join-Path $projectRoot "be/.env"
$beExample = Join-Path $projectRoot "be/.env.example"

Ensure-FromExample -Destination $feEnv -Example $feExample
Ensure-FromExample -Destination $beEnv -Example $beExample

$authServiceEnv = @"
DB_HOST=postgres-auth
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=Phuoc123456
DB_DATABASE=authdb
JWT_SECRET=supersecret
GOOGLE_CLIENT_ID=$GoogleClientId
"@

$jobServiceEnv = @"
DB_HOST=postgres-job
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=Phuoc123456
DB_DATABASE=jobdb
"@

$cvServiceEnv = @"
DB_HOST=postgres-cv
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=Phuoc123456
DB_DATABASE=cvdb
"@

Ensure-EnvContent -Path (Join-Path $projectRoot "be/src/services/auth-service/.env") -Content $authServiceEnv
Ensure-EnvContent -Path (Join-Path $projectRoot "be/src/services/job-service/.env") -Content $jobServiceEnv
Ensure-EnvContent -Path (Join-Path $projectRoot "be/src/services/cv-service/.env") -Content $cvServiceEnv

Write-Host ""
Write-Host "Done. Next steps:" -ForegroundColor Green
Write-Host "1) Update Google Client ID in fe/.env, be/.env, and auth-service/.env if still placeholder."
Write-Host "2) Run: docker compose up -d --build"
