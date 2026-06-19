import { Router } from 'express';
import { fnnRpcCall } from '../services/fnnClient.js';

const router = Router();

interface NodeInfoResult {
  pubkey: string;
  addresses: string[];
  channel_count: string;
  peers_count: string;
}

/**
 * Parse a count returned by FNN. The RPC contract says the value is a hex
 * string, but some versions return decimal. We auto-detect the radix to avoid
 * mis-parsing values like '10' as 16.
 */
function parseCount(value: string): number {
  const trimmed = value.trim();
  if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
    return parseInt(trimmed.slice(2), 16);
  }
  // If the value contains a hex digit, treat it as hex; otherwise decimal.
  if (/^[0-9a-fA-F]+$/.test(trimmed) && /[a-fA-F]/.test(trimmed)) {
    return parseInt(trimmed, 16);
  }
  return parseInt(trimmed, 10);
}

router.get('/', async (_req, res, next) => {
  try {
    const info = await fnnRpcCall<NodeInfoResult>('node_info', []);
    const channelCount = parseCount(info.channel_count);
    const peerCount = parseCount(info.peers_count);
    res.json({
      node_id: info.pubkey,
      addresses: info.addresses,
      channel_count: Number.isNaN(channelCount) ? 0 : channelCount,
      peer_count: Number.isNaN(peerCount) ? 0 : peerCount,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
