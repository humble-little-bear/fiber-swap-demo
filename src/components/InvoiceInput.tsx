import { useState, useCallback } from 'react';
import { ClipboardPaste, AlertCircle, CheckCircle2 } from 'lucide-react';
import styles from './InvoiceInput.module.css';

interface InvoiceInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function InvoiceInput({ value, onChange, disabled }: InvoiceInputProps) {
  const [pasteError, setPasteError] = useState<string | null>(null);

  const isValid = value.trim().toLowerCase().startsWith('lntb');
  const showValid = value.length > 0 && isValid;
  const showInvalid = value.length > 0 && !isValid;

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      onChange(text.trim());
      setPasteError(null);
    } catch {
      setPasteError('Clipboard access denied. Please paste manually.');
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
      <div className={styles.inputWrap}>
        <textarea
          className={`${styles.input} ${showInvalid ? styles.inputInvalid : ''} ${showValid ? styles.inputValid : ''}`}
          rows={3}
          placeholder="lntb..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
        {showValid && (
          <div className={styles.iconValid}>
            <CheckCircle2 size={18} />
          </div>
        )}
        {showInvalid && (
          <div className={styles.iconInvalid}>
            <AlertCircle size={18} />
          </div>
        )}
      </div>
      {showInvalid && (
        <span className={styles.hintInvalid}>Invoice must start with "lntb" (testnet)</span>
      )}
      {pasteError && (
        <span className={styles.hintInvalid}>{pasteError}</span>
      )}
    </div>
  );
}
