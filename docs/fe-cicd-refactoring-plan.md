# FE CI/CD·하네스 리팩토링 계획

> ✅ **완료 (2026-07-13)** — ⓪~⑤ 전부 main 병합·운영 반영됨. 기록용 아카이브.
> 최종 상태: GHCR 이미지 배포(nginx/1.27.5 서빙 확인), PR 게이트 5종 + main ruleset 활성,
> Vitest 14개, GA4 빌드 변수 이관, healthcheck IPv4 수정. 기존 Coolify Static 리소스는 중지(일주일 후 삭제).

> 작성: 2026-07-12 · 기준: origin/main `3f89ced` · 배포 방향: Coolify 단일화 (결정됨)
> 근거: 백엔드(cow-mju-craft)에서 검증 완료된 패턴 이식. 완료 시 상단에 ✅ 배너 후 아카이브.

## 현황

| 영역 | 상태 |
|---|---|
| CI | 워크플로우 0개 — PR이 아무 검증 없이 병합 가능 |
| 테스트 | 0개 (스크립트도 없음) |
| 배포 | source of truth 분열 — 저장소는 Vercel 기준, 실제는 nginx 서빙, 경로 재현 불가 |
| 하네스 | .codex만 존재(단일소스 아님), .ai-workspace에 stale plan/pr 방치, AGENTS.md 배포 설명 낡음 |
| 죽은 코드 | src/api/oauth.ts, .env.example의 카카오·네이버 URL (백엔드에서 제거된 기능) |

## 작업 순서

### ⓪ 배포 경로 확정·재현 가능화 — 전제 조건
- Coolify 대시보드에서 현재 FE가 어떻게 올라가 있는지 확인 (정적 리소스? 수동 업로드?)
- 저장소에 Dockerfile 추가: multi-stage (node build → nginx 정적 서빙 + SPA fallback)
  - 빌드 시 `VITE_API_BASE_URL=https://api.mju-craft.shop/api` (API는 직접 호출, /api 프록시 불필요)
- Coolify에 GHCR 이미지 기반 리소스로 등록 (백엔드와 동일 구조), 기존 수동 배포 제거
- vercel.json 삭제, SERVER_CONNECTION_GUIDE.md·AGENTS.md의 배포 설명 갱신

### ① PR CI + main ruleset
- ci.yml: `npm ci` → `npm run lint` → `npm run build`(tsc 포함) + docker build 검증(push 없음)
- gitleaks job (백엔드 ci.yml 복사)
- main ruleset: PR 필수 + 필수 체크(lint-build, secret-scan, docker-build) + force push 차단

### ② 배포 자동화 + smoke check
- deploy.yml: workflow_run(CI success, main) → GHCR push(:latest + :sha) → Coolify 웹훅 → smoke check
- smoke: https://mju-craft.shop 200 + 응답이 index.html인지 + (선택) 빌드 해시 asset 존재 확인
- ⚠️ 백엔드에서 배운 것: 200만 보지 말 것 — 내용까지 확인

### ③ 하네스 이식
- `.agents/commands` 단일소스 생성 + `.claude/commands`·`.codex/commands` 심링크 (백엔드 구조)
- 커맨드에 백엔드에서 수정한 기준점 로직 반영 (/review origin/main 기준, /impl plan 일치 검증, /plan 기준점 기록)
- AGENTS.md 최신화: 배포 경로, 실제 src 구조, 테스트 컨벤션 추가
- .ai-workspace의 stale plan.md·pr.md 정리, agent-config 구조 검증 CI job
- pre-commit 훅 (main 커밋 차단·시크릿 차단, 백엔드 scripts/setup-hooks.sh 이식)

### ④ 테스트 기반
- Vitest + React Testing Library 셋업, `npm test` 스크립트
- 최초 대상: src/api/client.ts(토큰 부착·에러 처리), utils 순수 함수들
- CI test job 추가. diff coverage 게이트는 테스트가 자리 잡은 뒤 (백엔드처럼 70%)
- E2E 1개(Playwright): 홈 → 프로젝트 목록 렌더 — ④ 안정화 후

### ⑤ 죽은 코드 정리
- src/api/oauth.ts 및 관련 화면·라우트, .env.example의 OAuth URL 제거
- mock-users.json 등 잔재 확인 후 정리

## 하지 않기로 한 것
- 전체 컴포넌트 테스트 커버리지 캠페인 — diff 게이트가 점진적으로 해결
- Vercel 병행 유지 — 경로 이원화가 이번 문제의 근원
- 스토리북·시각적 회귀 테스트 — 현 규모 과잉

## 완료 기준
git clone만으로 운영과 동일한 배포 산출물을 만들 수 있고, PR이 lint·build·시크릿 검증 없이는 병합되지 않으며, 배포 후 운영 상태가 Actions에서 확인된다.
