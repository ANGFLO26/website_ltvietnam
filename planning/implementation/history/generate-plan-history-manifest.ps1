[CmdletBinding()]
param(
    [string]$OutputPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path $scriptDirectory 'PLAN_HISTORY_MANIFEST.sha256'
}
$OutputPath = [System.IO.Path]::GetFullPath($OutputPath)

& (Join-Path $scriptDirectory 'verify-plan-history.ps1') `
    -GenerateManifest `
    -ManifestPath $OutputPath
