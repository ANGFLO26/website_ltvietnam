# =====================================================================
# LT VIETNAM - SQL Execution Verification (v1.2.1) - Windows PowerShell
# Run the complete verification suite against a real PostgreSQL 16 server.
#
# Requirement: psql (Postgres 16 client) must be in PATH and connected to PostgreSQL 16.
# Example Docker server:
#   docker run -d --name ltv-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
#   $env:PGHOST="localhost"; $env:PGPORT="5432"; $env:PGUSER="postgres"; $env:PGPASSWORD="postgres"
#   .\run_verification.ps1
# =====================================================================
$ErrorActionPreference = "Stop"
$DIR = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not $env:PGHOST)     { $env:PGHOST = "localhost" }
if (-not $env:PGPORT)     { $env:PGPORT = "5432" }
if (-not $env:PGUSER)     { $env:PGUSER = "postgres" }
if (-not $env:PGDATABASE) { $env:PGDATABASE = "ltv_verify" }
$DB = $env:PGDATABASE

function Invoke-Psql {
    param([string]$Db, [string[]]$PsqlArgs)
    & psql -v ON_ERROR_STOP=1 -X -q -d $Db @PsqlArgs
    if ($LASTEXITCODE -ne 0) { throw "psql failed (exit $LASTEXITCODE)" }
}

Write-Host "== 0. Create empty database: $DB =="
Invoke-Psql "postgres" @("-c", "DROP DATABASE IF EXISTS `"$DB`";")
Invoke-Psql "postgres" @("-c", "CREATE DATABASE `"$DB`";")

Write-Host "== 1. Migrate 001 -> 070 (schema_up.sql) =="
Invoke-Psql $DB @("-f", "$DIR\schema_up.sql")

Write-Host "== 2. Verify checks (63 tables / extension / trigger / enum / unique / FK) =="
Invoke-Psql $DB @("-f", "$DIR\verify_checks.sql")

Write-Host "== 3. Rollback 070 -> 001 (schema_down.sql) =="
Invoke-Psql $DB @("-f", "$DIR\schema_down.sql")

Write-Host "== 3b. Confirm schema ltv was removed after rollback =="
$left = (& psql -X -tA -d $DB -c "SELECT count(*) FROM information_schema.schemata WHERE schema_name='ltv';").Trim()
if ($left -ne "0") { throw "FAIL: schema ltv still exists after rollback" }
Write-Host "PASS: schema ltv was removed"

Write-Host "== 4. Migrate a second time 001 -> 070 =="
Invoke-Psql $DB @("-f", "$DIR\schema_up.sql")

Write-Host "== 5. Clean up database =="
Invoke-Psql "postgres" @("-c", "DROP DATABASE IF EXISTS `"$DB`";")

Write-Host "==================================================================="
Write-Host "  ALL STEPS PASSED - EXECUTION TESTED ON POSTGRESQL 16"
Write-Host "==================================================================="
