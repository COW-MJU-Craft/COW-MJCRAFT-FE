#!/usr/bin/env bash
#
# check-agent-config.sh — 에이전트 설정 정합성 점검
#
# AGENTS.md는 커맨드 원본이 .agents/commands/에 있고
# .claude/commands, .codex/commands는 그 심링크라고 명시한다.
# 이 스크립트는 그 전제가 실제로 맞는지 확인한다:
#   1. .claude/commands, .codex/commands가 .agents/commands를 가리키는 심링크인지
#   2. AGENTS.md 커맨드 테이블에 나열된 각 명령이 .agents/commands/*.md로 실제 존재하는지
#
# 실패 시 non-zero exit — CI나 로컬 점검용으로 사용한다.

set -u

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root" || exit 1

fail=0

# 1. 심링크 확인
check_symlink() {
    local link="$1"
    local expected_target="$2"

    if [ ! -e "$link" ] && [ ! -L "$link" ]; then
        echo "[check-agent-config] 실패: $link 가 존재하지 않습니다." >&2
        fail=1
        return
    fi

    if [ ! -L "$link" ]; then
        echo "[check-agent-config] 실패: $link 가 심링크가 아닙니다." >&2
        fail=1
        return
    fi

    local actual_target
    actual_target="$(readlink "$link")"
    if [ "$actual_target" != "$expected_target" ]; then
        echo "[check-agent-config] 실패: $link -> $actual_target (기대값: $expected_target)" >&2
        fail=1
    fi
}

check_symlink ".claude/commands" "../.agents/commands"
check_symlink ".codex/commands" "../.agents/commands"

# 2. AGENTS.md 커맨드 테이블과 실제 파일 대조
if [ ! -f "AGENTS.md" ]; then
    echo "[check-agent-config] 실패: AGENTS.md를 찾을 수 없습니다." >&2
    exit 1
fi

commands="$(grep -oE '^\| `/[a-z]+`' AGENTS.md | grep -oE '/[a-z]+' | tr -d '/')"

if [ -z "$commands" ]; then
    echo "[check-agent-config] 경고: AGENTS.md에서 커맨드 테이블을 찾지 못했습니다. 형식이 바뀌었는지 확인하세요." >&2
fi

for cmd in $commands; do
    if [ ! -f ".agents/commands/${cmd}.md" ]; then
        echo "[check-agent-config] 실패: AGENTS.md에 문서화된 /$cmd 명령의 .agents/commands/${cmd}.md 파일이 없습니다." >&2
        fail=1
    fi
done

if [ "$fail" -eq 0 ]; then
    echo "[check-agent-config] 통과: 심링크와 커맨드 문서가 모두 일치합니다."
    exit 0
else
    exit 1
fi
