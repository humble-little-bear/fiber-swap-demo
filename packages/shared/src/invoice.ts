export type LightningNetwork = 'mainnet' | 'testnet' | 'signet' | 'unknown';

export interface ParsedInvoice {
  /** The raw BOLT11 invoice string. */
  raw: string;
  /** Detected network from the prefix. */
  network: LightningNetwork;
  /** Amount in satoshis. `null` for amountless invoices. */
  amountSats: number | null;
  /** True when the invoice explicitly omits an amount. */
  isAmountless: boolean;
  /** Whether the string looks like a valid BOLT11 invoice. */
  isValid: boolean;
  /** Human-readable validation error, if any. */
  error?: string;
}

const NETWORK_BY_PREFIX: Record<string, LightningNetwork> = {
  lnbc: 'mainnet',
  lntb: 'testnet',
  lntbs: 'signet',
};

const MULTIPLIERS: Record<string, number> = {
  m: 1e-3,
  u: 1e-6,
  n: 1e-9,
  p: 1e-12,
};

const emptyParsed = (): Omit<ParsedInvoice, 'raw'> => ({
  network: 'unknown',
  amountSats: null,
  isAmountless: false,
  isValid: false,
});

const BOLT11_LIKE_RE = /^ln[a-z0-9]*1/i;

/**
 * Returns true for strings that look like a BOLT11 invoice (start with `ln` and
 * contain the separator `1`). This is intentionally looser than `parseBOLT11`:
 * it lets the backend forward invoices that use unknown prefixes or amount
 * formats to FNN, instead of rejecting them at the API layer.
 */
export function isBOLT11Like(invoice: string): boolean {
  return BOLT11_LIKE_RE.test(invoice.trim());
}

const FIBER_INVOICE_LIKE_RE = /^fib[a-z0-9]*1/i;

/**
 * Returns true for strings that look like a Fiber (CKB) invoice (start with
 * `fib` and contain the bech32 separator `1`, e.g. `fibt1...`). Like
 * `isBOLT11Like` this is intentionally loose: strict validation is left to FNN.
 */
export function isFiberInvoiceLike(invoice: string): boolean {
  return FIBER_INVOICE_LIKE_RE.test(invoice.trim());
}

/**
 * Lightweight BOLT11 invoice parser.
 *
 * Only reads the human-readable prefix (`lnbc`/`lntb`/`lntbs` + amount). It
 * intentionally does NOT verify the invoice signature so it can run in both
 * Node.js and the browser without heavy crypto dependencies.
 */
export function parseBOLT11(invoice: string): ParsedInvoice {
  const trimmed = invoice.trim();
  const lower = trimmed.toLowerCase();

  if (!lower) {
    return { raw: trimmed, ...emptyParsed(), error: 'Invoice is empty' };
  }

  const separatorMatch = lower.match(/^(lnbc|lntb|lntbs)(\d+(?:\.\d+)?[munp]?)?1/);
  if (!separatorMatch) {
    return {
      raw: trimmed,
      ...emptyParsed(),
      error: 'Does not look like a valid Lightning invoice',
    };
  }

  const prefix = separatorMatch[1];
  const network = NETWORK_BY_PREFIX[prefix];
  const amountPart = separatorMatch[2] ?? '';

  // Amountless invoice.
  if (amountPart === '') {
    return {
      raw: trimmed,
      network,
      amountSats: null,
      isAmountless: true,
      isValid: true,
    };
  }

  const match = amountPart.match(/^(\d+(?:\.\d+)?)([munp]?)$/);
  if (!match) {
    return {
      raw: trimmed,
      network,
      amountSats: null,
      isAmountless: false,
      isValid: false,
      error: 'Invalid amount in invoice',
    };
  }

  const value = parseFloat(match[1]);
  const multiplier = match[2];

  if (!Number.isFinite(value) || value < 0) {
    return {
      raw: trimmed,
      network,
      amountSats: null,
      isAmountless: false,
      isValid: false,
      error: 'Invalid amount in invoice',
    };
  }

  const btc = multiplier ? value * (MULTIPLIERS[multiplier] ?? 1) : value;
  const amountSats = Math.round(btc * 100_000_000);

  if (!Number.isSafeInteger(amountSats)) {
    return {
      raw: trimmed,
      network,
      amountSats: null,
      isAmountless: false,
      isValid: false,
      error: 'Invoice amount is too large or has unsafe precision',
    };
  }

  return {
    raw: trimmed,
    network,
    amountSats,
    isAmountless: false,
    isValid: true,
  };
}
