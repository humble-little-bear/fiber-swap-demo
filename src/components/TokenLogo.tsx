import styles from './TokenLogo.module.css';

const COLORS: Record<string, string> = {
  CKB: '#3cc68a',
  USDC: '#2775ca',
  USDT: '#26a17b',
  ETH: '#627eea',
  WBTC: '#f7931a',
  DAI: '#f5ac37',
  LINK: '#2a5ada',
  UNI: '#ff007a',
};

interface TokenLogoProps {
  symbol: string;
  size?: 'sm' | 'md';
}

export function TokenLogo({ symbol, size = 'sm' }: TokenLogoProps) {
  return (
    <div
      className={`${styles.logo} ${size === 'md' ? styles.md : styles.sm}`}
      style={{ background: COLORS[symbol] || 'var(--bg-elevated)' }}
    >
      {symbol.slice(0, 2)}
    </div>
  );
}
