# 서버 연결 가이드

프론트엔드에서 서버 연결 시 꼭 필요한 최소 내용만 정리했습니다.

## 필수 환경 변수

프로젝트 루트에 `.env` 파일을 생성하고 아래 값을 설정합니다.

- `VITE_API_BASE_URL`: API 베이스 경로 (개발 기본값 `/api`)
- `VITE_TOKEN_KEY`: 토큰 저장 키

## 개발/배포 연결 방식

- 개발 환경: `vite.config.ts`에서 `/api` 프록시 사용
- 배포 환경: 빌드 시 `VITE_API_BASE_URL`이 https://api.mju-craft.shop/api 로 주입되어 API를 직접 호출 (Dockerfile ARG)

## 토큰 처리

- 토큰은 `localStorage`의 `VITE_TOKEN_KEY`로 저장
- 요청 시 `Authorization: Bearer <token>` 자동 부착
- 관련 코드: `src/api/client.ts`

## 서버 주소 변경 시

- 개발용: `.env`의 `VITE_API_BASE_URL` 값 수정
- 배포용: `Dockerfile`의 `VITE_API_BASE_URL` ARG 기본값 또는 deploy.yml 수정
