# Fiber Swap Demo

A cross-chain swap demo application bridging **CKB Fiber Network** and **Bitcoin Lightning Network** via CCH (Cross-Chain Hub).

## Overview

This demo showcases atomic cross-chain swaps between CKB Fiber and BTC Lightning:

- **CKB → BTC**: Pay a Fiber invoice, receive BTC on Lightning
- **BTC → CKB**: Pay a Lightning invoice, receive wrapped BTC on Fiber

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Frontend  │◄────►│   FNN + CCH      │◄────►│   LND Testnet   │
│  (React)    │      │  (Fiber Node)    │      │ (BTC Lightning) │
└─────────────┘      └──────────────────┘      └─────────────────┘
                            │
                            ▼
                    CKB Fiber Testnet
```

## Tech Stack

### Frontend
- **React 19** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** (styling)
- **@fiber-pay/react** + **@fiber-pay/sdk** (Fiber integration - planned)

### Backend
- **FNN** (Fiber Network Node) v0.8.0 — CKB state channel node
- **CCH** (Cross-Chain Hub) — embedded in FNN, acts as Ingrid
- **LND** (Lightning Network Daemon) v0.20.1 — Bitcoin Lightning node

## Prerequisites

Before running this demo, you need:

1. **Node.js** ≥ 18
2. **LND** running on Bitcoin testnet with:
   - Wallet created and unlocked
   - At least 1 active Lightning channel
   - Sufficient testnet BTC balance
3. **FNN** running on CKB testnet with:
   - CCH service enabled
   - `SimpleUDT` contract configured in `scripts`
   - `wrapped_btc_type_script` configured in `cch` section
   - At least 1 active Fiber channel

> See [Backend Deployment Guide](https://github.com/humble-little-bear/fiber-swap-demo/issues/4) for detailed setup instructions.

## Quick Start

### 1. Clone and Install

```bash
git clone <repo-url>
cd fiber-swap-demo
npm install
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
# FNN JSON-RPC endpoint
VITE_FNN_RPC_URL=http://127.0.0.1:8227

# LND REST API endpoint (if accessing directly from browser)
VITE_LND_REST_URL=https://127.0.0.1:8080
```

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

## Project Structure

```
fiber-swap-demo/
├── src/
│   ├── components/       # UI components
│   ├── pages/           # Route pages
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API services (FNN/LND RPC wrappers)
│   ├── types/           # TypeScript types
│   └── utils/           # Utilities
├── public/              # Static assets
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## Key Features

### Swap CKB → BTC

1. User provides a BTC Lightning invoice (amount they want to receive)
2. Frontend calls `send_btc` via FNN CCH RPC
3. CCH generates a Fiber invoice for the user to pay
4. Once the Fiber invoice is paid, CCH automatically pays the BTC Lightning invoice

### Swap BTC → CKB

1. User creates a Fiber invoice with `hash_algorithm: "sha256"` and wrapped BTC `udt_type_script`
2. Frontend calls `receive_btc` via FNN CCH RPC
3. CCH generates a BTC Lightning invoice for the user to pay
4. Once the BTC invoice is paid, CCH automatically pays the Fiber invoice

## CCH RPC Reference

All CCH methods are called through FNN's JSON-RPC endpoint (`http://127.0.0.1:8227`):

### `send_btc`

```bash
curl -X POST http://127.0.0.1:8227 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0","id":1,
    "method":"send_btc",
    "params":[{"btc_pay_req":"<lightning_invoice>","currency":"Fibt"}]
  }'
```

### `receive_btc`

```bash
curl -X POST http://127.0.0.1:8227 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0","id":1,
    "method":"receive_btc",
    "params":[{"fiber_pay_req":"<fiber_invoice>"}]
  }'
```

### `get_cch_order`

```bash
curl -X POST http://127.0.0.1:8227 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0","id":1,
    "method":"get_cch_order",
    "params":[{"payment_hash":"0x..."}]
  }'
```

## Order Status Flow

```
Pending → IncomingAccepted → OutgoingInFlight → Success
```

- **Pending**: Order created, waiting for payment
- **IncomingAccepted**: Incoming payment received and accepted
- **OutgoingInFlight**: Outgoing payment is being routed
- **Success**: Cross-chain swap completed

## Current Status

> ⚠️ This is a work-in-progress demo. Current limitations:
>
> - Frontend UI uses mock data (not yet connected to real backend APIs)
> - Actual cross-chain payment testing requires proper network topology:
>   - `send_btc` requires a Fiber wallet/node to pay the generated Fiber invoice
>   - `receive_btc` requires Lightning inbound capacity (remote channel balance > 0)

## Resources

- [Fiber Network Documentation](https://github.com/nervosnetwork/fiber)
- [Backend Deployment Guide](https://github.com/humble-little-bear/fiber-swap-demo/issues/4)
- [CCH RPC Documentation](https://github.com/nervosnetwork/fiber/blob/develop/crates/fiber-lib/src/rpc/README.md)

## License

MIT
