import { useState, useCallback, useMemo } from 'react';
import { ArrowDown, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { useNodeInfo } from '../hooks/useNodeInfo';
import { useQuote } from '../hooks/useQuote';
import { useSwap } from '../hooks/useSwap';
import { InvoiceInput } from './InvoiceInput';
import styles from './SwapCard.module.css';

const CKB_SYMBOL = 'CKB';
const BTC_SYMBOL = 'BTC';
const CKB_DECIMALS = 8;

function hexToDecimal(hex: string): string {
  const clean = hex.startsWith('0x') || hex.startsWith('0X') ? hex.slice(2) : hex;
  if (!clean) return '0';
  return BigInt(`0x${clean}`).toString(10);
}

interface SwapCardProps {
  onOrderCreated?: (paymentHash: string, incomingInvoice: string, outgoingPayReq: string) => void;
}

export function SwapCard({ onOrderCreated }: SwapCardProps) {
  const [btcSats, setBtcSats] = useState('');
  const [invoice, setInvoice] = useState('');
  const { data: nodeInfo } = useNodeInfo();
  const { quote, loading: quoteLoading } = useQuote(btcSats ? parseInt(btcSats, 10) : null);
  const { loading: swapLoading, error: swapError, createOrder } = useSwap();

  const quoteCkb = useMemo(() => {
    if (!quote) return '';
    const raw = hexToDecimal(quote.ckb_amount);
    const val = Number(raw) / Math.pow(10, CKB_DECIMALS);
    return val.toFixed(CKB_DECIMALS > 6 ? 6 : CKB_DECIMALS);
  }, [quote]);

  const backendOnline = nodeInfo?.online ?? false;
  const invoiceValid = invoice.trim().toLowerCase().startsWith('lntb');
  const canSubmit = backendOnline && invoiceValid && !!btcSats && parseInt(btcSats, 10) > 0 && !swapLoading;

  const handleBtcChange = useCallback((val: string) => {
    // Only allow positive integers (satoshis)
    if (val === '') {
      setBtcSats('');
      return;
    }
    const num = parseInt(val, 10);
    if (Number.isNaN(num) || num < 0) return;
    setBtcSats(num.toString());
  }, []);

  const handleCreateOrder = useCallback(async () => {
    if (!canSubmit) return;
    try {
      const res = await createOrder(invoice.trim());
      if (onOrderCreated && res) {
        onOrderCreated(res.payment_hash, res.incoming_invoice, res.outgoing_pay_req);
      }
    } catch {
      // error handled in hook
    }
  }, [canSubmit, createOrder, invoice, onOrderCreated]);

  return (
    <div className={styles.card}>
      {/* Card Header */}
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>Swap CKB → BTC</span>
        <div className={styles.cardActions}>
          <button
            className={styles.iconBtn}
            onClick={() => {
              setBtcSats('');
              setInvoice('');
            }}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* From Input (CKB) */}
      <div className={styles.tokenInput}>
        <div className={styles.tokenInputHeader}>
          <span className={styles.tokenInputLabel}>Sell</span>
          <span className={styles.tokenInputBalance}>Nervos CKB</span>
        </div>
        <div className={styles.tokenInputBody}>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={quoteCkb}
            readOnly
            className={styles.tokenInputField}
          />
          <div className={styles.tokenStaticBadge}>
            {CKB_SYMBOL}
          </div>
        </div>
        {quote && (
          <div className={styles.tokenInputValue}>
            {quote.rate} · Fee {quote.fee_estimate}
          </div>
        )}
        {quoteLoading && (
          <div className={styles.tokenInputValue}>
            <Loader2 size={12} className={styles.spinInline} /> Getting quote…
          </div>
        )}
      </div>

      {/* Swap Toggle (visual only, fixed direction) */}
      <div className={styles.swapToggleWrap}>
        <div className={styles.swapToggleBtn}>
          <ArrowDown size={18} />
        </div>
      </div>

      {/* To Input (BTC sats) */}
      <div className={styles.tokenInput}>
        <div className={styles.tokenInputHeader}>
          <span className={styles.tokenInputLabel}>Buy</span>
          <span className={styles.tokenInputBalance}>Lightning Testnet</span>
        </div>
        <div className={styles.tokenInputBody}>
          <input
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={btcSats}
            onChange={(e) => handleBtcChange(e.target.value)}
            className={styles.tokenInputField}
          />
          <div className={styles.tokenStaticBadge}>
            {BTC_SYMBOL}
          </div>
        </div>
        {btcSats && (
          <div className={styles.tokenInputValue}>
            {parseInt(btcSats, 10).toLocaleString()} sats
          </div>
        )}
      </div>

      {/* Invoice Input */}
      <div style={{ marginTop: 16 }}>
        <InvoiceInput value={invoice} onChange={setInvoice} disabled={swapLoading} />
      </div>

      {/* Rate display */}
      {quote && btcSats && (
        <div className={styles.rateRow}>
          <span>Quote valid until {new Date(quote.valid_until).toLocaleTimeString()}</span>
        </div>
      )}

      {/* Error */}
      {swapError && (
        <div className={styles.errorRow}>
          <AlertCircle size={14} />
          {swapError}
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleCreateOrder}
        disabled={!canSubmit}
        className={styles.swapBtn}
      >
        {swapLoading ? (
          <span className={styles.swapBtnLoading}>
            <Loader2 size={18} className={styles.spin} />
            Creating Order…
          </span>
        ) : !backendOnline ? (
          'Backend Offline'
        ) : !invoiceValid || !btcSats ? (
          'Enter amount and invoice'
        ) : (
          'Create Order'
        )}
      </button>
    </div>
  );
}
