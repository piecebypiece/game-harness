# 변경 이력

상태: 확정

이 프로젝트는 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)의 형식을 참고하며 Protocol v1 전까지 호환성이 변경될 수 있습니다.

## [decision-provider 0.1.0] - 2026-10-13

### 추가

- Core·승인 프로토콜과 분리된 선택적 @game-harness/decision-provider leaf 패키지
- 고정된 후보 관련성 계약, Decisions choice 응답 검사와 전체 실패 의미
- 요청·응답·시간 상한, retry 0, 키 부재 시 호출 0과 비밀값 없는 오류
- Windows/Ubuntu의 offline 공급자 검증과 clean source의 고정 tarball·checksum·manifest 제작

### 검증 경계

- Core version 0.2.0과 기존 승인 계약은 그대로 유지한다.
- 실제 API 키·계정 접근·유료 호출·검색 품질은 별도 검증이며 이 패키지 배포로 입증되지 않는다.
- 배포 경로는 GitHub prerelease의 고정 artifact이며 npm registry에 게시하지 않는다.

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
