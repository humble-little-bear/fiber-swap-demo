/** Direction of a CCH swap order. */
export type SwapDirection = 'ckb-to-btc' | 'btc-to-ckb';

/**
 * FNN serializes a CCH invoice as a single-key enum object —
 * `{ Fiber: "fibt..." }` for the Fiber leg or `{ Lightning: "lntb..." }` for
 * the Lightning leg. `send_btc` orders collect a Fiber invoice; `receive_btc`
 * orders collect a Lightning invoice.
 */
export type CchInvoiceValue =
  | string
  | { Fiber?: string; Lightning?: string }
  | null
  | undefined;

export interface ExtractedCchInvoice {
  invoice: string;
  /** Which network leg this invoice belongs to, when known. */
  leg: 'fiber' | 'lightning' | null;
}

export function extractCchInvoice(value: CchInvoiceValue): ExtractedCchInvoice {
  if (!value) return { invoice: '', leg: null };
  if (typeof value === 'string') return { invoice: value, leg: null };
  if (typeof value.Fiber === 'string') return { invoice: value.Fiber, leg: 'fiber' };
  if (typeof value.Lightning === 'string') return { invoice: value.Lightning, leg: 'lightning' };
  return { invoice: '', leg: null };
}

/**
 * Infer the swap direction from the incoming invoice leg: the CCH collects
 * cWBTC (Fiber) for ckb-to-btc orders and BTC (Lightning) for btc-to-ckb
 * orders.
 */
export function directionFromIncomingLeg(leg: ExtractedCchInvoice['leg']): SwapDirection | null {
  if (leg === 'fiber') return 'ckb-to-btc';
  if (leg === 'lightning') return 'btc-to-ckb';
  return null;
}
