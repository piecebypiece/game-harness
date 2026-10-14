#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$ProjectRoot = (Get-Location).Path,
    [string]$Task,
    [ValidateSet('shadow','rerank')][string]$Mode = 'shadow',
    [switch]$Graph,
    [switch]$Status
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$jevClientProcess = $null
try {
    if (-not $IsWindows) { throw 'windows_required' }
    $jevRoot = (Resolve-Path -LiteralPath $ProjectRoot).ProviderPath
    . (Join-Path $PSScriptRoot 'windows-jev-key.ps1')
    if ($Status) {
        [pscustomobject]@{ provider='typesafe-jev'; registered=[GameHarness.JevKeyStore]::Exists($jevRoot); keyPrinted=$false } | ConvertTo-Json -Compress
        return
    }
    if ([string]::IsNullOrWhiteSpace($Task)) { throw 'task_required' }
    $jevCli = Join-Path $jevRoot 'node_modules\codewiki-tool\dist\cli.js'
    if (-not (Test-Path -LiteralPath $jevCli)) { throw 'codewiki_not_installed' }
    $jevVersion = Get-Content -LiteralPath (Join-Path $jevRoot 'node_modules\codewiki-tool\package.json') -Raw | ConvertFrom-Json
    if ($jevVersion.version -ne '0.1.11-jev.0') { throw 'compatible_codewiki_required' }
    if (-not [GameHarness.JevKeyStore]::Exists($jevRoot)) {
        Write-Output '{"status":"unavailable","reason":"missing_api_key","liveApiCalls":0}'
        exit 1
    }

    $jevStart = [Diagnostics.ProcessStartInfo]::new()
    $jevStart.FileName = (Get-Command node.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
    $jevStart.WorkingDirectory = $jevRoot
    $jevStart.UseShellExecute = $false
    $jevStart.CreateNoWindow = $true
    $jevStart.RedirectStandardInput = $true
    $jevStart.RedirectStandardOutput = $true
    $jevStart.RedirectStandardError = $true
    foreach ($jevArgument in @($jevCli,'pack','--json','--semantic-provider','typesafe-jev','--semantic-mode',$Mode,'--semantic-key-stdin')) {
        $jevStart.ArgumentList.Add($jevArgument)
    }
    if ($Graph) { $jevStart.ArgumentList.Add('--graph') }
    $jevStart.ArgumentList.Add('--')
    $jevStart.ArgumentList.Add($Task)
    $jevStart.Environment.Clear()
    foreach ($jevEnvironmentName in @('SystemRoot','WINDIR','TEMP','TMP')) {
        $jevEnvironmentValue = [Environment]::GetEnvironmentVariable($jevEnvironmentName, 'Process')
        if (-not [string]::IsNullOrEmpty($jevEnvironmentValue)) { $jevStart.Environment[$jevEnvironmentName] = $jevEnvironmentValue }
    }
    $jevGitPath = (Get-Command git.exe -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
    $jevStart.Environment['Path'] = [IO.Path]::GetDirectoryName($jevGitPath) + ';' +
        [IO.Path]::GetDirectoryName($jevStart.FileName) + ';' + (Join-Path $env:SystemRoot 'System32')
    $jevClientProcess = [Diagnostics.Process]::new()
    $jevClientProcess.StartInfo = $jevStart
    if (-not $jevClientProcess.Start()) { throw 'client_launch_failed' }
    $jevOutputTask = $jevClientProcess.StandardOutput.ReadToEndAsync()
    $jevErrorTask = $jevClientProcess.StandardError.ReadToEndAsync()
    [GameHarness.JevKeyStore]::WriteToPipe($jevRoot, $jevClientProcess.StandardInput.BaseStream)
    $jevClientProcess.StandardInput.BaseStream.Close()
    if (-not $jevClientProcess.WaitForExit(100000)) { throw 'client_timeout' }
    $jevSafeOutput = $jevOutputTask.GetAwaiter().GetResult()
    [void]$jevErrorTask.GetAwaiter().GetResult()
    $jevPack = $jevSafeOutput | ConvertFrom-Json
    if ($jevPack.schema -ne 'codewiki.pack/1' -or $jevPack.semantic.provider -ne 'typesafe-jev') { throw 'invalid_client_output' }
    Write-Output $jevSafeOutput
    if ($jevClientProcess.ExitCode -ne 0) { exit 1 }
}
catch {
    Write-Output '{"status":"error","reason":"key_or_codewiki_call_failed","rawErrorPrinted":false}'
    exit 1
}
finally {
    if ($null -ne $jevClientProcess) {
        try { if (-not $jevClientProcess.HasExited) { $jevClientProcess.Kill($true) } } catch { }
        $jevClientProcess.Dispose()
    }
}

