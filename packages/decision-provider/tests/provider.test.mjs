import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { rankSurfaceCandidates } from '../src/index.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/surface-ranking.fixture.json', import.meta.url), 'utf8'));
const request = () => structuredClone(fixture.request);
const fakeKey = 'test-only-key';
const pending = () => new Promise(() => {});
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const labels = ['high', 'medium', 'low', 'unknown'];

function responseData(input = fixture.request) {
  return {
    model: 'gpt-6-luna',
    answers: input.candidates.map((candidate, index) => {
      const choice = fixture.okResult.rankings[index]?.label ?? 'high';
      return {
        name: `surface_${index}`, type: 'choice', choice, confidence: 0.9,
        probabilities: labels.map(value => ({ value, probability: value === choice ? 0.9 : 0.1 / 3 }))
      };
    }),
    usage: { input_tokens: 250, output_tokens: 0, total_tokens: 250,
      input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 }, output_tokens_details: { reasoning_tokens: 0 } }
  };
}

const jsonResponse = data => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
async function run(data = responseData(), input = request(), options = {}) {
  let calls = 0;
  const result = await rankSurfaceCandidates(input, {
    apiKey: fakeKey, fetchImpl: async () => { calls++; return jsonResponse(data); }, ...options
  });
  return { result, calls };
}
function failed(result, reason) {
  assert.notEqual(result.status, 'ok');
  assert.equal(result.reason, reason);
  assert.deepEqual(result.rankings, []);
  assert.equal(result.usage, null);
  assert.equal(result.schema, 'game-harness.surface-ranking.result/1');
  assert.equal(result.provider, 'openai-decisions');
  assert.equal(result.model, 'gpt-6-luna');
  assert.ok(Number.isFinite(result.elapsedMs) && result.elapsedMs >= 0);
}

test('public fixture round trip maps named answers back to all original IDs in request order', async () => {
  const data = responseData();
  data.answers.reverse();
  const original = request();
  const { result, calls } = await run(data, original);
  assert.deepEqual({ ...result, elapsedMs: 1 }, fixture.okResult);
  assert.deepEqual(original, fixture.request);
  assert.equal(calls, 1);
});

test('wire request is fixed endpoint/model, metadata-only input and unique choice questions', async () => {
  let calls = 0;
  const result = await rankSurfaceCandidates(request(), { apiKey: fakeKey, fetchImpl: async (url, init) => {
    calls++;
    assert.equal(url, 'https://api.openai.com/v1/decisions');
    assert.equal(init.method, 'POST');
    assert.equal(init.redirect, 'error');
    assert.equal(init.headers.Authorization, `Bearer ${fakeKey}`);
    assert.equal(init.headers['Content-Type'], 'application/json');
    assert.ok(init.signal instanceof AbortSignal);
    const body = JSON.parse(init.body);
    assert.equal(body.model, 'gpt-6-luna');
    assert.deepEqual(JSON.parse(body.input), { task: fixture.request.task, candidates: fixture.request.candidates });
    assert.equal(body.questions.length, 3);
    assert.equal(new Set(body.questions.map(question => question.name)).size, 3);
    for (const [index, question] of body.questions.entries()) {
      assert.equal(question.name, `surface_${index}`);
      assert.equal(question.type, 'choice');
      assert.ok(question.instructions.includes(`candidates[${index}]`));
      assert.deepEqual(question.choices, labels.map(value => ({ value })));
    }
    assert.ok(Buffer.byteLength(init.body) <= 64 * 1024);
    return jsonResponse(responseData());
  } });
  assert.equal(result.status, 'ok');
  assert.equal(calls, 1);
});

for (const provider of ['subscription-responses', 'chatgpt-subscription', 'other', '']) {
  test(`unsupported provider '${provider}' is unavailable with no authentication/network fallback`, async () => {
    const { result, calls } = await run(undefined, request(), { provider });
    failed(result, 'unsupported_provider');
    assert.equal(result.status, 'unavailable');
    assert.equal(calls, 0);
  });
}

test('missing key makes zero network calls even when environment has a key', async () => {
  const { result, calls } = await run(undefined, request(), { apiKey: '' });
  failed(result, 'missing_api_key');
  assert.equal(result.status, 'unavailable');
  assert.equal(calls, 0);
});

test('only OPENAI_API_KEY is read as the implicit credential', async () => {
  const script = `import { rankSurfaceCandidates } from ${JSON.stringify(new URL('../src/index.js', import.meta.url).href)};
    const result = await rankSurfaceCandidates(${JSON.stringify(fixture.request)}, {
      fetchImpl: async (url, init) => {
        if (init.headers.Authorization !== 'Bearer test-env-key') process.exit(2);
        return new Response(${JSON.stringify(JSON.stringify(responseData()))});
      }
    });
    process.exit(result.status === 'ok' ? 0 : 3);`;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    env: { ...process.env, OPENAI_API_KEY: 'test-env-key' }, timeout: 3000, encoding: 'utf8'
  });
  assert.equal(child.status, 0, child.stderr);
});

test('absence of the env key is unavailable and makes zero network calls', () => {
  const script = `import { rankSurfaceCandidates } from ${JSON.stringify(new URL('../src/index.js', import.meta.url).href)};
    let calls = 0;
    const result = await rankSurfaceCandidates(${JSON.stringify(fixture.request)}, { fetchImpl: async () => { calls++; } });
    process.exit(result.status === 'unavailable' && result.reason === 'missing_api_key' && calls === 0 ? 0 : 1);`;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    env: { ...process.env, OPENAI_API_KEY: '' }, timeout: 3000, encoding: 'utf8'
  });
  assert.equal(child.status, 0, child.stderr);
});

test('empty candidate request succeeds locally with zero usage/network', async () => {
  const { result, calls } = await run(undefined, { ...request(), candidates: [] });
  assert.equal(result.status, 'ok');
  assert.deepEqual(result.rankings, []);
  assert.deepEqual(result.usage, { inputTokens: 0, outputTokens: 0, totalTokens: 0 });
  assert.equal(calls, 0);
});

test('maximum 128 candidates is accepted with one bounded request', async () => {
  const input = { ...request(), candidates: Array.from({ length: 128 }, (_, i) => ({
    id: `D:${i}`, path: `${i}.md`, summary: '', evidence: [], protected: i === 0
  })) };
  const { result, calls } = await run(responseData(input), input);
  assert.equal(result.status, 'ok');
  assert.equal(result.rankings.length, 128);
  assert.equal(calls, 1);
});

const invalidRequests = [
  ['null request', () => null],
  ['human approval schema', () => ({ ...request(), schema: 'game-harness.decision-request.v1' })],
  ['unknown request property', () => ({ ...request(), extra: 'secret' })],
  ['missing task', () => { const value = request(); delete value.task; return value; }],
  ['task is not a string', () => ({ ...request(), task: 42 })],
  ['candidates is not an array', () => ({ ...request(), candidates: {} })],
  ['129 candidates', () => ({ ...request(), candidates: Array.from({ length: 129 }, (_, i) => ({ ...request().candidates[0], id: `${i}` })) })],
  ['duplicate IDs', () => { const value = request(); value.candidates[1].id = value.candidates[0].id; return value; }],
  ['candidate unknown property', () => { const value = request(); value.candidates[0].extra = true; return value; }],
  ['candidate missing protected', () => { const value = request(); delete value.candidates[0].protected; return value; }],
  ['candidate invalid evidence', () => { const value = request(); value.candidates[0].evidence = [42]; return value; }],
  ['candidate invalid path', () => { const value = request(); value.candidates[0].path = null; return value; }],
  ['sparse candidate array', () => { const value = request(); delete value.candidates[1]; return value; }]
];
for (const [name, make] of invalidRequests) {
  test(`rejects ${name} before network`, async () => {
    const { result, calls } = await run(undefined, make());
    failed(result, 'invalid_request');
    assert.equal(calls, 0);
  });
}

for (const [name, options] of [
  ['long timeout', { timeoutMs: 10001 }], ['zero timeout', { timeoutMs: 0 }],
  ['nonfinite timeout', { timeoutMs: Infinity }], ['negative threshold', { minConfidence: -1 }],
  ['high threshold', { minConfidence: 1.1 }], ['NaN threshold', { minConfidence: NaN }],
  ['non-string key', { apiKey: 42 }], ['header newline key', { apiKey: 'a\r\nb' }],
  ['non-function fetch', { fetchImpl: 42 }], ['endpoint override', { endpoint: 'https://example.invalid' }]
]) {
  test(`rejects ${name} without network`, async () => {
    const { result, calls } = await run(undefined, request(), options);
    failed(result, 'invalid_options');
    assert.equal(calls, 0);
  });
}

test('request getters and toJSON are not executed or transmitted', async () => {
  let invoked = 0;
  const input = request();
  Object.defineProperty(input, 'task', { get() { invoked++; return 'private'; } });
  const { result, calls } = await run(undefined, input);
  failed(result, 'invalid_request');
  assert.equal(invoked, 0);
  assert.equal(calls, 0);
  const arrayInput = request();
  Object.defineProperty(arrayInput.candidates, 0, { get() { invoked++; return 'private'; } });
  failed((await run(undefined, arrayInput)).result, 'invalid_request');
  assert.equal(invoked, 0);
  const jsonInput = request();
  jsonInput.toJSON = () => { invoked++; return 'private'; };
  failed((await run(undefined, jsonInput)).result, 'invalid_request');
  assert.equal(invoked, 0);
});

test('UTF-8 Korean and JSON escaping contribute to request byte limit', async () => {
  for (const task of ['가'.repeat(24000), '"'.repeat(35000)]) {
    const { result, calls } = await run(undefined, { ...request(), task });
    failed(result, 'request_too_large');
    assert.equal(calls, 0);
  }
});

test('wire envelope is bounded too even when supplied metadata fits 64KiB', async () => {
  const input = { ...request(), task: 'x'.repeat(65000) };
  assert.ok(Buffer.byteLength(JSON.stringify(input)) < 65536);
  const { result, calls } = await run(undefined, input);
  failed(result, 'request_too_large');
  assert.equal(calls, 0);
});

const invalidAnswers = [
  ['partial', data => data.answers.pop(), 'invalid_response'],
  ['extra answer', data => data.answers.push(data.answers[0]), 'invalid_response'],
  ['duplicate name', data => { data.answers[1].name = data.answers[0].name; }, 'invalid_response'],
  ['foreign name', data => { data.answers[1].name = 'foreign'; }, 'invalid_response'],
  ['null name', data => { data.answers[1].name = null; }, 'invalid_response'],
  ['refusal', data => { data.answers[1] = { name: 'surface_1', type: 'refusal' }; }, 'refusal'],
  ['unknown choice', data => { data.answers[1].choice = 'unknown'; }, 'unknown'],
  ['foreign choice', data => { data.answers[1].choice = 'critical'; }, 'invalid_response'],
  ['wrong answer type', data => { data.answers[1].type = 'predicate'; }, 'invalid_response'],
  ['low confidence', data => { data.answers[1].confidence = 0.49; }, 'low_confidence'],
  ['negative confidence', data => { data.answers[1].confidence = -0.01; }, 'invalid_response'],
  ['confidence > 1', data => { data.answers[1].confidence = 1.01; }, 'invalid_response'],
  ['confidence wrong type', data => { data.answers[1].confidence = '0.9'; }, 'invalid_response'],
  ['missing probabilities', data => { delete data.answers[1].probabilities; }, 'invalid_response'],
  ['partial probabilities', data => data.answers[1].probabilities.pop(), 'invalid_response'],
  ['duplicate probability choice', data => { data.answers[1].probabilities[1].value = data.answers[1].probabilities[0].value; }, 'invalid_response'],
  ['invalid probability', data => { data.answers[1].probabilities[1].probability = -1; }, 'invalid_response'],
  ['invalid probability sum', data => { data.answers[1].probabilities[1].probability = 0.5; }, 'invalid_response'],
  ['model drift', data => { data.model = 'different-model'; }, 'invalid_response']
];
for (const [name, mutate, reason] of invalidAnswers) {
  test(`entire fallback for ${name} including protected candidates`, async () => {
    const data = responseData();
    mutate(data);
    const { result, calls } = await run(data);
    failed(result, reason);
    assert.equal(calls, 1);
  });
}

for (const [name, mutate] of [
  ['missing usage', data => { delete data.usage; }],
  ['negative tokens', data => { data.usage.input_tokens = -1; }],
  ['fractional tokens', data => { data.usage.input_tokens = 1.5; }],
  ['unsafe tokens', data => { data.usage.input_tokens = Number.MAX_SAFE_INTEGER + 1; }],
  ['inconsistent token total', data => { data.usage.total_tokens++; }],
  ['missing usage details', data => { delete data.usage.input_tokens_details; }],
  ['cache tokens exceed input', data => { data.usage.input_tokens_details.cached_tokens = 251; }],
  ['negative cache-write tokens', data => { data.usage.input_tokens_details.cache_write_tokens = -1; }],
  ['reasoning tokens exceed output', data => { data.usage.output_tokens_details.reasoning_tokens = 1; }]
]) {
  test(`entire fallback for ${name}`, async () => {
    const data = responseData();
    mutate(data);
    failed((await run(data)).result, 'invalid_usage');
  });
}

test('finite confidence threshold is inclusive and configurable', async () => {
  const data = responseData();
  data.answers[0].confidence = 0.5;
  assert.equal((await run(data)).result.status, 'ok');
  failed((await run(data, request(), { minConfidence: 0.8 })).result, 'low_confidence');
});

test('overflow JSON number is rejected even in a nested response extension', async () => {
  const text = JSON.stringify(responseData()).replace('"confidence":0.9', '"confidence":1e400');
  failed(await rankSurfaceCandidates(request(), { apiKey: fakeKey, fetchImpl: async () => new Response(text) }), 'invalid_response');
  const extended = JSON.stringify({ ...responseData(), extension: { number: 1 } }).replace('"number":1', '"number":1e400');
  failed(await rankSurfaceCandidates(request(), { apiKey: fakeKey, fetchImpl: async () => new Response(extended) }), 'invalid_response');
});

test('malformed JSON and invalid UTF-8 are sanitized', async () => {
  for (const body of ['private response fragment {', new Uint8Array([0xff])]) {
    failed(await rankSurfaceCandidates(request(), { apiKey: fakeKey, fetchImpl: async () => new Response(body) }), 'invalid_response');
  }
});

for (const status of [400, 401, 403, 429, 500]) {
  test(`HTTP ${status} has one attempt, no body exposure and no retry`, async () => {
    let calls = 0;
    let cancelled = 0;
    const result = await rankSurfaceCandidates(request(), { apiKey: fakeKey, fetchImpl: async () => {
      calls++;
      return new Response(new ReadableStream({ cancel() { cancelled++; } }), { status });
    } });
    failed(result, 'http_error');
    assert.equal(calls, 1);
    assert.equal(cancelled, 1);
  });
}

test('redirect response is rejected and cancelled', async () => {
  let cancelled = 0;
  const result = await rankSurfaceCandidates(request(), { apiKey: fakeKey, fetchImpl: async () =>
    new Response(new ReadableStream({ cancel() { cancelled++; } }), { status: 302 }) });
  failed(result, 'redirect_rejected');
  assert.equal(cancelled, 1);
});

test('fetch exception is sanitized and makes only one attempt', async () => {
  let calls = 0;
  const result = await rankSurfaceCandidates(request(), { apiKey: fakeKey, fetchImpl: async () => {
    calls++;
    throw new Error('private headers input response test-only-key');
  } });
  failed(result, 'network_error');
  assert.equal(calls, 1);
  assert.ok(!JSON.stringify(result).includes(fakeKey));
});

test('response content-length cap cancels body before reading', async () => {
  let reads = 0;
  let cancelled = 0;
  const result = await rankSurfaceCandidates(request(), { apiKey: fakeKey, fetchImpl: async () => ({
    ok: true, status: 200, headers: new Headers({ 'Content-Length': '262145' }),
    body: { cancel() { cancelled++; }, getReader() { reads++; throw new Error(); } }
  }) });
  failed(result, 'response_too_large');
  assert.equal(reads, 0);
  assert.equal(cancelled, 1);
});

test('stream byte cap does not trust absent or understated content-length and releases reader', async () => {
  for (const length of [undefined, '1']) {
    let cancelled = 0;
    const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(262145)); }, cancel() { cancelled++; } });
    const result = await rankSurfaceCandidates(request(), { apiKey: fakeKey, fetchImpl: async () =>
      new Response(stream, { headers: length ? { 'Content-Length': length } : {} }) });
    failed(result, 'response_too_large');
    assert.equal(stream.locked, false);
    assert.equal(cancelled, 1);
  }
});

test('split UTF-8 chunks are decoded incrementally and successful stream lock is released', async () => {
  const input = request();
  input.candidates[0].id = '문서';
  const data = responseData(input);
  data.extra = '한글';
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  const stream = new ReadableStream({ start(controller) {
    for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
    controller.close();
  } });
  const result = await rankSurfaceCandidates(input, { apiKey: fakeKey, fetchImpl: async () => new Response(stream) });
  assert.equal(result.status, 'ok');
  assert.equal(result.rankings[0].id, '문서');
  assert.equal(stream.locked, false);
});

test('deadline returns when fetch ignores AbortSignal forever, aborts signal, and does not retry', async () => {
  let calls = 0;
  let signal;
  const start = performance.now();
  const result = await rankSurfaceCandidates(request(), { apiKey: fakeKey, timeoutMs: 25, fetchImpl: (url, init) => {
    calls++; signal = init.signal; return pending();
  } });
  failed(result, 'timeout');
  assert.equal(calls, 1);
  assert.equal(signal.aborted, true);
  assert.ok(performance.now() - start < 1000);
});

test('late fetch response after timeout is discarded without reading or unhandled rejection', async () => {
  let complete;
  let cancelled = 0;
  let reads = 0;
  const result = await rankSurfaceCandidates(request(), { apiKey: fakeKey, timeoutMs: 20,
    fetchImpl: () => new Promise(resolve => { complete = resolve; }) });
  failed(result, 'timeout');
  complete({ ok: true, body: { cancel() { cancelled++; return Promise.reject(new Error('private')); }, getReader() { reads++; } } });
  await pause(10);
  assert.equal(cancelled, 1);
  assert.equal(reads, 0);
});

test('body deadline releases stream lock even when read and cancel never resolve', async () => {
  let cancelled = 0;
  let released = 0;
  let signal;
  const result = await rankSurfaceCandidates(request(), { apiKey: fakeKey, timeoutMs: 25, fetchImpl: async (url, init) => {
    signal = init.signal;
    return { ok: true, status: 200, headers: new Headers(), body: {
      getReader: () => ({ read: pending, cancel() { cancelled++; return pending(); }, releaseLock() { released++; } })
    } };
  } });
  failed(result, 'timeout');
  assert.equal(signal.aborted, true);
  assert.equal(cancelled, 1);
  assert.equal(released, 1);
});

test('one deadline covers fetch and body instead of granting each its own timeout', async () => {
  let cancelled = 0;
  let bodyTimer;
  const bytes = new TextEncoder().encode(JSON.stringify(responseData()));
  const stream = new ReadableStream({
    start(controller) {
      bodyTimer = setTimeout(() => { controller.enqueue(bytes); controller.close(); }, 100);
    },
    cancel() { clearTimeout(bodyTimer); cancelled++; }
  });
  const start = performance.now();
  const result = await rankSurfaceCandidates(request(), { apiKey: fakeKey, timeoutMs: 80, fetchImpl: async () => {
    await pause(50);
    return new Response(stream);
  } });
  failed(result, 'timeout');
  assert.ok(performance.now() - start < 1000);
  assert.equal(cancelled, 1);
  assert.equal(stream.locked, false);
});

test('expired deadline during synchronous response work does not return ok', async () => {
  const bytes = new TextEncoder().encode(JSON.stringify(responseData()));
  let read = false;
  const result = await rankSurfaceCandidates(request(), { apiKey: fakeKey, timeoutMs: 25, fetchImpl: async () => ({
    ok: true, status: 200, headers: new Headers(), body: { getReader: () => ({
      async read() {
        if (read) return { done: true };
        read = true;
        const until = performance.now() + 40;
        while (performance.now() < until) { /* Deliberately blocks event loop beyond deadline. */ }
        return { done: false, value: bytes };
      }, cancel() {}, releaseLock() {}
    }) }
  }) });
  failed(result, 'timeout');
});

test('successful and rejected operations clear deadline timers without retaining child process', () => {
  const script = `import { rankSurfaceCandidates } from ${JSON.stringify(new URL('../src/index.js', import.meta.url).href)};
    const request = ${JSON.stringify(fixture.request)};
    await rankSurfaceCandidates(request, { apiKey: '', timeoutMs: 10000 });
    await rankSurfaceCandidates(request, { apiKey: '${fakeKey}', timeoutMs: 10000,
      fetchImpl: async () => new Response(${JSON.stringify(JSON.stringify(responseData()))}) });`;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], { timeout: 2000, encoding: 'utf8' });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.error, undefined);
});

test('default implementation does not write logs or retain raw exceptions in result', () => {
  const script = `import { rankSurfaceCandidates } from ${JSON.stringify(new URL('../src/index.js', import.meta.url).href)};
    await rankSurfaceCandidates(${JSON.stringify(fixture.request)}, { apiKey: '${fakeKey}',
      fetchImpl: async () => { throw new Error('private input private response ${fakeKey}'); } });`;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], { timeout: 2000, encoding: 'utf8' });
  assert.equal(child.status, 0);
  assert.equal(child.stdout, '');
  assert.equal(child.stderr, '');
});
