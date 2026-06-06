export interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoURI?: string;
  balance?: string;
  price?: number;
}

export interface Quote {
  btc_sats: number;
  ckb_amount: string; // hex string
  rate: string;
  fee_estimate: string;
  valid_until: string; // ISO 8601
}

export type CchOrderStatus =
  | 'Pending'
  | 'IncomingAccepted'
  | 'OutgoingInFlight'
  | 'Success'
  | 'Failed';

export interface CchOrder {
  order_id: string;
  payment_hash: string;
  incoming_invoice: string; // Fiber invoice to pay
  outgoing_pay_req: string; // Original BTC invoice
  status: CchOrderStatus;
  created_at: string;
}

export interface NodeInfo {
  node_id: string;
  channel_count: number;
  peer_count: number;
  online: boolean;
}
