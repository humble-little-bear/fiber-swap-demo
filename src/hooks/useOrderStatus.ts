import { useState, useEffect, useRef } from 'react';
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
  const isMountedRef = useRef(true);
  const hasFetchedRef = useRef(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    isMountedRef.current = true;
    hasFetchedRef.current = false;

    if (!paymentHash) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    let interval = 2000;

    const tick = async () => {
      const isInitial = !hasFetchedRef.current;
      try {
        if (isInitial && isMountedRef.current) setLoading(true);
        const order = await getOrder(paymentHash);
        if (!isMountedRef.current) return;
        hasFetchedRef.current = true;
        setData(order);
        setError(null);

        if (!TERMINAL_STATES.includes(order.status) && isMountedRef.current) {
          interval = nextInterval(interval);
          timer = setTimeout(tick, interval);
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        hasFetchedRef.current = true;
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        if (isMountedRef.current) {
          interval = nextInterval(interval);
          timer = setTimeout(tick, interval);
        }
      } finally {
        if (isMountedRef.current && isInitial) {
          setLoading(false);
        }
      }
    };

    tick();

    return () => {
      isMountedRef.current = false;
      if (timer) clearTimeout(timer);
    };
  }, [paymentHash]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return { data, loading, error };
}
