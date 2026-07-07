import { useState, useCallback, useEffect, useMemo } from 'react';
import { RefreshCw, ArrowDown, Loader2, AlertCircle, Droplets, ExternalLink } from 'lucide-react';
import { useQuote } from '../hooks/useQuote';
import { useSwap } from '../hooks/useSwap';
import { InvoiceInput } from './InvoiceInput';
import { OrderPanel } from './OrderPanel';
import { postFaucetClaim } from '../api/client';
import { parseBOLT11, parseSafeSats } from '../utils/invoice';
import { formatCkb } from '../utils/format';
import styles from './SwapCard.module.css';

function formatValidUntil(iso: string): string {
  const date = new Date(iso);
  const time = date.getTime();
  if (!Number.isFinite(time)) return '—';
  const diff = time - Date.now();
  if (diff <= 0) return 'Expired';
  const mins = Math.ceil(diff / 60000);
  return `Valid for ${mins} min${mins === 1 ? '' : 's'}`;
}

export function SwapCard() {
  const [invoice, setInvoice] = useState('');
  const [manualBtcSats, setManualBtcSats] = useState('');
  const [manualTouched, setManualTouched] = useState(false);
  const [faucetAddress, setFaucetAddress] = useState('');
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetMessage, setFaucetMessage] = useState<string | null>(null);
  const [faucetTxHash, setFaucetTxHash] = useState<string | null>(null);
  const [faucetError, setFaucetError] = useState<string | null>(null);
  const { quote, loading: quoteLoading, requestQuote } = useQuote();
  const { order, loading: swapLoading, error: swapError, createOrder, reset } = useSwap();

  const parsedInvoice = useMemo(() => parseBOLT11(invoice), [invoice]);
  const manualParse = useMemo(() => parseSafeSats(manualBtcSats), [manualBtcSats]);

  const isInvoiceValid = parsedInvoice.isValid;
  const invoiceAmountSats = parsedInvoice.amountSats;
  const isAmountless = parsedInvoice.isAmountless;

  // For amountless invoices the user enters the amount manually.
  // For amountful invoices the amount is derived from the invoice.
  const { btcSats, enteredSatsInfo } = useMemo(() => {
    if (!isInvoiceValid) {
      return { btcSats: '', enteredSatsInfo: { sats: NaN, valid: false } };
    }
    if (isAmountless) {
      return { btcSats: manualBtcSats, enteredSatsInfo: manualParse };
    }
    if (invoiceAmountSats != null) {
      return {
        btcSats: String(invoiceAmountSats),
        enteredSatsInfo: { sats: invoiceAmountSats, valid: true },
      };
    }
    return { btcSats: '', enteredSatsInfo: { sats: NaN, valid: false } };
  }, [isInvoiceValid, isAmountless, invoiceAmountSats, manualBtcSats, manualParse]);

  // Debounced quote request when the entered sats amount changes.
  useEffect(() => {
    if (enteredSatsInfo.valid && enteredSatsInfo.sats > 0) {
      requestQuote(Math.round(enteredSatsInfo.sats));
    } else {
      requestQuote(0);
    }
  }, [enteredSatsInfo, requestQuote]);

  const ckbAmount = useMemo(() => {
    if (!quote) return '';
    return formatCkb(quote.ckb_amount);
  }, [quote]);

  const handleInvoiceChange = useCallback((value: string) => {
    setInvoice(value);
    setManualBtcSats('');
    setManualTouched(false);
  }, []);

  const handleBtcSatsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setManualBtcSats(e.target.value);
    setManualTouched(true);
  }, []);

  const handleCreateOrder = useCallback(async () => {
    if (!isInvoiceValid || !enteredSatsInfo.valid || enteredSatsInfo.sats <= 0 || !quote) return;
    await createOrder(invoice.trim(), Math.round(enteredSatsInfo.sats));
  }, [isInvoiceValid, enteredSatsInfo, invoice, createOrder, quote]);

  const handleReset = useCallback(() => {
    setManualBtcSats('');
    setInvoice('');
    reset();
  }, [reset]);

  const handleClaimFaucet = useCallback(async () => {
    const address = faucetAddress.trim();
    if (!address || faucetLoading) return;
    setFaucetLoading(true);
    setFaucetError(null);
    setFaucetMessage(null);
    setFaucetTxHash(null);
    try {
      const result = await postFaucetClaim(address);
      setFaucetMessage(result.message || 'cWBTC sent');
      setFaucetTxHash(result.tx_hash ?? null);
    } catch (err) {
      setFaucetError(err instanceof Error ? err.message : String(err));
    } finally {
      setFaucetLoading(false);
    }
  }, [faucetAddress, faucetLoading]);

  const enteredSatsValid = enteredSatsInfo.valid && enteredSatsInfo.sats > 0;

  const manualSatsError = isAmountless && manualTouched && manualBtcSats && !manualParse.valid
    ? manualParse.error || 'Invalid amount'
    : '';

  const canCreate =
    isInvoiceValid &&
    enteredSatsValid &&
    !quoteLoading &&
    !swapLoading &&
    quote != null;

  const isAmountEditable = isInvoiceValid && isAmountless;

  if (order) {
    return (
      <div className={styles.card}>
        <OrderPanel order={order} />
        <button className={styles.resetBtn} onClick={handleReset}>
          <RefreshCw size={16} />
          New Payment
        </button>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      {/* Card Header */}
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>Pay a Lightning Invoice</span>
        <div className={styles.cardActions}>
          <button className={styles.iconBtn} onClick={handleReset} title="Reset">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className={styles.faucetBox}>
        <div className={styles.faucetHeader}>
          <div className={styles.faucetTitle}>
            <Droplets size={15} />
            Need test cWBTC?
          </div>
          <span className={styles.faucetHint}>One claim per address cooldown</span>
        </div>
        <div className={styles.faucetControls}>
          <input
            type="text"
            placeholder="Paste ckt1... address"
            value={faucetAddress}
            onChange={(e) => setFaucetAddress(e.target.value)}
            className={styles.faucetInput}
            disabled={faucetLoading}
          />
          <button
            type="button"
            className={styles.faucetBtn}
            onClick={handleClaimFaucet}
            disabled={faucetLoading || !faucetAddress.trim()}
          >
            {faucetLoading ? <Loader2 size={14} className={styles.spin} /> : 'Claim'}
          </button>
        </div>
        {faucetMessage && (
          <div className={styles.faucetSuccess}>
            {faucetMessage}
            {faucetTxHash && (
              <a
                href={`https://pudge.explorer.nervos.org/transaction/${faucetTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.faucetLink}
              >
                <ExternalLink size={12} />
                View tx
              </a>
            )}
          </div>
        )}
        {faucetError && (
          <div className={styles.faucetError}>
            <AlertCircle size={13} />
            {faucetError}
          </div>
        )}
      </div>

      {/* 1. BTC Lightning Invoice */}
      <InvoiceInput value={invoice} onChange={handleInvoiceChange} disabled={swapLoading} />

      {/* 2. Recipient gets (BTC sats) */}
      <div className={styles.tokenInput}>
        <div className={styles.tokenInputHeader}>
          <span className={styles.tokenInputLabel}>Recipient gets (BTC)</span>
          {isInvoiceValid && !isAmountless && invoiceAmountSats != null && (
            <span className={styles.tokenInputHint}>from invoice</span>
          )}
          {isAmountless && (
            <span className={styles.tokenInputHint}>amountless invoice — enter amount</span>
          )}
        </div>
        <div className={styles.tokenInputBody}>
          <input
            type="text"
            inputMode="numeric"
            placeholder={isAmountless ? 'Enter sats amount' : '0'}
            value={btcSats}
            onChange={handleBtcSatsChange}
            disabled={!isAmountEditable && !isInvoiceValid}
            readOnly={!isAmountEditable}
            className={styles.tokenInputField}
          />
          <div className={styles.tokenBadge}>sats</div>
        </div>
        {isAmountless && (
          <div className={styles.tokenInputValue}>
            This invoice has no amount. Enter how many sats to pay.
          </div>
        )}
        {manualSatsError && (
          <div className={styles.errorBox}>
            <AlertCircle size={14} />
            {manualSatsError}
          </div>
        )}
      </div>

      {/* Arrow */}
      <div className={styles.swapToggleWrap}>
        <div className={styles.swapToggleBtn}>
          <ArrowDown size={18} />
        </div>
      </div>

      {/* 3. You pay (CKB) */}
      <div className={styles.tokenInput}>
        <div className={styles.tokenInputHeader}>
          <span className={styles.tokenInputLabel}>You pay (CKB)</span>
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
            {quote.rate} · Fee {quote.fee_estimate} · {formatValidUntil(quote.valid_until)}
          </div>
        )}
      </div>

      {/* Error */}
      {swapError && (
        <div className={styles.errorBox}>
          <AlertCircle size={14} />
          {swapError.message}
        </div>
      )}

      {/* 4. Create Order Button */}
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
        ) : !isInvoiceValid ? (
          'Paste a valid invoice'
        ) : isAmountless && !enteredSatsValid ? (
          manualSatsError ? 'Invalid BTC amount' : 'Enter BTC amount'
        ) : !quote ? (
          quoteLoading ? (
            <span className={styles.swapBtnLoading}>
              <Loader2 size={18} className={styles.spin} />
              Getting quote…
            </span>
          ) : (
            'Waiting for quote…'
          )
        ) : (
          'Create Order'
        )}
      </button>
    </div>
  );
}
