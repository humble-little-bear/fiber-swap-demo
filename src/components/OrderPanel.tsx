import { useState, useEffect, useRef } from 'react';
import { useOrderStatus } from '../hooks/useOrderStatus';
import type { CchOrder } from '../types';
import { Copy, CheckCircle2, XCircle, Clock, Plane, Send, Loader2, Check } from 'lucide-react';
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
      return 'Pending';
    case 'IncomingAccepted':
      return 'Incoming Accepted';
    case 'OutgoingInFlight':
      return 'Outgoing In Flight';
    case 'Success':
      return 'Success';
    case 'Failed':
      return 'Failed';
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
  const currentStep = STATUS_ORDER[current.status] ?? 0;
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Order Created</h3>
        {loading && !isTerminal(current.status) && (
          <span className={styles.polling}>
            <Loader2 size={14} className={styles.spin} />
            Updating…
          </span>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>Incoming Fiber Invoice</div>
        <div className={styles.invoiceBox}>
          <code className={styles.invoiceText}>{current.incoming_invoice}</code>
          <button
            className={styles.copyBtn}
            onClick={() => handleCopy(current.incoming_invoice)}
            title="Copy invoice"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
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
                {isFailed ? 'Failed' : statusLabel(s)}
              </span>
            </div>
          );
        })}
      </div>

      {current.status === 'Success' && (
        <div className={styles.successBanner}>Payment completed successfully!</div>
      )}
      {current.status === 'Failed' && (
        <div className={styles.errorBanner}>Payment failed. Please try again.</div>
      )}
    </div>
  );
}
