---
title: CodeWiki 저장소 경계와 사용 정책 검토 판정
status: 검토중
type: review_disposition
created: 2026-08-01
research_date: 2026-08-01
scope: codewiki-integration
review_judgment: SOUND_WITH_CORRECTIONS
implementation_authorized: false
live_adoption_authorized: false
---

# CodeWiki 저장소 경계와 사용 정책 검토 판정

## 결론

Game Harness Set과 CodeWiki의 관계는 제품 구성상 상위 제품과 선택형 도구이지만,
Git 저장소를 물리적으로 중첩하는 관계는 아니다.

권장 구조는 다음과 같은 독립 저장소 조합이다.

| 저장소 | 책임 | 공개 범위 | 관계 |
|---|---|---|---|
| piecebypiece/game-harness | protocol, Reference Runtime, Module SDK, integration contract | public | 상위 제품 |
| 별도 CodeWiki Tool 저장소 | CodeWiki CLI와 자체 release | 비공개 | 독립 도구이며 향후 선택형 Context Provider 후보 |
| 연구·정책 저장소 | 전략, 정책, 평가, decision record | private 권장 | 제품·도구 변경의 근거 |

CodeWiki 소스는 game-harness 저장소에 vendoring하지 않는다. game-harness는 향후 검증된
Module Manifest 또는 integration lock을 통해 exact CodeWiki release 또는 artifact만 선택적으로
참조한다. 현재는 그 integration manifest와 provider가 구현되거나 승인된 상태가 아니다.

## Git 관리 결정

### 채택

- 세 저장소는 각각 독립 Git history, issue tracker, branch, release를 유지한다.
- game-harness와 codewiki-tool은 sibling independent repositories로 관리한다.
- game-harness 기본 CI는 private CodeWiki 저장소에 접근하지 않아도 통과해야 한다.
- cross-repository conformance는 private integration lane에서 수행한다.
- integration 승격 시 exact tag 또는 commit, protocol compatibility, artifact SHA-256을 기록한다.

### 채택하지 않음

- Monorepo: public 제품과 private 도구의 공개·라이선스·폐기 경계를 섞는다.
- Subtree: private 구현을 public history에 복제할 위험이 있다.
- 기본 submodule: public clone과 CI가 private dependency 접근 때문에 깨질 수 있다.
- 서로 무관한 연구 저장소 history를 game-harness branch로 push하는 방식

Submodule은 필요할 경우에도 private conformance fixture 전용 저장소에서만 별도 검토한다.

## 정본 경계

| 범위 | 정본 |
|---|---|
| 제품 전략, 도입 정책, 실험 판정 | 연구·정책 저장소 |
| executable protocol, schema, Reference Runtime release | game-harness |
| CodeWiki CLI 구현과 자체 release | codewiki-tool |
| 게임 프로젝트의 설계·코드·테스트·runtime evidence | 해당 게임 프로젝트 |

CodeWiki는 project SoT가 아니라 canonical docs, source, tests, logs, runtime evidence로 이동시키는
routing layer다. game-harness도 프로젝트 정본을 소유하지 않는다.

## 상위 개발자 검토 수정사항

### 필수 수정

| ID | 수정 계약 | 상태 |
|---|---|---|
| M1 | project read, OS temporary write, generated-cache write, project-file write를 분리한다. auto-readonly는 persistent write 0이다. | 반영 |
| M2 | Skill은 설명과 추천만 한다. Tool이 독립 승인 기록과 저장 정책을 command intent에 대조해 fail-closed해야 한다. | 반영 |
| M3 | pack 누락의 직접 원인과 coverage blind spot을 분리한다. | 반영 |
| M4 | 현재 strict config v1에 usage 또는 permission policy를 추가하지 않는다. | 반영 |
| M5 | Unity, Unreal, Godot process 실행은 Game Harness Engine Execution Provider가 소유한다. CodeWiki Adapter는 생성된 bounded export만 읽는다. | 반영 |

pack 누락의 직접 원인은 다음처럼 나눈다.

- exact 대상 누락: handle 또는 ref 부재
- paraphrase 누락: alias, tokenization 또는 ranking 실패
- coverage blind spot: 미등록 surface를 repair 후보로 발견하지 못한 별도 관측 실패

### 권장 보완

- Project Surface는 확정 용어가 아니라 임시 surface로 유지한다.
- discovery observation을 Candidate Files나 pack confidence에 직접 반영하지 않는다.
- path, observation, content open, bytes, wall time, output과 sensitive path budget을 분리한다.
- Adopt, Trial, Hold, Retire는 도구·패턴 도입 상태에만 사용한다.

## 사용 정책 강제 경계

저장된 정책은 repo 파일만으로 자기 승인할 수 없다. 향후 Tool enforcement는 최소한 다음을
독립 승인 기록에 결속해야 한다.

- policy hash
- project identity
- Tool identity, version, hash
- capability registry identity
- trusted issuer와 user identity
- command intent와 요청 권한

누락, 위조, 다른 사용자, unknown issuer, unknown command는 project content를 열기 전에
fail-closed한다. 호출자가 만든 matching receipt나 branch가 함께 변경한 self-signed receipt는
승인이 아니다.

현재 codewiki-tool에는 이 강제가 구현되어 있지 않다. 따라서 persisted auto-readonly 또는
cross-session approval을 제품 기능으로 주장하지 않는다.

## Discovery 경계

초기 discovery는 report-only observation이다. 관측 결과는 사람이 승인한 handle, ref 또는
alias repair가 생기기 전까지 Candidate Files, Read First, confidence 또는 pack score에 어떤
신호도 추가하지 않는다.

최소 기본 budget은 다음과 같다.

| 항목 | 한도 |
|---|---:|
| 검사 path | 128 |
| observation | 64 |
| content open | 12 |
| bytes per file | 2,048 |
| total content bytes | 16,384 |
| wall time | 5,000 ms |
| report output | 32,768 bytes |
| raw absolute path emission | 0 |
| sensitive, vendor, generated, binary, network, engine execution | 0 |

## Engine 실행 경계

CodeWiki Profile은 engine-specific discovery 규칙을 소유할 수 있고, CodeWiki Metadata Adapter는
이미 생성된 export의 provenance와 freshness를 검증할 수 있다. Unity Editor, Unreal commandlet,
Godot editor와 같은 process의 시작·중단·timeout·resource·permission 책임은 Game Harness의
별도 Engine Execution Provider가 소유한다.

Adapter가 engine process를 직접 spawn하거나 Provider 실패 시 일반 process로 fallback해서는
안 된다.

## Release와 호환성 흐름

1. 연구 저장소에서 정책과 실험 판정을 검토한다.
2. game-harness에서 provider contract와 protocol compatibility를 별도 PR로 검토한다.
3. codewiki-tool에서 CLI 기능과 자체 테스트를 별도 PR로 구현한다.
4. 각 저장소가 독립 release artifact와 검증 근거를 만든다.
5. private conformance lane에서 exact version, commit, artifact hash 조합을 검증한다.
6. 검증된 조합만 game-harness integration lock 후보로 제안한다.
7. 현재는 Provider와 Tool-enforced off가 없으므로 운영상 호출하지 않는다. 향후 구현되더라도
   사용자 승인 전에는 default off와 report-only를 유지한다.

## Build to Delete

CodeWiki integration 제거는 설치 시 기록한 exact inventory에 한해서 다음 대상을 지워야 한다.

- optional module registry entry와 integration lock
- CodeWiki adapter, Provider module/config와 engine export
- 별도 policy artifact와 repo 밖 CodeWiki-specific approval receipt/binding
- 설치된 CodeWiki artifact
- CodeWiki가 소유한 .cw/config.yaml, .cw/handles.yaml, Docs/CodeWiki/** 파일
- generated cache, report와 임시 staging
- optional instruction fragment, hook와 background process

공유 trust store 자체는 제거하지 않고 CodeWiki-specific entry만 제거한다. 보존할 evidence는
integration이 제거됐다는 사실과 limitation을 표시해 orphan evidence로 오인되지 않게 한다.

제거 뒤에도 game-harness Core, 다른 Module, 게임 프로젝트 정본과 기존 작업 흐름은 그대로
동작해야 한다. CodeWiki 저장소 삭제나 접근 불가가 game-harness 기본 build와 test를 깨뜨리면
이 경계는 실패다.

최종 acceptance는 clean project fixture의 설치 전후 non-owned bytes 동일, canonical migration
0건, orphan config/cache/process/hook 0건, Core test와 기존 workflow PASS를 요구한다. 이 통합
Build to Delete 검증은 현재 NOT_RUN이며 판정은 HOLD다.

## 현재 판정

- 저장소 구조: SOUND
- 정책 방향: SOUND_WITH_CORRECTIONS
- 제품 구현: HOLD
- live adoption: 미승인
- config v1 변경: 금지
- Tool policy enforcement: 미구현
- CodeWiki integration Build to Delete: NOT_RUN / HOLD
- Unity 우선 검토: 유지
- Unreal과 Godot 구현: 보류

다음 단계는 이 문서의 정확성 재검토다. 승인 획득, Provider 구현, Tool schema 변경 또는 live
프로젝트 설치는 이 문서의 범위가 아니다.
