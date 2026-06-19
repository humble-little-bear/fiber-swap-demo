const SHANNONS_PER_CKB = 100_000_000n;

/**
 * Format a CKB amount given as shannons (hex string) to a fixed 4-decimal CKB
 * string using BigInt arithmetic to avoid Number precision loss.
 */
export function formatCkb(shannonsHex: string): string {
  try {
    const shannons = BigInt(shannonsHex);
    const scale = SHANNONS_PER_CKB;
    const integerPart = shannons / scale;
    const fractionRaw = shannons % scale;
    // Round fractional part to 4 decimal places using BigInt to avoid
    // Number precision loss for very large amounts.
    const scaled = (fractionRaw * 10000n) / scale;
    const remainder = (fractionRaw * 10000n) % scale;
    let fraction = scaled;
    if (remainder * 2n >= scale) {
      fraction += 1n;
    }
    const fractionStr = fraction.toString().padStart(4, '0');
    return `${integerPart}.${fractionStr}`;
  } catch {
    return '—';
  }
}
