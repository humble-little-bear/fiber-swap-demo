import { FiberNodeButton } from '@fiber-pay/react';
import { ArrowLeftRight, Settings, BookOpen } from 'lucide-react';
import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.logoBox}>
          <ArrowLeftRight size={20} color="#fff" />
        </div>
        <span className={styles.brandText}>FiberSwap</span>
      </div>

      <nav className={styles.nav}>
        <button className={styles.navItem}>
          <BookOpen size={18} />
          <span>Docs</span>
        </button>
        <button className={styles.navItem}>
          <Settings size={18} />
          <span>Settings</span>
        </button>
        <div className={styles.connectWrap}>
          <FiberNodeButton
            network="testnet"
            strategy="passkey"
            passkeyUsername="FiberSwap User"
            className={styles.connectBtn}
          />
        </div>
      </nav>
    </header>
  );
}
