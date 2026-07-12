# /pr - PR 설명 작성 및 생성

## 역할

현재 브랜치와 base 브랜치의 차이를 분석하여 PR 설명을 작성한다.
사용자 승인 후 브랜치를 push하고 `gh pr create`로 PR을 생성할 수 있다.

## 실행 순서

### 1. 브랜치 및 변경사항 파악

```bash
git branch --show-current
git status -sb
git fetch origin main
git log origin/main..HEAD --oneline
git diff origin/main...HEAD --stat
git diff origin/main...HEAD
```

base 브랜치가 `main`이 아니면 실제 기본 브랜치를 확인하고 그 기준으로 비교한다. 로컬 브랜치가 아닌 **origin의 최신 상태**를 기준으로 한다.

### 2. PR 템플릿 확인

`.github/pull_request_template.md`가 있으면 해당 형식을 그대로 따른다.
없으면 아래 구조를 사용한다.

```md
# 요약

# 작업 내용

# 테스트 방법

# 기타
```

### 3. PR 설명 작성

다음 내용을 포함한다.

- 요약: 이 PR이 무엇을 하는지 한 문장
- 작업 내용: 기능/의도 단위 체크리스트
- 기술적 변경 포인트: API, 라우팅, 상태 관리, UI 구조 변경
- 테스트 방법: 실행한 명령어와 수동 확인 화면
- 배포 영향: 환경 변수, Vercel rewrite, API base URL 영향
- 보안/민감정보 영향: 토큰, 인증, 클라이언트 노출 값 변경 여부

### 4. PR 설명 저장 및 보고

`.ai-workspace/pr.md`에 저장하고 사용자에게 전문을 보여준다.

### 5. 브랜치 push 승인 대기

현재 브랜치의 upstream 및 미push 커밋 여부를 확인한다.

```bash
git branch --show-current
git status -sb
git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1
```

upstream이 없거나 미push 커밋이 있으면 실행할 명령어를 보여주고 승인 여부를 묻는다.

```bash
git push origin <현재 브랜치명>
```

### 6. PR 생성 승인 대기

push가 성공하면 PR 제목, PR 본문, 실행할 명령어를 보여주고 승인 여부를 묻는다.

```bash
gh pr create --title "<제목>" --body "$(cat .ai-workspace/pr.md)"
```

승인받은 경우에만 PR을 생성한다.

### 7. PR 생성 후 보고 및 상태 파일 정리

PR URL을 사용자에게 보고하고, `.ai-workspace/pr.md` 상단에 완료 기록을 추가한다
(다음 작업이 낡은 초안을 읽지 않게):

```text
> ✅ 완료 — PR: <URL> (생성일)
```
사용자가 merge를 원하면 `/merge` 절차로 이어간다.

## 주의사항

- main 브랜치에서 PR 생성 절차를 진행하지 않는다.
- push와 PR 생성은 각각 별도 승인 후에만 실행한다.
- force push 금지.
- 1000줄 이상 diff인 경우 전체 diff 대신 `--stat` 기반으로 요약하고 사용자에게 알린다.
