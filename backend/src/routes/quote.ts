import { Router } from 'express';

const router = Router();

// Simplified mock quote: 1 BTC = 13_000_000 CKB
const BTC_TO_CKB_RATE = 13_000_000;

interface QuoteBody {
  btc_sats: number;
  currency?: string;
}

router.post('/', (req, res) => {
  const { btc_sats } = req.body as QuoteBody;

  if (!btc_sats || btc_sats <= 0 || !Number.isFinite(btc_sats)) {
    res.status(400).json({ error: 'Invalid btc_sats' });
    return;
  }

  const ckbAmountFloat = (btc_sats / 100_000_000) * BTC_TO_CKB_RATE;
  const ckbAmount = Math.round(ckbAmountFloat * 100_000_000); // convert to shannons (1e8)
  const feeEstimate = 500; // CKB
  const validUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  res.json({
    btc_sats,
    ckb_amount: `0x${ckbAmount.toString(16)}`,
    rate: `1 BTC = ${BTC_TO_CKB_RATE.toLocaleString()} CKB`,
    fee_estimate: `~${feeEstimate} CKB`,
    valid_until: validUntil,
  });
});

export default router;
