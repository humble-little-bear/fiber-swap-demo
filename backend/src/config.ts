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

  // Faucet
  faucetPrivateKey: process.env.FAUCET_PRIVATE_KEY ?? '',
  ckbRpcUrl: process.env.CKB_RPC_URL ?? 'https://testnet.ckbapp.dev/',
  /** Amount of cWBTC to send per claim (in shannons, with 8 decimals). Default: 5000000000 = 50 cWBTC */
  faucetClaimAmount: process.env.FAUCET_CLAIM_AMOUNT ?? '5000000000',
  /** Cooldown in seconds between claims for the same address. Default: 60 seconds. */
  faucetCooldownSeconds: Number(process.env.FAUCET_COOLDOWN_SECONDS ?? '60'),

  // cWBTC xUDT type script (testnet, type hash_type)
  wbtcTypeScript: {
    codeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
    hashType: 'type' as const,
    args: '0x9a1086531ed6dc69e0bd44cef5278e03faf3015b31aff60b08fb87663ce8507100000000',
  },

  // cWBTC xUDT cell dep (resolved from type_id at build time)
  wbtcCellDep: {
    outPoint: {
      txHash: '0xbf6fb538763efec2a70a6a3dcb7242787087e1030c4e7d86585bc63a9d337f5f',
      index: '0x0',
    },
    depType: 'code' as const,
  },
};
