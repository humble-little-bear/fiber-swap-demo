import { useState, useEffect, useRef, useCallback } from 'react';
import { postQuote } from '../api/client';
import type { Quote } from '../types';

export function useQuote() {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        setQuote(q);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setQuote(null);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return { quote, loading, error, requestQuote };
}
