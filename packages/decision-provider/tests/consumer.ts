import {
  rankSurfaceCandidates, type SurfaceRankingRequest, type SurfaceRankingResult,
  type SurfaceRankingOptions, type SurfaceRankingUsage
} from '@game-harness/decision-provider';

const request: SurfaceRankingRequest = {
  schema: 'game-harness.surface-ranking.request/1', task: '공개 문서 찾기',
  candidates: [{ id: 'D:public', path: 'Docs/public.md', summary: '', evidence: [], protected: false }]
};
const options: SurfaceRankingOptions = { fetchImpl: fetch, timeoutMs: 50, minConfidence: 0.8 };
const result: SurfaceRankingResult = await rankSurfaceCandidates(request, options);
if (result.status === 'ok') {
  const usage: SurfaceRankingUsage = result.usage;
  usage.totalTokens.toFixed();
  result.rankings.map(ranking => ranking.id);
} else {
  const absent: null = result.usage;
  const empty: [] = result.rankings;
  result.reason.toUpperCase();
  void absent;
  void empty;
}
// @ts-expect-error Human approval schema is not the semantic ranking schema.
request.schema = 'game-harness.decision-request.v1';
// @ts-expect-error Input candidates require an explicit protection flag.
const incomplete: SurfaceRankingRequest = { schema: 'game-harness.surface-ranking.request/1', task: '', candidates: [{ id: '', path: '', summary: '', evidence: [] }] };
void incomplete;
