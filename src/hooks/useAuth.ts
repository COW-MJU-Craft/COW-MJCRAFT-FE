import { useEffect, useMemo, useState } from 'react';
import {
  AUTH_CHANGED_EVENT,
  getDisplayUserName,
  isLoggedIn,
} from '../utils/auth/auth';

export function useAuth() {
  const [loggedIn, setLoggedIn] = useState<boolean>(() => isLoggedIn());
  const [userName, setUserName] = useState<string>(() => getDisplayUserName());

  useEffect(() => {
    const sync = () => {
      setLoggedIn(isLoggedIn());
      setUserName(getDisplayUserName());
    };

    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return useMemo(
    () => ({
      isLoggedIn: loggedIn,
      userName,
    }),
    [loggedIn, userName],
  );
}
