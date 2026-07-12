# /merge - 승인 후 PR 병합

## 역할

사용자가 명시적으로 PR 병합을 요청했을 때 PR 상태를 확인하고, 사용자 승인 후 병합한다.
승인 없이 `gh pr merge`를 실행하면 안 된다.

## 실행 순서

### 1. 현재 PR 확인

```bash
gh pr view --json number,title,url,headRefName,baseRefName,mergeStateStatus,reviewDecision,statusCheckRollup
```

현재 브랜치에 연결된 PR이 없으면 중단하고 사용자에게 보고한다.

### 2. 체크 및 리뷰 확인

```bash
gh pr checks
gh pr view --json reviews,comments,latestReviews,reviewDecision,statusCheckRollup,files
```

확인 대상:

- GitHub Actions 등 필수 체크 결과
- 사람 리뷰의 수정 요청 또는 승인 여부
- 리뷰 봇 코멘트와 미해결 제안
- 환경 변수, 인증, 결제/주문/신청 흐름 영향 여부

### 3. 수정 필요 사항 보고

리뷰어 또는 리뷰 봇이 수정 요청/제안/미해결 코멘트를 남겼다면 병합을 바로 진행하지 않는다.
파일/라인/요지 기준으로 요약하고 사용자 선택을 기다린다.

```text
리뷰 코멘트에서 수정 필요 사항이 발견됐습니다.
1. <파일:라인> - <요지>
2. <파일:라인> - <요지>

"수정해줘"라고 하시면 반영 후 다시 검증하겠습니다.
"그냥 머지해줘"라고 하시면 현재 상태로 merge 승인 단계로 진행하겠습니다.
```

### 4. 병합 가능 여부 확인

다음 조건을 확인한다.

- base 브랜치가 올바른지
- PR 상태가 병합 가능한지
- 필수 체크가 통과했는지
- 리뷰 상태가 적절한지
- 미해결 수정 요청을 사용자에게 보고했는지

체크 실패, 리뷰 미승인, 충돌이 있으면 병합하지 않고 중단한다.

### 5. 병합 방식 제안

프로젝트 기본값은 `squash`를 우선 제안한다.

```bash
gh pr merge <PR번호> --squash --delete-branch
```

### 6. 사용자 승인 대기

PR 번호, 제목, URL, 병합 방식, 실행할 명령어를 보여주고 승인 여부를 묻는다.

승인받은 경우에만 `gh pr merge`를 실행한다.

### 7. 병합 후 보고

병합 결과와 브랜치 삭제 여부를 보고한다.
로컬 브랜치 정리는 별도 요청이 있을 때만 수행한다.

## 주의사항

- 사용자가 "머지", "병합", "merge"를 명시적으로 요청한 경우에만 실행한다.
- 승인 없이 merge 금지.
- force push 금지.
- main 브랜치 직접 커밋 금지.
