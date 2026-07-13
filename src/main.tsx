import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import './index.css';
import App from './App';
import ToastProvider from './components/toast/ToastProvider';
import ConfirmProvider from './components/confirm/ConfirmProvider';
import { AUTH_CHANGED_EVENT } from './utils/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3,
      retry: 1,
    },
  },
});

// 로그인/로그아웃/401(세션 만료)로 인증 상태가 바뀌면 캐시된 서버 데이터를 비운다.
// 그대로 두면 로그아웃 후 다른 관리자가 로그인했을 때 이전 세션의 데이터가
// 화면에 잠깐 보일 수 있다.
window.addEventListener(AUTH_CHANGED_EVENT, () => {
  queryClient.clear();
});

const showQueryDevtools =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_RQ_DEVTOOLS !== 'false';

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <ToastProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConfirmProvider>
    </ToastProvider>
    {showQueryDevtools && (
      <ReactQueryDevtools
        initialIsOpen={false}
        buttonPosition="bottom-left"
      />
    )}
  </QueryClientProvider>
);
