import type { Quote, CchOrder, NodeInfo } from '../types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export async function getHealth(): Promise<{ status: string; fnnConnected: boolean }> {
  return fetchJson('/api/health');
}

export async function getNodeInfo(): Promise<NodeInfo> {
  const data = await fetchJson<NodeInfo & { addresses?: string[] }>('/api/node-info');
  return { ...data, online: true };
}

export async function postQuote(btcSats: number): Promise<Quote> {
  return fetchJson('/api/quote', {
    method: 'POST',
    body: JSON.stringify({ btc_sats: btcSats }),
  });
}

export async function postSwapCkbToBtc(btcPayReq: string): Promise<CchOrder> {
  return fetchJson('/api/swap/ckb-to-btc', {
    method: 'POST',
    body: JSON.stringify({ btc_pay_req: btcPayReq }),
  });
}

export async function getOrder(paymentHash: string): Promise<CchOrder> {
  return fetchJson(`/api/order/${encodeURIComponent(paymentHash)}`);
}
