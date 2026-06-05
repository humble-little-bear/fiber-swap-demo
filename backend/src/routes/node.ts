import { Router } from 'express';
import { fnnRpcCall } from '../services/fnnClient.js';

const router = Router();

interface NodeInfoResult {
  node_id: string;
  addresses: string[];
  channels: unknown[];
  peers: unknown[];
}

router.get('/', async (_req, res, next) => {
  try {
    const info = await fnnRpcCall<NodeInfoResult>('node_info', []);
    res.json({
      node_id: info.node_id,
      addresses: info.addresses,
      channel_count: info.channels?.length ?? 0,
      peer_count: info.peers?.length ?? 0,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
