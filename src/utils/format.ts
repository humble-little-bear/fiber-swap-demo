/**
 * Format a CKB amount given as shannons (hex string) to a fixed 4-decimal CKB
 * string. Number precision is sufficient for payment UI amounts (safe up to
 * ~90 trillion CKB, far above any user balance).
 */
export function formatCkb(shannonsHex: string): string {
  try {
    const ckb = Number(shannonsHex) / 1e8;
    if (!Number.isFinite(ckb)) return '—';
    return ckb.toFixed(4);
  } catch {
    return '—';
  }
}
