import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client';
import type { CchOrder, CchOrderStatus } from '../types';

const TERMINAL_STATES: CchOrderStatus[] = ['Success', 'Failed'];

interface UseOrderStatusResult {
  order: CchOrder | null;
  loading: boolean;
  error: string | null;
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export function useOrderStatus(paymentHash: string | null): UseOrderStatusResult {
  const [order, setOrder] = useState<CchOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);

  const fetchOrder = useCallback(async (hash: string) => {
    try {
      const o = await api.getOrder(hash);
      setOrder(o);
      setError(null);
      return o.status;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      return null;
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    attemptRef.current = 0;
    queueMicrotask(() => {
      setOrder(null);
      setError(null);
      setLoading(false);
    });

    if (!paymentHash) return;

    const poll = async () => {
      setLoading(true);
      const status = await fetchOrder(paymentHash);
      setLoading(false);

      if (status && TERMINAL_STATES.includes(status)) {
        return;
      }

      attemptRef.current += 1;
      const delay = clamp(2000 * Math.pow(1.5, attemptRef.current - 1), 2000, 10000);
      timerRef.current = setTimeout(poll, delay);
    };

    poll();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [paymentHash, fetchOrder]);

  return { order, loading, error };
}
