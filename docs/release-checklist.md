# Release Checklist

상태: 확정

## Development Preview 0.2.0

```bash
npm ci
npm run typecheck
npm test
npm run verify:package
npm run test:consumer
```

## 필수 근거

- protocol이 Reference Runtime/SDK/Profile을 의존하지 않는다.
- schema/type/runtime validator drift와 unknown field rejection을 테스트한다.
- incomplete ClaimInventory와 무단 denominator 변경을 거부한다.
- evaluator assignment/result mismatch와 E0 release 판정을 거부한다.
- 승인된 ExecutionIntent와 실제 intent hash mismatch를 거부한다.
- stale/oversized context, redaction, public source/tarball hygiene가 검증된다.
- 실제 tarball을 새 임시 프로젝트에 설치해 API와 CLI를 실행한다.
- evaluator가 실제로 실행되지 않은 상태는 `NOT_RUN`으로 남는다.

## 이 버전에서 실행하지 않는 검증

- live Unity/Unreal/Godot runtime
- OS-enforced mutation broker 공격 테스트
- install/uninstall rollback
- 게임기획·개발·아트·마케팅/사업의 실제 end-to-end 표본
- 외부 사용자 fresh install

이 항목은 다음 마일스톤의 acceptance이며 `0.2.0` 완료 주장에 포함하지 않습니다.
