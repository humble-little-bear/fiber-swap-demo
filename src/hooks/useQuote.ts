import { useState, useEffect, useRef, useCallback } from 'react';
import { postQuote } from '../api/client';
import type { Quote } from '../types';

export function useQuote() {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const requestQuote = useCallback((btcSats: number) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!btcSats || btcSats <= 0) {
      setQuote(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    debounceRef.current = setTimeout(async () => {
      try {
        const q = await postQuote(btcSats);
        if (!isMountedRef.current) return;
        setQuote(q);
      } catch (err) {
        if (!isMountedRef.current) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setQuote(null);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    }, 300);
  }, []);

  return { quote, loading, error, requestQuote };
}
