import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ArrowDown, Settings, RefreshCw, ChevronDown, Info } from 'lucide-react';
import type { Token } from '../types';
import { TokenSelectModal } from './TokenSelectModal';
import { TokenLogo } from './TokenLogo';
import styles from './SwapCard.module.css';

const DEFAULT_FROM: Token = {
  symbol: 'CKB',
  name: 'Nervos CKB',
  address: '0x000...',
  decimals: 8,
  balance: '12500.45',
  price: 0.0085,
};

const DEFAULT_TO: Token = {
  symbol: 'USDC',
  name: 'USD Coin',
  address: '0x001...',
  decimals: 6,
  balance: '3450.00',
  price: 1.0,
};

export function SwapCard() {
  const [fromToken, setFromToken] = useState<Token>(DEFAULT_FROM);
  const [toToken, setToToken] = useState<Token>(DEFAULT_TO);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [selectingFor, setSelectingFor] = useState<'from' | 'to' | null>(null);
  const [slippage, setSlippage] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleFromAmountChange = useCallback(
    (val: string) => {
      setFromAmount(val);
      if (!val || !fromToken.price || !toToken.price) {
        setToAmount('');
        return;
      }
      const num = parseFloat(val);
      if (!isFinite(num)) {
        setToAmount('');
        return;
      }
      const fromVal = num * fromToken.price;
      const toVal = fromVal / toToken.price;
      setToAmount(toVal.toFixed(toToken.decimals > 6 ? 6 : toToken.decimals));
    },
    [fromToken, toToken]
  );

  const handleToAmountChange = useCallback(
    (val: string) => {
      setToAmount(val);
      if (!val || !fromToken.price || !toToken.price) {
        setFromAmount('');
        return;
      }
      const num = parseFloat(val);
      if (!isFinite(num)) {
        setFromAmount('');
        return;
      }
      const toVal = num * toToken.price;
      const fromVal = toVal / fromToken.price;
      setFromAmount(fromVal.toFixed(fromToken.decimals > 6 ? 6 : fromToken.decimals));
    },
    [fromToken, toToken]
  );

  const handleSwapTokens = useCallback(() => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  }, [fromToken, toToken, fromAmount, toAmount]);

  const exchangeRate = useMemo(() => {
    if (!fromToken.price || !toToken.price) return null;
    return (fromToken.price / toToken.price).toFixed(6);
  }, [fromToken, toToken]);

  const handleSelectToken = useCallback(
    (token: Token) => {
      if (selectingFor === 'from') {
        if (token.symbol === toToken.symbol) {
          setToToken(fromToken);
        }
        setFromToken(token);
      } else {
        if (token.symbol === fromToken.symbol) {
          setFromToken(toToken);
        }
        setToToken(token);
      }
      setFromAmount('');
      setToAmount('');
    },
    [selectingFor, fromToken, toToken]
  );

  const handleSwap = useCallback(() => {
    setLoading(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => setLoading(false), 1500);
  }, []);

  return (
    <div className={styles.card}>
      {/* Card Header */}
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>Swap</span>
        <div className={styles.cardActions}>
          <button
            className={styles.iconBtn}
            onClick={() => {
              setFromAmount('');
              setToAmount('');
            }}
          >
            <RefreshCw size={18} />
          </button>
          <button
            className={showSettings ? styles.iconBtnActive : styles.iconBtn}
            onClick={() => setShowSettings((s) => !s)}
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className={styles.settingsPanel}>
          <div className={styles.settingsLabel}>Slippage tolerance</div>
          <div className={styles.slippageRow}>
            {[0.1, 0.5, 1.0].map((v) => (
              <button
                key={v}
                onClick={() => setSlippage(v)}
                className={slippage === v ? styles.slippageBtnActive : styles.slippageBtn}
              >
                {v}%
              </button>
            ))}
          </div>
        </div>
      )}

      {/* From Input */}
      <TokenInput
        token={fromToken}
        amount={fromAmount}
        onAmountChange={handleFromAmountChange}
        onSelectToken={() => setSelectingFor('from')}
        label="Sell"
      />

      {/* Swap Toggle */}
      <div className={styles.swapToggleWrap}>
        <button onClick={handleSwapTokens} className={styles.swapToggleBtn}>
          <ArrowDown size={18} />
        </button>
      </div>

      {/* To Input */}
      <TokenInput
        token={toToken}
        amount={toAmount}
        onAmountChange={handleToAmountChange}
        onSelectToken={() => setSelectingFor('to')}
        label="Buy"
      />

      {/* Exchange Rate */}
      {exchangeRate && fromAmount && (
        <div className={styles.rateRow}>
          <span>
            1 {fromToken.symbol} ≈ {exchangeRate} {toToken.symbol}
          </span>
          <Info size={14} />
        </div>
      )}

      {/* Swap Button */}
      <button
        onClick={handleSwap}
        disabled={loading || !fromAmount}
        className={styles.swapBtn}
      >
        {loading ? (
          <span className={styles.swapBtnLoading}>
            <RefreshCw size={18} className={styles.spin} />
            Swapping...
          </span>
        ) : !fromAmount ? (
          'Enter an amount'
        ) : (
          'Swap'
        )}
      </button>

      {/* Token Select Modal */}
      <TokenSelectModal
        isOpen={selectingFor !== null}
        onClose={() => setSelectingFor(null)}
        onSelect={handleSelectToken}
        excludeToken={selectingFor === 'from' ? toToken : fromToken}
      />
    </div>
  );
}

function TokenInput({
  token,
  amount,
  onAmountChange,
  onSelectToken,
  label,
}: {
  token: Token;
  amount: string;
  onAmountChange: (val: string) => void;
  onSelectToken: () => void;
  label: string;
}) {
  return (
    <div className={styles.tokenInput}>
      <div className={styles.tokenInputHeader}>
        <span className={styles.tokenInputLabel}>{label}</span>
        <span className={styles.tokenInputBalance}>
          Balance: {token.balance} {token.symbol}
        </span>
      </div>

      <div className={styles.tokenInputBody}>
        <input
          type="number"
          placeholder="0"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          className={styles.tokenInputField}
        />
        <button onClick={onSelectToken} className={styles.tokenSelectBtn}>
          <TokenLogo symbol={token.symbol} />
          {token.symbol}
          <ChevronDown size={16} color="var(--text-secondary)" />
        </button>
      </div>

      {amount && token.price && (
        <div className={styles.tokenInputValue}>
          ${(parseFloat(amount || '0') * token.price).toFixed(2)}
        </div>
      )}
    </div>
  );
}
