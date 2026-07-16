# 보안 정책

상태: 확정

## 지원 버전

현재 Development Preview에서는 최신 `0.2.x`만 보안 수정 대상으로 삼습니다.

## 비공개 제보

credential 노출, 임의 파일 쓰기, path traversal, command injection, redaction 우회 같은 취약점은 공개 issue에 올리지 마세요.

[GitHub Security Advisory를 비공개로 제출](https://github.com/piecebypiece/game-harness/security/advisories/new)해 주세요. 재현 단계, 영향 범위, 안전한 최소 fixture를 포함하고 실제 credential이나 비공개 저장소 내용을 첨부하지 마세요.

maintainer는 접수 확인, 재현, 영향 평가, 수정과 공개 시점을 협의합니다. 현재 소규모 프로젝트이므로 고정 응답 시간을 보장하지 않지만 위험한 세부 정보는 수정 전 공개하지 않습니다.

## 범위

보안 문제로 취급하는 예:

- 승인되지 않은 프로젝트 또는 외부 시스템 mutation
- stale decision이나 다른 payload에 대한 승인 재사용
- 패키지·artifact의 credential/개인 경로 누출
- evaluator assignment/result 위조가 release claim으로 이어지는 경우
- schema validator의 fail-open 동작

일반 기능 요청과 문서 오류는 GitHub Issues를 사용해 주세요.
