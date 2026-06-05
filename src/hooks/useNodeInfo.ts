import { useState, useEffect, useRef, useCallback } from 'react';
import { getNodeInfo } from '../api/client';
import type { NodeInfo } from '../types';

export function useNodeInfo(pollInterval = 10000) {
  const [data, setData] = useState<NodeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchInfo = useCallback(async () => {
    try {
      const info = await getNodeInfo();
      setData(info);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setData((prev) => (prev ? { ...prev, online: false } : null));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      await fetchInfo();
      if (!cancelled) {
        timerRef.current = setTimeout(tick, pollInterval);
      }
    };

    tick();

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [fetchInfo, pollInterval]);

  return { data, loading, error, refetch: fetchInfo };
}
