import {
  ProcessManager,
  createKeyManager,
  getFiberBinaryInfo,
  ensureFiberBinary,
  type FiberNodeConfig,
} from '@fiber-pay/node';
import { config } from '../config.js';
import { homedir } from 'os';
import { join } from 'path';

export interface ManagedNode {
  rpcUrl: string;
  stop: () => Promise<void>;
}

const DEFAULT_DATA_DIR = join(homedir(), '.fiber-swap-demo', 'fiber-node');
const DEFAULT_BINARY_DIR = join(homedir(), '.fiber-pay', 'bin');
const DEFAULT_KEY_PASSWORD = 'fiber-pay-default-key';
const READY_POLL_INTERVAL_MS = 2000;
const READY_TIMEOUT_MS = 180000;

async function pollNodeInfo(rpcUrl: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: Error | undefined;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'ready-check',
          method: 'node_info',
          params: [],
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { result?: unknown };
        if (data.result != null) {
          return;
        }
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }

    await new Promise((resolve) => setTimeout(resolve, READY_POLL_INTERVAL_MS));
  }

  throw lastError ?? new Error(`Fiber node did not become RPC-ready within ${timeoutMs}ms`);
}

export async function startFiberNode(): Promise<ManagedNode> {
  if (process.env.FIBER_NODE_ENABLED === 'false') {
    console.log('[fiber-node] Management disabled; using FNN_RPC_URL from config');
    return {
      rpcUrl: config.fnnRpcUrl,
      stop: async () => {},
    };
  }

  const dataDir = process.env.FIBER_NODE_DATA_DIR || DEFAULT_DATA_DIR;
  const binaryDir = process.env.FIBER_NODE_BINARY_DIR || DEFAULT_BINARY_DIR;
  const chain = process.env.FIBER_NODE_CHAIN || 'testnet';
  const rpcAddr = process.env.FIBER_NODE_RPC_ADDR || '127.0.0.1:8227';
  const keyPassword = process.env.FIBER_KEY_PASSWORD || DEFAULT_KEY_PASSWORD;
  const logLevel = (process.env.FIBER_LOG_LEVEL as FiberNodeConfig['logLevel']) || 'info';
  const configFilePath = process.env.FIBER_NODE_CONFIG_FILE || undefined;

  const binaryInfo = await getFiberBinaryInfo(binaryDir);
  let binaryPath = binaryInfo.path;
  if (!binaryInfo.ready) {
    console.log('[fiber-node] Fiber binary not found; downloading...');
    binaryPath = await ensureFiberBinary({
      installDir: binaryDir,
      version: process.env.FIBER_NODE_VERSION,
    });
  } else {
    console.log(`[fiber-node] Fiber binary ready: ${binaryInfo.path} (v${binaryInfo.version})`);
  }

  const keyManager = createKeyManager(dataDir, {
    autoGenerate: true,
    encryptionPassword: keyPassword,
  });
  await keyManager.initialize();

  const managerConfig: FiberNodeConfig = {
    binaryPath,
    dataDir,
    chain: chain as FiberNodeConfig['chain'],
    rpcListeningAddr: rpcAddr,
    keyPassword,
    logLevel,
  };
  if (configFilePath) {
    managerConfig.configFilePath = configFilePath;
  }

  const manager = new ProcessManager(managerConfig);

  manager.on('stdout', (line: string) => process.stdout.write(`[fnn] ${line}`));
  manager.on('stderr', (line: string) => process.stderr.write(`[fnn] ${line}`));

  console.log(`[fiber-node] Starting node (dataDir=${dataDir}, rpc=${rpcAddr})...`);
  await manager.start();

  const rpcUrl = manager.getRpcUrl();
  console.log(`[fiber-node] Waiting for RPC readiness at ${rpcUrl}...`);
  await pollNodeInfo(rpcUrl, READY_TIMEOUT_MS);
  console.log('[fiber-node] Node is RPC-ready');

  config.fnnRpcUrl = rpcUrl;

  return {
    rpcUrl,
    stop: async () => {
      console.log('[fiber-node] Stopping node...');
      await manager.stop(30000);
      console.log('[fiber-node] Node stopped');
    },
  };
}
