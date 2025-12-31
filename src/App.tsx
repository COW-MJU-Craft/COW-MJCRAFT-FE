import { Route, Routes } from 'react-router-dom';
import SiteLayout from './components/SiteLayout';
import MainPage from './pages/MainPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';

function Placeholder({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-heading text-3xl text-primary">{title}</h1>
      <p className="mt-2 text-slate-600">페이지 작업 예정</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<MainPage />} />

        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />

        <Route path="/about" element={<Placeholder title="명지공방 소개" />} />
        <Route path="/resources" element={<Placeholder title="무료 배포" />} />
        <Route path="/settlements" element={<Placeholder title="정산" />} />
        <Route path="/contact" element={<Placeholder title="문의" />} />
      </Route>
    </Routes>
  );
}
