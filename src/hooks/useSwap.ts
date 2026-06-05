import { useState, useCallback } from 'react';
import { api } from '../api/client';
import type { SwapResponse } from '../types';

interface UseSwapResult {
  order: SwapResponse | null;
  loading: boolean;
  error: string | null;
  createOrder: (btcPayReq: string) => Promise<SwapResponse>;
  reset: () => void;
}

export function useSwap(): UseSwapResult {
  const [order, setOrder] = useState<SwapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrder = useCallback(async (btcPayReq: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.swapCkbToBtc(btcPayReq);
      setOrder(res);
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      throw err;
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
