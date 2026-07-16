# 지원 매트릭스

상태: 확정

조사/검증일: 2026-07-17

| 표면 | 상태 | 현재 검증 |
|---|---|---|
| Node.js 20, 22 | 지원 대상 | CI typecheck/test/package/consumer smoke |
| Windows PowerShell | 개발 환경 | 로컬 전체 검증 |
| Ubuntu | CI 환경 | GitHub Actions 예정 |
| macOS | 미검증 | 기여 기반 |
| TypeScript/ESM API | 개발 미리보기 | declaration + 소비자 import |
| JSON Schema artifacts | 개발 미리보기 | schema-driven validator tests |
| Unity | fixture profile만 | live editor/runtime 미검증 |
| Unreal Engine | contract 방향만 | adapter 없음 |
| Godot | contract 방향만 | adapter 없음 |
| npm registry | 미제공 | GitHub/tarball install만 |

Protocol v1 전에는 `0.x` minor release에도 schema와 API 변경이 있을 수 있습니다.
