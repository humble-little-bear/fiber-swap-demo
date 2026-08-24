import { Router } from 'express';
import { FnnRpcError, fnnRpcCall } from '../services/fnnClient.js';
import { isBOLT11Like, parseBOLT11 } from '../utils/invoice.js';
import { extractCchInvoice } from '../utils/cch.js';

const router = Router();

interface SendBtcBody {
  btc_pay_req: string;
  currency?: string;
  btc_sats?: number;
}

interface SendBtcResult {
  payment_hash: string;
  incoming_invoice: { Fiber?: string; Lightning?: string } | string;
  amount_sats?: string;
  fee_sats?: string;
  status?: string;
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

    if (!btc_pay_req || typeof btc_pay_req !== 'string' || !isBOLT11Like(btc_pay_req)) {
      res.status(400).json({ error: 'Missing or invalid btc_pay_req' });
      return;
    }

    const parsed = parseBOLT11(btc_pay_req);

    const rpcParams: Record<string, unknown> = {
      btc_pay_req,
      currency: currency || 'Fibt', // default to CKB testnet
    };

    if (parsed.isValid && parsed.isAmountless) {
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
    //
    // If we cannot parse the invoice locally (unknown prefix/amount format) we
    // do not know whether it is amountless, so we forward it to FNN without an
    // explicit amount and let FNN validate/require it.

    const result = await fnnRpcCall<SendBtcResult>('send_btc', [rpcParams]);

    // FNN returns incoming_invoice as a single-key enum ({ Fiber: "fibt..." })
    const { invoice: incomingInvoice } = extractCchInvoice(result.incoming_invoice);
    const now = new Date().toISOString();
    res.json({
      order_id: result.payment_hash,
      payment_hash: result.payment_hash,
      direction: 'ckb-to-btc',
      incoming_invoice: incomingInvoice,
      outgoing_pay_req: btc_pay_req,
      amount_sats: result.amount_sats,
      fee_sats: result.fee_sats,
      network: parsed.network,
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
