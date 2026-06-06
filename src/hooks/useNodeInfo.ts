import { useState, useEffect, useRef, useCallback } from 'react';
import { getNodeInfo } from '../api/client';
import type { NodeInfo } from '../types';

export function useNodeInfo(pollInterval = 10000) {
  const [data, setData] = useState<NodeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const fetchInfo = useCallback(async () => {
    try {
      const info = await getNodeInfo();
      if (!isMountedRef.current) return;
      setData(info);
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err : new Error(String(err)));
      setData((prev) => (prev ? { ...prev, online: false } : null));
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    const tick = async () => {
      if (!isMountedRef.current) return;
      await fetchInfo();
      if (isMountedRef.current) {
        timerRef.current = setTimeout(tick, pollInterval);
      }
    };

    tick();

    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [fetchInfo, pollInterval]);

  return { data, loading, error, refetch: fetchInfo };
}
