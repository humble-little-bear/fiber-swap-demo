import { useState, useCallback, useEffect, useRef } from 'react';
import { postSwapCkbToBtc } from '../api/client';
import type { CchOrder } from '../types';

export function useSwap() {
  const [order, setOrder] = useState<CchOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const createOrder = useCallback(async (btcPayReq: string) => {
    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const o = await postSwapCkbToBtc(btcPayReq);
      if (!isMountedRef.current) return null;
      setOrder(o);
      return o;
    } catch (err) {
      if (!isMountedRef.current) return null;
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      return null;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const reset = useCallback(() => {
    setOrder(null);
    setError(null);
    setLoading(false);
  }, []);

  return { order, loading, error, createOrder, reset };
}
