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

app.listen(config.port, () => {
  console.log(`Backend listening on http://localhost:${config.port}`);
  console.log(`FNN RPC proxy: ${config.fnnRpcUrl}`);
});
