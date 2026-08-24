import type { LightningNetwork } from '../utils/invoice';

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
  cwbtc_amount: string; // raw cWBTC hex string, 8 decimals
  ckb_amount?: string; // deprecated compatibility field
  rate: string;
  fee_estimate: string;
  valid_until: string; // ISO 8601
}

export type SwapDirection = 'ckb-to-btc' | 'btc-to-ckb';

export type CchOrderStatus =
  | 'Pending'
  | 'IncomingAccepted'
  | 'OutgoingInFlight'
  | 'OutgoingSuccess'
  | 'Success'
  | 'Failed';

export interface CchOrder {
  order_id: string;
  payment_hash: string;
  /**
   * Swap direction. `ckb-to-btc`: pay cWBTC on Fiber, BTC goes to the pasted
   * Lightning invoice. `btc-to-ckb`: pay the returned Lightning invoice with
   * BTC, cWBTC arrives at the Fiber invoice you created. Older backends may
   * omit this field; treat undefined as `ckb-to-btc`.
   */
  direction?: SwapDirection;
  incoming_invoice: string; // Invoice the payer pays: Fiber for ckb-to-btc, Lightning for btc-to-ckb
  outgoing_pay_req: string; // The pay req on the other network (BTC invoice or your Fiber invoice)
  amount_sats?: string; // hex string, sats including CCH fee (as reported by FNN)
  fee_sats?: string; // hex string, CCH operator fee
  network?: LightningNetwork;
  status: CchOrderStatus;
  created_at: string;
}

export interface NodeInfo {
  node_id: string;
  channel_count: number;
  peer_count: number;
  online: boolean;
}

export interface FaucetClaimResponse {
  success: boolean;
  message: string;
  amount?: string;
  amount_display?: string;
  tx_hash?: string;
  cooldown_until?: number;
}

export interface FaucetInfo {
  token: 'cWBTC';
  decimals: number;
  amount: string;
  amount_display: string;
  cooldown_seconds: number;
}
