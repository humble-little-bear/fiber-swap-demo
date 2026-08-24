import { useState, useCallback, useEffect, useMemo } from 'react';
import { RefreshCw, ArrowDown, ArrowUpDown, Loader2, AlertCircle } from 'lucide-react';
import { useQuote } from '../hooks/useQuote';
import { useSwap } from '../hooks/useSwap';
import { useFiberNodeContextOptional } from '../hooks/useFiberNodeContextOptional';
import { CWBTC_TYPE_SCRIPT } from '../context/FiberNodeProvider';
import { InvoiceInput } from './InvoiceInput';
import { OrderPanel } from './OrderPanel';
import { parseBOLT11, parseSafeSats, formatSats } from '../utils/invoice';
import { formatCwbtc } from '../utils/format';
import { parseCwbtcToRaw, formatCwbtcRaw, rawToHex } from '../utils/cwbtc';
import type { SwapDirection } from '../types';
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
  const [direction, setDirection] = useState<SwapDirection>('ckb-to-btc');
  const [invoice, setInvoice] = useState('');
  const [manualBtcSats, setManualBtcSats] = useState('');
  const [manualTouched, setManualTouched] = useState(false);
  // btc-to-ckb: desired receive amount, decimal cWBTC as entered by the user.
  const [receiveCwbtc, setReceiveCwbtc] = useState('');
  const [receiveTouched, setReceiveTouched] = useState(false);
  const { quote, loading: quoteLoading, requestQuote } = useQuote();
  const { order, loading: swapLoading, error: swapError, createOrder, reset } = useSwap();

  const fiber = useFiberNodeContextOptional();
  const fiberNode = fiber?.isRunning ? fiber.node : null;

  const parsedInvoice = useMemo(() => parseBOLT11(invoice), [invoice]);
  const manualParse = useMemo(() => parseSafeSats(manualBtcSats), [manualBtcSats]);

  const isInvoiceValid = parsedInvoice.isValid;
  const invoiceAmountSats = parsedInvoice.amountSats;
  const isAmountless = parsedInvoice.isAmountless;

  // ckb-to-btc: for amountless invoices the user enters the amount manually;
  // for amountful invoices the amount is derived from the invoice.
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

  // btc-to-ckb: the receive amount drives everything. 1 sat = 1 raw cWBTC unit.
  const receiveRaw = useMemo(() => {
    try {
      return parseCwbtcToRaw(receiveCwbtc);
    } catch {
      return null;
    }
  }, [receiveCwbtc]);

  const receiveSatsInfo = useMemo(() => {
    if (!receiveCwbtc.trim()) {
      return { sats: NaN, valid: false };
    }
    if (receiveRaw === null) {
      return { sats: NaN, valid: false, error: 'Enter a cWBTC amount with up to 8 decimal places.' };
    }
    if (receiveRaw <= 0n) {
      return { sats: NaN, valid: false, error: 'Amount must be greater than zero.' };
    }
    if (receiveRaw > BigInt(Number.MAX_SAFE_INTEGER)) {
      return { sats: NaN, valid: false, error: 'Amount exceeds the maximum safe value.' };
    }
    return { sats: Number(receiveRaw), valid: true };
  }, [receiveCwbtc, receiveRaw]);

  // Debounced quote request when the effective sats amount changes.
  // Both directions quote the same way: total sats moved = base + CCH fee.
  const quoteSats = direction === 'ckb-to-btc' ? enteredSatsInfo : receiveSatsInfo;
  useEffect(() => {
    if (quoteSats.valid && quoteSats.sats > 0) {
      requestQuote(Math.round(quoteSats.sats));
    } else {
      requestQuote(0);
    }
  }, [quoteSats, requestQuote]);

  // ckb-to-btc: cWBTC the user pays for the invoice amount (sats + fee).
  const cwbtcAmount = useMemo(() => {
    if (!quote || direction !== 'ckb-to-btc') return '';
    return formatCwbtc(quote.cwbtc_amount ?? quote.ckb_amount ?? '0x0');
  }, [quote, direction]);

  // btc-to-ckb: BTC sats the user pays for the desired receive amount.
  // The quote's raw cWBTC unit count maps 1:1 to sats.
  const paySatsDisplay = useMemo(() => {
    if (!quote || direction !== 'btc-to-ckb') return '';
    try {
      const sats = Number(BigInt(quote.cwbtc_amount ?? quote.ckb_amount ?? '0x0'));
      if (!Number.isSafeInteger(sats)) return '';
      return String(sats);
    } catch {
      return '';
    }
  }, [quote, direction]);

  const handleInvoiceChange = useCallback((value: string) => {
    setInvoice(value);
    setManualBtcSats('');
    setManualTouched(false);
  }, []);

  const handleBtcSatsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setManualBtcSats(e.target.value);
    setManualTouched(true);
  }, []);

  const handleReceiveChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setReceiveCwbtc(e.target.value);
    setReceiveTouched(true);
  }, []);

  const handleDirectionFlip = useCallback(() => {
    setDirection((d) => (d === 'ckb-to-btc' ? 'btc-to-ckb' : 'ckb-to-btc'));
    setInvoice('');
    setManualBtcSats('');
    setManualTouched(false);
    setReceiveCwbtc('');
    setReceiveTouched(false);
    reset();
  }, [reset]);

  const handleCreateOrder = useCallback(async () => {
    if (direction === 'ckb-to-btc') {
      if (!isInvoiceValid || !enteredSatsInfo.valid || enteredSatsInfo.sats <= 0 || !quote) return;
      await createOrder('ckb-to-btc', invoice.trim(), Math.round(enteredSatsInfo.sats));
      return;
    }
    // btc-to-ckb: the browser node signs the cWBTC receive invoice, then the
    // backend swaps it for a Lightning invoice via CCH receive_btc. The hash
    // algorithm must be sha256 — the CCH reuses the payment hash on LND.
    if (!fiberNode || !receiveSatsInfo.valid || !quote || receiveRaw === null) return;
    const fiberInvoice = await fiberNode.newInvoice({
      amount: rawToHex(receiveRaw),
      currency: 'Fibt',
      udt_type_script: CWBTC_TYPE_SCRIPT,
      hash_algorithm: 'sha256',
      description: 'fiber-swap-demo: BTC -> cWBTC',
    });
    await createOrder('btc-to-ckb', fiberInvoice.invoice_address);
  }, [direction, isInvoiceValid, enteredSatsInfo, quote, createOrder, invoice, fiberNode, receiveSatsInfo, receiveRaw]);

  const handleReset = useCallback(() => {
    setManualBtcSats('');
    setInvoice('');
    setReceiveCwbtc('');
    setReceiveTouched(false);
    reset();
  }, [reset]);

  const enteredSatsValid = enteredSatsInfo.valid && enteredSatsInfo.sats > 0;

  const manualSatsError = isAmountless && manualTouched && manualBtcSats && !manualParse.valid
    ? manualParse.error || 'Invalid amount'
    : '';

  const receiveError =
    direction === 'btc-to-ckb' && receiveTouched && receiveCwbtc && !receiveSatsInfo.valid
      ? receiveSatsInfo.error || 'Invalid amount'
      : '';

  const canCreate =
    direction === 'ckb-to-btc'
      ? isInvoiceValid && enteredSatsValid && !quoteLoading && !swapLoading && quote != null
      : receiveSatsInfo.valid &&
        receiveSatsInfo.sats > 0 &&
        fiberNode != null &&
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
          New Swap
        </button>
      </div>
    );
  }

  const isCkbToBtc = direction === 'ckb-to-btc';

  return (
    <div className={styles.card}>
      {/* Card Header */}
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>
          {isCkbToBtc ? 'Pay a Lightning Invoice' : 'Receive cWBTC with BTC'}
        </span>
        <div className={styles.cardActions}>
          <button className={styles.iconBtn} onClick={handleReset} title="Reset">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {isCkbToBtc ? (
        <>
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
        </>
      ) : (
        <>
          {/* 1. You pay (BTC sats, quoted from the receive amount) */}
          <div className={styles.tokenInput}>
            <div className={styles.tokenInputHeader}>
              <span className={styles.tokenInputLabel}>You pay (BTC)</span>
              {quote && <span className={styles.tokenInputHint}>includes CCH fee</span>}
            </div>
            <div className={styles.tokenInputBody}>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={paySatsDisplay}
                readOnly
                className={styles.tokenInputField}
              />
              <div className={styles.tokenBadge}>sats</div>
            </div>
            {quote && (
              <div className={styles.tokenInputValue}>
                {quote.rate} · Fee {quote.fee_estimate} · {formatValidUntil(quote.valid_until)}
              </div>
            )}
            <div className={styles.tokenInputValue}>
              Pay the Lightning invoice with any BTC testnet wallet after creating the order.
            </div>
          </div>
        </>
      )}

      {/* Direction flip */}
      <div className={styles.swapToggleWrap}>
        <button
          className={styles.swapToggleBtn}
          onClick={handleDirectionFlip}
          title="Flip swap direction"
          disabled={swapLoading}
        >
          {isCkbToBtc ? <ArrowDown size={18} /> : <ArrowUpDown size={18} />}
        </button>
      </div>

      {isCkbToBtc ? (
        /* 3. You pay (cWBTC) */
        <div className={styles.tokenInput}>
          <div className={styles.tokenInputHeader}>
            <span className={styles.tokenInputLabel}>You pay (cWBTC)</span>
          </div>
          <div className={styles.tokenInputBody}>
            <input
              type="number"
              placeholder="0"
              value={cwbtcAmount}
              readOnly
              className={styles.tokenInputField}
            />
            <div className={styles.tokenBadge}>cWBTC</div>
          </div>
          {quote && (
            <div className={styles.tokenInputValue}>
              {quote.rate} · Fee {quote.fee_estimate} · {formatValidUntil(quote.valid_until)}
            </div>
          )}
        </div>
      ) : (
        /* 2. You receive (cWBTC) — editable, drives the Fiber invoice amount */
        <div className={styles.tokenInput}>
          <div className={styles.tokenInputHeader}>
            <span className={styles.tokenInputLabel}>You receive (cWBTC)</span>
            <span className={styles.tokenInputHint}>received by your browser node</span>
          </div>
          <div className={styles.tokenInputBody}>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={receiveCwbtc}
              onChange={handleReceiveChange}
              disabled={swapLoading}
              className={styles.tokenInputField}
            />
            <div className={styles.tokenBadge}>cWBTC</div>
          </div>
          {receiveCwbtc && receiveSatsInfo.valid && receiveRaw !== null && (
            <div className={styles.tokenInputValue}>
              = {formatSats(Number(receiveRaw))} of cWBTC ({formatCwbtcRaw(receiveRaw)} cWBTC)
            </div>
          )}
          {receiveError && (
            <div className={styles.errorBox}>
              <AlertCircle size={14} />
              {receiveError}
            </div>
          )}
          {!fiberNode && (
            <div className={styles.errorBox}>
              <AlertCircle size={14} />
              Connect your Fiber browser node via the header button — it signs the cWBTC receive
              invoice.
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {swapError && (
        <div className={styles.errorBox}>
          <AlertCircle size={14} />
          {swapError.message}
        </div>
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
        ) : isCkbToBtc ? (
          !isInvoiceValid ? (
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
          )
        ) : !receiveSatsInfo.valid || receiveSatsInfo.sats <= 0 ? (
          receiveError ? 'Invalid cWBTC amount' : 'Enter cWBTC amount'
        ) : !fiberNode ? (
          'Connect browser node first'
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
