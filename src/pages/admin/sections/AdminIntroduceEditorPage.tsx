import Reveal from '../../../components/ui/Reveal';
import AdminIntroduceDetailEditor from './AdminIntroduceDetailEditor';
import AdminIntroduceMainEditor from './AdminIntroduceMainEditor';

type IntroduceTab = 'main' | 'detail';

type AdminIntroduceEditorPageProps = {
  activeTab: IntroduceTab;
  onTabChange: (tab: IntroduceTab) => void;
};

const TAB_ITEMS: Array<{ label: string; value: IntroduceTab }> = [
  { label: '메인', value: 'main' },
  { label: '상세', value: 'detail' },
];

export default function AdminIntroduceEditorPage({
  activeTab,
  onTabChange,
}: AdminIntroduceEditorPageProps) {
  return (
    <>
      <Reveal id="about" delayMs={80} className="mt-8 rounded-3xl bg-white p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl text-slate-900">소개 수정</h2>
            <p className="mt-2 text-sm text-slate-600">
              탭을 전환해서 메인/상세 소개를 편집하세요.
            </p>
          </div>
          <div className="flex rounded-full bg-slate-100 p-1">
            {TAB_ITEMS.map((tab) => {
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => onTabChange(tab.value)}
                  className={[
                    'rounded-full px-4 py-2 text-xs font-bold transition-colors',
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-slate-600 hover:bg-white',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </Reveal>
      {activeTab === 'main' && <AdminIntroduceMainEditor />}
      {activeTab === 'detail' && <AdminIntroduceDetailEditor />}
    </>
  );
}
