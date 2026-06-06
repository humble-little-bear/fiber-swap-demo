export const config = {
  port: Number(process.env.PORT ?? 3001),
  fnnRpcUrl: process.env.FNN_RPC_URL ?? 'http://127.0.0.1:8227',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
};
