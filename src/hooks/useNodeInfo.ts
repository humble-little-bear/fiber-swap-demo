import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { NodeInfo } from '../types';

interface UseNodeInfoResult {
  data: NodeInfo | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useNodeInfo(pollInterval = 30000): UseNodeInfoResult {
  const [data, setData] = useState<NodeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNodeInfo = useCallback(async () => {
    try {
      const info = await api.nodeInfo();
      setData(info);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setData((prev) =>
        prev
          ? { ...prev, online: false }
          : { node_id: '', channel_count: 0, peer_count: 0, online: false }
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(fetchNodeInfo, pollInterval);
    queueMicrotask(fetchNodeInfo);
    return () => clearInterval(id);
  }, [fetchNodeInfo, pollInterval]);

  return { data, loading, error, refetch: fetchNodeInfo };
}
