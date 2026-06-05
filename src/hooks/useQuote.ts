import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client';
import type { Quote } from '../types';

interface UseQuoteResult {
  quote: Quote | null;
  loading: boolean;
  error: string | null;
}

export function useQuote(btcSats: number | null, debounceMs = 300): UseQuoteResult {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchQuote = useCallback(async (sats: number) => {
    setLoading(true);
    try {
      const q = await api.quote(sats);
      setQuote(q);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (btcSats == null || btcSats <= 0) {
      queueMicrotask(() => {
        setQuote(null);
        setError(null);
      });
      return;
    }

    timerRef.current = setTimeout(() => {
      fetchQuote(btcSats);
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [btcSats, debounceMs, fetchQuote]);

  return { quote, loading, error };
}
