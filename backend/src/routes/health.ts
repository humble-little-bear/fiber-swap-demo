import { Router } from 'express';
import { checkFnnHealth } from '../services/fnnClient.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const fnnConnected = await checkFnnHealth();
    res.json({ status: 'ok', fnnConnected });
  } catch (err) {
    next(err);
  }
});

export default router;
