import { Router } from 'express';
import { fnnCall } from '../services/fnnClient.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    await fnnCall('node_info');
    res.json({ status: 'ok', fnn: 'connected' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(503).json({ status: 'degraded', fnn: 'unreachable', error: message });
  }
});

export default router;
