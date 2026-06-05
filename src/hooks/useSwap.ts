import { useState, useCallback } from 'react';
import { postSwapCkbToBtc } from '../api/client';
import type { CchOrder } from '../types';

export function useSwap() {
  const [order, setOrder] = useState<CchOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createOrder = useCallback(async (btcPayReq: string) => {
    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const o = await postSwapCkbToBtc(btcPayReq);
      setOrder(o);
      return o;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setOrder(null);
    setError(null);
    setLoading(false);
  }, []);

  return { order, loading, error, createOrder, reset };
}
