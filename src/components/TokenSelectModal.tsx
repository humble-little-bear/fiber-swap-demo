import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import type { Token } from '../types';
import { TokenLogo } from './TokenLogo';
import styles from './TokenSelectModal.module.css';

const POPULAR_TOKENS: Token[] = [
  { symbol: 'CKB', name: 'Nervos CKB', address: '0x000...', decimals: 8, balance: '12500.45', price: 0.0085 },
  { symbol: 'USDC', name: 'USD Coin', address: '0x001...', decimals: 6, balance: '3450.00', price: 1.0 },
  { symbol: 'USDT', name: 'Tether USD', address: '0x002...', decimals: 6, balance: '2100.50', price: 1.0 },
  { symbol: 'ETH', name: 'Ethereum', address: '0x003...', decimals: 18, balance: '4.25', price: 3200 },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x004...', decimals: 8, balance: '0.15', price: 68000 },
  { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x005...', decimals: 18, balance: '5000.00', price: 1.0 },
  { symbol: 'LINK', name: 'Chainlink', address: '0x006...', decimals: 18, balance: '120.5', price: 14.2 },
  { symbol: 'UNI', name: 'Uniswap', address: '0x007...', decimals: 18, balance: '350.0', price: 8.5 },
];

interface TokenSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: Token) => void;
  excludeToken?: Token | null;
}

export function TokenSelectModal({ isOpen, onClose, onSelect, excludeToken }: TokenSelectModalProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return POPULAR_TOKENS.filter((t) => {
      if (t.symbol === excludeToken?.symbol) return false;
      if (!q) return true;
      return t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q);
    });
  }, [query, excludeToken]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>Select a token</span>
          <button onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className={styles.searchWrap}>
          <div className={styles.searchBox}>
            <Search size={18} color="var(--text-tertiary)" />
            <input
              placeholder="Search name or paste address"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {/* Token List */}
        <div className={styles.tokenList}>
          {filtered.map((token) => (
            <button
              key={token.symbol}
              onClick={() => {
                onSelect(token);
                onClose();
              }}
              className={styles.tokenItem}
            >
              <div className={styles.tokenItemLeft}>
                <TokenLogo symbol={token.symbol} size="md" />
                <div className={styles.tokenItemInfo}>
                  <div className={styles.tokenItemSymbol}>{token.symbol}</div>
                  <div className={styles.tokenItemName}>{token.name}</div>
                </div>
              </div>
              <div className={styles.tokenItemRight}>
                <div className={styles.tokenItemBalance}>{token.balance}</div>
                <div className={styles.tokenItemValue}>
                  ${token.price ? (parseFloat(token.balance || '0') * token.price).toFixed(2) : '0.00'}
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>
              No tokens found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
