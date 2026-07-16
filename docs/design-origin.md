# 설계 기원과 사용 의도

상태: 검토중

조사 기준일: 2026-07-17

## 대화에서 시작된 문제

사용자는 AI를 단발성 코드 생성기가 아니라 게임기획, 개발, 아트, 마케팅·사업 전체에서 함께 일하는 도구로 사용하려 했습니다. 그러나 하나의 긴 prompt나 고정된 에이전트 조직을 만드는 것이 목적은 아니었습니다.

실제 의도는 다음에 가까웠습니다.

- 기존 게임 프로젝트를 손상하지 않고 설치하고 제거할 수 있을 것
- 새 세션에서도 이전 채팅 전체가 아니라 검증된 상태와 결정으로 이어갈 것
- 공격적 평가와 방어적 평가가 같은 고정 요구와 근거를 보고 합의할 것
- 사용자가 이해하지 못한 변경, 비용, 외부 게시가 자동으로 진행되지 않을 것
- 코드 평가, 설계, 테스트, 합의, 학습, 인지 지원을 필요에 따라 교체할 것
- AI와 도구가 발전하면 낡은 prompt/agent layer를 제거해도 증거와 결정 기록은 남을 것

이 문서는 대화 원문을 공개하지 않습니다. 개인 경로, 비공개 프로젝트 정보, credential, 일시적인 세션 표현을 제거하고 반복된 요구만 설계 rationale로 정리했습니다.

## 조사에서 얻은 방향

채택 신호가 큰 코딩 에이전트, agent framework, CI, observability, game-engine automation 사례에서 공통으로 얻은 교훈은 다음과 같습니다.

1. 실행 loop와 tool integration은 교체 속도가 빠르므로 Core에 고정하면 안 됩니다.
2. repository-local instruction과 재현 가능한 command는 범용 채팅 기억보다 이식성이 좋습니다.
3. 자동 평가는 편리하지만 평가 입력, 독립성, 실행 여부를 고정하지 않으면 자기평가를 강화합니다.
4. 게임 개발에서는 source/build/test만으로 플레이 경험과 asset import를 증명할 수 없습니다.
5. 공개 패키지는 기능뿐 아니라 fresh install, uninstall/rollback, 보안 제보, 지원 범위와 claim discipline이 필요합니다.

특정 도구의 UX를 복제하지 않고 adapter와 provider 교체가 가능한 protocol boundary로 반영했습니다.

## 실제 사용 계획

첫 도입은 개발 분야의 read-only shadow pilot입니다. 실제 저장소의 dirty 상태와 정본을 보존한 채 snapshot과 evidence를 비교하고, Reference Runtime 자체가 작업 결과를 과장하지 않는지 먼저 검증합니다.

그 다음 순서는 다음과 같습니다.

1. 설치/제거와 mutation broker
2. 두 독립 프로젝트의 live runtime vertical slice
3. 게임기획 Pack의 spec 소비 가능성
4. 아트 Pack의 생성-검토-import-runtime 연결
5. 마케팅·사업 Pack의 출처·비용·가설 분리
6. 사용자 학습과 인지 병목 지원의 opt-in 비교 실험

각 분야는 독립적으로 중단하거나 다른 스킬·도구로 교체할 수 있어야 합니다. 제품 가치는 에이전트 수가 아니라 누락 감소, 재작업 감소, 승인 안전성, 사용자의 이해와 시간 절감으로 판단합니다.
