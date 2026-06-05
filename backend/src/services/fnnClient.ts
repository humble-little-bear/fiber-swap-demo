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

export async function fnnRpcCall<T>(method: string, params: unknown[] = []): Promise<T> {
  const body: RpcRequest = {
    jsonrpc: '2.0',
    id: Math.random().toString(36).slice(2),
    method,
    params,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  const res = await fetch(config.fnnRpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!res.ok) {
    throw new Error(`FNN RPC HTTP error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as RpcResponse<T>;

  if (data.error) {
    throw new Error(`FNN RPC error [${data.error.code}]: ${data.error.message}`);
  }

  if (data.result === undefined) {
    throw new Error('FNN RPC returned undefined result');
  }

  return data.result;
}

export async function checkFnnHealth(): Promise<boolean> {
  try {
    await fnnRpcCall('node_info', []);
    return true;
  } catch {
    return false;
  }
}
