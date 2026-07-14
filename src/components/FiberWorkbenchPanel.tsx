import { useMemo, useState } from 'react';
import type { FiberNodeButtonTabContext } from '@fiber-pay/react';
import { Check, Copy, Loader2, Send } from 'lucide-react';
import { CWBTC_TYPE_SCRIPT } from '../context/FiberNodeProvider';
import {
  CWBTC_DECIMALS,
  formatCwbtcRaw,
  parseCwbtcToRaw,
  rawToHex,
} from '../utils/cwbtc';
import styles from './FiberWorkbenchPanel.module.css';

interface FiberWorkbenchPanelProps {
  context: FiberNodeButtonTabContext;
}

function formatPubkey(value: string): string {
  if (value.length <= 24) {
    return value;
  }

  return `${value.slice(0, 14)}...${value.slice(-10)}`;
}

function normalizePubkey(value: string): `0x${string}` {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Target pubkey is required.');
  }

  return (trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`) as `0x${string}`;
}

function isAllowedCwbtcInput(value: string): boolean {
  return /^\d*(?:\.\d{0,8})?$/.test(value);
}

function parsePositiveDisplayAmount(value: string): bigint | null {
  try {
    const raw = parseCwbtcToRaw(value);
    return raw > 0n ? raw : null;
  } catch {
    return null;
  }
}

export function FiberWorkbenchPanel({ context }: FiberWorkbenchPanelProps) {
  const { fiber, state, actions } = context;
  const isNodeReady = state.isNodeReady;

  const [fundingDisplay, setFundingDisplay] = useState(() =>
    formatCwbtcRaw(state.fundingAmount || '0')
  );
  const [invoiceDisplay, setInvoiceDisplay] = useState(() =>
    formatCwbtcRaw(state.invoiceAmount || '0')
  );
  const [copiedInvoice, setCopiedInvoice] = useState(false);
  const [keysendPubkey, setKeysendPubkey] = useState('');
  const [keysendAmount, setKeysendAmount] = useState('1');
  const [keysendLoading, setKeysendLoading] = useState(false);
  const [keysendMessage, setKeysendMessage] = useState<string | null>(null);
  const [keysendError, setKeysendError] = useState<string | null>(null);

  const fundingRaw = useMemo(
    () => parsePositiveDisplayAmount(fundingDisplay),
    [fundingDisplay]
  );
  const invoiceRaw = useMemo(
    () => parsePositiveDisplayAmount(invoiceDisplay),
    [invoiceDisplay]
  );
  const keysendRaw = useMemo(
    () => parsePositiveDisplayAmount(keysendAmount),
    [keysendAmount]
  );

  const handleFundingAmountChange = (value: string) => {
    if (!isAllowedCwbtcInput(value)) {
      return;
    }

    setFundingDisplay(value);
    try {
      state.setFundingAmount(parseCwbtcToRaw(value).toString());
    } catch {
      state.setFundingAmount('0');
    }
  };

  const handleInvoiceAmountChange = (value: string) => {
    if (!isAllowedCwbtcInput(value)) {
      return;
    }

    setInvoiceDisplay(value);
    try {
      state.setInvoiceAmount(parseCwbtcToRaw(value).toString());
    } catch {
      state.setInvoiceAmount('0');
    }
  };

  const handleKeysendAmountChange = (value: string) => {
    if (!isAllowedCwbtcInput(value)) {
      return;
    }

    setKeysendAmount(value);
  };

  const handleCopyInvoice = async () => {
    if (!state.createdInvoice) {
      return;
    }

    await navigator.clipboard.writeText(state.createdInvoice);
    setCopiedInvoice(true);
    window.setTimeout(() => setCopiedInvoice(false), 1600);
  };

  const handleKeysend = async () => {
    if (!fiber.node || !keysendRaw) {
      return;
    }

    setKeysendLoading(true);
    setKeysendMessage(null);
    setKeysendError(null);

    try {
      const result = await fiber.node.sendPayment({
        target_pubkey: normalizePubkey(keysendPubkey),
        amount: rawToHex(keysendRaw),
        keysend: true,
        udt_type_script: CWBTC_TYPE_SCRIPT,
      });
      const status = result.status ?? 'submitted';
      const paymentHash = result.payment_hash
        ? ` · ${formatPubkey(result.payment_hash)}`
        : '';
      setKeysendMessage(`Keysend ${status}${paymentHash}`);
    } catch (err) {
      setKeysendError(err instanceof Error ? err.message : String(err));
    } finally {
      setKeysendLoading(false);
    }
  };

  return (
    <div className={styles.workbench}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h4 className={styles.sectionTitle}>Connection</h4>
            <p className={styles.sectionMeta}>
              {fiber.nodeInfo?.pubkey
                ? formatPubkey(fiber.nodeInfo.pubkey)
                : 'Node is not connected'}
            </p>
          </div>
          <span className={styles.badge}>
            {isNodeReady ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h4 className={styles.sectionTitle}>Open Channel</h4>
          {state.channelOpenFlow.lastResult && (
            <span className={styles.badge}>Recent success</span>
          )}
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Target peer pubkey</span>
          <input
            className={styles.input}
            list={state.peerListId}
            value={state.peerPubkey}
            onChange={(event) => state.setPeerPubkey(event.target.value)}
            placeholder={state.connectedPeers[0]?.pubkey ?? '0x...'}
          />
          <datalist id={state.peerListId}>
            {state.connectedPeers.map((peer) => (
              <option key={peer.pubkey} value={peer.pubkey} />
            ))}
          </datalist>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Funding amount (cWBTC)</span>
          <input
            className={styles.input}
            inputMode="decimal"
            value={fundingDisplay}
            onChange={(event) => handleFundingAmountChange(event.target.value)}
            placeholder="10"
          />
          <span className={styles.hint}>
            Up to {CWBTC_DECIMALS} decimals. Raw units are handled internally.
          </span>
        </label>

        <button
          className={`${styles.button} ${styles.primaryButton}`}
          type="button"
          disabled={
            !isNodeReady ||
            state.channelOpenFlow.isOpening ||
            !state.peerPubkey.trim() ||
            !fundingRaw
          }
          onClick={() => void actions.openChannel()}
        >
          {state.channelOpenFlow.isOpening ? (
            <Loader2 size={16} className={styles.spinner} />
          ) : null}
          Open Channel ({fundingDisplay || '0'} cWBTC)
        </button>
      </section>

      <section className={styles.section}>
        <h4 className={styles.sectionTitle}>Payments</h4>

        <label className={styles.field}>
          <span className={styles.label}>Invoice amount (cWBTC)</span>
          <input
            className={styles.input}
            inputMode="decimal"
            value={invoiceDisplay}
            onChange={(event) => handleInvoiceAmountChange(event.target.value)}
            placeholder="1"
          />
        </label>

        <div className={styles.row}>
          <button
            className={`${styles.button} ${styles.primaryButton}`}
            type="button"
            disabled={state.isCreatingInvoice || !isNodeReady || !invoiceRaw}
            onClick={() => void actions.createInvoice()}
          >
            {state.isCreatingInvoice ? (
              <Loader2 size={16} className={styles.spinner} />
            ) : null}
            Create Invoice ({invoiceDisplay || '0'} cWBTC)
          </button>
          {state.createdInvoice ? (
            <button
              className={styles.copyButton}
              type="button"
              onClick={() => void handleCopyInvoice()}
              title="Copy invoice"
            >
              {copiedInvoice ? <Check size={14} /> : <Copy size={14} />}
            </button>
          ) : null}
        </div>

        {state.createdInvoice ? (
          <div className={styles.inlineCode}>{state.createdInvoice}</div>
        ) : null}

        <label className={styles.field}>
          <span className={styles.label}>Invoice</span>
          <input
            className={styles.input}
            value={state.invoiceInput}
            onChange={(event) => state.setInvoiceInput(event.target.value)}
            placeholder="Paste invoice to pay"
          />
        </label>

        <div className={styles.rowBetween}>
          <button
            className={`${styles.button} ${styles.secondaryButton}`}
            type="button"
            disabled={state.isPaying || !isNodeReady || !state.invoiceInput.trim()}
            onClick={() => void actions.payInvoice()}
          >
            {state.isPaying ? <Loader2 size={16} className={styles.spinner} /> : null}
            Pay Invoice
          </button>
          <span className={styles.hint}>
            Status: {state.paymentResult?.status ?? 'Idle'}
          </span>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h4 className={styles.sectionTitle}>Keysend</h4>
          <span className={styles.badge}>Direct</span>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Recipient pubkey</span>
          <input
            className={styles.input}
            list={state.peerListId}
            value={keysendPubkey}
            onChange={(event) => setKeysendPubkey(event.target.value)}
            placeholder={state.connectedPeers[0]?.pubkey ?? '0x...'}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Amount (cWBTC)</span>
          <input
            className={styles.input}
            inputMode="decimal"
            value={keysendAmount}
            onChange={(event) => handleKeysendAmountChange(event.target.value)}
            placeholder="0.1"
          />
        </label>

        <button
          className={`${styles.button} ${styles.primaryButton}`}
          type="button"
          disabled={!isNodeReady || keysendLoading || !keysendPubkey.trim() || !keysendRaw}
          onClick={() => void handleKeysend()}
        >
          {keysendLoading ? (
            <Loader2 size={16} className={styles.spinner} />
          ) : (
            <Send size={16} />
          )}
          Send Keysend
        </button>

        {keysendMessage ? <div className={styles.message}>{keysendMessage}</div> : null}
        {keysendError ? <div className={styles.error}>{keysendError}</div> : null}
      </section>
    </div>
  );
}
