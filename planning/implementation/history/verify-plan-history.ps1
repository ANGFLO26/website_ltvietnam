[CmdletBinding()]
param(
    [string]$ManifestPath,
    [switch]$GenerateManifest
)

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
$expectedDirectoryCounts = @{
    'planning/implementation/v0.1' = 12
    'planning/implementation/v0.2' = 15
    'planning/implementation/v0.3' = 16
    'planning/implementation/v0.4' = 18
    'planning/implementation/v0.4.1' = 19
}

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrWhiteSpace($ManifestPath)) {
    $ManifestPath = Join-Path $scriptDirectory 'PLAN_HISTORY_MANIFEST.sha256'
}
$ManifestPath = [System.IO.Path]::GetFullPath($ManifestPath)

$repoRootOutput = & git -C $scriptDirectory rev-parse --show-toplevel 2>&1
if ($LASTEXITCODE -ne 0) {
    throw "Unable to resolve repository root: $repoRootOutput"
}
$repoRoot = ([string]$repoRootOutput).Trim()
$gitExecutable = (Get-Command git -ErrorAction Stop).Source

function New-GitProcess {
    param([Parameter(Mandatory = $true)][string]$Arguments)

    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $gitExecutable
    $startInfo.WorkingDirectory = $repoRoot
    $startInfo.Arguments = $Arguments
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.CreateNoWindow = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    return $process
}

function Assert-SourceCommit {
    $process = New-GitProcess -Arguments "cat-file -e $sourceCommit^{commit}"
    try {
        if (-not $process.Start()) {
            throw 'Could not start git cat-file commit check'
        }
        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()
        $process.WaitForExit()
        $stdout = $stdoutTask.Result
        $stderr = $stderrTask.Result
        if ($process.ExitCode -ne 0) {
            throw "Source commit is missing or is not a commit: $sourceCommit; stdout=$stdout stderr=$stderr"
        }
    }
    finally {
        $process.Dispose()
    }
}

function Invoke-GitBinary {
    param([Parameter(Mandatory = $true)][string]$Arguments)

    $process = New-GitProcess -Arguments $Arguments
    $memory = New-Object System.IO.MemoryStream
    try {
        if (-not $process.Start()) {
            throw "Could not start git process: git $Arguments"
        }
        $stderrTask = $process.StandardError.ReadToEndAsync()
        $process.StandardOutput.BaseStream.CopyTo($memory)
        $process.WaitForExit()
        $stderr = $stderrTask.Result
        if ($process.ExitCode -ne 0) {
            throw "git $Arguments failed with exit $($process.ExitCode): $stderr"
        }
        return ,$memory.ToArray()
    }
    finally {
        $memory.Dispose()
        $process.Dispose()
    }
}

function Get-ExactBlobSha256 {
    param([Parameter(Mandatory = $true)][string]$BlobOid)

    $process = New-GitProcess -Arguments "cat-file blob $BlobOid"
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        if (-not $process.Start()) {
            throw "Could not start git cat-file for blob $BlobOid"
        }
        $stderrTask = $process.StandardError.ReadToEndAsync()
        $hashBytes = $sha256.ComputeHash($process.StandardOutput.BaseStream)
        $process.WaitForExit()
        $stderr = $stderrTask.Result
        if ($process.ExitCode -ne 0) {
            throw "git cat-file blob $BlobOid failed with exit $($process.ExitCode): $stderr"
        }
        return ([System.BitConverter]::ToString($hashBytes)).Replace('-', '').ToLowerInvariant()
    }
    finally {
        $sha256.Dispose()
        $process.Dispose()
    }
}

function Test-AllowedHistoryPath {
    param([Parameter(Mandatory = $true)][string]$Path)

    foreach ($sourcePath in $sourcePaths) {
        if ($Path.StartsWith("$sourcePath/", [System.StringComparison]::Ordinal)) {
            return $true
        }
    }
    return $false
}

function Get-SourceTreeEntries {
    Assert-SourceCommit

    $arguments = 'ls-tree -r -z --full-tree ' + $sourceCommit + ' -- ' + ($sourcePaths -join ' ')
    [byte[]]$treeBytes = Invoke-GitBinary -Arguments $arguments
    $utf8 = New-Object System.Text.UTF8Encoding($false, $true)
    $entriesByPath = @{}
    $directoryCounts = @{}
    foreach ($sourcePath in $sourcePaths) {
        $directoryCounts[$sourcePath] = 0
    }

    $recordStart = 0
    for ($index = 0; $index -lt $treeBytes.Length; $index++) {
        if ($treeBytes[$index] -ne 0) {
            continue
        }
        if ($index -eq $recordStart) {
            throw 'git ls-tree returned an empty record'
        }

        $record = $utf8.GetString($treeBytes, $recordStart, $index - $recordStart)
        $recordStart = $index + 1
        $tabIndex = $record.IndexOf("`t", [System.StringComparison]::Ordinal)
        if ($tabIndex -lt 0) {
            throw "Malformed git ls-tree record without tab separator: $record"
        }

        $metadata = $record.Substring(0, $tabIndex)
        $path = $record.Substring($tabIndex + 1)
        $metadataParts = $metadata.Split([char[]]' ', [System.StringSplitOptions]::RemoveEmptyEntries)
        if ($metadataParts.Count -ne 3) {
            throw "Malformed git ls-tree metadata: $metadata"
        }

        $mode = $metadataParts[0]
        $type = $metadataParts[1]
        $blobOid = $metadataParts[2]
        if ($mode -notmatch '^[0-7]{6}$') {
            throw "Malformed tree mode for $path`: $mode"
        }
        if ($type -cne 'blob') {
            throw "Non-blob tree entry rejected: mode=$mode type=$type oid=$blobOid path=$path"
        }
        if ($blobOid -notmatch '^([0-9a-f]{40}|[0-9a-f]{64})$') {
            throw "Malformed blob OID for $path`: $blobOid"
        }
        if ($path.Contains("`r") -or $path.Contains("`n")) {
            throw "Manifest-incompatible path with line break rejected: $path"
        }
        if (-not (Test-AllowedHistoryPath -Path $path)) {
            throw "Tree path is outside allowed history directories: $path"
        }
        if ($entriesByPath.ContainsKey($path)) {
            throw "Duplicate tree path: $path"
        }

        $entriesByPath[$path] = [PSCustomObject]@{
            Mode = $mode
            Type = $type
            BlobOid = $blobOid
            Path = $path
        }

        foreach ($sourcePath in $sourcePaths) {
            if ($path.StartsWith("$sourcePath/", [System.StringComparison]::Ordinal)) {
                $directoryCounts[$sourcePath]++
                break
            }
        }
    }

    if ($recordStart -ne $treeBytes.Length) {
        throw 'git ls-tree output was not NUL-terminated'
    }
    if ($entriesByPath.Count -ne 80) {
        throw "Unexpected source tree path count: $($entriesByPath.Count), expected 80"
    }
    foreach ($sourcePath in $sourcePaths) {
        if ($directoryCounts[$sourcePath] -ne $expectedDirectoryCounts[$sourcePath]) {
            throw "Unexpected path count for $sourcePath`: $($directoryCounts[$sourcePath]), expected $($expectedDirectoryCounts[$sourcePath])"
        }
    }

    [string[]]$orderedPaths = @($entriesByPath.Keys)
    [System.Array]::Sort($orderedPaths, [System.StringComparer]::Ordinal)
    $orderedEntries = New-Object 'System.Collections.Generic.List[object]'
    foreach ($path in $orderedPaths) {
        $orderedEntries.Add($entriesByPath[$path])
    }
    return $orderedEntries.ToArray()
}

function Get-ExactManifestData {
    param([Parameter(Mandatory = $true)][object[]]$TreeEntries)

    $hashesByPath = @{}
    $lines = New-Object 'System.Collections.Generic.List[string]'
    foreach ($entry in $TreeEntries) {
        $hash = Get-ExactBlobSha256 -BlobOid $entry.BlobOid
        $hashesByPath[$entry.Path] = $hash
        $lines.Add("$hash  $($entry.Path)")
    }
    return [PSCustomObject]@{
        HashesByPath = $hashesByPath
        Lines = $lines.ToArray()
    }
}

function Write-Utf8NoBomLines {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string[]]$Lines
    )

    $parent = Split-Path -Parent $Path
    if ([string]::IsNullOrWhiteSpace($parent) -or -not (Test-Path -LiteralPath $parent -PathType Container)) {
        throw "Manifest parent directory does not exist: $parent"
    }

    $encoding = New-Object System.Text.UTF8Encoding($false)
    $writer = New-Object System.IO.StreamWriter($Path, $false, $encoding)
    try {
        $writer.NewLine = "`n"
        foreach ($line in $Lines) {
            $writer.WriteLine($line)
        }
    }
    finally {
        $writer.Dispose()
    }
}

function Read-Manifest {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Manifest is missing: $Path"
    }

    $encoding = New-Object System.Text.UTF8Encoding($false, $true)
    $manifestLines = [System.IO.File]::ReadAllLines($Path, $encoding)
    $hashesByPath = @{}
    $order = New-Object 'System.Collections.Generic.List[string]'
    $lineNumber = 0
    foreach ($line in $manifestLines) {
        $lineNumber++
        if ($line -notmatch '^([0-9a-f]{64})  (.+)$') {
            throw "Malformed manifest line ${lineNumber}: $line"
        }
        $hash = $Matches[1]
        $path = $Matches[2]
        if (-not (Test-AllowedHistoryPath -Path $path)) {
            throw "Manifest path is outside allowed history directories: $path"
        }
        if ($hashesByPath.ContainsKey($path)) {
            throw "Duplicate manifest path: $path"
        }
        $hashesByPath[$path] = $hash
        $order.Add($path)
    }
    if ($hashesByPath.Count -eq 0) {
        throw 'Manifest has no entries'
    }

    [string[]]$sortedOrder = @($order)
    [System.Array]::Sort($sortedOrder, [System.StringComparer]::Ordinal)
    for ($index = 0; $index -lt $sortedOrder.Count; $index++) {
        if ($order[$index] -cne $sortedOrder[$index]) {
            throw "Manifest is not in stable ordinal lexicographic order at entry $($index + 1)"
        }
    }

    return [PSCustomObject]@{
        HashesByPath = $hashesByPath
        Order = $order.ToArray()
    }
}

$treeEntries = @(Get-SourceTreeEntries)
$exactData = Get-ExactManifestData -TreeEntries $treeEntries

if ($GenerateManifest) {
    Write-Utf8NoBomLines -Path $ManifestPath -Lines $exactData.Lines
    Write-Output 'PLAN_HISTORY_MANIFEST_GENERATION=PASS'
    Write-Output "source_commit=$sourceCommit"
    Write-Output 'hash_basis=git-cat-file-blob'
    Write-Output "tree_paths=$($treeEntries.Count)"
    Write-Output "manifest_entries=$($exactData.Lines.Count)"
    Write-Output "output=$ManifestPath"
    return
}

$manifest = Read-Manifest -Path $ManifestPath
$treePaths = @($exactData.HashesByPath.Keys)
$manifestPaths = @($manifest.HashesByPath.Keys)
$missing = @($treePaths | Where-Object { -not $manifest.HashesByPath.ContainsKey($_) })
$extra = @($manifestPaths | Where-Object { -not $exactData.HashesByPath.ContainsKey($_) })
$mismatched = @(
    $treePaths |
        Where-Object {
            $manifest.HashesByPath.ContainsKey($_) -and
            $manifest.HashesByPath[$_] -cne $exactData.HashesByPath[$_]
        }
)

if ($missing.Count -gt 0 -or $extra.Count -gt 0 -or $mismatched.Count -gt 0) {
    if ($missing.Count -gt 0) {
        Write-Error "Missing manifest entries: $($missing -join ', ')"
    }
    if ($extra.Count -gt 0) {
        Write-Error "Extra manifest entries: $($extra -join ', ')"
    }
    if ($mismatched.Count -gt 0) {
        foreach ($path in $mismatched) {
            Write-Error "Hash mismatch: $path expected_blob=$($exactData.HashesByPath[$path]) manifest=$($manifest.HashesByPath[$path])"
        }
    }
    throw 'Plan-history exact-blob manifest verification failed'
}

Write-Output 'PLAN_HISTORY_VERIFICATION=PASS'
Write-Output "source_commit=$sourceCommit"
Write-Output 'hash_basis=git-cat-file-blob'
Write-Output "manifest_entries=$($manifest.HashesByPath.Count)"
Write-Output "tree_paths=$($treeEntries.Count)"
Write-Output 'missing=0'
Write-Output 'extra=0'
Write-Output 'duplicate=0'
Write-Output 'mismatch=0'
