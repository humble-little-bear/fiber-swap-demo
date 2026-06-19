import { useState, useCallback, useMemo } from 'react';
import { ClipboardPaste, AlertCircle } from 'lucide-react';
import { parseBOLT11 } from '../utils/invoice';
import styles from './InvoiceInput.module.css';

interface InvoiceInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function InvoiceInput({ value, onChange, disabled }: InvoiceInputProps) {
  const [touched, setTouched] = useState(false);

  const parsedInvoice = useMemo(() => parseBOLT11(value), [value]);
  const isValid = !value || parsedInvoice.isValid;
  const showError = touched && value && !isValid;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      onChange(text);
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
        maxLength={5000}
      />
      {showError && (
        <div className={styles.error}>
          <AlertCircle size={14} />
          {parsedInvoice.error || 'Does not look like a valid Lightning invoice'}
        </div>
      )}
    </div>
  );
}
