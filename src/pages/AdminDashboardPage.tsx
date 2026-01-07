import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Reveal from '../components/Reveal';
import { adminApi } from '../api/admin';
import {
  loadAdminContent,
  saveAdminContent,
  type AdminContent,
} from '../utils/adminContent';
import { loadFeedbackEntries, type FeedbackEntry } from '../utils/feedbackStore';
import { loadAdminSettlements } from '../utils/adminSettlements';
import type { SettlementReport } from '../types/settlements';
import AdminAboutSection from './admin/AdminAboutSection';
import AdminFeedbackFormSection from './admin/AdminFeedbackFormSection';
import AdminFeedbackListSection from './admin/AdminFeedbackListSection';
import AdminLinktreeSection from './admin/AdminLinktreeSection';
import AdminLinksSection from './admin/AdminLinksSection';
import AdminProjectsSection from './admin/AdminProjectsSection';
import AdminSettlementsSection from './admin/AdminSettlementsSection';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const section = location.hash.replace('#', '') || 'about';
  const [checking, setChecking] = useState(true);
  const [meName, setMeName] = useState<string | null>(null);
  const [content, setContent] = useState<AdminContent>(() =>
    loadAdminContent()
  );
  const [dirty, setDirty] = useState(false);
  const [entries, setEntries] = useState<FeedbackEntry[]>(() =>
    loadFeedbackEntries()
  );
  const [settlements, setSettlements] = useState<SettlementReport[]>(() =>
    loadAdminSettlements()
  );
  const [settlementsDirty, setSettlementsDirty] = useState(false);
  const projectOptionsByTerm = useMemo(() => {
    const map: Record<string, string[]> = {};
    content.projectsIntro.forEach((project) => {
      const term = project.term.trim();
      const title = project.title.trim();
      if (!term || !title) return;
      const list = map[term] ?? [];
      if (!list.includes(title)) list.push(title);
      map[term] = list;
    });
    return map;
  }, [content.projectsIntro]);

  useEffect(() => {
    let active = true;
    adminApi
      .me()
      .then((me) => {
        if (!active) return;
        setMeName(me.username);
        setChecking(false);
      })
      .catch(() => {
        if (!active) return;
        navigate('/admin/login');
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  if (checking) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-slate-600">
        관리자 권한 확인 중...
      </div>
    );
  }

  const updateContent = (next: AdminContent) => {
    setContent(next);
    setDirty(true);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Reveal>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-3xl text-primary">
              관리자 대시보드
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {meName ? `${meName} 계정으로 로그인 됨` : '관리자 권한'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                saveAdminContent(content);
                setDirty(false);
              }}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
            >
              {dirty ? '변경사항 저장' : '저장됨'}
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await adminApi.logout();
                } finally {
                  navigate('/');
                }
              }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              로그아웃
            </button>
          </div>
        </div>
      </Reveal>

      {section === 'about' && (
        <AdminAboutSection content={content} updateContent={updateContent} />
      )}

      {section === 'links' && (
        <AdminLinksSection content={content} updateContent={updateContent} />
      )}

      {section === 'linktree' && (
        <AdminLinktreeSection content={content} updateContent={updateContent} />
      )}

      {section === 'projects' && (
        <AdminProjectsSection content={content} updateContent={updateContent} />
      )}

      {section === 'settlements' && (
        <AdminSettlementsSection
          settlements={settlements}
          setSettlements={setSettlements}
          settlementsDirty={settlementsDirty}
          setSettlementsDirty={setSettlementsDirty}
          projectOptionsByTerm={projectOptionsByTerm}
        />
      )}

      {section === 'form' && (
        <AdminFeedbackFormSection
          content={content}
          updateContent={updateContent}
        />
      )}

      {section === 'feedback' && (
        <AdminFeedbackListSection entries={entries} setEntries={setEntries} />
      )}
    </div>
  );
}
