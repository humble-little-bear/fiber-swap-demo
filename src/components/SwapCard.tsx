import { useState, useCallback, useEffect, useMemo } from 'react';
import { RefreshCw, ArrowDown, Loader2 } from 'lucide-react';
import { useQuote } from '../hooks/useQuote';
import { useSwap } from '../hooks/useSwap';
import { InvoiceInput } from './InvoiceInput';
import { OrderPanel } from './OrderPanel';
import styles from './SwapCard.module.css';

const SATOSHI_PER_BTC = 100_000_000;

export function SwapCard() {
  const [btcSats, setBtcSats] = useState('');
  const [invoice, setInvoice] = useState('');
  const [invoiceValid, setInvoiceValid] = useState(false);
  const { quote, loading: quoteLoading, requestQuote } = useQuote();
  const { order, loading: swapLoading, error: swapError, createOrder, reset } = useSwap();

  // Debounced quote request when btcSats changes
  useEffect(() => {
    const sats = parseFloat(btcSats);
    if (btcSats && Number.isFinite(sats) && sats > 0) {
      requestQuote(Math.round(sats));
    } else {
      requestQuote(0);
    }
  }, [btcSats, requestQuote]);

  const ckbAmount = useMemo(() => {
    if (!quote) return '';
    const hex = quote.ckb_amount;
    const shannons = parseInt(hex, 16);
    return (shannons / SATOSHI_PER_BTC).toFixed(4);
  }, [quote]);

  const handleInvoiceChange = useCallback((value: string, isValid: boolean) => {
    setInvoice(value);
    setInvoiceValid(isValid);
  }, []);

  const handleCreateOrder = useCallback(async () => {
    if (!invoiceValid || !btcSats) return;
    await createOrder(invoice.trim());
  }, [invoiceValid, btcSats, invoice, createOrder]);

  const handleReset = useCallback(() => {
    setBtcSats('');
    setInvoice('');
    setInvoiceValid(false);
    reset();
  }, [reset]);

  const canCreate = invoiceValid && btcSats && !quoteLoading && !swapLoading;

  if (order) {
    return (
      <div className={styles.card}>
        <OrderPanel order={order} />
        <button className={styles.resetBtn} onClick={handleReset}>
          <RefreshCw size={16} />
          New Swap
        </button>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      {/* Card Header */}
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>CKB → BTC Swap</span>
        <div className={styles.cardActions}>
          <button className={styles.iconBtn} onClick={handleReset} title="Reset">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* CKB Input (top) */}
      <div className={styles.tokenInput}>
        <div className={styles.tokenInputHeader}>
          <span className={styles.tokenInputLabel}>You send (CKB)</span>
        </div>
        <div className={styles.tokenInputBody}>
          <input
            type="number"
            placeholder="0"
            value={ckbAmount}
            readOnly
            className={styles.tokenInputField}
          />
          <div className={styles.tokenBadge}>CKB</div>
        </div>
        {quote && (
          <div className={styles.tokenInputValue}>
            {quote.rate} · Fee {quote.fee_estimate}
          </div>
        )}
      </div>

      {/* Arrow */}
      <div className={styles.swapToggleWrap}>
        <div className={styles.swapToggleBtn}>
          <ArrowDown size={18} />
        </div>
      </div>

      {/* BTC Input (bottom) */}
      <div className={styles.tokenInput}>
        <div className={styles.tokenInputHeader}>
          <span className={styles.tokenInputLabel}>You receive (BTC)</span>
        </div>
        <div className={styles.tokenInputBody}>
          <input
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={btcSats}
            onChange={(e) => setBtcSats(e.target.value)}
            className={styles.tokenInputField}
          />
          <div className={styles.tokenBadge}>sats</div>
        </div>
      </div>

      {/* Invoice Input */}
      <InvoiceInput value={invoice} onChange={handleInvoiceChange} disabled={swapLoading} />

      {/* Error */}
      {swapError && (
        <div className={styles.errorBox}>{swapError.message}</div>
      )}

      {/* Create Order Button */}
      <button
        onClick={handleCreateOrder}
        disabled={!canCreate}
        className={styles.swapBtn}
      >
        {swapLoading ? (
          <span className={styles.swapBtnLoading}>
            <Loader2 size={18} className={styles.spin} />
            Creating Order…
          </span>
        ) : !btcSats ? (
          'Enter BTC amount'
        ) : !invoiceValid ? (
          'Paste valid invoice'
        ) : (
          'Create Order'
        )}
      </button>
    </div>
  );
}
