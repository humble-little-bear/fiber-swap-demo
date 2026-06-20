import { Router } from 'express';
import { config } from '../config.js';
import { createBtcInvoice } from '../services/lndClient.js';

const router = Router();

router.post('/', async (_req, res, next) => {
  try {
    const lndInvoice = await createBtcInvoice(config.btcInvoiceAmountSats);
    const paymentHash =
      lndInvoice.payment_hash ??
      (lndInvoice.r_hash
        ? Buffer.from(lndInvoice.r_hash, 'base64').toString('hex')
        : '');

    res.json({
      payment_request: lndInvoice.payment_request,
      payment_hash: paymentHash,
      amount_sats: config.btcInvoiceAmountSats,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
