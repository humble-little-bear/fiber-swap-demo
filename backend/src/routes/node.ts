import { Router } from 'express';
import { fnnRpcCall } from '../services/fnnClient.js';

const router = Router();

interface NodeInfoResult {
  pubkey: string;
  addresses: string[];
  channel_count: string;
  peers_count: string;
}

function parseHexCount(value: string): number {
  const parsed = parseInt(value, 16);
  return Number.isFinite(parsed) ? parsed : 0;
}

router.get('/', async (_req, res, next) => {
  try {
    const info = await fnnRpcCall<NodeInfoResult>('node_info', []);
    res.json({
      node_id: info.pubkey,
      addresses: info.addresses,
      channel_count: parseHexCount(info.channel_count),
      peer_count: parseHexCount(info.peers_count),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
