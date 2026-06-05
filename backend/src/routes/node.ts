import { Router } from 'express';
import { fnnCall, type NodeInfoResult } from '../services/fnnClient.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const info = await fnnCall<NodeInfoResult>('node_info');
    res.json({
      node_id: info.public_key,
      channel_count: info.open_channels ?? 0,
      peer_count: info.peers_count ?? 0,
      online: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(503).json({
      node_id: '',
      channel_count: 0,
      peer_count: 0,
      online: false,
      error: message,
    });
  }
});

export default router;
