import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { loadAdminContent, type AdminContent } from '../../../utils/admin/content';
import { introApi } from '../../../api/site/intro';
import IntroduceDetailView from '../../../features/introduce/IntroduceDetailView';

type FallbackDetail = {
  brandTitle?: string;
  brandSubtitle?: string;
  introTitle?: string;
  introSlogan?: string;
  introBody?: string;
  purposeTitle?: string;
  purposeDescription?: string;
  currentLogoTitle?: string;
  currentLogoDescription?: string;
  currentLogoImageKey?: string;
  logoHistories?: Array<{
    year?: string;
    imageKey?: string;
    description?: string;
  }>;
};

export default function AboutPage() {
  const [content] = useState<AdminContent>(() => loadAdminContent());

  const { data: detail } = useQuery({
    queryKey: ['introduceDetail'],
    queryFn: () => introApi.getDetail().then((d) => d ?? null),
  });

  const fallback: FallbackDetail = {
    brandTitle: content.about.headline,
    brandSubtitle: content.about.subheadline,
    introTitle: content.about.headline,
    introSlogan: content.about.subheadline,
    introBody: content.about.intro.join('\n'),
    purposeTitle: content.about.purposeTitle,
    purposeDescription: content.about.purposeBody.join('\n'),
    currentLogoTitle: content.about.logoTitle,
    currentLogoDescription: content.about.logoBody.join('\n'),
    logoHistories: [],
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <IntroduceDetailView data={detail ?? null} fallback={fallback} />
    </div>
  );
}
