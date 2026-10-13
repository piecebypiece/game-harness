# Decisions 표면 후보 평가 공급자

상태: 검토중
조사 날짜: 2026-10-13
패키지: `@game-harness/decision-provider@0.1.0`

기존 후보 메타데이터를 선택적으로 Decisions API에 평가 요청하는 독립 ES module leaf 패키지다. `rankSurfaceCandidates`는 후보를 생성하거나 정렬하지 않고 모든 요청 ID의 label과 confidence를 돌려준다. 소비자가 `ok` 결과만 사용하고, 나머지는 기존 후보 순서 전체로 fallback한다. Core, native broker, human approval용 `DecisionRequest`/`DecisionRecord`와 의존 관계가 없다. 런타임 의존성과 OpenAI SDK가 없으며 Node.js 20 이상에서 native fetch를 사용한다.

## 설치와 호출

배포한 고정 tarball을 소비자 프로젝트에 설치한다. Core 패키지 설치나 workspace 등록은 필요하지 않다.

```sh
npm install --save-exact /path/to/game-harness-decision-provider-0.1.0.tgz
```

```js
import { rankSurfaceCandidates } from '@game-harness/decision-provider';

const request = {
  schema: 'game-harness.surface-ranking.request/1',
  task: '이동 결과 표시 계약을 찾는다.',
  candidates: [
    { id: 'D:public', path: 'Docs/public.md', summary: '결과 표시 계약',
      evidence: ['explicit task reference'], protected: true }
  ]
};
const result = await rankSurfaceCandidates(request, { timeoutMs: 3000 });
// result.status !== 'ok'이면 소비자가 request.candidates 전체를 기존 순서로 사용한다.
```

호출 전에 API 키를 `OPENAI_API_KEY` 환경변수로 명시하거나 `options.apiKey`로 전달한다. 키가 없으면 `unavailable / missing_api_key`이며 네트워크 호출은 0회다. 공급자는 파일, 인증 저장소, 계정 정보를 읽지 않는다. `options.provider`의 지원값은 `openai-decisions` 하나다. `subscription-responses` 등을 지정하면 `unavailable / unsupported_provider`로 반환하며 다른 인증·과금 경로로 전환하지 않는다. 구독 Responses adapter는 구현하지 않았다.

유효한 키로 이 함수를 호출하면 제공한 task·후보 메타데이터가 OpenAI로 전달되며 API 과금이 발생할 수 있다. 소비자는 호출 여부와 후보 보호·정렬 정책을 소유한다. `protected` 값은 그대로 전달·보존하며 보호 후보의 낮은 label이 보호를 해제하지 않는다.

## 계약

request는 `schema`, `task:string`, `candidates`를 갖는다. 각 후보는 `id:string`, `path:string`, `summary:string`, `evidence:string[]`, `protected:boolean`을 필수로 갖고 ID는 고유해야 한다. 알 수 없는 필드, getter, sparse 배열, human approval schema는 거부한다. 문자열은 빈 값도 허용한다. 후보가 비어 있고 키가 있으면 네트워크 없이 `ok`, 빈 rankings, 사용량 0을 반환한다.

result는 항상 다음 필드를 갖는다.

| 필드 | 값 |
|---|---|
| `schema` | `game-harness.surface-ranking.result/1` |
| `provider` / `model` | `openai-decisions` / `gpt-6-luna` |
| `status` | `ok`, `unavailable`, `error` |
| `reason` | 성공 시 null, 실패 시 정해진 안전한 reason code |
| `rankings` | 성공 시 요청 순서의 `{id,label,confidence}` 전체, 실패 시 `[]` |
| `usage` | 성공 시 `{inputTokens,outputTokens,totalTokens}`, 실패 시 null |
| `elapsedMs` | 함수 진입부터 반환까지 측정한 경과 시간 |

고정 request/result v1 JSON Schema는 `schemas/surface-ranking.request.v1.schema.json`, `schemas/surface-ranking.result.v1.schema.json`이며 package subpath `@game-harness/decision-provider/schemas/*`로 접근한다. 공개 TypeScript 선언은 `src/index.d.ts`다. JSON Schema로 표현하지 못하는 ID 고유성·일대일 대응, 토큰 합계, 직렬화 크기, confidence threshold는 런타임에서 검사한다.

POST endpoint는 `https://api.openai.com/v1/decisions`, model은 `gpt-6-luna`로 고정한다. 후보마다 `surface_0`, `surface_1`처럼 고유 question name을 만들고 `choice`의 `high/medium/low/unknown`을 요청한다. 응답 순서가 바뀌어도 name으로 원 ID에 대응시킨다. 응답 model, 전체 answer 수, 이름 집합·중복, choice, 유한한 confidence 0~1, 네 가지 probabilities와 합계, 정수 토큰 사용량·합계·details를 검사한다. refusal, unknown, 낮은 confidence, 부분·중복·다른 이름·유효하지 않은 사용량은 전체 실패다.

`options.minConfidence` 기본값은 0.5, 유효 범위는 유한한 0~1이다. 이 기본값은 보수적 운용값이며 정확도나 calibration을 입증하지 않는다. `options.timeoutMs`는 유한한 양수이면서 최대 10000이며 기본값은 10000이다. 상한 밖 옵션은 오류로 반환한다. `options.fetchImpl`은 native-compatible fetch를 주입하는 offline 시험용이다. endpoint, model, retry를 재설정하는 옵션은 없다.

## 상한과 실패 처리

- 후보 최대 128개, 직렬화한 request와 전송 envelope 각각 UTF-8 64KiB, 응답 본문 256KiB다. envelope의 questions 오버헤드 때문에 입력 메타데이터가 64KiB 미만이어도 거부될 수 있다.
- deadline은 진입부터 입력 검증·fetch·본문 읽기·응답 검증 전체에 적용하며 retry는 0회다. redirect는 `error`이며 반환된 redirect 응답도 거부한다.
- 본문은 제한된 stream reader로 읽고 Content-Length만 신뢰하지 않는다. UTF-8 오류·잘못된 JSON도 실패다.
- AbortSignal을 무시하는 fetch나 영원히 pending인 body에서도 deadline race로 결과를 반환한다. 타이머를 제거하고 abort, reader cancel/release, 늦게 도착한 body cancel을 수행한다. 주입한 fetch/reader가 cancel 자체도 무시하면 그 구현 내부 자원을 강제로 종료할 수 없지만 반환을 기다리게 하지는 않는다. JavaScript event loop가 외부 동기 코드로 막히면 선점할 수 없으며 다음 실행 시 deadline을 다시 확인한다.
- 오류 reason은 `invalid_request`, `request_too_large`, `invalid_options`, `unsupported_provider`, `missing_api_key`, `fetch_unavailable`, `timeout`, `network_error`, `redirect_rejected`, `http_error`, `response_too_large`, `invalid_response`, `refusal`, `unknown`, `low_confidence`, `invalid_usage` 중 하나다. 원본 입력·응답·header·키·exception은 결과나 로그에 넣지 않는다.
- 공급자는 로그, 평가 기록, 파일을 만들지 않는다. 실제 유료 API 호출·계정 접근·의미 평가 품질은 이 패키지의 offline 시험으로 입증하지 않는다.

## 개발 검증

저장소 루트에서 leaf만 설치·검증한다. 루트 workspace·lock은 수정하지 않는다.

```sh
npm --prefix packages/decision-provider ci --workspaces=false --ignore-scripts
npm --prefix packages/decision-provider test --workspaces=false
npm --prefix packages/decision-provider run typecheck --workspaces=false
cd packages/decision-provider
npm pack . --workspaces=false --ignore-scripts
```

시험은 공개 가상 fixture와 fake fetch만 사용한다. 성공·전체 fallback·스키마·타입 소비, UTF-8/크기 제한, 무응답 timeout, 늦은 응답, stream/timer cleanup, 비밀값 비노출을 검증한다. 개발 의존성인 Ajv와 TypeScript는 배포 소비자의 런타임에 필요하지 않다. registry publish와 실제 유료 호출은 이 명령에 포함되지 않는다.

API 형식은 [공식 Decisions 가이드](https://developers.openai.com/api/docs/guides/decisions)와 [공식 TypeScript create reference](https://developers.openai.com/api/reference/typescript/resources/decisions/methods/create)를 확인했다. 계정 가용성과 가격은 호출 전에 소비자가 현재 공식 정보로 확인한다.
