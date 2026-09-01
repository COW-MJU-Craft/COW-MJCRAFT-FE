import { useEffect, useState } from 'react';
import { formsApi } from '../api/site/forms';
import type { ActiveFormResponse } from '../api/site/forms';

export function useActiveForm() {
  const [data, setData] = useState<ActiveFormResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    formsApi
      .getActiveForm()
      .then((res) => setData(res))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
