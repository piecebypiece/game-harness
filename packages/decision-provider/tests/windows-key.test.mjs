import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync,mkdirSync,writeFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

test('Windows DPAPI-to-CodeWiki pipe hides key from environment, arguments, stdout and stderr',{skip:process.platform!=='win32'},()=>{
  const root=mkdtempSync(join(tmpdir(),'jev-vault-contract-'));
  const helper=fileURLToPath(new URL('../src/windows-jev-key.ps1',import.meta.url));
  const invoke=fileURLToPath(new URL('../src/invoke-codewiki-jev.ps1',import.meta.url));
  const marker='offline-vault-test-only-key';
  try {
    mkdirSync(join(root,'node_modules','codewiki-tool','dist'),{recursive:true});
    writeFileSync(join(root,'node_modules','codewiki-tool','package.json'),JSON.stringify({version:'0.1.11-jev.0',type:'module'}));
    writeFileSync(join(root,'node_modules','codewiki-tool','dist','cli.js'),[
      'let key="";for await(const chunk of process.stdin)key+=chunk;key=key.trimEnd();',
      'const checks={pipeMatches:key==="offline-vault-test-only-key",noKeyEnvironment:!Object.hasOwn(process.env,"TYPESAFE_API_KEY"),noKeyArgument:!process.argv.join(" ").includes(key),noNodePreload:!Object.hasOwn(process.env,"NODE_OPTIONS"),taskProtected:process.argv.at(-1)==="--eval-dir \\"quoted\\" 한글"};',
      'process.stderr.write(key);console.log(JSON.stringify({schema:"codewiki.pack/1",semantic:{provider:"typesafe-jev",status:"ok"},checks}));',
      'if(!Object.values(checks).every(Boolean))process.exitCode=1;'
    ].join('\n'));
    const quoted=value=> "'" + value.replaceAll("'","''") + "'";
    const source=[
      '$ErrorActionPreference="Stop"',
      '. ' + quoted(helper),
      '$testRoot=' + quoted(root),
      'if([GameHarness.JevKeyStore]::Exists($testRoot)){throw "unexpected_existing_test_credential"}',
      '$testStored=$false',
      'try {',
      ' $key=ConvertTo-SecureString ' + quoted(marker) + ' -AsPlainText -Force',
      ' try {[GameHarness.JevKeyStore]::Save($testRoot,$key);$testStored=$true}finally{$key.Dispose()}',
      ' $blobPath=Join-Path ([Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)) ("GameHarness\\Keys\\typesafe-jev-"+[GameHarness.JevKeyStore]::Target($testRoot)+".dpapi")',
      ' $blob=[IO.File]::ReadAllBytes($blobPath)',
      ' if([Text.Encoding]::Unicode.GetString($blob).Contains("offline-vault-test-only-key") -or [Text.Encoding]::UTF8.GetString($blob).Contains("offline-vault-test-only-key")){throw "plaintext_storage"}',
      ' [Environment]::SetEnvironmentVariable("TYPESAFE_API_KEY","unused-offline-environment-key","Process")',
      ' [Environment]::SetEnvironmentVariable("NODE_OPTIONS","--not-a-valid-node-option","Process")',
      ' $reply=& ' + quoted(invoke) + ' -ProjectRoot $testRoot -Task ' + quoted('--eval-dir "quoted" 한글'),
      ' Write-Output $reply',
      '}finally{if($testStored){[GameHarness.JevKeyStore]::Remove($testRoot)}}'
    ].join('\n');
    const script=join(root,'test.ps1');writeFileSync(script,source);
    const env={...process.env};delete env.NODE_OPTIONS;
    const result=spawnSync('pwsh.exe',['-NoProfile','-File',script],{encoding:'utf8',windowsHide:true,env,timeout:20000});
    assert.equal(result.status,0,'native key transport failed: ' + (result.stderr + result.stdout).replaceAll(marker,'[SYNTHETIC_TOKEN]').slice(0,1200));
    assert(!result.stdout.includes(marker));assert(!result.stderr.includes(marker));
    const reply=JSON.parse(result.stdout.trim());
    assert.equal(reply.schema,'codewiki.pack/1');assert(Object.values(reply.checks).every(Boolean));
  } finally { rmSync(root,{recursive:true,force:true}); }
});

