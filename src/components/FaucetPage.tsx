import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Droplets, ExternalLink, Loader2 } from 'lucide-react';
import { getFaucetInfo, postFaucetClaim } from '../api/client';
import type { FaucetInfo } from '../types';
import styles from './FaucetPage.module.css';

export function FaucetPage() {
  const [address, setAddress] = useState('');
  const [info, setInfo] = useState<FaucetInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFaucetInfo()
      .then((result) => {
        if (!cancelled) setInfo(result);
      })
      .catch(() => {
        // The claim endpoint still returns a display amount, so info loading is best-effort.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClaim = useCallback(async () => {
    const trimmed = address.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setMessage(null);
    setTxHash(null);

    try {
      const result = await postFaucetClaim(trimmed);
      const displayAmount = result.amount_display ?? info?.amount_display;
      setMessage(displayAmount ? `Claimed ${displayAmount} cWBTC` : result.message || 'cWBTC sent');
      setTxHash(result.tx_hash ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [address, info?.amount_display, loading]);

  return (
    <div className={styles.page}>
      <a href="/" className={styles.backLink}>
        <ArrowLeft size={14} />
        Back to swap
      </a>

      <section className={styles.card}>
        <div className={styles.header}>
          <div className={styles.iconWrap}>
            <Droplets size={20} />
          </div>
          <div>
            <h1 className={styles.title}>cWBTC Faucet</h1>
            <p className={styles.subtitle}>
              Claim test cWBTC for Fiber CCH payments on CKB testnet.
            </p>
          </div>
        </div>

        <div className={styles.form}>
          <div className={styles.amountRow}>
            <span className={styles.amountLabel}>Amount per claim</span>
            <span className={styles.amountValue}>
              {info ? `${info.amount_display} cWBTC` : 'cWBTC'}
            </span>
          </div>

          <label className={styles.label} htmlFor="faucet-address">
            CKB testnet address
          </label>
          <div className={styles.controls}>
            <input
              id="faucet-address"
              type="text"
              placeholder="ckt1..."
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              className={styles.input}
              disabled={loading}
            />
            <button
              type="button"
              className={styles.button}
              onClick={handleClaim}
              disabled={loading || !address.trim()}
            >
              {loading ? (
                <Loader2 size={16} className={styles.spin} />
              ) : (
                <>
                  <Droplets size={16} />
                  Claim
                </>
              )}
            </button>
          </div>
          <p className={styles.hint}>One claim per address cooldown. Testnet funds only.</p>
        </div>

        {message && (
          <div className={styles.success}>
            <CheckCircle2 size={16} />
            <span>{message}</span>
            {txHash && (
              <a
                href={`https://pudge.explorer.nervos.org/transaction/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.txLink}
              >
                View tx
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}
      </section>
    </div>
  );
}
