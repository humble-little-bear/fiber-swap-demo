import { Router } from 'express';
import { fnnRpcCall } from '../services/fnnClient.js';

const router = Router();

interface SendBtcBody {
  btc_pay_req: string;
  currency?: string;
}

interface SendBtcResult {
  payment_hash: string;
  invoice: string;
}

router.post('/', async (req, res, next) => {
  try {
    const { btc_pay_req, currency } = req.body as SendBtcBody;

    if (!btc_pay_req || typeof btc_pay_req !== 'string') {
      res.status(400).json({ error: 'Missing or invalid btc_pay_req' });
      return;
    }

    const result = await fnnRpcCall<SendBtcResult>('send_btc', [{ btc_pay_req, currency }]);

    const now = new Date().toISOString();
    res.json({
      order_id: result.payment_hash,
      payment_hash: result.payment_hash,
      incoming_invoice: result.invoice,
      outgoing_pay_req: btc_pay_req,
      status: 'Pending',
      created_at: now,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
