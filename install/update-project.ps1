param(
    [string]$TargetPath,
    [string]$ConfigPath,
    [switch]$ConfirmWrite,
    [switch]$ExportPlan,
    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$CoreScript = Join-Path $PSScriptRoot 'project-sync-core.mjs'
$arguments = @($CoreScript, 'update')

if ($Help) { $arguments += '--help' }
if (![string]::IsNullOrWhiteSpace($TargetPath)) { $arguments += @('--target', $TargetPath) }
if (![string]::IsNullOrWhiteSpace($ConfigPath)) { $arguments += @('--config', $ConfigPath) }
if ($ConfirmWrite) { $arguments += '--confirm-write' }
if ($ExportPlan) { $arguments += '--export-plan' }

& node @arguments
exit $LASTEXITCODE
