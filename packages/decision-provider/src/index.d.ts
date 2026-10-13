export interface SurfaceCandidate {
  id: string;
  path: string;
  summary: string;
  evidence: string[];
  protected: boolean;
}

export interface SurfaceRankingRequest {
  schema: 'game-harness.surface-ranking.request/1';
  task: string;
  candidates: SurfaceCandidate[];
}

export interface SurfaceRanking {
  id: string;
  label: 'high' | 'medium' | 'low' | 'unknown';
  confidence: number;
}

export interface SurfaceRankingUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

interface ResultBase {
  schema: 'game-harness.surface-ranking.result/1';
  provider: 'openai-decisions';
  model: 'gpt-6-luna';
  elapsedMs: number;
}

export type SurfaceRankingResult = ResultBase & (
  | { status: 'ok'; reason: null; rankings: SurfaceRanking[]; usage: SurfaceRankingUsage }
  | { status: 'unavailable' | 'error'; reason: string; rankings: []; usage: null }
);

export interface SurfaceRankingOptions {
  /** Explicit API key; otherwise only OPENAI_API_KEY is consulted. */
  apiKey?: string;
  /** Native-compatible fetch injection for offline tests. */
  fetchImpl?: typeof fetch;
  /** Finite positive total deadline, at most 10000 ms. Default: 10000. */
  timeoutMs?: number;
  /** Finite confidence threshold in [0, 1]. Default: 0.5, not a calibration claim. */
  minConfidence?: number;
  /** Only openai-decisions is implemented. Other strings return unavailable without network. */
  provider?: string;
}

export function rankSurfaceCandidates(
  request: SurfaceRankingRequest,
  options?: SurfaceRankingOptions
): Promise<SurfaceRankingResult>;
