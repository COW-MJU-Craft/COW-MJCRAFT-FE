# MJU-CRAFT-FE

명지대학교 중앙동아리 COW 1팀에서 개발한 COW X MJU_CRAFT 프로젝트 프론트엔드 레포지토리입니다.

## 기술 스택

- React 19.2.0
- TypeScript 5.9.3
- Vite 7.2.4
- Tailwind CSS 4.1.18
- React Router DOM 7.11.0
- @dnd-kit (drag & drop)
- react-markdown + remark-gfm/remark-breaks
- lucide-react (icons)
- Fetch API 기반 커스텀 클라이언트 (`src/api/core/client.ts`)
- ESLint 9 (flat config, react-hooks/refresh 포함)
- Docker + nginx 배포 (Coolify — GitHub Actions가 GHCR 이미지 빌드·push 후 웹훅 트리거)

## 프로젝트 구조

```text
src/
├─ api/                 # API 요청 모듈
│  ├─ core/              # 공통 API 클라이언트와 응답 유틸
│  ├─ site/              # 사용자 영역 API
│  └─ admin/             # 관리자 영역 API
├─ assets/              # 정적 자원 (로고, 폰트 등)
├─ components/          # 공용 컴포넌트
│  ├─ analytics/         # Google Analytics 관련 컴포넌트
│  ├─ application/       # 지원/신청 공용 컴포넌트
│  ├─ confirm/           # 전역 Confirm 모달
│  ├─ layout/            # 사이트/관리자 레이아웃과 헤더
│  ├─ order/             # 주문 표시 컴포넌트
│  ├─ payout/            # 정산 표시 컴포넌트
│  ├─ project/           # 프로젝트 카드 컴포넌트
│  ├─ social/            # SNS 플로팅 컴포넌트
│  ├─ toast/             # 전역 Toast
│  └─ ui/                # 범용 UI 컴포넌트
├─ constants/           # 상수 정의
├─ data/                # 정적 데이터
├─ features/            # 도메인별 기능
├─ hooks/               # 커스텀 훅
├─ pages/               # 라우트 단위 페이지
│  ├─ site/              # 사용자 영역 도메인별 페이지
│  └─ admin/             # 관리자 영역 도메인별 페이지
├─ styles/              # 전역 스타일
├─ types/               # 타입 정의
└─ utils/               # 유틸 함수
   ├─ admin/             # 관리자 콘텐츠/정산 유틸
   ├─ auth/              # 인증 토큰 유틸
   ├─ cart/              # 장바구니 유틸
   ├─ common/            # 날짜, 미디어, 토스트 등 공통 유틸
   ├─ order/             # 주문 draft 유틸
   └─ project/           # 프로젝트 정렬 유틸
```

## 환경 변수

프로젝트 루트에 `.env` 파일을 생성하고 값을 설정했습니다.

- 개발 서버에서 `/api`는 `vite.config.ts`의 프록시 설정을 따릅니다.
- 배포 환경에서는 `vercel.json` 리라이트 규칙을 사용합니다.
- GA4를 사용하려면 `VITE_GA4_MEASUREMENT_ID`에 GA4 측정 ID(`G-...`)를 설정합니다.
- 개발 확인용 footer 배지는 로컬 개발 환경에서 자동 표시되며, 배포 환경에서는 `VITE_SHOW_GA4_FOOTER_BADGE=true`일 때만 표시됩니다.
- `VITE_GA4_DEBUG_MODE=true`를 설정하면 GA4 DebugView에서 page_view 이벤트를 확인할 수 있습니다.
- `VITE_GA4_REPORT_URL`에 Analytics 리포트 URL을 넣으면 footer 배지에서 GA4 화면으로 이동할 수 있습니다.

## 스크립트

```bash
npm run dev      # 개발 서버 실행
npm run build    # 타입 체크 + 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
npm run lint     # ESLint 실행
```

## 라우팅 개요

- 사용자 영역: `SiteLayout`
- 관리자 영역: `AdminLayout`
- 로그인/소셜 콜백 페이지 포함

자세한 라우트는 `src/App.tsx`를 참고하세요.

## API 통신

- `src/api/core/client.ts`의 Fetch 기반 클라이언트 사용
- 토큰은 `localStorage`의 `VITE_TOKEN_KEY`로 관리
- 필요 시 `Authorization: Bearer <token>` 자동 부착

## 인증/소셜 로그인

- 카카오/네이버 OAuth 콜백 라우트 사용
- 관련 API 모듈은 `src/api/site/`, `src/api/admin/` 하위에서 관리

## UI 공통 요소

- 전역 토스트: `src/components/toast/ToastProvider`
- 전역 확인 모달: `src/components/confirm/ConfirmProvider`

## 배포

- GitHub Actions(`deploy.yml`)가 Docker 이미지를 빌드해 GHCR에 push하고, Coolify 웹훅을 트리거한다
- nginx(`nginx.conf`)가 정적 SPA 라우팅을 담당: `/api/`는 프런트가 처리하지 않고(백엔드 도메인 직접 호출), 그 외 경로는 `/index.html`로 폴백
- 배포 후 `/version.json`으로 실제 배포된 커밋 SHA를 확인할 수 있다(스모크 체크에서 사용)
- 롤백은 `rollback.yml` workflow_dispatch로 특정 SHA 이미지를 `:latest`로 재태깅해 진행한다

## 코드 품질

- ESLint Flat Config 사용 (`eslint.config.js`)
- TypeScript strict 모드 기반

## 개발 메모

- Vite + Tailwind 구성이며 전역 스타일은 `src/index.css`에서 관리합니다.
- 폰트는 `src/assets/fonts`와 `src/styles/font.css`에 정의되어 있습니다.
