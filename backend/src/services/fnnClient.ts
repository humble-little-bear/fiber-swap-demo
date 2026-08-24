import { config } from '../config.js';

interface RpcRequest {
  jsonrpc: '2.0';
  id: string;
  method: string;
  params: unknown[];
}

interface RpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: string;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

/**
 * Error returned by the FNN JSON-RPC endpoint. Swap routes surface these to
 * callers (502) so integrators can see validation details (e.g. the sha256
 * hash-algorithm requirement for receive_btc invoices) instead of a generic
 * 500. Messages originate from FNN/LND and contain no secrets.
 */
export class FnnRpcError extends Error {
  constructor(
    public readonly rpcCode: number,
    rpcMessage: string
  ) {
    super(`FNN RPC error [${rpcCode}]: ${rpcMessage}`);
    this.name = 'FnnRpcError';
  }
}

export async function fnnRpcCall<T>(method: string, params: unknown[] = []): Promise<T> {
  const body: RpcRequest = {
    jsonrpc: '2.0',
    id: Math.random().toString(36).slice(2),
    method,
    params,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(config.fnnRpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`FNN RPC HTTP error: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as RpcResponse<T>;

    if (data.error) {
      throw new FnnRpcError(data.error.code, data.error.message);
    }

    if (data.result === undefined) {
      throw new Error('FNN RPC returned undefined result');
    }

    return data.result;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkFnnHealth(): Promise<boolean> {
  try {
    await fnnRpcCall('node_info', []);
    return true;
  } catch (err) {
    console.error('FNN health check failed:', err);
    return false;
  }
}
