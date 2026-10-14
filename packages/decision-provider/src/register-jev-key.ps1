#requires -Version 7.0
[CmdletBinding()]
param([string]$ProjectRoot = (Get-Location).Path)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$jevSecureInput = $null
try {
    if (-not $IsWindows) { throw 'Windows에서 실행해야 합니다.' }
    $jevRoot = (Resolve-Path -LiteralPath $ProjectRoot).ProviderPath
    if (-not (Test-Path -LiteralPath (Join-Path $jevRoot 'node_modules\codewiki-tool\dist\cli.js'))) {
        throw 'CodeWiki가 설치된 프로젝트에서 실행해야 합니다.'
    }
    . (Join-Path $PSScriptRoot 'windows-jev-key.ps1')
    Write-Host ('키를 사용할 프로젝트: ' + $jevRoot)
    Write-Host '키는 Windows 사용자 계정에 묶어 암호화 보관합니다. 채팅·환경변수·프로젝트 파일에 기록하지 않습니다.'
    $jevSecureInput = Read-Host 'TypeSafe API 키' -AsSecureString
    [GameHarness.JevKeyStore]::Save($jevRoot, $jevSecureInput)
    Write-Output '{"status":"registered","provider":"typesafe-jev","keyStore":"Windows DPAPI CurrentUser","keyPrinted":false}'
}
catch {
    Write-Output '{"status":"error","reason":"key_registration_failed","keyPrinted":false}'
    exit 1
}
finally { if ($null -ne $jevSecureInput) { $jevSecureInput.Dispose() } }

