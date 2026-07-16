# 변경 이력

상태: 확정

이 프로젝트는 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)의 형식을 참고하며 Protocol v1 전까지 호환성이 변경될 수 있습니다.

## [0.2.0] - 2026-07-17

### 추가

- 런타임 의존성이 없는 `@game-harness/protocol` workspace
- 21개 versioned contract schema와 schema-driven runtime validator
- `RequirementSet`/`ClaimInventory` completeness와 분모 변경 decision gate
- `EvaluationAssignment`/`EvaluationResult` 무결성 및 E0 release 제한
- exact `ExecutionIntent`/`DecisionRecord` binding
- stale/oversized context fail-closed 및 redaction helpers
- 공개 소스·tarball 위생 검사와 실제 소비자 설치 smoke test

### 변경

- 기존 TypeScript CLI를 교체 가능한 Reference Runtime으로 명시
- evaluator packet의 근거 없는 외부 평가 통과 값을 `NOT_RUN` gate로 교체

### 알려진 한계

- live engine runtime 실증은 이번 버전에 포함하지 않음
- mutation broker와 install ledger enforcement는 schema 수준
- npm registry에는 게시하지 않음

## [0.1.0] - 2026-06-27

### 추가

- project state detection, status, evidence, improvement proposal, evaluator packet CLI
- fixture 기반 engine profile 예제
