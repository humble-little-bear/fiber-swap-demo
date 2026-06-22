const parseCorsOrigin = (): string | string[] => {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',').map((s) => s.trim());
  }
  return [
    'http://localhost:5173',
    'http://localhost:4173',
    'http://localhost:4174',
    'https://fiber-swap.retric.uk',
  ];
};

export const config = {
  port: Number(process.env.PORT ?? 3001),
  fnnRpcUrl: process.env.FNN_RPC_URL ?? 'http://127.0.0.1:8227',
  corsOrigin: parseCorsOrigin(),
  lndRestUrl: process.env.LND_REST_URL ?? 'https://127.0.0.1:8080',
  lndMacaroonPath:
    process.env.LND_MACAROON_PATH ??
    '/home/retric/.lnd/data/chain/bitcoin/testnet/invoices.macaroon',
  lndTlsCertPath: process.env.LND_TLS_CERT_PATH ?? '/home/retric/.lnd/tls.cert',
  btcInvoiceAmountSats: Number(process.env.BTC_INVOICE_AMOUNT_SATS ?? '100'),
};
