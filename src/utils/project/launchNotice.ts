import type { ProjectLifecycleStatus } from '../../types/status';

type LaunchNoticeOfferParams = {
  /** 서버에 저장된 현재 상태. 신규 생성이면 null */
  savedStatus: ProjectLifecycleStatus | null;
  /** 이번 저장으로 반영할 상태 */
  nextStatus: ProjectLifecycleStatus;
  /** 이미 등록된 출시 공지 ID */
  launchNoticeId?: number | null;
};

/**
 * 이번 저장에서 서버가 출시 공지를 등록할 수 있는 상황인지 판단한다.
 * 백엔드 규칙과 동일: OPEN으로 "전환"될 때만, 이미 출시 공지가 없을 때만 등록된다.
 */
export function shouldOfferLaunchNotice({
  savedStatus,
  nextStatus,
  launchNoticeId,
}: LaunchNoticeOfferParams): boolean {
  if (nextStatus !== 'OPEN') return false;
  if (savedStatus === 'OPEN') return false;
  return launchNoticeId == null;
}
