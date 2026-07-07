import { Router, type Request, type Response } from 'express';
import { config } from '../config.js';
import { claimWbtc } from '../services/faucetService.js';

const router = Router();

// Simple in-memory cooldown store (resets on server restart)
const cooldowns = new Map<string, number>();

router.post('/claim', async (req: Request, res: Response) => {
  try {
    const { address } = req.body as { address?: string };

    if (!address || typeof address !== 'string' || !address.startsWith('ckt1')) {
      res.status(400).json({
        success: false,
        message: 'Invalid address: must be a CKB testnet address starting with ckt1',
      });
      return;
    }

    // Check private key config
    if (!config.faucetPrivateKey) {
      res.status(500).json({
        success: false,
        message: 'Faucet not configured: FAUCET_PRIVATE_KEY is not set',
      });
      return;
    }

    // Check cooldown
    const now = Date.now();
    const cooldownUntil = cooldowns.get(address);
    if (cooldownUntil && now < cooldownUntil) {
      const remainingSec = Math.ceil((cooldownUntil - now) / 1000);
      res.status(429).json({
        success: false,
        message: `Cooldown: try again in ${remainingSec}s`,
        cooldown_until: cooldownUntil,
      });
      return;
    }

    const txHash = await claimWbtc(address);

    const nextCooldown = now + config.faucetCooldownSeconds * 1000;
    cooldowns.set(address, nextCooldown);

    res.json({
      success: true,
      message: `Claimed ${config.faucetClaimAmount} cWBTC`,
      amount: config.faucetClaimAmount,
      tx_hash: txHash,
      cooldown_until: nextCooldown,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Faucet claim error:', message);
    res.status(500).json({
      success: false,
      message,
    });
  }
});

export default router;
