const CWBTC_DECIMALS = 100_000_000n;

export function formatCwbtc(rawHex: string): string {
  try {
    const raw = BigInt(rawHex);
    const whole = raw / CWBTC_DECIMALS;
    const fraction = raw % CWBTC_DECIMALS;
    if (fraction === 0n) return whole.toString();
    return `${whole}.${fraction.toString().padStart(8, '0').replace(/0+$/, '')}`;
  } catch {
    return '—';
  }
}
