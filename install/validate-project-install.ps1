param(
    [string]$TargetPath,
    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Show-Help {
    @'
AI Agent Skills Toolkit project install validator

Usage:
  pwsh -NoProfile -File install/validate-project-install.ps1 -TargetPath <repo>

Parameters:
  -TargetPath     Target project repository path to validate.
  -Help           Show this help.
'@ | Write-Host
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
    if ($normalized -notlike '*-profile') { $normalized = "$normalized-profile" }
    return $normalized
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
$aiRoot = Join-Path $targetRoot '.ai-toolkit'
$versionPath = Join-Path $aiRoot '.ai-toolkit-version'
$configPath = Join-Path $aiRoot '.ai-toolkit.config.json'
$failures = @()

if (!(Test-Path -LiteralPath $aiRoot)) { $failures += 'Missing .ai-toolkit/ directory.' }
if (!(Test-Path -LiteralPath $versionPath)) { $failures += 'Missing .ai-toolkit/.ai-toolkit-version.' }
if (!(Test-Path -LiteralPath $configPath)) { $failures += 'Missing .ai-toolkit/.ai-toolkit.config.json.' }

if ($failures.Count -eq 0) {
    $versionRecord = Get-Content -Raw -LiteralPath $versionPath | ConvertFrom-Json
    $config = Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json
    $recordedToolkitVersion = [string](Get-JsonProperty -Object $versionRecord -Name 'toolkitVersion' -Default '')
    $recordedToolkitCommit = [string](Get-JsonProperty -Object $versionRecord -Name 'toolkitCommit' -Default '')
    $selectedAgents = Convert-ToStringArray (Get-JsonProperty -Object $config -Name 'selectedAgents' -Default @())
    $selectedProfiles = Convert-ToStringArray (Get-JsonProperty -Object $config -Name 'selectedProfiles' -Default @())
    $allowOverwrite = [bool](Get-JsonProperty -Object $config -Name 'allowOverwriteProjectContext' -Default $false)

    if ([string]::IsNullOrWhiteSpace($recordedToolkitVersion)) {
        $failures += 'Missing toolkitVersion in .ai-toolkit/.ai-toolkit-version.'
    }
    if ([string]::IsNullOrWhiteSpace($recordedToolkitCommit) -or $recordedToolkitCommit -eq 'unknown') {
        $failures += 'Missing resolved toolkitCommit in .ai-toolkit/.ai-toolkit-version.'
    }

    if ($allowOverwrite) {
        $failures += 'Config has allowOverwriteProjectContext:true, which is rejected in Phase 5 v1.'
    }

    foreach ($agent in $selectedAgents) {
        $name = Normalize-AgentName $agent
        $path = Join-Path $aiRoot "compiled-agents\$name.compiled.md"
        if (!(Test-Path -LiteralPath $path)) { $failures += "Missing compiled agent: $name" }
    }

    foreach ($profile in $selectedProfiles) {
        $name = Normalize-ProfileName $profile
        $path = Join-Path $aiRoot "profiles\$name.md"
        if (!(Test-Path -LiteralPath $path)) { $failures += "Missing profile: $name" }
    }

    $contextNames = @('AGENTS.md', 'STATE.md', 'DECISIONS.md', 'PROJECT_CONTEXT.md', 'RELEASE_GATES.md')
    $managedContextFiles = @(Get-ChildItem -Recurse -Force -File -LiteralPath $aiRoot | Where-Object { $contextNames -contains $_.Name })
    if ($managedContextFiles.Count -gt 0) {
        $failures += 'Project-local context files were found inside .ai-toolkit managed files.'
    }

    $unsafeFilePatterns = @('.env', '.env.*', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'npm-shrinkwrap.json', '*.log')
    foreach ($pattern in $unsafeFilePatterns) {
        $matches = @(Get-ChildItem -Recurse -Force -File -LiteralPath $aiRoot -Filter $pattern)
        foreach ($match in $matches) {
            $failures += "Unsafe artifact found: $($match.FullName)"
        }
    }

    $unsafeDirectories = @('node_modules', '.cache', 'dist', 'build', 'temp', 'scratch')
    $directories = @(Get-ChildItem -Recurse -Force -Directory -LiteralPath $aiRoot | Where-Object { $unsafeDirectories -contains $_.Name })
    foreach ($directory in $directories) {
        $failures += "Unsafe directory found: $($directory.FullName)"
    }
}

if ($failures.Count -gt 0) {
    Write-Host 'Validation failed:'
    $failures | ForEach-Object { Write-Host "- $_" }
    exit 1
}

Write-Host 'Validation passed. Installed toolkit files are present and no unsafe .ai-toolkit artifacts were found.'
