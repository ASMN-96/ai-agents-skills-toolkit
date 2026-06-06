param(
    [string]$TargetPath,
    [switch]$Help
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$CoreScript = Join-Path $PSScriptRoot 'project-sync-core.mjs'
$arguments = @($CoreScript, 'validate')

if ($Help) { $arguments += '--help' }
if (![string]::IsNullOrWhiteSpace($TargetPath)) { $arguments += @('--target', $TargetPath) }

& node @arguments
exit $LASTEXITCODE
