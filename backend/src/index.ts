import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import healthRouter from './routes/health.js';
import nodeRouter from './routes/node.js';
import quoteRouter from './routes/quote.js';
import swapRouter from './routes/swap.js';
import orderRouter from './routes/order.js';

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/node-info', nodeRouter);
app.use('/api/quote', quoteRouter);
app.use('/api/swap/ckb-to-btc', swapRouter);
app.use('/api/order/:payment_hash', orderRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ error: err.message ?? 'Internal Server Error' });
  }
);

import { startFiberNode } from './services/fiberNode.js';

async function main() {
  let node: { stop: () => Promise<void> } | undefined;

  try {
    node = await startFiberNode();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[fiber-node] Failed to start node: ${message}`);
    console.log('[fiber-node] Continuing with configured FNN_RPC_URL; /api/health will report disconnected');
  }

  const server = app.listen(config.port, () => {
    console.log(`Backend listening on http://localhost:${config.port}`);
    console.log(`FNN RPC proxy: ${config.fnnRpcUrl}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down...`);
    server.close(async () => {
      try {
        await node?.stop();
      } catch (err) {
        console.error('[fiber-node] Error stopping node:', err);
      }
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main();
