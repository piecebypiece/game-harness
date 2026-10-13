# 변경 이력

상태: 검토중

## 0.1.0 — 2026-10-13

- 별도 optional leaf 패키지로 `rankSurfaceCandidates`와 request/result v1 계약을 추가했다.
- 고정 Decisions API endpoint/model, 전체 fallback, 네트워크·본문 deadline, 크기·사용량 검증을 추가했다.
- Core와 human approval용 DecisionRequest/DecisionRecord는 의존하거나 변경하지 않는다.
- 실제 유료 API, 계정 접근, 의미 평가의 정확도·calibration은 미검증이다.
