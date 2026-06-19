import { parseBOLT11 } from '@fiber-swap/shared';
export { parseBOLT11 } from '@fiber-swap/shared';
export type { LightningNetwork, ParsedInvoice } from '@fiber-swap/shared';

export function isTestnetInvoice(invoice: string): boolean {
  const parsed = parseBOLT11(invoice);
  return parsed.isValid && parsed.network === 'testnet';
}

export function formatSats(sats: number): string {
  return `${sats.toLocaleString()} sats`;
}

/**
 * Parse a user-entered sats amount for amountless invoices.
 * Only accepts positive whole numbers that fit in a safe integer.
 */
export function parseSafeSats(value: string): { sats: number; valid: boolean; error?: string } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { sats: NaN, valid: false };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { sats: NaN, valid: false, error: 'Please enter a whole number of sats (digits only).' };
  }
  try {
    if (BigInt(trimmed) > BigInt(Number.MAX_SAFE_INTEGER)) {
      return { sats: NaN, valid: false, error: 'Amount exceeds the maximum safe value.' };
    }
  } catch {
    return { sats: NaN, valid: false, error: 'Invalid amount.' };
  }
  const sats = Number(trimmed);
  if (!Number.isFinite(sats) || sats <= 0 || !Number.isSafeInteger(sats)) {
    return { sats: NaN, valid: false, error: 'Invalid amount.' };
  }
  return { sats, valid: true };
}
