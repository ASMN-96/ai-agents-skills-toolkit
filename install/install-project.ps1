param(
    [string]$TargetPath,
    [string[]]$Agents = @(),
    [string[]]$Profiles = @(),
    [string[]]$Skills = @(),
    [string]$ConfigPath,
    [switch]$ConfirmWrite,
    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ToolkitRoot = Split-Path -Parent $PSScriptRoot

function Get-ToolkitVersion {
    $versionPath = Join-Path $ToolkitRoot '.ai-toolkit\VERSION'
    if (!(Test-Path -LiteralPath $versionPath)) {
        throw 'Missing .ai-toolkit/VERSION. Project sync requires the canonical toolkit version file.'
    }
    $version = (Get-Content -Raw -LiteralPath $versionPath).Trim()
    if ([string]::IsNullOrWhiteSpace($version)) {
        throw '.ai-toolkit/VERSION is empty.'
    }
    return $version
}

function Show-Help {
    @'
AI Agent Skills Toolkit project installer

Usage:
  pwsh -NoProfile -File install/install-project.ps1 -TargetPath <repo> -Agents <names> -Profiles <names> -Skills <names>
  pwsh -NoProfile -File install/install-project.ps1 -TargetPath <repo> -ConfigPath templates/.ai-toolkit.config.example.json

Default behavior is dry-run. Add -ConfirmWrite to copy selected files into the target .ai-toolkit/ directory.

Parameters:
  -TargetPath     Target project repository path.
  -Agents         Agent names without extension, for example reviewer-agent,security-agent.
  -Profiles       Profile names without extension, for example audit-profile.
  -Skills         Toolkit-owned skill names, for example governance.
  -ConfigPath     Optional JSON config with selectedAgents, selectedProfiles, and selectedSkills.
  -ConfirmWrite   Required to write files. Omit for dry-run.
  -Help           Show this help.
'@ | Write-Host
}

function Get-ToolkitCommit {
    try {
        $commit = & git -C $ToolkitRoot rev-parse HEAD 2>$null
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($commit)) { return $null }
        return $commit.Trim()
    }
    catch {
        return $null
    }
}

function Get-JsonProperty {
    param($Object, [string]$Name, $Default)
    if ($null -eq $Object) { return $Default }
    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) { return $Default }
    return $property.Value
}

function Convert-ToStringArray {
    param($Value)
    if ($null -eq $Value) { return @() }
    if ($Value -is [string]) {
        if ([string]::IsNullOrWhiteSpace($Value)) { return @() }
        return @($Value)
    }
    return @($Value | ForEach-Object { [string]$_ } | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

function Normalize-AgentName {
    param([string]$Name)
    $normalized = [System.IO.Path]::GetFileName($Name.Trim())
    $normalized = $normalized -replace '\.compiled\.md$', ''
    $normalized = $normalized -replace '\.md$', ''
    return $normalized
}

function Normalize-ProfileName {
    param([string]$Name)
    $normalized = [System.IO.Path]::GetFileName($Name.Trim())
    $normalized = $normalized -replace '\.md$', ''
    if ($normalized -notlike '*-profile') {
        $candidate = Join-Path $ToolkitRoot "profiles\$normalized-profile.md"
        if (Test-Path -LiteralPath $candidate) {
            $normalized = "$normalized-profile"
        }
    }
    return $normalized
}

function Normalize-SkillName {
    param([string]$Name)
    $trimmed = $Name.Trim()
    if ($trimmed -match '[\\/]') {
        throw "Invalid skill name '$Name'. Use skill folder names only."
    }
    $normalized = $trimmed -replace '\.md$', ''
    if ($normalized -notmatch '^[a-z0-9]+(-[a-z0-9]+)*$') {
        throw "Invalid skill name '$Name'. Use lowercase hyphen-case folder names only."
    }
    return $normalized
}

function Assert-SingleFileSkill {
    param([string]$SkillRoot, [string]$SkillName)
    $skillFile = Join-Path $SkillRoot 'SKILL.md'
    if (!(Test-Path -LiteralPath $skillFile)) { throw "Skill not found: $SkillName" }
    $skillFileItem = Get-Item -LiteralPath $skillFile
    $extraItems = @(Get-ChildItem -Recurse -Force -LiteralPath $SkillRoot | Where-Object { $_.FullName -ne $skillFileItem.FullName })
    if ($extraItems.Count -gt 0) {
        throw "Skill '$SkillName' includes bundled resources. Phase 6 v1 syncs single-file skills only."
    }
}

function Get-FileAction {
    param([string]$SourcePath, [string]$DestinationPath)
    if (!(Test-Path -LiteralPath $DestinationPath)) { return 'Add' }
    $sourceHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $SourcePath).Hash
    $destHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $DestinationPath).Hash
    if ($sourceHash -eq $destHash) { return 'Unchanged' }
    return 'Update'
}

function Invoke-GitOutput {
    param([string]$TargetRoot, [string[]]$Arguments)
    $output = & git -C $TargetRoot @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw ($output -join "`n")
    }
    return ($output -join "`n").Trim()
}

function Test-TargetGitSafety {
    param([string]$TargetRoot, [string]$BranchPolicy, [switch]$RefreshRemote)
    try {
        if ($BranchPolicy -ne 'no-direct-main') {
            return [pscustomobject]@{ Safe = $false; Message = "Unsupported branchPolicy '$BranchPolicy'. Confirm mode requires no-direct-main." }
        }

        $inside = Invoke-GitOutput $TargetRoot @('rev-parse', '--is-inside-work-tree')
        if ($inside -ne 'true') {
            return [pscustomobject]@{ Safe = $false; Message = 'Target is not a Git work tree.' }
        }

        $branch = Invoke-GitOutput $TargetRoot @('rev-parse', '--abbrev-ref', 'HEAD')
        if ($branch -eq 'HEAD') {
            return [pscustomobject]@{ Safe = $false; Message = 'Target repository is in detached HEAD state.' }
        }
        if ($branch -in @('main', 'master')) {
            return [pscustomobject]@{ Safe = $false; Message = "Refusing confirm mode on target branch '$branch' because branchPolicy is no-direct-main." }
        }

        $status = Invoke-GitOutput $TargetRoot @('status', '--porcelain')
        if (![string]::IsNullOrWhiteSpace($status)) {
            return [pscustomobject]@{ Safe = $false; Message = 'Target repository has dirty or uncommitted changes.' }
        }

        $upstream = Invoke-GitOutput $TargetRoot @('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}')
        if ([string]::IsNullOrWhiteSpace($upstream)) {
            return [pscustomobject]@{ Safe = $false; Message = "Target branch '$branch' is missing an upstream." }
        }
        if ($RefreshRemote) {
            Invoke-GitOutput $TargetRoot @('fetch') | Out-Null
        }

        $counts = Invoke-GitOutput $TargetRoot @('rev-list', '--left-right', '--count', 'HEAD...@{u}')
        $parts = @($counts -split '\s+')
        if ($parts.Count -lt 2) {
            return [pscustomobject]@{ Safe = $false; Message = 'Unable to compare target branch with upstream.' }
        }
        $ahead = [int]$parts[0]
        $behind = [int]$parts[1]
        if ($ahead -ne 0 -or $behind -ne 0) {
            return [pscustomobject]@{ Safe = $false; Message = "Target branch '$branch' is not aligned with upstream '$upstream' (ahead $ahead, behind $behind)." }
        }

        return [pscustomobject]@{ Safe = $true; Message = "Target branch '$branch' is clean and aligned with upstream '$upstream'." }
    }
    catch {
        return [pscustomobject]@{ Safe = $false; Message = "Target Git safety check failed: $($_.Exception.Message)" }
    }
}

function Assert-TargetGitSafety {
    param([string]$TargetRoot, [string]$BranchPolicy)
    $status = Test-TargetGitSafety $TargetRoot $BranchPolicy -RefreshRemote
    if (!$status.Safe) {
        throw $status.Message
    }
}

function Write-TargetGitSafetyStatus {
    param([string]$TargetRoot, [string]$BranchPolicy)
    $status = Test-TargetGitSafety $TargetRoot $BranchPolicy
    Write-Host "Target Git safety: $(if ($status.Safe) { 'pass' } else { 'not ready' }) - $($status.Message)"
}

function Write-CopyPlan {
    param($Plan)

    $sections = @(
        @{ Type = 'compiled-agent'; Label = 'Planned copied agents' },
        @{ Type = 'profile'; Label = 'Planned copied profiles' },
        @{ Type = 'skill'; Label = 'Planned copied skills' }
    )

    foreach ($section in $sections) {
        Write-Host "$($section.Label):"
        $items = @($Plan | Where-Object { $_.Type -eq $section.Type })
        if ($items.Count -eq 0) {
            Write-Host '  (none)'
        }
        else {
            $items | Select-Object Action, Type, Name, Destination | Format-Table -AutoSize | Out-String | Write-Host
        }
    }
}

function Resolve-Config {
    if ([string]::IsNullOrWhiteSpace($ConfigPath)) { return $null }
    $resolvedConfig = Resolve-Path -LiteralPath $ConfigPath
    return Get-Content -Raw -LiteralPath $resolvedConfig | ConvertFrom-Json
}

function New-ToolkitManifest {
    param($Plan, [string]$ToolkitVersion, [string]$ToolkitCommit)
    $assets = @($Plan | Sort-Object RelativePath | ForEach-Object {
        [ordered]@{
            type = $_.Type
            name = $_.Name
            path = ($_.RelativePath -replace '\\', '/')
            sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.Destination).Hash.ToLowerInvariant()
        }
    })

    return [ordered]@{
        schemaVersion = '1.0.0'
        toolkitVersion = $ToolkitVersion
        toolkitCommit = $ToolkitCommit
        generatedAtUtc = (Get-Date).ToUniversalTime().ToString('o')
        assets = $assets
    }
}

if ($Help) {
    Show-Help
    exit 0
}

if ([string]::IsNullOrWhiteSpace($TargetPath)) {
    Show-Help
    throw 'TargetPath is required.'
}

$targetRoot = (Resolve-Path -LiteralPath $TargetPath).Path
$config = Resolve-Config
$ToolkitVersion = Get-ToolkitVersion

$selectedAgents = @(if ($Agents.Count -gt 0) { Convert-ToStringArray $Agents } else { Convert-ToStringArray (Get-JsonProperty $config 'selectedAgents' @()) })
$selectedProfiles = @(if ($Profiles.Count -gt 0) { Convert-ToStringArray $Profiles } else { Convert-ToStringArray (Get-JsonProperty $config 'selectedProfiles' @()) })
$selectedSkills = @(if ($Skills.Count -gt 0) { Convert-ToStringArray $Skills } else { Convert-ToStringArray (Get-JsonProperty $config 'selectedSkills' @()) })

if ($selectedAgents.Count -eq 0 -and $selectedProfiles.Count -eq 0 -and $selectedSkills.Count -eq 0) {
    throw 'Select at least one compiled agent, profile, or skill through parameters or config. Broad installs are not allowed.'
}

$allowOverwrite = [bool](Get-JsonProperty $config 'allowOverwriteProjectContext' $false)
if ($allowOverwrite) {
    throw 'allowOverwriteProjectContext:true is rejected in Phase 6 v1.'
}

$branchPolicy = [string](Get-JsonProperty $config 'branchPolicy' 'no-direct-main')
$approvalMode = [string](Get-JsonProperty $config 'approvalMode' 'manual')
$projectContextPath = [string](Get-JsonProperty $config 'projectContextPath' 'docs/ai/PROJECT_CONTEXT.md')
$toolkitCommit = Get-ToolkitCommit
if ($ConfirmWrite -and [string]::IsNullOrWhiteSpace($toolkitCommit)) {
    throw 'Unable to determine toolkit Git commit. Confirm mode requires a Git checkout of the toolkit repository.'
}
$aiRoot = Join-Path $targetRoot '.ai-toolkit'
$copyPlan = @()

foreach ($agent in $selectedAgents) {
    $name = Normalize-AgentName $agent
    $source = Join-Path $ToolkitRoot "compiled-agents\$name.compiled.md"
    if (!(Test-Path -LiteralPath $source)) { throw "Compiled agent not found: $name" }
    $destination = Join-Path $aiRoot "compiled-agents\$name.compiled.md"
    $copyPlan += [pscustomobject]@{
        Type = 'compiled-agent'
        Name = $name
        Action = Get-FileAction $source $destination
        Source = $source
        Destination = $destination
        RelativePath = "compiled-agents\$name.compiled.md"
    }
}

foreach ($profileEntry in $selectedProfiles) {
    $name = Normalize-ProfileName $profileEntry
    $source = Join-Path $ToolkitRoot "profiles\$name.md"
    if (!(Test-Path -LiteralPath $source)) { throw "Profile not found: $name" }
    $destination = Join-Path $aiRoot "profiles\$name.md"
    $copyPlan += [pscustomobject]@{
        Type = 'profile'
        Name = $name
        Action = Get-FileAction $source $destination
        Source = $source
        Destination = $destination
        RelativePath = "profiles\$name.md"
    }
}

foreach ($skill in $selectedSkills) {
    $name = Normalize-SkillName $skill
    $skillRoot = Join-Path $ToolkitRoot "skills\$name"
    Assert-SingleFileSkill $skillRoot $name
    $source = Join-Path $skillRoot 'SKILL.md'
    $destination = Join-Path $aiRoot "skills\$name\SKILL.md"
    $copyPlan += [pscustomobject]@{
        Type = 'skill'
        Name = $name
        Action = Get-FileAction $source $destination
        Source = $source
        Destination = $destination
        RelativePath = "skills\$name\SKILL.md"
    }
}

Write-Host "Toolkit version: $ToolkitVersion"
Write-Host "Toolkit commit:  $toolkitCommit"
Write-Host "Target path:     $targetRoot"
Write-Host "Mode:            $(if ($ConfirmWrite) { 'confirm-write' } else { 'dry-run' })"
Write-TargetGitSafetyStatus $targetRoot $branchPolicy
Write-Host ''
Write-CopyPlan $copyPlan

if (!$ConfirmWrite) {
    Write-Host 'Dry-run only. No files were written.'
    exit 0
}

Assert-TargetGitSafety $targetRoot $branchPolicy

New-Item -ItemType Directory -Force -Path (Join-Path $aiRoot 'compiled-agents') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $aiRoot 'profiles') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $aiRoot 'skills') | Out-Null

foreach ($item in $copyPlan) {
    if ($item.Action -ne 'Unchanged') {
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $item.Destination) | Out-Null
        Copy-Item -LiteralPath $item.Source -Destination $item.Destination -Force
    }
}

$writtenConfig = [ordered]@{
    toolkitVersion = $ToolkitVersion
    toolkitCommit = $toolkitCommit
    selectedAgents = @($selectedAgents | ForEach-Object { Normalize-AgentName $_ })
    selectedProfiles = @($selectedProfiles | ForEach-Object { Normalize-ProfileName $_ })
    selectedSkills = @($selectedSkills | ForEach-Object { Normalize-SkillName $_ })
    projectContextPath = $projectContextPath
    approvalMode = $approvalMode
    branchPolicy = $branchPolicy
    allowOverwriteProjectContext = $false
}

$versionRecord = [ordered]@{
    toolkitVersion = $ToolkitVersion
    toolkitCommit = $toolkitCommit
    installedAtUtc = (Get-Date).ToUniversalTime().ToString('o')
    selectedAgents = $writtenConfig.selectedAgents
    selectedProfiles = $writtenConfig.selectedProfiles
    selectedSkills = $writtenConfig.selectedSkills
}

$versionRecord | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $aiRoot '.ai-toolkit-version')
$writtenConfig | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $aiRoot '.ai-toolkit.config.json')
New-ToolkitManifest $copyPlan $ToolkitVersion $toolkitCommit | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $aiRoot '.ai-toolkit-manifest.json')

Write-Host 'Install complete. Managed files were written only under .ai-toolkit/.'
