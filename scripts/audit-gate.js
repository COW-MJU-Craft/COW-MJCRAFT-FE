// npm audit 게이트.
//
// `npm audit`은 개별 권고 예외를 지원하지 않아, 패치 경로가 없는 권고 하나 때문에
// 게이트 전체를 끄거나 문턱을 낮추게 된다. 그러면 이후에 들어올 진짜 취약점을 놓친다.
// 그래서 --json 결과에서 허용 목록만 걸러내고 나머지 high 이상은 그대로 실패시킨다.
//
// ALLOWLIST에 항목을 추가할 때는 반드시 "왜 해당 없는지"와 "언제 제거할지"를 함께 적는다.

import { spawnSync } from 'node:child_process';

const FAIL_LEVELS = new Set(['high', 'critical']);

const ALLOWLIST = new Map([
  [
    'GHSA-qwww-vcr4-c8h2',
    'react-router RSC Mode CSRF — 이 앱은 BrowserRouter 기반 Vite SPA라 RSC 라우트가 없어 해당 없음. ' +
      'react-router-dom이 react-router를 정확한 버전으로 고정하고 8.x가 없어 패치 경로가 막혀 있다. ' +
      '7.x 백포트가 나오면 제거할 것.',
  ],
  [
    'GHSA-mh99-v99m-4gvg',
    'brace-expansion DoS — eslint > minimatch@3 경유 개발 의존성이라 런타임 번들에 포함되지 않는다. ' +
      'minimatch@3이 ^1.1.7을 요구하는데 1.x에는 패치 릴리스가 없다. ' +
      'eslint가 minimatch를 올리면 제거할 것.',
  ],
]);

const result = spawnSync('npm', ['audit', '--json'], {
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});

// npm audit은 취약점이 있으면 종료 코드가 0이 아니므로, 코드가 아니라 출력 유무로 판단한다.
if (!result.stdout) {
  console.error('npm audit 실행 실패');
  if (result.stderr) console.error(result.stderr);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  console.error('npm audit JSON 파싱 실패. 원본 출력 앞부분:');
  console.error(result.stdout.slice(0, 2000));
  process.exit(1);
}

// via 배열의 객체 항목만 실제 권고다. 문자열 항목은 다른 패키지를 통해 전파된
// 결과라서 중복으로 세지 않는다.
const advisories = new Map();
for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vulnerability.via ?? []) {
    if (typeof via !== 'object' || !via.url) continue;
    const id = via.url.split('/').pop();
    advisories.set(id, {
      id,
      name: via.name,
      severity: via.severity,
      title: via.title,
      url: via.url,
    });
  }
}

const blocking = [];
const allowed = [];
for (const advisory of advisories.values()) {
  if (!FAIL_LEVELS.has(advisory.severity)) continue;
  (ALLOWLIST.has(advisory.id) ? allowed : blocking).push(advisory);
}

for (const advisory of allowed) {
  console.log(`허용됨    ${advisory.id}  ${advisory.name}`);
  console.log(`          ${ALLOWLIST.get(advisory.id)}`);
}

// 해결된 권고를 허용 목록에 남겨두면 나중에 같은 ID의 새 문제를 가린다.
for (const id of ALLOWLIST.keys()) {
  if (!advisories.has(id)) {
    console.log(`정리 필요  ${id} — 더 이상 보고되지 않는다. ALLOWLIST에서 제거할 것.`);
  }
}

if (blocking.length === 0) {
  console.log(`\nhigh 이상 차단 대상 없음 (허용 ${allowed.length}건).`);
  process.exit(0);
}

console.error(`\nhigh 이상 취약점 ${blocking.length}건 — 허용 목록에 없음:`);
for (const advisory of blocking) {
  console.error(`  ${advisory.severity.padEnd(8)} ${advisory.name}  ${advisory.title ?? ''}`);
  console.error(`           ${advisory.url}`);
}
process.exit(1);
