import { Router } from 'express';
import { fnnCall, type CchOrderResult } from '../services/fnnClient.js';

const router = Router({ mergeParams: true });

router.get('/:payment_hash', async (req, res) => {
  const { payment_hash } = req.params;

  if (!payment_hash) {
    res.status(400).json({ error: 'payment_hash is required' });
    return;
  }

  try {
    const order = await fnnCall<CchOrderResult>('get_cch_order', [{ payment_hash }]);

    res.json({
      order_id: order.payment_hash,
      payment_hash: order.payment_hash,
      incoming_invoice: order.ckb_invoice || '',
      outgoing_pay_req: order.btc_pay_req || '',
      status: order.status,
      created_at: order.timestamp,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    // If FNN returns "Key not found", the order doesn't exist yet
    if (message.toLowerCase().includes('key not found') || message.toLowerCase().includes('not found')) {
      res.status(404).json({ error: 'Order not found', details: message });
      return;
    }

    res.status(502).json({ error: 'Failed to fetch order status', details: message });
  }
});

export default router;
