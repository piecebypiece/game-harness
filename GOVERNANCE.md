# 거버넌스

상태: 초안

현재 프로젝트는 maintainer-led 방식입니다. 저장소 소유자가 release, protocol compatibility, 보안 대응과 roadmap 우선순위의 최종 책임을 집니다.

## 결정 원칙

- 사용자 통제와 프로젝트 정본 보존
- evidence-before-claim
- protocol과 특정 runtime/provider의 분리
- 작은 가역 변경과 명시적 migration
- 실제 사용자·프로젝트 증거가 없는 범위 확장 보류

Protocol v1 이전에는 빠른 학습을 위해 breaking change가 가능하지만 `CHANGELOG.md`에 기록합니다. 외부 기여자가 늘어나면 maintainer 승격, RFC, release 권한 정책을 별도 제안합니다.
