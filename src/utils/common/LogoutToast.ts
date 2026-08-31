import { toast } from './toast';

export function showLogoutToast() {
  toast({ message: '로그아웃 되었습니다!', tone: 'success' });
}
