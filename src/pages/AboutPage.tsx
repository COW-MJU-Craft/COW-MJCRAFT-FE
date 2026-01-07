import { useMemo } from 'react';
import Reveal from '../components/Reveal';
import BrandIcon from '../components/BrandIcon';
import mjucraftLogo from '../assets/mjucraftLogo.png';
import { loadAdminContent } from '../utils/adminContent';

export default function AboutPage() {
  const content = useMemo(() => loadAdminContent(), []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <Reveal>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div>
            <h1 className="font-heading text-3xl text-primary">
              {content.about.headline}
            </h1>
            <p className="mt-3 text-slate-700">{content.about.subheadline}</p>
            <div className="mt-6 space-y-3 text-sm text-slate-600">
              {content.about.intro.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center">
            <img
              src={mjucraftLogo}
              alt="명지공방 로고"
              className="mx-auto h-40 w-90 rounded-2xl bg-slate-50 object-contain"
            />
            <p className="mt-4 text-sm font-bold text-slate-700">
              {content.about.footerNote}
            </p>
          </div>
        </div>
      </Reveal>

      <Reveal delayMs={80} className="mt-12 rounded-3xl bg-white p-8">
        <h2 className="font-heading text-xl text-slate-900">
          {content.about.purposeTitle}
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-600">
          {content.about.purposeBody.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Reveal>

      <Reveal delayMs={120} className="mt-10 rounded-3xl bg-white p-8">
        <h2 className="font-heading text-xl text-slate-900">
          {content.about.logoTitle}
        </h2>
        <div className="mt-4 space-y-3 text-sm text-slate-600">
          {content.about.logoBody.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </Reveal>

      <Reveal delayMs={160} className="mt-10 rounded-3xl bg-white p-8">
        <h2 className="font-heading text-xl text-slate-900">공식 링크</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <a
            href={content.links.instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <BrandIcon kind="instagram" />
            인스타그램 바로가기
          </a>
          <a
            href={content.links.kakaoUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <BrandIcon kind="kakao" />
            카카오톡 오픈채팅 바로가기
          </a>
        </div>
      </Reveal>

      <Reveal delayMs={200} className="mt-10 rounded-3xl bg-white p-8">
        <h2 className="font-heading text-xl text-slate-900">프로젝트 소개</h2>
        <div className="mt-4 space-y-4">
          {content.projectsIntro.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
              등록된 프로젝트 소개가 없어요.
            </div>
          ) : (
            content.projectsIntro.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-bold text-primary">
                    {item.term}
                  </div>
                  <div className="text-xs text-slate-500">{item.date}</div>
                </div>
                <div className="mt-2 text-base font-bold text-slate-900">
                  {item.title}
                </div>
                <p className="mt-2 text-sm text-slate-600">{item.summary}</p>
                {item.links.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.links
                      .filter((l) => l.url.trim().length > 0)
                      .map((link) => (
                        <a
                          key={`${item.id}-${link.label}`}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          {link.label}
                        </a>
                      ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Reveal>
    </div>
  );
}
