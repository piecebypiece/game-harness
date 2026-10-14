# 변경 이력

상태: 검토중

## 0.1.1-jev.0 — 2026-10-14

- 선택 공급자 `typesafe-jev`와 고정 `jev-1.13.0` 모델, named choice criteria, 전체 응답 검증을 추가했다.
- private stdin 키 전달과 요청 본문에 키가 섞이는 경우의 전송 차단을 추가했다.
- Windows DPAPI CurrentUser 보관·등록·CodeWiki 호출기를 추가했다. 정상 호출의 키 노출을 줄이며 임의 셸 권한을 격리하지 않는다.
- 로컬 연동 시험판이다. 실제 CodeWiki 효용·calibration·청구서는 별도 증거가 필요하다.

## 0.1.0 — 2026-10-13

- 별도 optional leaf 패키지로 `rankSurfaceCandidates`와 request/result v1 계약을 추가했다.
- 고정 Decisions API endpoint/model, 전체 fallback, 네트워크·본문 deadline, 크기·사용량 검증을 추가했다.
- Core와 human approval용 DecisionRequest/DecisionRecord는 의존하거나 변경하지 않는다.
- 실제 유료 API, 계정 접근, 의미 평가의 정확도·calibration은 미검증이다.
