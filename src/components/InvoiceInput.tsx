import { useState, useCallback } from 'react';
import { ClipboardPaste, AlertCircle } from 'lucide-react';
import styles from './InvoiceInput.module.css';

interface InvoiceInputProps {
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  disabled?: boolean;
}

// Simple BOLT11 prefix check
function looksLikeInvoice(s: string): boolean {
  const trimmed = s.trim();
  if (!trimmed) return false;
  return trimmed.toLowerCase().startsWith('lntb') || trimmed.toLowerCase().startsWith('lnbc');
}

export function InvoiceInput({ value, onChange, disabled }: InvoiceInputProps) {
  const [touched, setTouched] = useState(false);

  const isValid = !value || looksLikeInvoice(value);
  const showError = touched && value && !isValid;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const v = e.target.value;
      onChange(v, looksLikeInvoice(v));
    },
    [onChange]
  );

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      onChange(text, looksLikeInvoice(text));
      setTouched(true);
    } catch {
      // ignore clipboard errors
    }
  }, [onChange]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>BTC Lightning Invoice</span>
        <button
          type="button"
          className={styles.pasteBtn}
          onClick={handlePaste}
          disabled={disabled}
        >
          <ClipboardPaste size={14} />
          Paste
        </button>
      </div>
      <textarea
        className={`${styles.input} ${showError ? styles.inputError : ''}`}
        placeholder="Paste a testnet BTC Lightning invoice (lntb...)"
        value={value}
        onChange={handleChange}
        onBlur={() => setTouched(true)}
        disabled={disabled}
        rows={3}
      />
      {showError && (
        <div className={styles.error}>
          <AlertCircle size={14} />
          Does not look like a valid Lightning invoice
        </div>
      )}
    </div>
  );
}
