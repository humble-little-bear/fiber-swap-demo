import { Router } from 'express';

const router = Router();

const CWBTC_DECIMALS = 100_000_000n;
const CCH_BASE_FEE_SATS = BigInt(process.env.CCH_BASE_FEE_SATS ?? '0');
const CCH_FEE_RATE_PER_MILLION_SATS = BigInt(
  process.env.CCH_FEE_RATE_PER_MILLION_SATS ?? '1'
);

interface QuoteBody {
  btc_sats: number;
  currency?: string;
}

function formatCwbtc(raw: bigint): string {
  const whole = raw / CWBTC_DECIMALS;
  const fraction = raw % CWBTC_DECIMALS;
  if (fraction === 0n) return whole.toString();
  return `${whole}.${fraction.toString().padStart(8, '0').replace(/0+$/, '')}`;
}

router.post('/', (req, res) => {
  const { btc_sats } = req.body as QuoteBody;

  if (!btc_sats || btc_sats <= 0 || !Number.isSafeInteger(btc_sats)) {
    res.status(400).json({ error: 'Invalid btc_sats' });
    return;
  }

  const sats = BigInt(btc_sats);
  const amountMsats = sats * 1_000n;
  const feeSats =
    (amountMsats * CCH_FEE_RATE_PER_MILLION_SATS) / 1_000_000_000n + CCH_BASE_FEE_SATS;
  const cwbtcRawAmount = sats + feeSats;
  const validUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  res.json({
    btc_sats,
    cwbtc_amount: `0x${cwbtcRawAmount.toString(16)}`,
    // Deprecated compatibility field for older frontend builds.
    ckb_amount: `0x${cwbtcRawAmount.toString(16)}`,
    rate: '1 sat = 1 cWBTC raw unit',
    fee_estimate: `${formatCwbtc(feeSats)} cWBTC`,
    valid_until: validUntil,
  });
});

export default router;
