import { Router } from 'express';
import { fnnRpcCall } from '../services/fnnClient.js';

const router = Router();

interface NodeInfoResult {
  pubkey: string;
  addresses: string[];
  channel_count: string;
  peers_count: string;
}

router.get('/', async (_req, res, next) => {
  try {
    const info = await fnnRpcCall<NodeInfoResult>('node_info', []);
    res.json({
      node_id: info.pubkey,
      addresses: info.addresses,
      channel_count: parseInt(info.channel_count, 16),
      peer_count: parseInt(info.peers_count, 16),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
