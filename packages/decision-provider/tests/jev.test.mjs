import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { rankSurfaceCandidates } from '../src/index.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/surface-ranking.fixture.json', import.meta.url), 'utf8'));
const key = 'offline-test-only-jev-api-key';
const labels = ['high','medium','low','unknown'];
const input = () => structuredClone(fixture.request);
function answerData() {
  return { model: 'jev-1.13.0', answers: Object.fromEntries(fixture.request.candidates.map((candidate,index) => {
    const choice = fixture.okResult.rankings[index].label;
    return ['surface_' + index, { type:'choice', choice, confidence:0.9,
      probabilities:Object.fromEntries(labels.map(label => [label,label === choice ? 0.9 : 0.1 / 3])) }];
  })), usage:{ input_tokens:250, output_tokens:135 } };
}
async function run(data=answerData(), request=input(), options={}) {
  let calls=0;
  const result=await rankSurfaceCandidates(request,{provider:'typesafe-jev',apiKey:key,
    fetchImpl:async () => { calls++; return new Response(JSON.stringify(data)); },...options});
  assert(!JSON.stringify(result).includes(key));
  return {result,calls};
}
test('Jev uses its pinned endpoint/model and named criteria over existing metadata',async () => {
  const {result,calls}=await run(answerData(),input(),{fetchImpl:async (url,options) => {
    assert.equal(url,'https://api.typesafe.ai/v1/systemone');
    assert.equal(options.redirect,'error');
    assert.equal(options.headers.Authorization,'Bearer ' + key);
    assert(!options.body.includes(key));
    const wire=JSON.parse(options.body);
    assert.equal(wire.model,'jev-1.13.0');
    assert.deepEqual(JSON.parse(wire.state),{task:fixture.request.task,candidates:fixture.request.candidates});
    assert.deepEqual(Object.keys(wire.questions),['surface_0','surface_1','surface_2']);
    for(const question of Object.values(wire.questions)) {
      assert.equal(question.type,'choice');
      assert.deepEqual(Object.keys(question.criteria),labels);
    }
    return new Response(JSON.stringify(answerData()));
  }});
  assert.equal(result.status,'ok');
  assert.equal(result.provider,'typesafe-jev');
  assert.equal(result.model,'jev-1.13.0');
  assert.deepEqual(result.rankings.map(row => row.id),fixture.request.candidates.map(row => row.id));
  assert.deepEqual(result.usage,{inputTokens:250,outputTokens:135,totalTokens:385});
  assert.equal(calls,0);
});
const invalidCases=[
  ['wrong model','invalid_response',data=>{data.model=key;}],
  ['partial answers','invalid_response',data=>{delete data.answers.surface_0;}],
  ['extra answer','invalid_response',data=>{data.answers.extra=data.answers.surface_0;}],
  ['unknown label','unknown',data=>{data.answers.surface_0.choice='unknown';data.answers.surface_0.probabilities=Object.fromEntries(labels.map(label=>[label,label==='unknown'?1:0]));}],
  ['low confidence','low_confidence',data=>{data.answers.surface_0.confidence=0.49;}],
  ['bad sum','invalid_response',data=>{data.answers.surface_0.probabilities.high=0.5;}],
  ['choice is not maximum','invalid_response',data=>{data.answers.surface_0.probabilities=Object.fromEntries(labels.map(label=>[label,label===data.answers.surface_0.choice?0.1:0.3]));}],
  ['secret in choice','invalid_response',data=>{data.answers.surface_0.choice=key;}],
  ['negative tokens','invalid_usage',data=>{data.usage.input_tokens=-1;}],
  ['unsafe token total','invalid_usage',data=>{data.usage.input_tokens=Number.MAX_SAFE_INTEGER;}]
];
for(const [name,reason,change] of invalidCases) test('Jev rejects ' + name + ' with full sanitized fallback',async () => {
  const data=answerData();change(data);
  const {result,calls}=await run(data);
  assert.equal(calls,1);assert.equal(result.status,'error');assert.equal(result.reason,reason);
  assert.deepEqual(result.rankings,[]);assert.equal(result.usage,null);
});
test('key in task or candidate metadata blocks transmission',async () => {
  for(const mutate of [request=>{request.task+=' ' + key;},request=>{request.candidates[0].evidence.push(key);},request=>{request.candidates[0].id=key;}]) {
    const request=input();mutate(request);
    const {result,calls}=await run(answerData(),request);
    assert.equal(result.reason,'credential_in_request');assert.equal(calls,0);
  }
});
test('response/debug echo and thrown key are not included in results',async () => {
  const data=answerData();data.debug=key;data.usage.debug=key;
  const success=await run(data);assert.equal(success.result.status,'ok');
  const failed=await run(data,input(),{fetchImpl:async()=>{throw new Error(key);}});
  assert.equal(failed.result.reason,'network_error');
});
test('Jev redirects and HTTP failures do not leak raw body or retry',async () => {
  for(const status of [302,401,429,500]) {
    let calls=0;
    const {result}=await run(answerData(),input(),{fetchImpl:async()=>{calls++;return new Response(key,{status});}});
    assert.equal(calls,1);assert.equal(result.reason,status===302?'redirect_rejected':'http_error');
  }
});
test('private stdin key disables environment fallback and never enters arguments/results',async () => {
  const folder=mkdtempSync(join(tmpdir(),'jev-stdin-contract-'));
  try {
    const moduleUrl=new URL('../src/index.js',import.meta.url).href;
    const script=join(folder,'client.mjs');
    writeFileSync(script,[
      'import {rankSurfaceCandidates} from ' + JSON.stringify(moduleUrl) + ';',
      'const input=' + JSON.stringify(fixture.request) + ';',
      'const data=' + JSON.stringify(answerData()) + ';',
      'let calls=0;const result=await rankSurfaceCandidates(input,{provider:"typesafe-jev",apiKeyInput:"stdin",timeoutMs:1000,fetchImpl:async(url,options)=>{',
      'calls++;if(options.headers.Authorization!=="Bearer offline-test-only-jev-api-key")throw new Error("wrong_key");',
      'if(process.argv.join(" ").includes(options.headers.Authorization.slice(7)))throw new Error("argument_key");',
      'return new Response(JSON.stringify(data));}});console.log(JSON.stringify({result,calls}));'
    ].join('\n'));
    const env={...process.env,TYPESAFE_API_KEY:'unused-offline-environment-key'};delete env.NODE_OPTIONS;
    const result=await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,[script],{env,windowsHide:true,stdio:['pipe','pipe','pipe']});
      let out='',err='';child.stdout.on('data',part=>out+=part);child.stderr.on('data',part=>err+=part);
      child.on('error',reject);child.on('close',code=>resolve({code,out,err}));child.stdin.end(key + '\n');
    });
    assert.equal(result.code,0);assert(!result.out.includes(key));assert(!result.err.includes(key));
    const parsed=JSON.parse(result.out);assert.equal(parsed.result.status,'ok');assert.equal(parsed.calls,1);
  } finally { rmSync(folder,{recursive:true,force:true}); }
});

