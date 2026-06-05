export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  fnnRpcUrl: process.env.FNN_RPC_URL || 'http://127.0.0.1:8227',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
