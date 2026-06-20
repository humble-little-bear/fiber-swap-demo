import fs from 'fs';
import https from 'https';
import { config } from '../config.js';

export interface LndInvoiceResponse {
  payment_request: string;
  payment_hash?: string;
  r_hash?: string;
  add_index?: string;
}

function readMacaroon(): string {
  return fs.readFileSync(config.lndMacaroonPath).toString('hex');
}

function readTlsCert(): Buffer {
  return fs.readFileSync(config.lndTlsCertPath);
}

export function createBtcInvoice(
  amountSats: number,
  memo = 'fiber-swap demo'
): Promise<LndInvoiceResponse> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      value: amountSats.toString(),
      memo,
      expiry: '3600',
    });

    const url = new URL('/v1/invoices', config.lndRestUrl);
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || '443',
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Grpc-Metadata-macaroon': readMacaroon(),
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        ca: readTlsCert(),
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data) as LndInvoiceResponse);
            } catch {
              reject(new Error(`Invalid JSON from LND: ${data}`));
            }
          } else {
            reject(new Error(`LND error ${res.statusCode}: ${data}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}
