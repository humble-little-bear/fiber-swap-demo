import { Router } from 'express';
import { fnnRpcCall } from '../services/fnnClient.js';
import { parseBOLT11 } from '../utils/invoice.js';

const router = Router();

interface SendBtcBody {
  btc_pay_req: string;
  currency?: string;
  btc_sats?: number;
}

interface SendBtcResult {
  payment_hash: string;
  invoice: string;
}

function isValidSats(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0 &&
    Number.isSafeInteger(value)
  );
}

router.post('/', async (req, res, next) => {
  try {
    const { btc_pay_req, currency, btc_sats } = req.body as SendBtcBody;

    if (!btc_pay_req || typeof btc_pay_req !== 'string') {
      res.status(400).json({ error: 'Missing or invalid btc_pay_req' });
      return;
    }

    const parsed = parseBOLT11(btc_pay_req);
    if (!parsed.isValid) {
      res.status(400).json({ error: parsed.error ?? 'Invalid Lightning invoice' });
      return;
    }

    const rpcParams: Record<string, unknown> = { btc_pay_req, currency };

    if (parsed.isAmountless) {
      if (!isValidSats(btc_sats)) {
        res.status(400).json({ error: 'Amountless invoice requires a positive btc_sats amount' });
        return;
      }
      rpcParams.amount = Math.round(btc_sats);
    }
    // For amountful invoices we intentionally ignore any frontend-supplied
    // btc_sats and let FNN use the amount encoded in the invoice. This prevents
    // API-layer bypass where a caller requests one quote amount but sends a
    // different amount to FNN.

    const result = await fnnRpcCall<SendBtcResult>('send_btc', [rpcParams]);

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
