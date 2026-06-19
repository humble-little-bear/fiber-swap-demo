import { Router } from 'express';
import { fnnRpcCall } from '../services/fnnClient.js';
import { parseBOLT11 } from '../utils/invoice.js';

const router = Router({ mergeParams: true });

interface GetCchOrderResult {
  payment_hash: string;
  status: string;
  invoice: string;
  outgoing_pay_req?: string;
}

router.get('/', async (req, res, next) => {
  try {
    const { payment_hash } = req.params as { payment_hash: string };

    if (!payment_hash || !payment_hash.trim()) {
      res.status(400).json({ error: 'Missing payment_hash' });
      return;
    }

    const result = await fnnRpcCall<GetCchOrderResult>('get_cch_order', [
      { payment_hash },
    ]);

    const payReq = result.outgoing_pay_req ?? '';
    const incomingInvoice = result.invoice ?? '';
    // Prefer the outgoing invoice, fall back to the incoming invoice, then
    // to the demo's default network (testnet) so the frontend link still works.
    const network = payReq
      ? parseBOLT11(payReq).network
      : incomingInvoice
        ? parseBOLT11(incomingInvoice).network
        : 'testnet';

    res.json({
      payment_hash: result.payment_hash,
      status: result.status,
      incoming_invoice: result.invoice,
      outgoing_pay_req: payReq,
      network,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
