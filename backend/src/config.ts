const parseCorsOrigin = (): string | string[] => {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',').map((s) => s.trim());
  }
  return [
    'http://localhost:5173',
    'http://localhost:4173',
    'http://localhost:4174',
    'https://fiber-swap.pingkey.xyz',
  ];
};

export const config = {
  port: Number(process.env.PORT ?? 3001),
  fnnRpcUrl: process.env.FNN_RPC_URL ?? 'http://127.0.0.1:8227',
  corsOrigin: parseCorsOrigin(),
};
