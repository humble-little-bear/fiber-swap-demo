import { Router } from 'express';
import { FnnRpcError, fnnRpcCall } from '../services/fnnClient.js';
import { parseBOLT11 } from '../utils/invoice.js';
import { directionFromIncomingLeg, extractCchInvoice } from '../utils/cch.js';

const router = Router({ mergeParams: true });

interface GetCchOrderResult {
  payment_hash: string;
  status: string;
  incoming_invoice: { Fiber?: string; Lightning?: string } | string;
  outgoing_pay_req?: string;
  amount_sats?: string;
  fee_sats?: string;
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
    // FNN returns incoming_invoice as a single-key enum — { Fiber: "fibt..." }
    // for send_btc orders, { Lightning: "lntb..." } for receive_btc orders.
    const { invoice: incomingInvoice, leg } = extractCchInvoice(result.incoming_invoice);
    // The Lightning invoice carries the network: it is the outgoing pay req
    // for send_btc orders and the incoming invoice for receive_btc orders.
    // Fall back to the demo's default network (testnet) so the frontend link
    // still works.
    const parsedOutgoing = payReq ? parseBOLT11(payReq) : null;
    const parsedIncoming = incomingInvoice ? parseBOLT11(incomingInvoice) : null;
    const network =
      (parsedOutgoing?.isValid ? parsedOutgoing.network : undefined) ??
      (parsedIncoming?.isValid ? parsedIncoming.network : undefined) ??
      'testnet';

    res.json({
      payment_hash: result.payment_hash,
      status: result.status,
      direction: directionFromIncomingLeg(leg) ?? undefined,
      incoming_invoice: incomingInvoice,
      outgoing_pay_req: payReq,
      amount_sats: result.amount_sats,
      fee_sats: result.fee_sats,
      network,
    });
  } catch (err) {
    if (err instanceof FnnRpcError) {
      // FNN reports unknown orders as "Store error: Key not found: Hash256(...)"
      const notFound = err.message.includes('Key not found');
      if (notFound) {
        res.status(404).json({ error: 'Order not found' });
      } else {
        // 400 rather than 502: the CDN replaces 5xx bodies with its own error
        // page, which would hide the FNN message from API clients.
        res.status(400).json({ error: err.message, upstream: true });
      }
      return;
    }
    next(err);
  }
});

export default router;
