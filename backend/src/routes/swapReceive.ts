import { Router } from 'express';
import { FnnRpcError, fnnRpcCall } from '../services/fnnClient.js';
import { isFiberInvoiceLike, parseBOLT11 } from '../utils/invoice.js';
import { extractCchInvoice } from '../utils/cch.js';

const router = Router();

interface ReceiveBtcBody {
  fiber_pay_req: string;
}

interface ReceiveBtcResult {
  payment_hash: string;
  incoming_invoice: { Fiber?: string; Lightning?: string } | string;
  outgoing_pay_req?: string;
  amount_sats?: string;
  fee_sats?: string;
  status?: string;
}

router.post('/', async (req, res, next) => {
  try {
    const { fiber_pay_req } = req.body as ReceiveBtcBody;

    if (!fiber_pay_req || typeof fiber_pay_req !== 'string' || !isFiberInvoiceLike(fiber_pay_req)) {
      res.status(400).json({ error: 'Missing or invalid fiber_pay_req' });
      return;
    }

    // The caller (a Fiber node, e.g. the acceptance CI) signs a cWBTC invoice
    // for what they want to receive; the CCH replies with a Lightning invoice
    // over the same payment hash. Retrying with the same fiber_pay_req is
    // idempotent on the FNN side.
    const result = await fnnRpcCall<ReceiveBtcResult>('receive_btc', [
      { fiber_pay_req: fiber_pay_req.trim() },
    ]);

    // For receive_btc orders the incoming invoice is the Lightning leg.
    const { invoice: incomingInvoice } = extractCchInvoice(result.incoming_invoice);
    const now = new Date().toISOString();
    res.json({
      order_id: result.payment_hash,
      payment_hash: result.payment_hash,
      direction: 'btc-to-ckb',
      incoming_invoice: incomingInvoice,
      outgoing_pay_req: result.outgoing_pay_req ?? fiber_pay_req.trim(),
      amount_sats: result.amount_sats,
      fee_sats: result.fee_sats,
      network: parseBOLT11(incomingInvoice).network,
      status: result.status ?? 'Pending',
      created_at: now,
    });
  } catch (err) {
    if (err instanceof FnnRpcError) {
      res.status(502).json({ error: err.message });
      return;
    }
    next(err);
  }
});

export default router;
