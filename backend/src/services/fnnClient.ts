import { config } from '../config.js';

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params: unknown[];
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

let requestId = 0;

export async function fnnCall<T = unknown>(method: string, params: unknown[] = []): Promise<T> {
  const id = ++requestId;
  const body: JsonRpcRequest = { jsonrpc: '2.0', id, method, params };

  const res = await fetch(config.fnnRpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`FNN HTTP error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as JsonRpcResponse;

  if (data.error) {
    throw new Error(`FNN RPC error [${data.error.code}]: ${data.error.message}`);
  }

  return data.result as T;
}

export interface NodeInfoResult {
  version: string;
  commit_hash: string;
  public_key: string;
  node_name?: string;
  addresses: string[];
  chain_hash: string;
  open_channels: number;
  pending_channels: number;
  peers_count: number;
}

export interface SendBtcParams {
  btc_pay_req: string;
  currency?: string;
}

export interface SendBtcResult {
  payment_hash: string;
  ckb_invoice: string;
}

export interface GetCchOrderParams {
  payment_hash: string;
}

export type CchOrderStatus =
  | 'Pending'
  | 'IncomingAccepted'
  | 'OutgoingInFlight'
  | 'Success'
  | 'Failed';

export interface CchOrderResult {
  payment_hash: string;
  status: CchOrderStatus;
  timestamp: string;
  btc_pay_req?: string;
  ckb_invoice?: string;
}
