[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$sourceCommit = '9e694692b7f4e224b3cd8b8ff35edd6ee5afeccd'
$sourcePaths = @(
    'planning/implementation/v0.1',
    'planning/implementation/v0.2',
    'planning/implementation/v0.3',
    'planning/implementation/v0.4',
    'planning/implementation/v0.4.1'
)

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$manifestPath = Join-Path $scriptDirectory 'PLAN_HISTORY_MANIFEST.sha256'

$repoRootOutput = & git -C $scriptDirectory rev-parse --show-toplevel 2>&1
if ($LASTEXITCODE -ne 0) {
    throw "Unable to resolve repository root: $repoRootOutput"
}
$repoRoot = ([string]$repoRootOutput).Trim()

if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "Manifest is missing: $manifestPath"
}

$expected = @{}
$manifestOrder = New-Object 'System.Collections.Generic.List[string]'
$lineNumber = 0

foreach ($line in Get-Content -LiteralPath $manifestPath -Encoding UTF8) {
    $lineNumber++
    if ([string]::IsNullOrWhiteSpace($line)) {
        continue
    }
    if ($line -notmatch '^([0-9a-f]{64})  (.+)$') {
        throw "Malformed manifest line ${lineNumber}: $line"
    }

    $hash = $Matches[1]
    $path = $Matches[2]
    $allowed = $false
    foreach ($sourcePath in $sourcePaths) {
        if ($path.StartsWith("$sourcePath/", [System.StringComparison]::Ordinal)) {
            $allowed = $true
            break
        }
    }
    if (-not $allowed) {
        throw "Manifest path is outside the allowed history directories: $path"
    }
    if ($expected.ContainsKey($path)) {
        throw "Duplicate manifest path: $path"
    }

    $expected[$path] = $hash
    $manifestOrder.Add($path)
}

if ($expected.Count -eq 0) {
    throw 'Manifest has no entries'
}

[string[]]$sortedOrder = @($manifestOrder)
[System.Array]::Sort($sortedOrder, [System.StringComparer]::Ordinal)
for ($index = 0; $index -lt $sortedOrder.Count; $index++) {
    if ($manifestOrder[$index] -cne $sortedOrder[$index]) {
        throw "Manifest is not in stable ordinal lexicographic order at entry $($index + 1)"
    }
}

$tempBase = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$tempRoot = Join-Path $tempBase ('ltvn-plan-history-' + [System.Guid]::NewGuid().ToString('N'))
$resolvedTempRoot = [System.IO.Path]::GetFullPath($tempRoot)
if (-not $resolvedTempRoot.StartsWith($tempBase, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Unsafe temporary directory: $resolvedTempRoot"
}

$archivePath = Join-Path $resolvedTempRoot 'plan-history.tar'
$extractRoot = Join-Path $resolvedTempRoot 'extract'

try {
    New-Item -ItemType Directory -Path $extractRoot -Force | Out-Null

    $archiveOutput = & git -C $repoRoot archive --format=tar "--output=$archivePath" $sourceCommit -- @sourcePaths 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "git archive failed: $archiveOutput"
    }

    $tarOutput = & tar -xf $archivePath -C $extractRoot 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "tar extraction failed: $tarOutput"
    }

    $actual = @{}
    foreach ($sourcePath in $sourcePaths) {
        $sourceDirectory = Join-Path $extractRoot ($sourcePath -replace '/', [System.IO.Path]::DirectorySeparatorChar)
        if (-not (Test-Path -LiteralPath $sourceDirectory -PathType Container)) {
            throw "Archived history directory is missing: $sourcePath"
        }

        foreach ($file in Get-ChildItem -LiteralPath $sourceDirectory -File -Recurse) {
            $relativePath = $file.FullName.Substring($extractRoot.Length).TrimStart('\', '/').Replace('\', '/')
            if ($actual.ContainsKey($relativePath)) {
                throw "Duplicate archived path: $relativePath"
            }
            $actual[$relativePath] = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
        }
    }

    $missing = @($expected.Keys | Where-Object { -not $actual.ContainsKey($_) } | Sort-Object)
    $extra = @($actual.Keys | Where-Object { -not $expected.ContainsKey($_) } | Sort-Object)
    $mismatched = @(
        $expected.Keys |
            Where-Object { $actual.ContainsKey($_) -and $actual[$_] -cne $expected[$_] } |
            Sort-Object
    )

    if ($missing.Count -gt 0 -or $extra.Count -gt 0 -or $mismatched.Count -gt 0) {
        if ($missing.Count -gt 0) {
            Write-Error "Missing entries: $($missing -join ', ')"
        }
        if ($extra.Count -gt 0) {
            Write-Error "Extra entries: $($extra -join ', ')"
        }
        if ($mismatched.Count -gt 0) {
            foreach ($path in $mismatched) {
                Write-Error "Hash mismatch: $path expected=$($expected[$path]) actual=$($actual[$path])"
            }
        }
        throw 'Plan-history manifest verification failed'
    }

    Write-Output 'PLAN_HISTORY_VERIFICATION=PASS'
    Write-Output "source_commit=$sourceCommit"
    Write-Output "manifest_entries=$($expected.Count)"
    Write-Output "archive_files=$($actual.Count)"
}
finally {
    if (Test-Path -LiteralPath $resolvedTempRoot) {
        Remove-Item -LiteralPath $resolvedTempRoot -Recurse -Force
    }
}
