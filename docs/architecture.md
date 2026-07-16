# 아키텍처

상태: 검토중

## 정본 경계

Game Harness Set의 제품 정본은 protocol contract입니다. 현재 TypeScript CLI는 그 계약을 소비하는 Reference Runtime이며, 프로젝트의 코드·설계 문서·엔진 설정을 정본으로 대체하지 않습니다.

의존 방향은 다음 하나만 허용합니다.

```text
Reference Runtime / SDK / Engine Profile / Module / Discipline Pack
                              -> @game-harness/protocol
```

Protocol은 위 구현을 역으로 import하지 않습니다.

## 현재 패키지

```text
@game-harness/core
├─ packages/protocol/     # schema, types, validation, integrity, redaction
├─ src/core/              # detect/status/evidence/improvement/evaluator packet
├─ src/profiles/          # 프로젝트·엔진별 교체 가능 profile 예제
├─ fixtures/              # 공개 회귀 fixture
└─ docs/                  # 공개 운영 계약
```

Protocol package가 물리적으로 분리되어 있고 zero runtime dependency를 유지합니다. M2 이전에는 Reference Runtime의 대량 경로 이동을 하지 않습니다.

## 핵심 계약

- `RequirementSet`: 사용자가 승인한 required/optional/out-of-scope 분모
- `ClaimInventory`: 요구사항별 주장과 evidence 연결
- `ContextPacket`: bounded context, provenance, freshness
- `EvaluationAssignment`: evaluator, 독립성 등급, packet/claim hash, read-only 권한
- `ExecutionIntent`: operation, target, write set, 비용과 permission의 불변 hash 대상
- `DecisionRecord`: exact intent 승인 또는 거부
- `RunAttempt`: 실제 실행 lifecycle과 receipt
- `MutationLease`: 향후 broker가 강제할 target lease/fencing contract

## 교체 가능 경계

Module은 capability, input/output schema, permission, evidence gate를 manifest로 선언합니다. Discipline Pack은 게임기획·개발·아트·마케팅/사업에 필요한 Module 조합을 요청합니다. 특정 AI 모델, IDE, engine automation 또는 외부 서비스는 adapter이며 protocol 정본이 아닙니다.

## 현재와 이후

현재 구현은 contract validation과 read-mostly Reference Runtime까지입니다. install transaction, OS-enforced mutation broker, receipt registry, module registry, 네 분야 실제 Pack은 roadmap 항목이며 현재 동작으로 오해하면 안 됩니다.
