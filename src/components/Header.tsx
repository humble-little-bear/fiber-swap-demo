import { FiberNodeButton } from '@fiber-pay/react';
import { ArrowLeftRight } from 'lucide-react';
import { useFiberNodeContext } from '../hooks/useFiberNodeContext';
import styles from './Header.module.css';

export function Header() {
  const fiber = useFiberNodeContext();

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.logoBox}>
          <ArrowLeftRight size={20} color="#fff" />
        </div>
        <span className={styles.brandText}>FiberSwap</span>
      </div>

      <nav className={styles.nav}>
        <FiberNodeButton
          fiber={fiber}
          network="testnet"
          strategy="passkey"
          passkeyUsername="FiberSwap User"
          className={styles.connectBtn}
        />
      </nav>
    </header>
  );
}
