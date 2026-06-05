import { useState, useCallback } from 'react';
import { Copy, CheckCircle2, Loader2, XCircle, Clock, Zap } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useOrderStatus } from '../hooks/useOrderStatus';
import type { CchOrderStatus } from '../types';
import styles from './OrderPanel.module.css';

interface OrderPanelProps {
  paymentHash: string;
  incomingInvoice: string;
  outgoingPayReq: string;
  onClose?: () => void;
}

const STATUS_META: Record<
  CchOrderStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  Pending: {
    label: 'Pending',
    color: '#f0a500',
    icon: <Clock size={16} />,
  },
  IncomingAccepted: {
    label: 'Incoming Accepted',
    color: '#4c82fb',
    icon: <CheckCircle2 size={16} />,
  },
  OutgoingInFlight: {
    label: 'Outgoing In Flight',
    color: '#fc72ff',
    icon: <Loader2 size={16} className={styles.spin} />,
  },
  Success: {
    label: 'Success',
    color: '#40b66b',
    icon: <CheckCircle2 size={16} />,
  },
  Failed: {
    label: 'Failed',
    color: '#ff4d4f',
    icon: <XCircle size={16} />,
  },
};

const TIMELINE_STEPS: { status: CchOrderStatus; label: string }[] = [
  { status: 'Pending', label: 'Pending' },
  { status: 'IncomingAccepted', label: 'Accepted' },
  { status: 'OutgoingInFlight', label: 'In Flight' },
  { status: 'Success', label: 'Success' },
];

function statusIndex(status: CchOrderStatus): number {
  const idx = TIMELINE_STEPS.findIndex((s) => s.status === status);
  return idx >= 0 ? idx : -1;
}

export function OrderPanel({ paymentHash, incomingInvoice, outgoingPayReq, onClose }: OrderPanelProps) {
  const { order, loading } = useOrderStatus(paymentHash);
  const [copied, setCopied] = useState(false);

  const currentStatus = order?.status ?? 'Pending';
  const meta = STATUS_META[currentStatus];
  const currentIdx = statusIndex(currentStatus);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(incomingInvoice);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [incomingInvoice]);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.title}>Order Status</span>
          {onClose && (
            <button className={styles.closeBtn} onClick={onClose}>
              <XCircle size={18} />
            </button>
          )}
        </div>
        <div className={styles.hashRow}>
          <span className={styles.hashLabel}>Payment Hash</span>
          <span className={styles.hashValue}>
            {paymentHash.slice(0, 10)}…{paymentHash.slice(-8)}
          </span>
        </div>
      </div>

      <div className={styles.statusRow}>
        <span className={styles.statusDot} style={{ color: meta.color }}>
          {meta.icon}
        </span>
        <span className={styles.statusLabel} style={{ color: meta.color }}>
          {meta.label}
        </span>
        {loading && <span className={styles.polling}>Polling…</span>}
      </div>

      <div className={styles.timeline}>
        {TIMELINE_STEPS.map((step, idx) => {
          const isActive = idx <= currentIdx && currentIdx >= 0;
          const isCurrent = idx === currentIdx;
          return (
            <div key={step.status} className={styles.timelineItem}>
              <div
                className={`${styles.timelineDot} ${isActive ? styles.timelineDotActive : ''} ${
                  isCurrent ? styles.timelineDotCurrent : ''
                }`}
              />
              <span
                className={`${styles.timelineLabel} ${isActive ? styles.timelineLabelActive : ''}`}
              >
                {step.label}
              </span>
              {idx < TIMELINE_STEPS.length - 1 && (
                <div
                  className={`${styles.timelineLine} ${
                    idx < currentIdx ? styles.timelineLineActive : ''
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.qrSection}>
        <div className={styles.qrLabel}>Pay this Fiber Invoice</div>
        <div className={styles.qrWrap}>
          <QRCodeSVG value={incomingInvoice} size={180} level="M" bgColor="transparent" fgColor="#ffffff" />
        </div>
        <button className={styles.copyBtn} onClick={handleCopy}>
          {copied ? (
            <>
              <CheckCircle2 size={14} />
              Copied
            </>
          ) : (
            <>
              <Copy size={14} />
              Copy Invoice
            </>
          )}
        </button>
      </div>

      <div className={styles.invoices}>
        <div className={styles.invoiceRow}>
          <span className={styles.invoiceLabel}>Outgoing (BTC)</span>
          <span className={styles.invoiceValue} title={outgoingPayReq}>
            {outgoingPayReq.slice(0, 24)}…
          </span>
        </div>
        <div className={styles.invoiceRow}>
          <span className={styles.invoiceLabel}>Incoming (Fiber)</span>
          <span className={styles.invoiceValue} title={incomingInvoice}>
            {incomingInvoice.slice(0, 24)}…
          </span>
        </div>
      </div>

      <div className={styles.payHint}>
        <Zap size={14} />
        Pay the Fiber invoice above with your Fiber wallet to complete the swap.
      </div>
    </div>
  );
}
