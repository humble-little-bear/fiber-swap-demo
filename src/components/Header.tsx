import { FiberNodeButton, NodeInfoPanel } from '@fiber-pay/react';
import { ArrowLeftRight } from 'lucide-react';
import { useFiberNodeContext } from '../hooks/useFiberNodeContext';
import { CWBTC_ASSET } from '../context/FiberNodeProvider';
import { FiberWorkbenchPanel } from './FiberWorkbenchPanel';
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
          asset={CWBTC_ASSET}
          initialFundingAmount="1000000000"
          invoiceAmount="100000000"
          tabs={[
            {
              id: 'workbench',
              render: (context) => <FiberWorkbenchPanel context={context} />,
            },
            { id: 'channels' },
            {
              id: 'deposit',
              label: 'Deposit',
              render: ({ fiber: { node } }) => (
                <NodeInfoPanel
                  node={node}
                  network="testnet"
                  asset={CWBTC_ASSET}
                  showQrCode
                />
              ),
            },
            { id: 'diagnostics' },
          ]}
        />
      </nav>
    </header>
  );
}
