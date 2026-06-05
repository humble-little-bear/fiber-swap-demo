import { useState, useEffect } from 'react';
import { getOrder } from '../api/client';
import type { CchOrder, CchOrderStatus } from '../types';

const TERMINAL_STATES: CchOrderStatus[] = ['Success', 'Failed'];

function nextInterval(current: number): number {
  return Math.min(current * 1.5, 10000);
}

export function useOrderStatus(paymentHash: string | undefined) {
  const [data, setData] = useState<CchOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!paymentHash) {
      // Reset state when paymentHash is cleared
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let interval = 2000;

    const tick = async () => {
      try {
        setLoading(true);
        const order = await getOrder(paymentHash);
        if (cancelled) return;
        setData(order);
        setError(null);

        if (!TERMINAL_STATES.includes(order.status)) {
          interval = nextInterval(interval);
          timer = setTimeout(tick, interval);
        }
      } catch (err) {
        if (cancelled) return;
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        interval = nextInterval(interval);
        timer = setTimeout(tick, interval);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [paymentHash]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return { data, loading, error };
}
