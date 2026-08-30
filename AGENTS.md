# AGENTS.md

이 파일은 AI 에이전트가 COW-MJCRAFT-FE 레포지토리에서 작업할 때 따라야 할 규칙과 프로젝트 컨텍스트를 정의합니다.

## 프로젝트 개요

**MJU-CRAFT 프론트엔드** - 명지대학교 중앙동아리 COW 1팀의 COW X MJU_CRAFT 프로젝트 FE 레포지토리입니다.

| 항목 | 내용 |
|---|---|
| 프레임워크 | React 19 |
| 언어 | TypeScript |
| 빌드 도구 | Vite |
| 스타일 | Tailwind CSS 4 |
| 라우팅 | React Router DOM |
| 서버 상태 | TanStack React Query |
| 아이콘 | lucide-react |
| 배포 | Coolify — GitHub Actions가 GHCR 이미지 빌드·push 후 웹훅 트리거 (deploy.yml) |

## 주요 명령어

**최초 셋업 (clone 후 1회)**
```bash
bash scripts/setup-hooks.sh   # pre-commit 훅 활성화 (main 커밋 차단·시크릿 차단)
```

```bash
npm run dev      # 개발 서버 실행
npm run build    # TypeScript 빌드 + Vite 프로덕션 빌드
npm run lint     # ESLint 실행
npm run preview  # 빌드 결과 미리보기
```

`vite.config.ts`에서 `VITE_API_BASE_URL`이 필수입니다. 로컬 실행 전 `.env`에 해당 값을 설정해야 합니다.

## 프로젝트 구조

```text
src/
├─ api/                 # API 요청 모듈
├─ assets/              # 로고, 폰트 등 정적 자원
├─ components/          # 공용 컴포넌트
├─ constants/           # 상수
├─ data/                # 정적 데이터
├─ features/            # 도메인별 기능
├─ hooks/               # 커스텀 훅
├─ pages/               # 라우트 단위 페이지
│  ├─ site/             # 사용자 영역
│  └─ admin/            # 관리자 영역
├─ styles/              # 전역 스타일
├─ types/               # 타입 정의
└─ utils/               # 유틸 함수
```

## 작업 원칙

- 작업 전 현재 파일 구조, 기존 구현, 타입, API 계층을 먼저 확인한다.
- 기존 패턴을 우선 따르고, 불필요한 새 추상화나 대규모 리팩토링을 피한다.
- 사용자 요청 범위 밖의 파일은 수정하지 않는다.
- UI 변경 시 기존 레이아웃, 색상, 간격, 반응형 패턴과 일관성을 유지한다.
- API 호출은 가능한 한 `src/api/` 계층에 모으고, 페이지/컴포넌트에서 직접 fetch 로직을 중복 작성하지 않는다.
- 라우트 단위 화면은 `src/pages/`, 재사용 가능한 UI는 `src/components/`, 도메인 기능 묶음은 `src/features/`에 둔다.
- 타입은 `any`를 피하고, 기존 타입 파일 또는 API 응답 타입을 우선 재사용한다.
- 아이콘이 필요하면 기존 의존성인 `lucide-react`를 우선 사용한다.

## 환경 변수와 민감정보

- `.env`, API 키, 토큰, 비밀번호, 백엔드 운영 URL 등 민감정보를 커밋하지 않는다.
- 환경 변수 추가가 필요하면 README 또는 PR 설명에 필요한 키 이름과 목적을 명시한다.
- `VITE_` prefix가 붙은 값은 클라이언트 번들에 노출될 수 있음을 전제로 작성한다.

## 검증 기준

변경 범위에 따라 다음 명령어를 실행한다.

```bash
npm run lint
npm run build
npm test
```

- 단순 문구/문서 수정이면 빌드·테스트 생략 가능하나, 생략 사유를 보고한다.
- TypeScript 타입, 라우팅, API, 인증, 관리자 화면, 주문/신청 흐름을 수정한 경우 `npm run build`를 우선 실행한다.
- 유틸/훅/API 모듈처럼 테스트가 존재하거나 있어야 하는 로직을 수정한 경우 `npm test`를 실행한다 (테스트 컨벤션 참고).
- UI 변경이 크면 개발 서버 또는 브라우저에서 화면 확인을 권장한다.

## Git 워크플로우

- `main` 브랜치에 직접 커밋하지 않는다.
- 일반 작업은 `feat/...`, `fix/...`, `refactor/...`, `docs/...`, `chore/...` 브랜치에서 진행하고 PR 대상은 `develop`으로 한다.
- `develop`에서 통합 검증이 끝난 뒤 `develop` -> `main` PR로 배포 대상 변경을 모아 반영한다.
- 긴급 hotfix처럼 `main` 대상 PR이 필요한 경우에는 작업 사유와 검증 범위를 PR 본문에 명시한다.
- PR base 검증 워크플로우(`pr-base-guard.yml`)가 일반 작업 브랜치는 `develop`, `develop`/`hotfix/*` 브랜치는 `main` 대상 PR만 허용한다.
- 브랜치 이름은 변경 목적이 드러나게 작성한다.
  - `feat/...`
  - `fix/...`
  - `refactor/...`
  - `docs/...`
  - `chore/...`
- 커밋 메시지는 Conventional Commits 형식을 따른다.

예시:

```text
feat: 프로젝트 상세 페이지 추가
fix: 주문 조회 상태 표시 수정
docs: 개발 환경 설명 보완
```

## Git 승인 게이트

AI는 아래 작업을 사용자 승인 없이 실행하지 않는다.

1. 커밋
2. push
3. PR 생성
4. PR merge

규칙:

- `git add .` 또는 `git add -A`를 사용하지 않는다. 항상 파일을 명시한다.
- `git push --force`, `git push --force-with-lease`를 사용하지 않는다.
- 커밋 전 변경 파일과 diff를 확인하고 사용자에게 요약한다.
- push 전 대상 브랜치와 실행할 명령어를 사용자에게 보여준다.
- PR 생성 전 제목과 본문을 작성해 사용자에게 먼저 보여준다.

## 절대 금지

- 사용자 승인 없는 commit, push, PR 생성, merge
- force push
- main 직접 커밋
- 민감정보 커밋
- 요청 범위를 벗어난 리팩토링
- `node_modules`, `dist` 같은 생성물 수정 또는 커밋
- 원인을 확인하지 않은 추측성 수정

## AI 에이전트 커맨드 워크플로우

커맨드 원본은 `.agents/commands/`에 있다. `.claude/commands/`와 `.codex/commands/`는 이 디렉토리를 가리키는 심링크이므로, **수정은 반드시 `.agents/commands/`에서만** 한다.

사용자가 아래 명령을 요청하거나 요청 내용에 해당 작업이 포함되면 `.agents/commands/<command>.md`를 먼저 읽고 해당 절차를 따른다.

| 명령 | 용도 |
|---|---|
| `/feature` | 새 화면, 주요 플로우, API 연동처럼 계획-구현-검증-PR이 필요한 큰 작업 |
| `/plan` | 구현 전 계획 수립 |
| `/impl` | 승인된 계획 기반 구현 |
| `/review` | 변경사항 셀프 리뷰 |
| `/commit` | 커밋 메시지 제안 및 승인 후 커밋 |
| `/pr` | PR 설명 작성 및 승인 후 PR 생성 |
| `/merge` | 승인 후 PR 병합 |

`/feature`는 작은 문구 수정, 단순 스타일 조정, 파일 하나짜리 버그 수정에는 과할 수 있다. 그런 경우 `/plan`, `/impl`, `/review`, `/commit`을 필요한 만큼만 사용한다.

- 커밋이 포함되는 모든 요청은 `/commit` 명시 여부와 관계없이 `.agents/commands/commit.md`를 따른다.
- PR 생성이 포함되는 모든 요청은 `/pr` 명시 여부와 관계없이 `.agents/commands/pr.md`를 따른다.
- 머지가 포함되는 모든 요청은 `/merge` 명시 여부와 관계없이 `.agents/commands/merge.md`를 따른다.

### Git 작업 요청 해석 규칙

사용자가 명령어를 정확히 쓰지 않아도, 요청 문장에 포함된 최종 목표를 기준으로 필요한 `.agents/commands/*.md`를 모두 읽고 순서대로 따른다.

예:

- "커밋해줘", "변경사항 저장해줘"
  - `.agents/commands/commit.md`를 읽고 따른다.
- "푸쉬까지 진행해줘", "push까지 해줘"
  - `.agents/commands/commit.md`를 읽고 커밋 절차를 따른다.
  - 커밋 후 push 승인 절차까지 진행한다.
- "PR 작성까지 진행해줘", "PR 본문 써줘"
  - `.agents/commands/pr.md`를 읽고 PR 설명 작성 및 `.ai-workspace/pr.md` 저장까지 진행한다.
  - PR 생성은 별도 승인 없이는 하지 않는다.
- "PR 생성까지 진행해줘", "PR 올려줘"
  - `.agents/commands/commit.md`와 `.agents/commands/pr.md`를 모두 읽고 따른다.
  - 커밋, push, PR 생성은 각 승인 게이트를 지킨다.
- "PR 푸쉬까지 진행해줘"
  - PR은 push 이후 생성 가능하므로, 의미가 불명확하면 "push 후 PR 생성"으로 해석한다.
  - `.agents/commands/commit.md`와 `.agents/commands/pr.md`를 모두 읽고 따른다.
- "머지까지 진행해줘"
  - `.agents/commands/commit.md`, `.agents/commands/pr.md`, `.agents/commands/merge.md`를 모두 읽고 순서대로 따른다.
  - 커밋, push, PR 생성, merge는 각 승인 게이트를 지킨다.

요청이 "까지 진행" 형태여도 승인 게이트는 생략하지 않는다.
단, 사용자가 직전 단계의 실행 명령과 대상을 이미 확인한 뒤 "승인", "진행", "계속"이라고 답하면 해당 게이트의 승인으로 본다.

`.codex/commands`의 내용이 이 파일과 충돌하면 `AGENTS.md`를 우선한다.

---

## 테스트 컨벤션

**작성 의무**: 새 로직(유틸, api 모듈, 훅) 추가 또는 기존 로직 변경 시 해당 부분의 테스트를 함께 작성한다.

- 도구: Vitest + React Testing Library (`npm test` / `npm run test:watch`)
- 위치: 대상 파일 옆에 `*.test.ts(x)` (예: `src/utils/date.test.ts`)
- 우선순위: 순수 함수·api 모듈 > 훅 > 컴포넌트. 스타일·마크업만 바뀌는 컴포넌트 테스트는 강제하지 않는다
- 깡통 테스트 금지 — assertion 없는 테스트, 구현 복사 테스트는 작성하지 않는다
- 참고 예시: `src/api/client.test.ts` (fetch mock, 토큰 부착·에러 처리), `src/utils/date.test.ts` (경계값)

**E2E 스모크 테스트**: `e2e/` 디렉토리에 Playwright로 작성한다 (`npm run test:e2e`).
Vitest 단위 테스트와 대상이 다르다 — 개별 로직이 아니라 "빌드된 실제 페이지가
크래시 없이 렌더링되는지"만 확인한다. 특정 데이터 내용에 의존하는 어서션은
피하고, API 응답과 무관하게 항상 렌더링되는 요소(레이아웃, 폼, 리다이렉트)만
검증한다. `vitest.config.ts`의 `test.exclude`에 `e2e/**`가 포함돼 있어야
vitest가 Playwright 스펙 파일을 잘못 주워가지 않는다.

---

## 핸드오프/상태 문서 컨벤션

에이전트가 작업 인계 문서(핸드오프, 계획, 상태 파일)를 작성할 때:

1. **기준점 기록 필수** — 문서 상단에 작성 시각, 기준 브랜치, HEAD SHA를 적는다
2. **완료 처리 규칙 명시** — 완료 시 처리 방법(배너 후 아카이브 또는 삭제)을 문서 안에 적는다
3. **완료된 문서는 즉시 닫는다** — 방치된 완료 문서는 다음 에이전트에게 틀린 컨텍스트를 준다
4. **영구 정보는 AGENTS.md로 이관** — 일회성 문서에 영구 규칙을 남기지 않는다
