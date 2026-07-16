# 보안 모델

상태: 검토중

## 보호 대상

- 프로젝트 정본과 dirty worktree
- credential, 개인 경로, 비공개 source/artifact
- 사용자의 승인 의미와 비용 한도
- evaluator 독립성과 evidence provenance
- 외부 시스템에 대한 mutation idempotency

## 주요 위협과 현재 완화

| 위협 | 현재 완화 | 남은 경계 |
|---|---|---|
| 구현자가 요구 분모 축소 | stable RequirementSet hash, denominator Decision | 승인 UI 없음 |
| 승인 후 payload 교체 | ExecutionIntent hash와 Decision binding | broker enforcement 없음 |
| 자기평가를 독립 평가로 표시 | EvaluationAssignment/result hash, E0 release 거부 | evaluator 실행 자동화 없음 |
| stale/과대 context 사용 | age/size fail-closed validator | semantic relevance 평가는 제한적 |
| credential·개인 경로 공개 | redaction helper, source/tarball hygiene check | 모든 외부 adapter 적용은 미검증 |
| 중복·충돌 mutation | MutationLease/RunAttempt schema | fencing/receipt registry 없음 |

## 데이터 분류

- Public: schema, synthetic fixture, 공개 문서와 release evidence
- Project-local: snapshot, 일반 로그, 내부 경로가 제거된 evidence
- Sensitive: credential, 개인 식별 경로, 비공개 source, 미출시 asset, 결제/배포 권한

Sensitive 데이터는 public artifact에 포함하지 않으며 최소 권한의 provider가 필요합니다. fixture는 합성 데이터를 사용합니다.

## 기본 동작

Reference Runtime은 read-mostly입니다. `detect`는 explicit output 없이는 snapshot을 디스크에 쓰지 않습니다. evidence/proposal/export는 명시적 명령일 때만 지정 경로에 기록합니다. 현재 broker가 없으므로 live project mutation 자동화 용도로 사용하면 안 됩니다.

## 공개 전 검사

`npm run verify:package`는 공개 문서 존재, 로컬 절대 경로·credential-like text, tarball 파일 목록과 생성 artifact 누출을 검사합니다. 이는 전문 secret scanner나 dependency provenance 검사를 대체하지 않습니다.
