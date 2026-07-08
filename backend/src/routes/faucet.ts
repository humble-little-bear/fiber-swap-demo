import { Router, type Request, type Response } from 'express';
import { config } from '../config.js';
import { claimWbtc, queueFaucetClaim } from '../services/faucetService.js';

const router = Router();

// Simple in-memory cooldown store (resets on server restart).
// The backend runs as a single PM2 fork today, so this protects ordinary web
// traffic. Multi-process deployment should move this to Redis or a database.
const cooldowns = new Map<string, number>();
const inFlightClaims = new Set<string>();

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

function secondsUntil(timestamp: number): number {
  return Math.ceil((timestamp - Date.now()) / 1000);
}

function formatCwbtc(rawAmount: string): string {
  const decimals = 8;
  const raw = BigInt(rawAmount);
  const base = BigInt(10) ** BigInt(decimals);
  const whole = raw / base;
  const fraction = raw % base;
  if (fraction === BigInt(0)) return whole.toString();
  return `${whole}.${fraction.toString().padStart(decimals, '0').replace(/0+$/, '')}`;
}

router.post('/claim', async (req: Request, res: Response) => {
  try {
    const rawAddress = (req.body as { address?: string }).address;

    if (!rawAddress || typeof rawAddress !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Enter a CKB testnet address',
      });
      return;
    }

    const address = normalizeAddress(rawAddress);

    if (!address.startsWith('ckt1')) {
      res.status(400).json({
        success: false,
        message: 'Address must start with ckt1',
      });
      return;
    }

    if (!config.faucetPrivateKey) {
      res.status(500).json({
        success: false,
        message: 'Faucet not configured: FAUCET_PRIVATE_KEY is not set',
      });
      return;
    }

    const now = Date.now();
    const cooldownUntil = cooldowns.get(address);
    if (cooldownUntil && now < cooldownUntil) {
      res.status(429).json({
        success: false,
        message: `Try again in ${secondsUntil(cooldownUntil)}s`,
        cooldown_until: cooldownUntil,
      });
      return;
    }

    if (inFlightClaims.has(address)) {
      res.status(409).json({
        success: false,
        message: 'A claim for this address is already being processed',
      });
      return;
    }

    const nextCooldown = now + config.faucetCooldownSeconds * 1000;
    cooldowns.set(address, nextCooldown);
    inFlightClaims.add(address);

    let txHash: string;
    try {
      txHash = await queueFaucetClaim(() => claimWbtc(address));
    } catch (err) {
      cooldowns.delete(address);
      throw err;
    } finally {
      inFlightClaims.delete(address);
    }

    res.json({
      success: true,
      message: `Claimed ${formatCwbtc(config.faucetClaimAmount)} cWBTC`,
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
