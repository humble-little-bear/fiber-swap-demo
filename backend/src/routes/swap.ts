import { Router } from 'express';
import { fnnCall, type SendBtcResult } from '../services/fnnClient.js';

const router = Router();

interface SwapRequest {
  btc_pay_req: string;
  currency?: string;
}

router.post('/ckb-to-btc', async (req, res) => {
  const { btc_pay_req, currency } = req.body as SwapRequest;

  if (!btc_pay_req || typeof btc_pay_req !== 'string') {
    res.status(400).json({ error: 'btc_pay_req is required' });
    return;
  }

  // Basic Lightning invoice prefix validation for testnet
  if (!btc_pay_req.trim().toLowerCase().startsWith('lntb')) {
    res.status(400).json({ error: 'Invalid testnet Lightning invoice (must start with lntb)' });
    return;
  }

  try {
    const result = await fnnCall<SendBtcResult>('send_btc', [{ btc_pay_req, currency }]);

    res.json({
      order_id: result.payment_hash,
      payment_hash: result.payment_hash,
      incoming_invoice: result.ckb_invoice,
      outgoing_pay_req: btc_pay_req,
      status: 'Pending',
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(502).json({ error: 'Failed to create cross-chain order', details: message });
  }
});

export default router;
