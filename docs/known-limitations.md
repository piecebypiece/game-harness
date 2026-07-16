# 알려진 한계

상태: 확정

## 제품 수준

- Development Preview이며 Protocol v1 호환성 보장이 없습니다.
- 외부 사용자 fresh install과 장기 운영 자료가 없습니다.
- npm registry 배포와 signed provenance를 제공하지 않습니다.

## 실행 안전

- `MutationLease`, `InstallLedger`, `RunAttempt`는 contract 중심이며 OS-enforced broker와 receipt registry가 없습니다.
- install/uninstall transaction과 자동 rollback이 없습니다.
- 외부 API 비용·게시·결제 mutation을 실행하는 provider가 없습니다.

## 게임개발 실증

- 공개 회귀는 fixture와 Node.js Reference Runtime 중심입니다.
- live Unity/Unreal/Godot runtime 검증을 이번 버전에서 수행하지 않았습니다.
- 게임기획·개발·아트·마케팅/사업 네 분야의 독립 end-to-end 표본을 충족하지 않았습니다.
- 포함된 engine profile은 범용 엔진 지원을 의미하지 않습니다.

## 평가와 UX

- 외부 evaluator를 자동 배정하거나 실행하지 않습니다.
- 평가가 실행되지 않으면 `NOT_RUN`을 기록하지만, 평가 품질 자체를 보장하지 않습니다.
- CLI 설치 마법사, interactive approval UI, uninstall UX가 없습니다.
- 사용자 학습과 인지 병목 Module은 설계 경계만 있고 제품 기능이 아닙니다.
