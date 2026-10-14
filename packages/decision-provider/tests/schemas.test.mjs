import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';
import { rankSurfaceCandidates } from '../src/index.js';

const readJson = relative => JSON.parse(readFileSync(new URL(relative, import.meta.url), 'utf8'));
const fixture = readJson('./fixtures/surface-ranking.fixture.json');
const ajv = new Ajv2020({ strictTypes: false });
const requestSchema = readJson('../schemas/surface-ranking.request.v1.schema.json');
const resultSchema = readJson('../schemas/surface-ranking.result.v1.schema.json');
const validateRequest = ajv.compile(requestSchema);
const validateResult = ajv.compile(resultSchema);

test('versioned schemas accept the shared public contract fixture', () => {
  assert.equal(requestSchema.$id, fixture.request.schema);
  assert.equal(resultSchema.$id, fixture.okResult.schema);
  assert.equal(validateRequest(fixture.request), true, JSON.stringify(validateRequest.errors));
  assert.equal(validateResult(fixture.okResult), true, JSON.stringify(validateResult.errors));
});

test('request schema rejects absent fields, type drift and additional properties', () => {
  for (const mutate of [
    value => { value.schema = 'game-harness.decision-request.v1'; },
    value => { delete value.task; },
    value => { value.candidates[0].protected = 'true'; },
    value => { value.candidates[0].evidence = [1]; },
    value => { value.candidates[0].extra = true; },
    value => { value.extra = true; },
    value => { value.candidates = Array(129).fill(value.candidates[0]); }
  ]) {
    const value = structuredClone(fixture.request);
    mutate(value);
    assert.equal(validateRequest(value), false);
  }
});

test('result schema binds each supported provider to its pinned model', () => {
  const value = { ...structuredClone(fixture.okResult), provider: 'typesafe-jev', model: 'jev-1.13.0' };
  assert.equal(validateResult(value), true);
  value.model = 'gpt-6-luna';
  assert.equal(validateResult(value), false);
  value.provider = 'openai-decisions'; value.model = 'jev-1.13.0';
  assert.equal(validateResult(value), false);
});

test('result schema enforces status-dependent whole fallback and finite bounds', () => {
  for (const mutate of [
    value => { delete value.reason; },
    value => { value.provider = 'different'; },
    value => { value.rankings[0].confidence = 2; },
    value => { value.rankings[0].confidence = NaN; },
    value => { value.rankings[0].label = 'unknown'; },
    value => { value.usage.inputTokens = -1; },
    value => { value.status = 'error'; value.reason = 'safe_reason'; },
    value => { value.reason = 'unsafe_success'; },
    value => { value.usage = null; },
    value => { value.elapsedMs = Infinity; },
    value => { value.extra = true; }
  ]) {
    const value = structuredClone(fixture.okResult);
    mutate(value);
    assert.equal(validateResult(value), false);
  }
});

test('runtime unavailable and malformed-input results satisfy the result schema', async () => {
  for (const request of [fixture.request, { ...fixture.request, schema: 'invalid' }]) {
    const result = await rankSurfaceCandidates(request, { apiKey: '' });
    assert.equal(validateResult(result), true, JSON.stringify(validateResult.errors));
    assert.deepEqual(result.rankings, []);
  }
});
