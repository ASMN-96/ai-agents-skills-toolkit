param(
    [string]$TargetPath,
    [string[]]$Agents = @(),
    [string[]]$Profiles = @(),
    [string]$ConfigPath,
    [switch]$ConfirmWrite,
    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ToolkitVersion = '0.5.0-draft'
$ToolkitRoot = Split-Path -Parent $PSScriptRoot

function Show-Help {
    @'
AI Agent Skills Toolkit project installer

Usage:
  pwsh -NoProfile -File install/install-project.ps1 -TargetPath <repo> -Agents <names> -Profiles <names>
  pwsh -NoProfile -File install/install-project.ps1 -TargetPath <repo> -ConfigPath templates/.ai-toolkit.config.example.json

Default behavior is dry-run. Add -ConfirmWrite to copy selected files into the target .ai-toolkit/ directory.

Parameters:
  -TargetPath     Target project repository path.
  -Agents         Agent names without extension, for example reviewer-agent,security-agent.
  -Profiles       Profile names without extension, for example audit-profile.
  -ConfigPath     Optional JSON config with selectedAgents and selectedProfiles.
  -ConfirmWrite   Required to write files. Omit for dry-run.
  -Help           Show this help.
'@ | Write-Host
}

function Get-ToolkitCommit {
    try {
        return (& git -C $ToolkitRoot rev-parse HEAD 2>$null).Trim()
    }
    catch {
        return 'unknown'
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

function Get-FileAction {
    param([string]$SourcePath, [string]$DestinationPath)
    if (!(Test-Path -LiteralPath $DestinationPath)) { return 'Add' }
    $sourceHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $SourcePath).Hash
    $destHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $DestinationPath).Hash
    if ($sourceHash -eq $destHash) { return 'Unchanged' }
    return 'Update'
}

function Assert-TargetBranchPolicy {
    param([string]$TargetRoot, [string]$BranchPolicy)
    if ($BranchPolicy -ne 'no-direct-main') { return }
    try {
        $branch = (& git -C $TargetRoot rev-parse --abbrev-ref HEAD 2>$null).Trim()
    }
    catch {
        throw 'Confirm mode with branchPolicy=no-direct-main requires the target to be a Git repository with a detectable branch.'
    }
    if ($branch -in @('main', 'master')) {
        throw "Refusing confirm mode on target branch '$branch' because branchPolicy is no-direct-main."
    }
}

function Resolve-Config {
    if ([string]::IsNullOrWhiteSpace($ConfigPath)) { return $null }
    $resolvedConfig = Resolve-Path -LiteralPath $ConfigPath
    return Get-Content -Raw -LiteralPath $resolvedConfig | ConvertFrom-Json
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

$selectedAgents = if ($Agents.Count -gt 0) { Convert-ToStringArray $Agents } else { Convert-ToStringArray (Get-JsonProperty $config 'selectedAgents' @()) }
$selectedProfiles = if ($Profiles.Count -gt 0) { Convert-ToStringArray $Profiles } else { Convert-ToStringArray (Get-JsonProperty $config 'selectedProfiles' @()) }

if ($selectedAgents.Count -eq 0 -and $selectedProfiles.Count -eq 0) {
    throw 'Select at least one compiled agent or profile through parameters or config. Broad installs are not allowed.'
}

$allowOverwrite = [bool](Get-JsonProperty $config 'allowOverwriteProjectContext' $false)
if ($allowOverwrite) {
    throw 'allowOverwriteProjectContext:true is rejected in Phase 5 v1.'
}

$branchPolicy = [string](Get-JsonProperty $config 'branchPolicy' 'no-direct-main')
$approvalMode = [string](Get-JsonProperty $config 'approvalMode' 'manual')
$projectContextPath = [string](Get-JsonProperty $config 'projectContextPath' 'docs/ai/PROJECT_CONTEXT.md')
$toolkitCommit = Get-ToolkitCommit
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
    }
}

foreach ($profile in $selectedProfiles) {
    $name = Normalize-ProfileName $profile
    $source = Join-Path $ToolkitRoot "profiles\$name.md"
    if (!(Test-Path -LiteralPath $source)) { throw "Profile not found: $name" }
    $destination = Join-Path $aiRoot "profiles\$name.md"
    $copyPlan += [pscustomobject]@{
        Type = 'profile'
        Name = $name
        Action = Get-FileAction $source $destination
        Source = $source
        Destination = $destination
    }
}

Write-Host "Toolkit version: $ToolkitVersion"
Write-Host "Toolkit commit:  $toolkitCommit"
Write-Host "Target path:     $targetRoot"
Write-Host "Mode:            $(if ($ConfirmWrite) { 'confirm-write' } else { 'dry-run' })"
Write-Host ''
$copyPlan | Select-Object Action, Type, Name, Destination | Format-Table -AutoSize | Out-String | Write-Host

if (!$ConfirmWrite) {
    Write-Host 'Dry-run only. No files were written.'
    exit 0
}

Assert-TargetBranchPolicy $targetRoot $branchPolicy

New-Item -ItemType Directory -Force -Path (Join-Path $aiRoot 'compiled-agents') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $aiRoot 'profiles') | Out-Null

foreach ($item in $copyPlan) {
    if ($item.Action -ne 'Unchanged') {
        Copy-Item -LiteralPath $item.Source -Destination $item.Destination -Force
    }
}

$writtenConfig = [ordered]@{
    toolkitVersion = $ToolkitVersion
    toolkitCommit = $toolkitCommit
    selectedAgents = @($selectedAgents | ForEach-Object { Normalize-AgentName $_ })
    selectedProfiles = @($selectedProfiles | ForEach-Object { Normalize-ProfileName $_ })
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
}

$versionRecord | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $aiRoot '.ai-toolkit-version')
$writtenConfig | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $aiRoot '.ai-toolkit.config.json')

Write-Host 'Install complete. Managed files were written only under .ai-toolkit/.'
