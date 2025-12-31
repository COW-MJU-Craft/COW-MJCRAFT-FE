import { Outlet } from 'react-router-dom';
import Header from './Header';

export default function SiteLayout() {
  return (
    <div className="min-h-screen bg-app-bg text-slate-900 font-body">
      <Header />
      <main className="pt-16">
        <Outlet />
      </main>

      <footer className="mt-20 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-600">
          <div className="font-heading text-base text-primary">명지공방</div>
          <div className="mt-2">
            제작: 명지대학교 IT 서비스 개발 중앙 동아리 COW
          </div>
          <div className="mt-1">
            © {new Date().getFullYear()} Myongji Workshop
          </div>
        </div>
      </footer>
    </div>
  );
}
