export const CWBTC_DECIMALS = 8;

const CWBTC_SCALE = 100000000n;

export function parseCwbtcToRaw(value: string): bigint {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '.') {
    return 0n;
  }

  if (!/^\d+(?:\.\d{0,8})?$/.test(trimmed)) {
    throw new Error('Enter a cWBTC amount with up to 8 decimal places.');
  }

  const [whole, fraction = ''] = trimmed.split('.');
  const paddedFraction = fraction.padEnd(CWBTC_DECIMALS, '0');
  return BigInt(whole) * CWBTC_SCALE + BigInt(paddedFraction || '0');
}

export function formatCwbtcRaw(value: string | bigint): string {
  let raw: bigint;

  try {
    raw = typeof value === 'bigint' ? value : BigInt(value || '0');
  } catch {
    return '0';
  }

  const sign = raw < 0n ? '-' : '';
  const absolute = raw < 0n ? -raw : raw;
  const whole = absolute / CWBTC_SCALE;
  const fraction = absolute % CWBTC_SCALE;

  if (fraction === 0n) {
    return `${sign}${whole.toString()}`;
  }

  const fractionText = fraction
    .toString()
    .padStart(CWBTC_DECIMALS, '0')
    .replace(/0+$/, '');

  return `${sign}${whole.toString()}.${fractionText}`;
}

export function rawToHex(value: bigint): `0x${string}` {
  if (value < 0n) {
    throw new Error('Amount cannot be negative.');
  }

  return `0x${value.toString(16)}`;
}
