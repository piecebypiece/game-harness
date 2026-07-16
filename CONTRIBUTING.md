# 기여 가이드

상태: 확정

Game Harness Set은 protocol-first, evidence-before-claim 원칙으로 개발합니다.

## 시작하기

```bash
npm ci
npm run typecheck
npm test
npm run verify:package
npm run test:consumer
```

## 변경 원칙

1. 프로젝트 정본을 하네스가 소유하게 만들지 않습니다.
2. protocol은 Reference Runtime, SDK, engine profile을 의존하지 않습니다.
3. 새 계약은 JSON Schema, TypeScript type, runtime validation, positive/negative test를 함께 변경합니다.
4. 검증하지 않은 runtime 결과를 통과로 표현하지 않습니다.
5. 기존 계약을 줄이거나 required 분모를 바꾸는 변경은 rationale과 migration note가 필요합니다.
6. Module과 Discipline Pack은 Core에 특정 공급자 구현을 고정하지 않습니다.
7. 개인 경로, credential, 비공개 프로젝트 자료를 fixture나 문서에 넣지 않습니다.

## Pull request

- 한 PR은 하나의 명확한 계약 또는 동작 변경에 집중합니다.
- 변경 이유, evidence, 호환성 영향, 남은 미검증 항목을 본문에 적습니다.
- 코드 변경에는 focused test를 추가합니다.
- 공개 API나 schema 변경에는 `CHANGELOG.md`를 갱신합니다.

버그와 기능 제안은 GitHub Issues를 사용하되 보안 취약점은 [SECURITY.md](SECURITY.md)를 따릅니다.
