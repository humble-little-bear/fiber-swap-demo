import { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useOrderStatus } from '../hooks/useOrderStatus';
import { useFiberNodeContextOptional } from '../hooks/useFiberNodeContextOptional';
import { CWBTC_TYPE_SCRIPT } from '../context/FiberNodeProvider';
import type { CchOrder, SwapDirection } from '../types';
import {
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  Plane,
  Send,
  Loader2,
  Check,
  Wallet,
  AlertCircle,
  Droplets,
} from 'lucide-react';
import styles from './OrderPanel.module.css';

/** Public trampoline node (fiber-testnet-public-bottle) used for delegated pathfinding. */
const TRAMPOLINE_NODE_PUBKEY =
  '0x02b6d4e3ab86a2ca2fad6fae0ecb2e1e559e0b911939872a90abdda6d20302be71';

/**
 * Default max fee for trampoline routing (1 CKB = 100,000,000 shannons).
 * The sender locks `final_amount + max_fee_amount` on the outer route;
 * any unused portion is returned.
 */
const DEFAULT_MAX_FEE_AMOUNT = '0x5f5e100';

interface OrderPanelProps {
  order: CchOrder;
}

const STATUS_ORDER: Record<string, number> = {
  Pending: 0,
  IncomingAccepted: 1,
  OutgoingInFlight: 2,
  OutgoingSuccess: 2,
  Success: 3,
  Failed: 3,
};

function statusLabel(status: string, direction: SwapDirection): string {
  const receiving = direction === 'btc-to-ckb';
  switch (status) {
    case 'Pending':
      return receiving ? 'Waiting for BTC payment' : 'Waiting for cWBTC payment';
    case 'IncomingAccepted':
      return receiving
        ? 'BTC received, preparing cWBTC payout'
        : 'cWBTC received, preparing BTC payout';
    case 'OutgoingInFlight':
      return receiving ? 'Sending cWBTC to your Fiber node' : 'Paying Lightning invoice';
    case 'OutgoingSuccess':
      return receiving ? 'cWBTC sent, settling' : 'Lightning payment settled, finalizing';
    case 'Success':
      return receiving ? 'Complete, you received cWBTC' : 'Complete, recipient received BTC';
    case 'Failed':
      return 'Failed, check the error and try again';
    default:
      return status;
  }
}

function stepLabel(status: string, direction: SwapDirection): string {
  const receiving = direction === 'btc-to-ckb';
  switch (status) {
    case 'Pending':
      return receiving ? 'Waiting for BTC' : 'Waiting for cWBTC';
    case 'IncomingAccepted':
      return receiving ? 'BTC received' : 'cWBTC received';
    case 'OutgoingInFlight':
      return receiving ? 'Sending cWBTC' : 'Paying BTC';
    case 'Success':
      return 'Complete';
    default:
      return status;
  }
}

function isTerminal(status: string): boolean {
  return status === 'Success' || status === 'Failed';
}

export function OrderPanel({ order }: OrderPanelProps) {
  const { data, loading } = useOrderStatus(order.payment_hash);
  const current = data ?? order;
  // Orders created before the direction field existed are ckb-to-btc.
  const direction: SwapDirection = current.direction ?? order.direction ?? 'ckb-to-btc';
  const receiving = direction === 'btc-to-ckb';
  const currentStep = STATUS_ORDER[current.status] ?? 0;
  const incomingInvoice = current.incoming_invoice || '';
  const [copiedInvoice, setCopiedInvoice] = useState(false);
  const [copiedPayReq, setCopiedPayReq] = useState(false);
  const invoiceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const payReqTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fiber = useFiberNodeContextOptional();
  const fiberNode = fiber?.isRunning ? fiber.node : null;

  // Local payment state (bypasses useFiberPayment to inject trampoline params)
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSent, setPaymentSent] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const handlePayWithNode = useCallback(async () => {
    if (!fiberNode || !incomingInvoice) return;
    setIsPaying(true);
    setPaymentError(null);
    setPaymentSent(false);
    try {
      await fiberNode.sendPayment({
        invoice: incomingInvoice,
        trampoline_hops: [TRAMPOLINE_NODE_PUBKEY],
        max_fee_amount: DEFAULT_MAX_FEE_AMOUNT,
        udt_type_script: CWBTC_TYPE_SCRIPT,
      });
      if (isMountedRef.current) {
        setPaymentSent(true);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setPaymentError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (isMountedRef.current) {
        setIsPaying(false);
      }
    }
  }, [fiberNode, incomingInvoice]);

  useEffect(() => {
    const invoiceRef = invoiceTimeoutRef;
    const payReqRef = payReqTimeoutRef;
    return () => {
      if (invoiceRef.current) {
        clearTimeout(invoiceRef.current);
      }
      if (payReqRef.current) {
        clearTimeout(payReqRef.current);
      }
    };
  }, []);

  const handleCopy = async (
    text: string,
    setter: (v: boolean) => void,
    ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  ) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      if (ref.current) clearTimeout(ref.current);
      ref.current = setTimeout(() => setter(false), 2000);
    } catch {
      // ignore
    }
  };

  // Browser-node payment only applies to ckb-to-btc orders (the payer leg is
  // on Fiber). For btc-to-ckb the incoming invoice is paid with BTC from any
  // external Lightning wallet.
  const showPayWithNode = (fiber?.isRunning ?? false) && !receiving;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          {receiving ? 'Pay the Lightning invoice below' : 'Pay the Fiber invoice below'}
        </h3>
      </div>

      {/* QR Code */}
      <div className={styles.qrSection}>
        <div className={styles.qrWrap}>
          {incomingInvoice ? (
            <QRCodeSVG value={incomingInvoice} size={180} level="M" />
          ) : (
            <div className={styles.errorBanner}>
              <AlertCircle size={16} />
              {receiving ? 'Lightning invoice is unavailable' : 'Fiber invoice is unavailable'}
            </div>
          )}
        </div>
      </div>

      {/* Fiber invoice copy */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>
          {receiving ? 'Lightning Invoice' : 'Fiber Invoice'}
        </div>
        <div className={styles.invoiceBox}>
          <code className={styles.invoiceText}>{incomingInvoice || '—'}</code>
          <button
            className={styles.copyBtn}
            onClick={() => handleCopy(incomingInvoice, setCopiedInvoice, invoiceTimeoutRef)}
            title="Copy invoice"
            disabled={!incomingInvoice}
          >
            {copiedInvoice ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* Payment actions */}
      <div className={styles.actions}>
        {showPayWithNode ? (
          <button
            className={styles.payBtn}
            onClick={handlePayWithNode}
            disabled={isPaying || isTerminal(current.status) || !incomingInvoice || !fiberNode}
          >
            {isPaying ? (
              <span className={styles.payBtnLoading}>
                <Loader2 size={16} className={styles.spin} />
                Paying…
              </span>
            ) : (
              <>
                <Wallet size={16} />
                Pay with Browser Node
              </>
            )}
          </button>
        ) : receiving ? (
          <div className={styles.nodeHint}>
            <AlertCircle size={14} />
            Pay this invoice with any BTC testnet Lightning wallet. Once it settles, the CCH
            sends cWBTC to the Fiber invoice you created.
          </div>
        ) : (
          <div className={styles.nodeHint}>
            <AlertCircle size={14} />
            Connect your Fiber browser node via the header button to pay here.
          </div>
        )}

        <button
          className={styles.copyPayBtn}
          onClick={() => handleCopy(incomingInvoice, setCopiedInvoice, invoiceTimeoutRef)}
          disabled={!incomingInvoice}
        >
          <Copy size={16} />
          Copy & Pay with External Wallet
        </button>

        {!receiving && (
          <a href="/faucet" className={styles.faucetHint}>
            <Droplets size={14} />
            Need test cWBTC? Claim from the faucet
          </a>
        )}
      </div>

      {paymentError && (
        <div className={styles.errorBanner}>
          <AlertCircle size={14} />
          {paymentError}
        </div>
      )}

      {paymentSent && (
        <div className={styles.successBanner}>
          Payment sent via trampoline routing (bottle node).
        </div>
      )}

      <div className={styles.statusBlock}>
        <div className={styles.statusHeader}>
          <div>
            <div className={styles.sectionLabel}>Status</div>
            <div className={styles.statusCurrent}>{statusLabel(current.status, direction)}</div>
          </div>
          {loading && !isTerminal(current.status) && (
            <span className={styles.polling}>
              <Loader2 size={14} className={styles.spin} />
              Updating…
            </span>
          )}
        </div>

        <div className={styles.timeline}>
          {['Pending', 'IncomingAccepted', 'OutgoingInFlight', 'Success'].map((s, idx) => {
            const step = STATUS_ORDER[s] ?? idx;
            const active = currentStep >= step && current.status !== 'Failed';
            const isFailed = current.status === 'Failed' && step === 3;

            return (
              <div key={s} className={styles.timelineItem}>
                <div className={styles.timelineIcon}>
                  {isFailed ? (
                    <XCircle size={18} className={styles.iconFailed} />
                  ) : active ? (
                    step === 3 ? (
                      <CheckCircle2 size={18} className={styles.iconSuccess} />
                    ) : step === 2 ? (
                      <Plane size={18} className={styles.iconActive} />
                    ) : step === 1 ? (
                      <Send size={18} className={styles.iconActive} />
                    ) : (
                      <Clock size={18} className={styles.iconActive} />
                    )
                  ) : (
                    <div className={styles.iconInactive} />
                  )}
                </div>
                <span className={active && !isFailed ? styles.labelActive : styles.labelInactive}>
                  {isFailed ? 'Failed' : stepLabel(s, direction)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {current.status === 'Success' && (
        <div className={styles.successBanner}>
          {receiving
            ? 'Swap completed — cWBTC arrived at your browser node.'
            : 'Payment completed successfully!'}
        </div>
      )}
      {current.status === 'Failed' && (
        <div className={styles.errorBanner}>Payment failed. Please try again.</div>
      )}

      <details className={styles.details}>
        <summary className={styles.detailsSummary}>
          <span>{receiving ? 'Your Fiber receive invoice' : 'Original BTC invoice'}</span>
          <span className={styles.detailsHint}>for reference</span>
        </summary>
        <div className={styles.invoiceBox}>
          <code className={styles.invoiceText}>{current.outgoing_pay_req}</code>
          <button
            className={styles.copyBtn}
            onClick={() => handleCopy(current.outgoing_pay_req, setCopiedPayReq, payReqTimeoutRef)}
            title="Copy original invoice"
          >
            {copiedPayReq ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </details>
    </div>
  );
}
