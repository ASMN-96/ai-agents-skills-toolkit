Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$InstallScript = Join-Path $RepoRoot 'install/install-project.ps1'
$UpdateScript = Join-Path $RepoRoot 'install/update-project.ps1'
$ValidateScript = Join-Path $RepoRoot 'install/validate-project-install.ps1'
$TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) "ai-toolkit-sync-tests-$([System.Guid]::NewGuid().ToString('N'))"

function Invoke-CheckedGit {
    param([string]$Repo, [string[]]$Arguments)
    $output = & git -C $Repo @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "git -C $Repo $($Arguments -join ' ') failed: $($output -join "`n")"
    }
}

function Invoke-Tool {
    param([string[]]$Arguments)
    $output = & pwsh -NoProfile @Arguments 2>&1
    [pscustomobject]@{
        ExitCode = $LASTEXITCODE
        Output = ($output -join "`n")
    }
}

function Assert-Success {
    param($Result, [string]$Message)
    if ($Result.ExitCode -ne 0) {
        throw "$Message failed unexpectedly: $($Result.Output)"
    }
}

function Assert-Failure {
    param($Result, [string]$Pattern, [string]$Message)
    if ($Result.ExitCode -eq 0) {
        throw "$Message succeeded unexpectedly: $($Result.Output)"
    }
    if ($Result.Output -notmatch $Pattern) {
        throw "$Message failed with the wrong output. Expected /$Pattern/. Actual: $($Result.Output)"
    }
}

function New-TestRepo {
    param([string]$Name)

    $remote = Join-Path $TempRoot "$Name-remote.git"
    $repo = Join-Path $TempRoot "$Name-repo"
    New-Item -ItemType Directory -Force -Path $repo | Out-Null
    & git init --bare $remote | Out-Null
    & git init $repo | Out-Null
    Invoke-CheckedGit $repo @('config', 'user.email', 'toolkit-test@example.com')
    Invoke-CheckedGit $repo @('config', 'user.name', 'Toolkit Test')
    Set-Content -Encoding UTF8 -LiteralPath (Join-Path $repo 'README.md') -Value "# $Name"
    Invoke-CheckedGit $repo @('add', 'README.md')
    Invoke-CheckedGit $repo @('commit', '-m', 'seed')
    Invoke-CheckedGit $repo @('branch', '-M', 'main')
    Invoke-CheckedGit $repo @('remote', 'add', 'origin', $remote)
    Invoke-CheckedGit $repo @('push', '-u', 'origin', 'main')
    Invoke-CheckedGit $repo @('switch', '-c', 'feature/toolkit-sync')
    Invoke-CheckedGit $repo @('push', '-u', 'origin', 'feature/toolkit-sync')
    return $repo
}

New-Item -ItemType Directory -Force -Path $TempRoot | Out-Null

try {
    $dryRunRepo = New-TestRepo 'dry-run'
    $dryRun = Invoke-Tool @('-File', $InstallScript, '-TargetPath', $dryRunRepo, '-Agents', 'reviewer-agent')
    Assert-Success $dryRun 'dry-run install'
    if (Test-Path -LiteralPath (Join-Path $dryRunRepo '.ai-toolkit')) {
        throw 'dry-run install wrote .ai-toolkit'
    }

    $mainRepo = New-TestRepo 'main-branch'
    Invoke-CheckedGit $mainRepo @('switch', 'main')
    Assert-Failure (Invoke-Tool @('-File', $InstallScript, '-TargetPath', $mainRepo, '-Agents', 'reviewer-agent', '-ConfirmWrite')) 'main|master' 'main branch confirm-write'

    $dirtyRepo = New-TestRepo 'dirty'
    Add-Content -LiteralPath (Join-Path $dirtyRepo 'README.md') -Value 'dirty change'
    Assert-Failure (Invoke-Tool @('-File', $InstallScript, '-TargetPath', $dirtyRepo, '-Agents', 'reviewer-agent', '-ConfirmWrite')) 'dirty|uncommitted' 'dirty confirm-write'

    $noUpstreamRepo = New-TestRepo 'no-upstream'
    Invoke-CheckedGit $noUpstreamRepo @('switch', '-c', 'feature/no-upstream')
    Assert-Failure (Invoke-Tool @('-File', $InstallScript, '-TargetPath', $noUpstreamRepo, '-Agents', 'reviewer-agent', '-ConfirmWrite')) 'upstream' 'no-upstream confirm-write'

    $detachedRepo = New-TestRepo 'detached'
    Invoke-CheckedGit $detachedRepo @('checkout', '--detach')
    Assert-Failure (Invoke-Tool @('-File', $InstallScript, '-TargetPath', $detachedRepo, '-Agents', 'reviewer-agent', '-ConfirmWrite')) 'detached' 'detached confirm-write'

    $aheadRepo = New-TestRepo 'ahead'
    Add-Content -LiteralPath (Join-Path $aheadRepo 'README.md') -Value 'ahead change'
    Invoke-CheckedGit $aheadRepo @('add', 'README.md')
    Invoke-CheckedGit $aheadRepo @('commit', '-m', 'ahead change')
    Assert-Failure (Invoke-Tool @('-File', $InstallScript, '-TargetPath', $aheadRepo, '-Agents', 'reviewer-agent', '-ConfirmWrite')) 'ahead|behind|diverg' 'ahead confirm-write'

    $behindRepo = New-TestRepo 'behind'
    $clone = Join-Path $TempRoot 'behind-clone'
    & git clone (Join-Path $TempRoot 'behind-remote.git') $clone | Out-Null
    Invoke-CheckedGit $clone @('config', 'user.email', 'toolkit-test@example.com')
    Invoke-CheckedGit $clone @('config', 'user.name', 'Toolkit Test')
    Invoke-CheckedGit $clone @('switch', 'feature/toolkit-sync')
    Add-Content -LiteralPath (Join-Path $clone 'README.md') -Value 'remote change'
    Invoke-CheckedGit $clone @('add', 'README.md')
    Invoke-CheckedGit $clone @('commit', '-m', 'remote change')
    Invoke-CheckedGit $clone @('push')
    Assert-Failure (Invoke-Tool @('-File', $InstallScript, '-TargetPath', $behindRepo, '-Agents', 'reviewer-agent', '-ConfirmWrite')) 'ahead|behind|diverg' 'behind confirm-write'

    $successRepo = New-TestRepo 'success'
    $install = Invoke-Tool @('-File', $InstallScript, '-TargetPath', $successRepo, '-Agents', 'reviewer-agent', '-ConfirmWrite')
    Assert-Success $install 'clean feature confirm-write'
    $manifestPath = Join-Path $successRepo '.ai-toolkit/.ai-toolkit-manifest.json'
    if (!(Test-Path -LiteralPath $manifestPath)) {
        throw 'confirm-write did not create .ai-toolkit/.ai-toolkit-manifest.json'
    }
    Assert-Success (Invoke-Tool @('-File', $ValidateScript, '-TargetPath', $successRepo)) 'manifest validation'
    Invoke-CheckedGit $successRepo @('add', '.ai-toolkit')
    Invoke-CheckedGit $successRepo @('commit', '-m', 'install toolkit')
    Invoke-CheckedGit $successRepo @('push')
    Assert-Success (Invoke-Tool @('-File', $UpdateScript, '-TargetPath', $successRepo, '-ConfirmWrite')) 'clean feature update'
    Assert-Success (Invoke-Tool @('-File', $ValidateScript, '-TargetPath', $successRepo)) 'post-update manifest validation'

    Add-Content -LiteralPath (Join-Path $successRepo '.ai-toolkit/compiled-agents/reviewer-agent.compiled.md') -Value 'tamper'
    Assert-Failure (Invoke-Tool @('-File', $ValidateScript, '-TargetPath', $successRepo)) 'hash|manifest|tamper' 'tampered manifest validation'

    Write-Host 'Project sync hardening tests passed.'
}
finally {
    Remove-Item -LiteralPath $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
