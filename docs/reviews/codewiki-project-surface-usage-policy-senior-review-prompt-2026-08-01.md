---
title: CodeWiki Project Surface 및 사용 정책 상위 개발자 검토 Prompt
status: 검토중
type: review_prompt
created: 2026-08-01
research_date: 2026-08-01
scope: codewiki
implementation_authorized: false
objective: correct_review_not_approval
related:
  - llm_codewiki_goal_contract.md
  - architecture_plan.md
  - profile_adapter_boundary.md
  - indexing_options.md
  - pack_ranking_model.md
  - final_tool_goal_and_gap_detection_2026-07-14.md
  - evaluation_rubric.md
---

# CodeWiki Project Surface 및 사용 정책 상위 개발자 검토 Prompt

## 목적

이 문서는 CodeWiki Toolkit의 Project Surface 발견과 agent 사용 결정 정책 제안을 상위 개발자에게
read-only로 검토받기 위한 전달용 prompt다.

목표는 제안을 승인받는 것이 아니다. 전제, 현재 구현, 문제 진단, 제안 구조, 반대 가설,
호환성, 비용, 검증 경로를 올바르게 확인하고 다음 중 어느 판단이든 근거 있게 받는 것이 목표다.

- 현재 제안이 타당하다.
- 방향은 타당하지만 수정이 필요하다.
- 증거가 부족하므로 실험 또는 보류가 필요하다.
- 문제 진단이나 구조가 잘못되어 기각해야 한다.

이 prompt는 구현 권한, live 프로젝트 설치 권한, schema 변경 권한, AGENTS/CLAUDE patch 권한을
부여하지 않는다.

## 사용 방법

1. 아래 `전달용 프롬프트` 전체를 상위 개발자 또는 독립 reviewer에게 전달한다.
2. reviewer가 가능한 경우 research root, tool repo, WobbleWitches Trial을 직접 읽게 한다.
3. reviewer가 현재 checkout을 수정하지 않도록 read-only 조건을 유지한다.
4. 검토 결과는 승인 여부가 아니라 `사실 확인`, `설계 적합성`, `위험`, `대안`, `최소 검증`으로 받는다.
5. 구현은 검토 결과를 받은 뒤 별도 WorkItem과 명시 승인으로 시작한다.

## 전달용 프롬프트

```text
역할:
당신은 CodeWiki Toolkit과 게임 개발 하네스 구조를 검토하는 상위 개발자다.
구현자나 제안자의 결론을 승인해 주는 역할이 아니다.
현재 checkout과 제안 내용을 독립적으로 검증하고, 잘못된 전제와 더 나은 대안을 찾는 것이 역할이다.

검토 목적:
Project CodeWiki가 Unity, Unreal, Godot 및 프로젝트 고유 파일/에셋 종류를 발견하고 활용할 수 있게
하는 제안과, agent가 CodeWiki를 사용할지 사용자와 결정하는 정책이 현재 아키텍처에 적합한지 검토한다.

중요:
- 승인 획득은 목표가 아니다.
- 방향이 좋아 보여도 근거가 부족하면 Insufficient Evidence 또는 Defer로 판정한다.
- 더 작은 해결책이 있으면 현재 제안을 축소하거나 기각해도 된다.
- 코드, config, Project CodeWiki, AGENTS.md, CLAUDE.md, canonical docs를 수정하지 않는다.
- reviewer가 확인하지 못한 항목은 추정하지 말고 Unverified 또는 Blocked로 남긴다.

대상 경로:
- Research root:
  C:\Users\chlx3\project_game\인디게임_개발_에이전트파이프라인
- Tool repo:
  C:\Users\chlx3\project_game\codewiki-tool
- WobbleWitches CodeWiki Trial:
  G:\Development\Project\WobbleWitches_CodeWikiTrial_20260521
- WobbleWitches live repo, 비교가 꼭 필요할 때만 read-only:
  G:\Development\Project\WobbleWitches

Source-of-truth 순서:
1. 각 target repo의 AGENTS.md와 현재 git/dirty 상태
2. canonical docs, active work records, 실제 source, tests/logs/runtime evidence
3. Research root의 CodeWiki 목표/아키텍처/평가 문서
4. codewiki-tool의 현재 source, tests, built CLI help
5. Project CodeWiki의 handles, routing docs, generated cache
6. 이 prompt의 제안 설명

Project CodeWiki는 프로젝트 설계나 runtime의 정본이 아니다.
Project CodeWiki는 정본 지식으로 가는 route와 connection state를 관리하는 routing layer다.

반드시 먼저 읽을 문서:
- 05_에이전트_아키텍처/유비쿼터스_언어_사전.md
- 08_CodeWiki_Toolkit/llm_codewiki_goal_contract.md
- 08_CodeWiki_Toolkit/architecture_plan.md
- 08_CodeWiki_Toolkit/profile_adapter_boundary.md
- 08_CodeWiki_Toolkit/indexing_options.md
- 08_CodeWiki_Toolkit/pack_ranking_model.md
- 08_CodeWiki_Toolkit/evaluation_rubric.md
- 08_CodeWiki_Toolkit/final_tool_goal_and_gap_detection_2026-07-14.md
- .agents/skills/codewiki-harness/SKILL.md

현재 사전정의:

1. CodeWiki Toolkit
- project-local code knowledge를 handle, backlink, check, context pack으로 관리하는 reusable CLI/toolkit이다.
- 게임 설계, 코드, 작업 상태, test/runtime evidence의 정본이 아니다.

2. Project CodeWiki
- 특정 프로젝트에 설치된 `.cw/`와 `Docs/CodeWiki/` 인스턴스다.
- 제거해도 기존 프로젝트 지식과 workflow가 유지되는 Build to Delete 조건을 지켜야 한다.

3. Handle
- `D:*` 문서, `F:*` 파일/구현 표면, `S:*` 넓은 surface, `I:*` invariant를 연결하는 안정 식별자다.

4. CodeWiki Context Pack
- `cw pack <task>`가 출력하는 Read First, Candidate Files, Invariants/Gates, Missing Evidence다.
- 구현 결론이나 runtime PASS 증거가 아니다.

5. CodeWiki Harness Skill
- CW를 routing/evaluation harness로 실행하고 canonical source와 독립 cross-check하게 하는 agent skill이다.
- live adoption, AGENTS patch, `.cw/` 정식 추적은 명시 승인 없이 수행하지 않는다.

6. Core / Profile / Adapter 경계
- Core: engine/project를 모르는 handle graph, backlink, ranking, validation, budget 계약
- Profile: Unity/Unreal/Godot 같은 엔진 계열의 탐지 규칙, 기본 경로, hint, 안전 기본값
- Adapter: git/fs/text parser, Unity GUID resolver, Unreal Asset Registry bridge처럼 형식별 metadata를
  read-only로 정규화하는 경계
- Project config: 프로젝트별 승인된 경로, 예외, 사용 정책

7. 기존 lifecycle 용어
- Trial: 제한된 pilot 사용
- Adopt: 정규 사용
- Hold: 발견 또는 검토만 유지하고 활성 사용하지 않음
- Retire: 사용 중단

8. Instruction Fragment
- 사람이 검토 후 AGENTS/CLAUDE/config에 적용할 수 있는 제안 조각이다.
- Automatic Patch와 같지 않다.

9. Harness Improvement Loop
- 사용 실패, 누락 evidence, 반복 마찰을 자동 self-patch가 아니라 reviewable Improvement Proposal로 바꾼다.

이번 검토에서 사용하는 임시 용어:

Project Surface:
- agent가 작업 라우팅, coverage, 영향 분석에서 고려할 수 있는 project-local 파일, 디렉터리,
  engine asset kind 또는 semantic data kind를 뜻한다.
- 이 용어를 stable dictionary term으로 확정하는 것 자체도 검토 대상이다.

혼동하면 안 되는 네 축:
- File Extension: `.asset`, `.prefab`, `.uasset`, `.tscn` 같은 저장 형식 표면
- Engine Asset Kind: ScriptableObject, Scene, Prefab, Blueprint, Resource 등 엔진 의미 종류
- Semantic Type: ControlGlyphSet, StageDefinition, ItemTraitDatabase 같은 프로젝트 도메인 타입
- Project Surface: 위 항목 중 routing/coverage 대상으로 승인된 범위

현재 상태 — 2026-08-01 live 확인값:

Research root:
- branch: main
- 기존 사용자 작업으로 dirty 상태다.
- 수정된 README/roadmap/workboard와 기존 untracked docs/skill-bundles가 있으므로 reviewer는 수정하지 않는다.

codewiki-tool:
- branch: `trial-readiness-init-project-name`
- HEAD: `eb1cd0a Exclude deprecated handles from impact routing`
- 기존 dirty paths:
  - README.md
  - lat.md
  - src/agents.test.ts
  - src/agents.ts
- 2026-08-01 재검증:
  - `npm run typecheck`: PASS
  - `npm test`: PASS, 8 suites / 53 tests / 53 pass
- 현재 CLI 구현:
  - init, doctor, index, check, pack, impact
  - audit 하위에는 coverage만 구현
  - profile list/show는 placeholder이며 실제 동작하지 않음
- 현재 profile schema:
  - `generic`
  - `unity-csharp`
  - Unreal/Godot profile은 미구현
- unity-csharp coverage extension에는 C#, asmdef, shader, HLSL, UXML, USS 등이 있지만
  `.asset`, `.prefab`, `.unity`는 first-party coverage file kind로 분류되지 않는다.
- `cw pack`은 repository 전체 파일을 semantic search하지 않는다.
  현재 Candidate Files는 task와 직접 신호가 있는 handle target을 ranking해 생성한다.
- Project Surface 자동 발견, engine asset kind registry, 새 파일 종류 drift 감지,
  프로젝트별 CW 사용 정책 persistence는 구현되어 있지 않다.

WobbleWitches CodeWiki Trial:
- branch: `trial/codewiki-usability-20260525`
- HEAD: `60e0dc60a docs: Unity connected 테스트 재개 계약 보강`
- worktree: clean
- 기존 seeded Damage/Grab 영역은 Medium 수준 routing 결과를 낸 이력이 있다.
- unknown 영역은 Low confidence와 read-only investigation으로 fail-closed한다.
- 2026-08-01 다음 prompt를 재실행했다.
  `cw pack "ControlGlyphSet MultiColumnListView ScriptableObject editor productivity" --budget 2000`
- 결과:
  - Confidence: Low, top score 20
  - Read First: D:codewiki-index만 제시
  - Candidate Files: ProjectSettings만 제시
  - ControlGlyphSet.cs와 ControlGlyphSet.asset은 누락
  - Missing Evidence: read-only investigation first
- 이 결과는 false high-confidence를 내지 않았다는 점에서는 안전하다.
- 그러나 해당 작업의 critical file recall과 실용 routing 품질은 부족하다.
- C# source도 누락됐으므로 원인은 특수 확장자 미지원 하나로만 확정할 수 없다.
  file discovery/coverage blind spot과 handle/alias/semantic relation 부재가 함께 있는 것으로 추정된다.

검토할 제안:

A. CodeWiki Usage Decision Gate를 skill에 추가

agent는 CW가 설치돼 있다는 사실과 이번 작업에서 사용할지를 구분한다.

제안 모드:
- `auto-readonly`: agent가 적합한 작업에서 doctor/check/pack/impact와 승인된 generated cache 작업을
  자율 사용할 수 있다. 사용 의무는 아니다.
- `ask`: 사용 전 이유, 예상 이득, 비용, mutation 여부를 설명하고 사용자와 결정한다.
- `off`: 해당 프로젝트에서 CW를 사용하지 않는다.

제안 출력:
- Availability: installed / absent
- Project Policy: auto-readonly / ask / off
- Task Fit: high / medium / low
- Decision: use / skip / ask
- Reason
- Expected Benefit
- Mutation: none / generated-cache / project-files

사용자에게 다시 물어야 하는 조건:
- 최초 project policy 선택
- live `cw init`
- `.cw/handles.yaml`, profile, schema, canonical docs 변경
- AGENTS/CLAUDE Instruction Fragment 적용
- 새 engine/plugin/file or semantic kind 활성화
- vendor/generated/binary/credential 위험 범위 확대
- 기존 permission/cost 범위 확대

이미 승인된 read-only 범위에서 CW command를 쓸 때마다 반복 질문하지 않는다.

B. report-only Project Surface discovery 추가

후보 command 이름:
- `cw audit surfaces`

init 또는 명시 audit에서 다음을 read-only로 보고한다.
- engine fingerprint와 버전 단서
- repo-relative extension inventory
- text/binary/unknown
- first-party/vendor/generated/cache ownership 후보
- engine asset kind 후보
- 같은 extension 내부의 semantic type 후보
- 파일 수, 크기, 대표 경로, parser/adapter availability
- known/unknown/unsupported 상태

보고서는 자동으로 handle, profile, config, canonical docs를 수정하지 않는다.
generated inventory가 필요하면 `.cw/cache/` 아래에만 둔다.

C. 사용자와 Project Surface 사용 여부 결정

탐지된 surface를 파일별로 묻지 않고 의미 묶음으로 제시한다.

예:
- Unity serialized assets: Trial 제안
- Assets/_ThirdParty: Hold 제안
- unknown first-party custom extension: metadata-only Trial 또는 Hold 제안

사용자는 Adopt / Trial / Hold / Retire 중 하나를 선택할 수 있다.
결과 persistence 위치는 아직 결정하지 않는다.

검토 후보:
- `.cw/config.yaml` schema extension
- 별도 tracked project policy 파일
- reviewable Instruction Fragment
- 다른 최소 구조

D. engine-specific Adapter

Unity:
- `.asset/.prefab/.unity`의 text serialization 여부 확인
- `.meta` GUID와 `m_Script` 관계를 이용해 serialized asset 후보와 C# type 연결
- editor가 없거나 binary serialization이면 Partial/Unsupported로 하향

Unreal:
- `.uproject`, `.uplugin`, Source, Config는 일반 fs/profile로 발견
- `.uasset/.umap` raw binary를 generic core가 직접 파싱하지 않음
- 필요 시 Unreal Asset Registry 또는 read-only commandlet Adapter 후보

Godot:
- `project.godot`, `.tscn`, `.tres`, `.gd`, `.cs`, addon surface 발견
- text metadata를 adapter로 정규화
- `.godot/imported`와 generated import data는 기본 제외

E. 프로젝트 도중 drift 처리

새 extension만 보지 않는다.
- 기존 `.asset` 안에 새 ScriptableObject semantic type 등장
- plugin이 새 roots/asset kinds 추가
- engine version 또는 serialization mode 변경
- first-party/vendor/generated ownership 변화
- rename, delete, GUID relation stale

제안 흐름:
1. `cw impact`가 current diff 기반 새 surface 후보를 찾음
2. `cw check` 또는 audit가 inventory drift를 경고
3. tool이 report-only Improvement Proposal을 생성
4. agent가 이득, 비용, privacy, parser confidence를 설명
5. 사용자가 Adopt/Trial/Hold를 결정
6. 이후 동일한 결정을 반복 질문하지 않음

핵심 안전 원칙:
- available != enabled != authoritative
- discovered != approved
- extension match != semantic relevance
- CodeWiki health PASS != adoption-ready
- pack confidence != runtime/product correctness
- generated inventory != canonical docs
- automatic canonical rewrite 금지
- live project mutation은 별도 승인

비목표:
- 이 검토에서 구현하거나 patch하지 않는다.
- 모든 engine binary asset을 generic parser로 해석하지 않는다.
- full semantic call graph나 embedding search platform을 한 번에 만들지 않는다.
- 모든 발견 surface를 자동 handle로 승격하지 않는다.
- vendor/generated/third-party content 원문을 무제한 ingest하지 않는다.
- CodeWiki를 작업 시작의 강제 의존성이나 project SoT로 만들지 않는다.
- ControlGlyphSet 한 사례만으로 세 엔진 전체 architecture를 확정하지 않는다.

반드시 검토할 질문:

1. 문제 진단
- ControlGlyphSet 실패를 file discovery/coverage와 handle/semantic routing의 복합 문제로 본 것이 맞는가?
- 더 직접적인 원인 또는 더 작은 수정이 있는가?
- 현재 handle-only routing이 의도된 scope라면 surface discovery가 실제로 필요한가?

2. 책임 분리
- Tool은 discovery evidence를 제공하고 Skill은 사용자와 사용 여부를 결정한다는 분리가 적절한가?
- Core/Profile/Adapter/Project config 중 책임이 잘못 배치된 항목이 있는가?

3. 사용자 정책
- auto-readonly / ask / off가 충분하고 이해 가능한가?
- 추천 default는 무엇이어야 하는가?
- 사용자 확인 빈도와 persistence 위치는 어디가 적절한가?
- 사용자가 선택한 정책이 다른 agent/session에서도 재현 가능해야 하는가?

4. Project Surface 모델
- Project Surface가 필요한 stable term인가, 기존 Handle/Profile/Coverage 용어로 충분한가?
- extension, engine asset kind, semantic type, ownership을 분리한 것이 맞는가?
- file이 아닌 virtual/generated/runtime-only surface도 포함해야 하는가?

5. 도구 표면
- `cw audit surfaces`라는 report-only command가 가장 작은 올바른 slice인가?
- 기존 `cw audit coverage` 확장으로 해결해야 하는가, 별도 command가 필요한가?
- `cw init`에서 어느 수준까지 자동 detect하고 무엇을 proposal로 남겨야 하는가?

6. Ranking과 false confidence
- discovered surface를 pack ranking에 바로 사용하지 않고 lower-confidence candidate signal로 제한해야 하는가?
- handle 없는 발견 파일을 Candidate Files에 노출할 조건은 무엇이어야 하는가?
- recall 개선이 precision과 context budget을 악화시키지 않도록 어떤 gate가 필요한가?

7. 엔진별 현실성
- Unity GUID/m_Script 연결의 정확성, Force Text 의존, 성능, stale 조건은 충분히 고려됐는가?
- Unreal Asset Registry/commandlet Adapter가 과한가, 필요한가?
- Godot text resource parsing에서 놓친 import/generated 경계가 있는가?
- 세 엔진을 동시에 설계하지 않고 Unity fixture부터 시작하는 것이 적절한가?

8. 보안과 비용
- binary, 대형 asset, secrets, licenses, vendor content를 어떤 기본 정책으로 제외해야 하는가?
- file count/size/time budget과 sampling 정책이 필요한가?
- network/editor 실행 없이 가능한 baseline과 engine-required 확장을 분리했는가?

9. lifecycle과 migration
- 같은 extension 안의 새 semantic type을 어떻게 drift로 판단할 것인가?
- profile version, project override, cache schema의 migration과 downgrade를 어떻게 다룰 것인가?
- config v1을 변경하지 않고 검증할 수 있는 더 작은 방법이 있는가?

10. 검증 설계
- 다음 fixture/metric이 충분한가?
  - Unity known serialized asset positive fixture
  - unknown first-party extension proposal fixture
  - vendor/generated exclusion fixture
  - unsupported binary safe-failure fixture
  - same-extension new semantic type drift fixture
  - user policy auto-readonly/ask/off skill scenarios
  - Critical File/Doc Recall, Candidate Precision, Manual Search Count, Overclaim Risk
- 어떤 반례나 failure fixture가 추가되어야 하는가?

11. 대안
- 현재 제안보다 작은 수정으로 같은 사용자 가치를 얻을 수 있는가?
- handle seeding discipline만 강화하는 대안은 충분한가?
- `rg --files` 기반 one-shot fallback을 skill에 넣는 것이 더 나은가?
- CodeWiki 밖의 Game Harness Engine Profile이 surface discovery를 소유해야 하는가?

검토 방법:

1. 위 현재 상태를 그대로 믿지 말고 가능한 항목은 live source/CLI로 확인한다.
2. current dirty files를 식별하고 수정하지 않는다.
3. `cw --help`, `cw audit --help`, profile implementation, coverage classification, pack ranking source를 확인한다.
4. WobbleWitches Trial pack 결과를 source와 독립 대조한다.
5. 제안과 반대 가설을 각각 steelman한다.
6. 문제를 반드시 해결해야 하는 부분, 있으면 좋은 부분, 보류할 부분으로 나눈다.
7. 구현 승인을 내리지 말고 다음 설계/실험에 필요한 판단을 제공한다.

판정 선택:
- SOUND: 문제 진단과 구조가 충분히 타당하며 다음 설계 단계로 진행 가능
- SOUND_WITH_CORRECTIONS: 방향은 타당하지만 필수 수정 후 재검토 필요
- INSUFFICIENT_EVIDENCE: 결론 전에 추가 측정/fixture/pilot 필요
- UNSOUND: 문제 진단 또는 구조가 잘못되어 현재 제안을 진행하면 안 됨
- BLOCKED: source, 권한, 환경 부족으로 검토 불가

출력 형식:

Senior Developer Review

Review Judgment:
- Decision: SOUND | SOUND_WITH_CORRECTIONS | INSUFFICIENT_EVIDENCE | UNSOUND | BLOCKED
- One-line reason:
- Confidence: High | Medium | Low

Facts Reverified:
| Claim | Verified? | Evidence | Correction |
|---|---|---|---|

Problem Diagnosis:
- What is correct:
- What is incomplete or wrong:
- Alternative root causes:
- What evidence would falsify the diagnosis:

Architecture Review:
- Core boundary:
- Profile boundary:
- Adapter boundary:
- Project policy boundary:
- Skill/tool responsibility split:
- Build to Delete impact:

Usage Policy Review:
- Recommended project mode model:
- Recommended default:
- When user confirmation is mandatory:
- When agent may decide without asking:
- Where and how the choice should persist:

Project Surface Review:
- Is the concept needed?:
- Recommended terminology:
- Minimum metadata:
- Discovery versus activation boundary:
- Drift and migration concerns:

Engine Review:
- Unity:
- Unreal:
- Godot:
- Generic/custom project types:

Findings:
| Severity | Finding | Evidence | Required Correction |
|---|---|---|---|

Alternative Designs:
| Alternative | Advantages | Costs/Risks | Prefer over proposal? |
|---|---|---|---|

Minimum Safe Experiment:
- Scope:
- Non-goals:
- Fixtures:
- Metrics:
- Stop conditions:
- Evidence needed before expanding scope:

Decision Split:
- Must do:
- Should do:
- Optional:
- Defer:
- Reject:

Open Questions for Product Owner:
- 질문은 실제 선택에 따라 architecture가 달라지는 항목만 작성한다.

Final Recommendation:
- 다음 한 단계만 제안한다.
- 구현 승인이 아니라 다음 검토/실험 단계의 적합성을 설명한다.

Review Integrity Statement:
- 이 결과가 제안 승인 목적이 아니라 정확한 검토 목적임을 확인한다.
- 직접 확인하지 않은 주장은 Unverified로 남겼음을 확인한다.
- 현재 checkout을 수정하지 않았음을 확인한다.
```

## Prompt 품질 판정

- 검토 대상과 정본 순서를 분리했다.
- 현재 구현과 제안을 분리했다.
- 제안의 반대 가설과 기각 가능성을 포함했다.
- 상위 개발자가 승인 외 판정을 자유롭게 선택할 수 있다.
- 구현과 live mutation을 명시적으로 금지했다.
- 다음 단계는 구현이 아니라 최소 검증 또는 설계 수정으로 제한했다.

## Ubiquitous Language Result

### Reused Terms

- `CodeWiki Toolkit`
- `Project CodeWiki`
- `Handle`
- `CodeWiki Context Pack`
- `CodeWiki Harness Skill`
- `Engine Profile`
- `Instruction Fragment`
- `Harness Improvement Loop`
- `Trial`, `Adopt`, `Hold`, `Retire`
- `Build to Delete`

### New Terms

- `Project Surface`는 이번 검토용 임시 용어다. reviewer가 필요성을 판정하기 전에는 사전에 확정하지 않는다.

### Conflicts

- `file type`, `data type`, `asset type`, `semantic type`을 하나의 개념처럼 쓰면 discovery와 routing 책임이 섞인다.

### Rename Suggestions

- 없음. reviewer가 `Project Surface`보다 기존 `Coverage Surface` 또는 다른 용어가 적합한지 판단한다.

### Dictionary Patch

- 지금은 없음. 검토 결과가 `Project Surface` 안정 용어 필요성을 지지할 때 별도 patch를 제안한다.

## Grill Me Gate

### Goal

- 상위 개발자가 현재 제안을 독립적으로 확인하고 틀린 전제, 필수 수정, 대안, 최소 실험을 제시한다.

### Assumptions

- reviewer가 최소한 research root와 codewiki-tool source를 읽을 수 있다.
- 현재 live 확인값은 2026-08-01 snapshot이며 검토 시점에 바뀔 수 있다.

### Missing Evidence

- Unity serialized asset discovery fixture는 아직 없다.
- Unreal/Godot profile과 Adapter는 미구현이다.
- `auto-readonly/ask/off` 사용자 정책 usability 실험은 없다.
- Project Surface inventory의 성능·privacy budget은 아직 측정되지 않았다.

### Risk

- prompt 분량이 길어 reviewer가 live evidence 확인보다 제안 요약에 의존할 수 있다.
- 임시 용어가 검토 전에 stable architecture로 오인될 수 있다.
- ControlGlyphSet 한 사례가 세 엔진 일반화의 충분한 근거처럼 보일 수 있다.

### Smaller Alternative

- reviewer가 전체 architecture 대신 Unity report-only fixture와 skill Usage Decision Gate만 먼저 검토할 수 있다.

### Verification

- reviewer output이 사실 재검증, 반대 가설, 대안, 최소 실험, falsification 조건을 모두 포함하는지 확인한다.
- reviewer가 checkout을 수정하지 않았는지 확인한다.

### Decision

- Proceed with review prompt. Implementation remains not authorized.

## Result

- Decision: 상위 개발자 read-only review 요청에 사용 가능
- Scope: CodeWiki Project Surface 발견, 사용 정책, engine adapter 및 drift lifecycle 제안

## Remaining Risk

- 이 prompt 자체가 구현 타당성을 증명하지 않는다.
- reviewer가 현재 source/CLI를 직접 확인하지 않으면 snapshot 기반 의견에 그칠 수 있다.

## Next Action

- 독립 상위 개발자에게 이 prompt를 전달하고, 결과를 수정 없이 먼저 보존한다.
- 검토 결과를 받은 뒤에만 proposal 수정 또는 최소 fixture WorkItem을 별도로 만든다.
