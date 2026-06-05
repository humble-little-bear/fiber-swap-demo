import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import healthRouter from './routes/health.js';
import nodeRouter from './routes/node.js';
import quoteRouter from './routes/quote.js';
import swapRouter from './routes/swap.js';
import orderRouter from './routes/order.js';

const app = express();

app.use(cors({ origin: config.frontendUrl }));
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/node-info', nodeRouter);
app.use('/api/quote', quoteRouter);
app.use('/api/swap', swapRouter);
app.use('/api/order', orderRouter);

app.listen(config.port, () => {
  console.log(`Fiber Swap Backend running on http://localhost:${config.port}`);
  console.log(`FNN RPC: ${config.fnnRpcUrl}`);
});
