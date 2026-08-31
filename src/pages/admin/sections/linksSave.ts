import type { AdminContent } from '../../../utils/admin/content';
import { snsAdminApi } from '../../../api/site/sns';

export async function saveLinksToApi(content: AdminContent) {
  const instagramUrl = (content.links.instagramUrl ?? '').trim();
  const kakaoUrl = (content.links.kakaoUrl ?? '').trim();

  const tasks: Promise<void>[] = [];
  if (instagramUrl)
    tasks.push(snsAdminApi.upsertInstagram({ url: instagramUrl }));
  if (kakaoUrl) tasks.push(snsAdminApi.upsertKakao({ url: kakaoUrl }));

  if (tasks.length === 0) {
    return { updated: false, message: '반영할 링크가 없어요.' };
  }

  await Promise.all(tasks);

  // 플로팅 즉시 갱신
  window.dispatchEvent(new Event('sns-updated'));

  return { updated: true, message: 'SNS 링크가 저장됐어요.' };
}
