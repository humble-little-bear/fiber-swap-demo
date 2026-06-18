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

/**
 * Lightweight BOLT11 invoice parser.
 *
 * Only reads the human-readable prefix (`lnbc`/`lntb`/`lntbs` + amount).
 * It intentionally does NOT verify the invoice signature.
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
