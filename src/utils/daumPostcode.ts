// 다음(Daum) 우편번호 서비스 스크립트를 지연 로드한다.
// 이전에는 index.html에서 모든 페이지에 무조건 스크립트를 심어놨는데,
// 실제로 주소 검색을 쓰는 화면은 일부(주문/마이페이지)뿐이라
// 사용 시점에만 불러오도록 바꿔 불필요한 서드파티 스크립트 로드를 줄인다.
export type DaumPostcodeResult = {
  zonecode: string;
  roadAddress?: string;
  jibunAddress?: string;
};

type DaumPostcodeConstructor = {
  new (options: {
    oncomplete: (data: DaumPostcodeResult) => void;
  }): {
    open: (options?: { left?: number; top?: number }) => void;
  };
};

declare global {
  interface Window {
    daum?: {
      Postcode: DaumPostcodeConstructor;
    };
  }
}

const SCRIPT_ID = 'daum-postcode-script';
const SCRIPT_SRC =
  'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

let loadPromise: Promise<void> | null = null;

export function loadDaumPostcodeScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.daum?.Postcode) return Promise.resolve();

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(
      SCRIPT_ID,
    ) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => {
        loadPromise = null;
        reject(new Error('다음 우편번호 스크립트를 불러오지 못했어요.'));
      });
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('다음 우편번호 스크립트를 불러오지 못했어요.'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
