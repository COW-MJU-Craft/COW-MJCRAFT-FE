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
| 배포 | Vercel |

## 주요 명령어

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
```

- 단순 문구/문서 수정이면 빌드 생략 가능하나, 생략 사유를 보고한다.
- TypeScript 타입, 라우팅, API, 인증, 관리자 화면, 주문/신청 흐름을 수정한 경우 `npm run build`를 우선 실행한다.
- UI 변경이 크면 개발 서버 또는 브라우저에서 화면 확인을 권장한다.

## Git 워크플로우

- `main` 브랜치에 직접 커밋하지 않는다.
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

## Codex 커맨드 워크플로우

사용자가 아래 명령을 요청하면 `.codex/commands/<command>.md`를 먼저 읽고 해당 절차를 따른다.

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

`.codex/commands`의 내용이 이 파일과 충돌하면 `AGENTS.md`를 우선한다.
