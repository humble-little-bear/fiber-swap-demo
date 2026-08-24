import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import healthRouter from './routes/health.js';
import nodeRouter from './routes/node.js';
import quoteRouter from './routes/quote.js';
import swapRouter from './routes/swap.js';
import swapReceiveRouter from './routes/swapReceive.js';
import orderRouter from './routes/order.js';
import btcInvoiceRouter from './routes/btcInvoice.js';
import faucetRouter from './routes/faucet.js';

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/node-info', nodeRouter);
app.use('/api/quote', quoteRouter);
app.use('/api/swap/ckb-to-btc', swapRouter);
app.use('/api/swap/btc-to-ckb', swapReceiveRouter);
app.use('/api/order/:payment_hash', orderRouter);
app.use('/api/btc-invoice', btcInvoiceRouter);
app.use('/api/faucet', faucetRouter);

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
    console.error('Unhandled error:', err);
    // Expose the original message in development so the frontend can show
    // actionable errors (e.g. "FNN RPC error: Method not found"). Keep the
    // response generic in production to avoid leaking internals.
    const isDev = process.env.NODE_ENV === 'development';
    res.status(500).json({
      error: isDev ? (err.message || 'Internal Server Error') : 'Internal Server Error',
    });
  }
);

const server = app.listen(config.port, () => {
  console.log(`Backend listening on http://localhost:${config.port}`);
  console.log(`FNN RPC proxy: ${config.fnnRpcUrl}`);
});

server.on('error', (err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});

const shutdown = (signal: string) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  server.close((err) => {
    if (err) {
      console.error('Error closing server:', err);
      process.exit(1);
    }
    console.log('Server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
