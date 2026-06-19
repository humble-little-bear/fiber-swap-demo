import { useState, useEffect, useRef, useCallback } from 'react';
import { postQuote } from '../api/client';
import type { Quote } from '../types';

export function useQuote() {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  const requestQuote = useCallback((btcSats: number) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    if (!btcSats || btcSats <= 0) {
      setQuote(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const q = await postQuote(btcSats, controller.signal);
        if (!isMountedRef.current) return;
        setQuote(q);
      } catch (err) {
        if (!isMountedRef.current) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
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
