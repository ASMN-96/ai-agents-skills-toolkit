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

$CoreScript = Join-Path $PSScriptRoot 'project-sync-core.mjs'
$arguments = @($CoreScript, 'install')

if ($Help) { $arguments += '--help' }
if (![string]::IsNullOrWhiteSpace($TargetPath)) { $arguments += @('--target', $TargetPath) }
if (![string]::IsNullOrWhiteSpace($ConfigPath)) { $arguments += @('--config', $ConfigPath) }
if ($Agents.Count -gt 0) { $arguments += @('--agents', ($Agents -join ',')) }
if ($Profiles.Count -gt 0) { $arguments += @('--profiles', ($Profiles -join ',')) }
if ($Skills.Count -gt 0) { $arguments += @('--skills', ($Skills -join ',')) }
if ($ConfirmWrite) { $arguments += '--confirm-write' }

& node @arguments
exit $LASTEXITCODE
