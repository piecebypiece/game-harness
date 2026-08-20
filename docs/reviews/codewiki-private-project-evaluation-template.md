---
title: 비공개 게임 프로젝트 CodeWiki 격리 평가 템플릿
status: 검토중
type: evaluation_template
created: 2026-08-20
scope: private-project-routing-evaluation
implementation_authorized: false
live_adoption_authorized: false
---

# 비공개 게임 프로젝트 CodeWiki 격리 평가 템플릿

## 목적

비공개 게임 프로젝트의 내용을 공개 저장소로 옮기지 않고 CodeWiki의 routing 가치를 검증하는
공급자 중립 템플릿이다. 이 문서는 평가 방법만 정의하며 특정 프로젝트의 결과나 도입 승인을
포함하지 않는다.

다음 정보는 공개 문서와 PR에 기록하지 않는다.

- 프로젝트·저장소·조직·제품 이름
- 내부 URL, 경로, 브랜치, commit과 작업 상태
- 정확한 실행 시각, 원시 prompt, 원시 pack과 로그
- 한 프로젝트에서만 나온 수치와 희귀한 기술 조합

## 평가 질문

1. CodeWiki가 수동 탐색보다 관련 문서·코드·serialized asset을 더 정확히 찾는가?
2. routing 결과를 받은 에이전트가 같은 읽기 예산에서 더 근거 있는 답을 만드는가?
3. 도구를 제거해도 기존 프로젝트 지식과 작업 흐름이 그대로 유지되는가?

CodeWiki는 프로젝트 정본이나 runtime correctness 판정자가 아니다. 정본 문서, source, test와
runtime evidence가 계속 최종 근거다.

## 실행 전 필수 조건

프로젝트 owner가 비공개 기록에서 다음 항목을 확정하고 hash로 고정해야 한다.

- 대상 snapshot과 포함·제외 manifest
- Tool source, dependency, build artifact와 toolchain
- prompt별 manual oracle과 critical evidence 분모
- oracle 작성자, runner, task agent, scorer와 adjudicator
- 격리 환경, 읽기 예산, 쓰기 위치와 보존·삭제 정책
- 외부 evaluator 사용 시 반출 범위와 승인

하나라도 불명확하면 실제 프로젝트에서 실행하지 않는다.

## 권한 분리

| 권한 | 기본값 |
|---|---|
| 승인된 snapshot 읽기 | 격리된 read-only 입력만 허용 |
| OS temporary write | 전용 HOME/TEMP/evidence 위치만 허용 |
| generated cache write | 프로젝트 밖 전용 위치만 허용 |
| project-file write | 금지 |
| content egress | 금지; 별도 승인 필요 |
| network | Tool 단계 금지 |
| engine execution | CodeWiki 범위 밖 |
| remote mutation | 금지; 별도 승인 필요 |

Skill은 이 권한을 부여하지 않는다. 실제 Tool 또는 실행 broker가 scope와 budget을 강제하고
초과 시 fail-closed해야 한다.

## 평가 구조

### 1. Routing 평가

정규화된 pack 출력만 평가한다.

- 필수 evidence recall
- supporting evidence recall
- candidate precision
- serialized asset recall
- confidence inflation
- 동일 입력 3회 결정성

### 2. 에이전트 유용성 평가

서로 독립된 clean session을 사용한다.

- Manual arm: 프로젝트의 canonical router만 제공
- CodeWiki arm: 같은 router와 CodeWiki pack을 제공
- 같은 모델, 도구, 직접 읽기 예산과 응답 형식을 사용
- 정답성, evidence anchor 정확성, 추가 탐색 횟수를 비교

pack 선택 품질과 최종 답변 품질을 하나의 PASS로 합치지 않는다. oracle은 task agent에게
공개하지 않으며 prompt 또는 oracle에서 만든 handle을 pack 입력으로 되먹이지 않는다.

### 3. 제거 가능성 평가

Build to Delete는 실제 프로젝트 평가와 분리된 fixture에서 먼저 검증한다.

- 설치 전후 non-owned bytes 동일
- canonical knowledge migration 0
- owned config/cache/hook/process 잔여 0
- CodeWiki 없이 기존 workflow 유지

fixture 결과를 실제 프로젝트 결과나 runtime PASS로 승격하지 않는다.

## Prompt 범주

프로젝트 owner는 비공개 공간에서 최소 세 prompt를 선택한다.

1. 정본 문서와 현재 작업 상태를 구분해야 하는 질문
2. 코드와 engine-specific serialized asset을 함께 찾아야 하는 흐름 질문
3. 복원·동기화·수명주기와 검증 범위를 구분해야 하는 질문

각 prompt의 문구, oracle, 분모와 scorer 규칙을 Tool 실행 전에 함께 봉인한다.

## 중단 조건

- target, Tool artifact, dirty ownership 또는 isolation provider가 불명확함
- 읽기 budget을 실제로 강제하거나 감사할 수 없음
- project write, network 또는 content egress가 승인 범위를 벗어남
- oracle 또는 과거 결과가 handle·overlay·prompt에 누출됨
- excluded·vendor·generated·sensitive 영역을 읽음
- 결과 공개 시 단일 프로젝트를 재식별할 수 있음

## 공개 규칙

원시 evidence는 프로젝트 owner가 지정한 비공개 저장소에 둔다. 공개 저장소에는 공급자 중립
구현, synthetic fixture와 재식별할 수 없는 다중 프로젝트 통계만 둘 수 있다.

- 단일 비공개 프로젝트 결과는 익명화해도 공개하지 않는다.
- 공개 통계는 독립 프로젝트 5개 이상에서만 검토한다.
- 작은 표본, 희귀 조합과 기존 공개 자료로 역추론할 수 있는 항목은 억제한다.
- 공개 전 별도의 disclosure review를 통과해야 한다.

## 판정 범위

이 평가가 낼 수 있는 최고 판정은 해당 snapshot에서의 `routing usefulness`다. 제품 도입,
엔진 실행 안정성, build/test 또는 runtime correctness를 증명하지 않는다.
