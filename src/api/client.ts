import type { Quote, NodeInfo, SwapResponse, CchOrder } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  health(): Promise<{ status: string; fnn: string }> {
    return request('/api/health');
  },

  nodeInfo(): Promise<NodeInfo> {
    return request('/api/node-info');
  },

  quote(btcSats: number): Promise<Quote> {
    return request('/api/quote', {
      method: 'POST',
      body: JSON.stringify({ btc_sats: btcSats, currency: 'Fibt' }),
    });
  },

  swapCkbToBtc(btcPayReq: string): Promise<SwapResponse> {
    return request('/api/swap/ckb-to-btc', {
      method: 'POST',
      body: JSON.stringify({ btc_pay_req: btcPayReq, currency: 'Fibt' }),
    });
  },

  getOrder(paymentHash: string): Promise<CchOrder> {
    return request(`/api/order/${encodeURIComponent(paymentHash)}`);
  },
};
