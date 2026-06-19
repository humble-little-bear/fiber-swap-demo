import { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useFiberPayment } from '@fiber-pay/react';
import { useOrderStatus } from '../hooks/useOrderStatus';
import { useFiberNodeContext } from '../hooks/useFiberNodeContext';
import type { CchOrder } from '../types';
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
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import styles from './OrderPanel.module.css';

interface OrderPanelProps {
  order: CchOrder;
}

const STATUS_ORDER: Record<string, number> = {
  Pending: 0,
  IncomingAccepted: 1,
  OutgoingInFlight: 2,
  Success: 3,
  Failed: 3,
};

function statusLabel(status: string): string {
  switch (status) {
    case 'Pending':
      return '等待支付 CKB';
    case 'IncomingAccepted':
      return '已收到 CKB，准备兑付 BTC';
    case 'OutgoingInFlight':
      return '正在支付 Lightning invoice';
    case 'Success':
      return '已完成，收款方已收到 BTC';
    case 'Failed':
      return '失败，请查看错误信息并重试';
    default:
      return status;
  }
}

function isTerminal(status: string): boolean {
  return status === 'Success' || status === 'Failed';
}

function ckbExplorerUrl(paymentHash: string): string {
  return `https://pudge.explorer.nervos.org/search?query=${encodeURIComponent(paymentHash)}`;
}

function btcExplorerUrl(paymentHash: string, network: string): string {
  const base =
    network === 'mainnet'
      ? 'https://mempool.space'
      : network === 'signet'
        ? 'https://mempool.space/signet'
        : 'https://mempool.space/testnet';
  return `${base}/lightning/payment/${encodeURIComponent(paymentHash)}`;
}

export function OrderPanel({ order }: OrderPanelProps) {
  const { data, loading } = useOrderStatus(order.payment_hash);
  const current = data ?? order;
  const currentStep = STATUS_ORDER[current.status] ?? 0;
  const incomingInvoice = current.incoming_invoice || '';
  const [copiedInvoice, setCopiedInvoice] = useState(false);
  const [copiedPayReq, setCopiedPayReq] = useState(false);
  const invoiceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const payReqTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fiber = useFiberNodeContext();
  const fiberNode = fiber.isRunning ? fiber.node : null;
  const { payInvoice, isPaying, paymentResult, error: paymentError } = useFiberPayment(fiberNode);

  const handlePayWithNode = useCallback(async () => {
    if (!fiberNode || !incomingInvoice) return;
    await payInvoice(incomingInvoice);
  }, [fiberNode, incomingInvoice, payInvoice]);

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

  const showPayWithNode = fiber.isRunning;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Pay the Fiber invoice below</h3>
        {loading && !isTerminal(current.status) && (
          <span className={styles.polling}>
            <Loader2 size={14} className={styles.spin} />
            Updating…
          </span>
        )}
      </div>

      {/* QR Code */}
      <div className={styles.qrSection}>
        <div className={styles.qrWrap}>
          {incomingInvoice ? (
            <QRCodeSVG value={incomingInvoice} size={180} level="M" />
          ) : (
            <div className={styles.errorBanner}>
              <AlertCircle size={16} />
              Fiber invoice is unavailable
            </div>
          )}
        </div>
      </div>

      {/* Fiber invoice copy */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Fiber Invoice</div>
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
            disabled={isPaying || isTerminal(current.status) || !incomingInvoice}
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
      </div>

      {paymentError && (
        <div className={styles.errorBanner}>{String(paymentError)}</div>
      )}

      {paymentResult && (
        <div className={styles.successBanner}>
          Browser payment sent. Status: {paymentResult.status}.
        </div>
      )}

      {/* Timeline */}
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
                {isFailed ? '失败' : statusLabel(s)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Links */}
      <div className={styles.links}>
        <a
          href={ckbExplorerUrl(current.payment_hash)}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          <ExternalLink size={14} />
          View CKB payment
        </a>
        <a
          href={btcExplorerUrl(current.payment_hash, current.network)}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          <ExternalLink size={14} />
          View Lightning payment
        </a>
      </div>

      {current.status === 'Success' && (
        <div className={styles.successBanner}>Payment completed successfully!</div>
      )}
      {current.status === 'Failed' && (
        <div className={styles.errorBanner}>Payment failed. Please try again.</div>
      )}

      {/* Original BTC invoice */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Original BTC Invoice</div>
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
      </div>
    </div>
  );
}
