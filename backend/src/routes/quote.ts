import { Router } from 'express';

const router = Router();

// Hardcoded rate: 1 BTC = 13,000,000 CKB
const CKB_PER_BTC = 13_000_000;
const FEE_CKB = 500;

interface QuoteRequest {
  btc_sats: number;
  currency?: string;
}

router.post('/', (req, res) => {
  const { btc_sats } = req.body as QuoteRequest;

  if (typeof btc_sats !== 'number' || btc_sats <= 0 || !Number.isFinite(btc_sats)) {
    res.status(400).json({ error: 'Invalid btc_sats' });
    return;
  }

  const btcAmount = btc_sats / 100_000_000;
  const ckbAmount = Math.round(btcAmount * CKB_PER_BTC);
  const ckbWithFee = ckbAmount + FEE_CKB;

  const validUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  res.json({
    btc_sats,
    ckb_amount: `0x${ckbWithFee.toString(16)}`,
    rate: `1 BTC = ${CKB_PER_BTC.toLocaleString()} CKB`,
    fee_estimate: `~${FEE_CKB} CKB`,
    valid_until: validUntil,
  });
});

export default router;
