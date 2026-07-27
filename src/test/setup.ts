import '@testing-library/jest-dom/vitest';

// Node 22+는 웹 스토리지 전역(localStorage/sessionStorage)을 노출하고, Node 25부터는
// 플래그 없이 기본 활성화된다. 반면 vitest의 jsdom 환경은 "이미 전역에 존재하는 키"를
// jsdom 구현으로 덮어쓰지 않으므로(populateGlobal의 `k in global` 검사), 테스트는
// jsdom Storage 대신 Node 네이티브 구현을 보게 된다.
// 이때 --localstorage-file 없이 실행하면 네이티브 localStorage는 Storage 프로토타입조차
// 없는 빈 객체라, localStorage.clear() 같은 호출이 전부 TypeError로 죽는다.
// (네이티브 sessionStorage는 정상 동작하므로 건드리지 않는다.)
// Node 22 CI에서는 전역이 없어 jsdom 구현이 그대로 쓰이므로 이 분기는 실행되지 않는다.
function isUsableStorage(value: unknown): value is Storage {
  return typeof (value as Storage | null | undefined)?.clear === 'function';
}

if (!isUsableStorage(globalThis.localStorage)) {
  // vitest가 jsdom window를 전역으로 흡수한 뒤라 원본 window를 직접 참조할 수 없다.
  // 같은 jsdom 문서 안에 iframe을 만들면 정상적인 Storage 인스턴스를 얻을 수 있다.
  const frame = document.createElement('iframe');
  document.body.appendChild(frame);
  const jsdomLocalStorage = frame.contentWindow?.localStorage;
  frame.remove();

  if (!isUsableStorage(jsdomLocalStorage)) {
    throw new Error('테스트 환경에서 jsdom localStorage를 확보하지 못했습니다.');
  }

  Object.defineProperty(globalThis, 'localStorage', {
    value: jsdomLocalStorage,
    configurable: true,
    writable: true,
  });
}
