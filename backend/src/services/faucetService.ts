import { config } from '../config.js';
import CKB from '@nervosnetwork/ckb-sdk-core';
import { addressToScript, privateKeyToAddress, scriptToAddress, AddressPrefix } from '@nervosnetwork/ckb-sdk-utils';

interface CellDep {
  outPoint: { txHash: string; index: string };
  depType: 'code' | 'depGroup';
}

type HashType = 'type' | 'data' | 'data1' | 'data2';

interface Script {
  codeHash: string;
  hashType: HashType;
  args: string;
}

interface CellOutPoint {
  txHash: string;
  index: string;
}

interface CellOutput {
  capacity: string;
  lock: Script;
  type: Script | null;
}

interface LiveCell {
  outPoint: CellOutPoint;
  output: CellOutput;
  outputData: string;
}

interface RpcResponse<T> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: { code: number; message: string };
}

interface RpcCellOutput {
  capacity: string;
  lock: { code_hash: string; hash_type: string; args: string };
  type: { code_hash: string; hash_type: string; args: string } | null;
}

interface RpcLiveCell {
  out_point: { tx_hash: string; index: string };
  output: RpcCellOutput;
  output_data: string;
  block_number: string;
}

function mapRpcCell(raw: RpcLiveCell): LiveCell {
  return {
    outPoint: {
      txHash: raw.out_point.tx_hash,
      index: raw.out_point.index,
    },
    output: {
      capacity: raw.output.capacity,
      lock: {
        codeHash: raw.output.lock.code_hash,
        hashType: raw.output.lock.hash_type as HashType,
        args: raw.output.lock.args,
      },
      type: raw.output.type
        ? {
            codeHash: raw.output.type.code_hash,
            hashType: raw.output.type.hash_type as HashType,
            args: raw.output.type.args,
          }
        : null,
    },
    outputData: raw.output_data,
  };
}

function getFaucetPrivateKeyHex(): string {
  if (!config.faucetPrivateKey) {
    throw new Error('Faucet not configured: FAUCET_PRIVATE_KEY is not set');
  }
  return config.faucetPrivateKey.startsWith('0x')
    ? config.faucetPrivateKey
    : `0x${config.faucetPrivateKey}`;
}

function getFaucetLockScript(): Script {
  // Derive lock script lazily so the swap demo can start even when faucet is disabled.
  return addressToScript(privateKeyToAddress(getFaucetPrivateKeyHex(), { prefix: AddressPrefix.Testnet }));
}

const WBTC_TYPE_SCRIPT: Script = {
  codeHash: config.wbtcTypeScript.codeHash,
  hashType: config.wbtcTypeScript.hashType,
  args: config.wbtcTypeScript.args,
};

const SECP256K1_CELL_DEP: CellDep = {
  outPoint: {
    txHash: '0xf8de3bb47d055cdf460d93a2a6e1b05f7432f9777c8c474abf4eec1d4aee5d37',
    index: '0x0',
  },
  depType: 'depGroup',
};

const XUDT_CELL_DEP: CellDep = {
  outPoint: {
    txHash: config.wbtcCellDep.outPoint.txHash,
    index: config.wbtcCellDep.outPoint.index,
  },
  depType: config.wbtcCellDep.depType as 'code',
};

const MIN_CELL_CAPACITY = BigInt(142_0000_0000); // 142 CKB minimum for xUDT cell with WBTC type script
const TX_FEE = BigInt(10_0000); // 0.001 CKB fee

async function ckbRpc<T>(method: string, params: unknown[]): Promise<T> {
  const body = { jsonrpc: '2.0' as const, id: 1, method, params };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(config.ckbRpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`CKB RPC HTTP ${res.status}: ${res.statusText}`);
    }

    const data = (await res.json()) as RpcResponse<T>;
    if (data.error) {
      throw new Error(`CKB RPC error [${data.error.code}]: ${data.error.message}`);
    }
    if (data.result === undefined) {
      throw new Error('CKB RPC returned undefined result');
    }

    return data.result;
  } finally {
    clearTimeout(timeout);
  }
}

async function collectWbtcCells(faucetLockScript: Script): Promise<LiveCell[]> {
  const result = await ckbRpc<{ objects: RpcLiveCell[]; last_cursor: string }>('get_cells', [
    {
      script: {
        code_hash: faucetLockScript.codeHash,
        hash_type: faucetLockScript.hashType,
        args: faucetLockScript.args,
      },
      script_type: 'lock',
      script_search_mode: 'exact',
      filter: {
        script: {
          code_hash: WBTC_TYPE_SCRIPT.codeHash,
          hash_type: WBTC_TYPE_SCRIPT.hashType,
          args: WBTC_TYPE_SCRIPT.args,
        },
      },
    },
    'asc',
    '0x64',
  ]);
  return result.objects.map(mapRpcCell);
}

async function collectCkbCells(minCapacity: bigint, faucetLockScript: Script): Promise<LiveCell[]> {
  const result = await ckbRpc<{ objects: RpcLiveCell[]; last_cursor: string }>('get_cells', [
    {
      script: {
        code_hash: faucetLockScript.codeHash,
        hash_type: faucetLockScript.hashType,
        args: faucetLockScript.args,
      },
      script_type: 'lock',
      script_search_mode: 'exact',
      filter: {
        script_len_range: ['0x0', '0x1'],
        output_data_len_range: ['0x0', '0x1'],
      },
    },
    'asc',
    '0x64',
  ]);
  return result.objects
    .map(mapRpcCell)
    .filter((c) =>
      c.output.lock.codeHash === faucetLockScript.codeHash &&
      c.output.lock.hashType === faucetLockScript.hashType &&
      c.output.lock.args === faucetLockScript.args &&
      BigInt(c.output.capacity) >= minCapacity,
    );
}

function parseUdtAmount(dataHex: string): bigint {
  if (!dataHex || dataHex === '0x' || dataHex.length < 2) return BigInt(0);
  const raw = dataHex.startsWith('0x') ? dataHex.slice(2) : dataHex;
  const buf = Buffer.from(raw, 'hex');
  let amount = BigInt(0);
  for (let i = buf.length - 1; i >= 0; i--) {
    amount = (amount << BigInt(8)) | BigInt(buf[i]);
  }
  return amount;
}

function packUdtAmount(amount: bigint): string {
  const buf = Buffer.alloc(16);
  let remaining = amount;
  for (let i = 0; i < 16 && remaining > BigInt(0); i++) {
    buf[i] = Number(remaining & BigInt(0xff));
    remaining >>= BigInt(8);
  }
  return '0x' + buf.toString('hex');
}

function bigIntToHex(bi: bigint): string {
  return '0x' + bi.toString(16);
}

export async function claimWbtc(recipientAddress: string): Promise<string> {
  const faucetPrivateKeyHex = getFaucetPrivateKeyHex();
  const faucetLockScript = getFaucetLockScript();
  const recipientLock = addressToScript(recipientAddress);

  if (
    recipientLock.codeHash !== faucetLockScript.codeHash ||
    recipientLock.hashType !== faucetLockScript.hashType
  ) {
    throw new Error('Invalid address: must be a CKB testnet secp256k1 address');
  }

  const claimAmountRaw = BigInt(config.faucetClaimAmount);
  const wbtcCells = await collectWbtcCells(faucetLockScript);

  if (wbtcCells.length === 0) {
    throw new Error('Faucet has no cWBTC cells');
  }

  const wbtcCellsWithAmount = wbtcCells
    .map((c) => ({ ...c, amount: parseUdtAmount(c.outputData) }));

  const inputWbtcCell = wbtcCellsWithAmount[0];

  if (inputWbtcCell.amount < claimAmountRaw) {
    throw new Error(
      `Insufficient cWBTC: have ${inputWbtcCell.amount.toString()}, need ${claimAmountRaw.toString()}`,
    );
  }

  const wbtcInputCapacity = BigInt(inputWbtcCell.output.capacity);
  const changeAmount = inputWbtcCell.amount - claimAmountRaw;

  // Determine how many WBTC outputs we need
  const wbtcOutputCount = changeAmount > BigInt(0) ? 2 : 1;
  const neededCapacity = MIN_CELL_CAPACITY * BigInt(wbtcOutputCount) + TX_FEE;

  // Collect additional CKB cells if needed
  let ckbInputCapacity = BigInt(0);
  const ckbInputs: LiveCell[] = [];

  if (wbtcInputCapacity < neededCapacity) {
    const deficit = neededCapacity - wbtcInputCapacity;
    const ckbCells = await collectCkbCells(deficit, faucetLockScript);
    for (const cell of ckbCells) {
      // Don't use the WBTC cell as a CKB cell
      if (cell.outPoint.txHash === inputWbtcCell.outPoint.txHash &&
          cell.outPoint.index === inputWbtcCell.outPoint.index) {
        continue;
      }
      ckbInputs.push(cell);
      ckbInputCapacity += BigInt(cell.output.capacity);
      if (ckbInputCapacity >= deficit) break;
    }
    if (ckbInputCapacity < deficit) {
      throw new Error(
        `Insufficient CKB capacity: need ${deficit}, found ${ckbInputCapacity}`,
      );
    }
  }

  const totalInputCapacity = wbtcInputCapacity + ckbInputCapacity;

  // Build outputs
  const outputCells: CellOutput[] = [];
  const outputDataList: string[] = [];

  outputCells.push({
    capacity: bigIntToHex(MIN_CELL_CAPACITY),
    lock: recipientLock,
    type: WBTC_TYPE_SCRIPT,
  });
  outputDataList.push(packUdtAmount(claimAmountRaw));

  if (changeAmount > BigInt(0)) {
    outputCells.push({
      capacity: bigIntToHex(MIN_CELL_CAPACITY),
      lock: faucetLockScript,
      type: WBTC_TYPE_SCRIPT,
    });
    outputDataList.push(packUdtAmount(changeAmount));
  }

  const outputCapacity = MIN_CELL_CAPACITY * BigInt(outputCells.length);
  const changeCkb = totalInputCapacity - outputCapacity - TX_FEE;

  if (changeCkb >= MIN_CELL_CAPACITY) {
    outputCells.push({
      capacity: bigIntToHex(changeCkb),
      lock: faucetLockScript,
      type: null,
    });
    outputDataList.push('0x');
  } else if (changeCkb < BigInt(0)) {
    throw new Error(
      `Insufficient capacity: input ${totalInputCapacity}, need ${outputCapacity + TX_FEE}`,
    );
  }

  // Build inputs (WBTC cell + CKB cells)
  const inputs = [
    { previousOutput: inputWbtcCell.outPoint, since: '0x0' },
    ...ckbInputs.map((c) => ({ previousOutput: c.outPoint, since: '0x0' })),
  ];

  // Build witnesses for all inputs (first one is the template, rest are empty)
  const witnessTemplate = { lock: '', inputType: '', outputType: '' };
  const witnesses = [witnessTemplate as unknown, ...Array.from({ length: inputs.length - 1 }, () => '0x')];

  // The CKB SDK signTransaction uses internal CKBComponents types that don't
  // perfectly match our constructed transaction. The runtime behavior is correct.
  const rawTx = {
    version: '0x0',
    cellDeps: [SECP256K1_CELL_DEP, XUDT_CELL_DEP],
    headerDeps: [],
    inputs,
    outputs: outputCells,
    outputsData: outputDataList,
    witnesses,
  };

  const ckbSdk = new CKB(config.ckbRpcUrl);
  await ckbSdk.loadDeps();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signedRaw = ckbSdk.signTransaction(faucetPrivateKeyHex)(rawTx as any);

  const signedTx = {
    version: signedRaw.version,
    cell_deps: (signedRaw.cellDeps as CellDep[]).map((d) => ({
      out_point: { tx_hash: d.outPoint.txHash, index: d.outPoint.index },
      dep_type: d.depType === 'depGroup' ? 'dep_group' : d.depType,
    })),
    header_deps: signedRaw.headerDeps,
    inputs: (signedRaw.inputs as { previousOutput: CellOutPoint; since: string }[]).map((i) => ({
      previous_output: { tx_hash: i.previousOutput.txHash, index: i.previousOutput.index },
      since: i.since,
    })),
    outputs: (signedRaw.outputs as CellOutput[]).map((o) => ({
      capacity: o.capacity,
      lock: { code_hash: o.lock.codeHash, hash_type: o.lock.hashType, args: o.lock.args },
      type: o.type
        ? { code_hash: o.type.codeHash, hash_type: o.type.hashType, args: o.type.args }
        : null,
    })),
    outputs_data: signedRaw.outputsData,
    witnesses: signedRaw.witnesses,
  };

  const txId = await ckbRpc<string>('send_transaction', [signedTx, 'passthrough']);
  return txId;
}
