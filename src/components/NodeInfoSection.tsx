import { useState } from 'react';
import { NodeInfoPanel, FiberPayQuickCard, useFiberNode } from '@fiber-pay/react';
import { Zap, CreditCard, Activity } from 'lucide-react';
import styles from './NodeInfoSection.module.css';

export function NodeInfoSection() {
  const [activeTab, setActiveTab] = useState<'node' | 'quick' | 'status'>('quick');

  const fiber = useFiberNode({
    network: 'testnet',
    enabled: false,
  });

  return (
    <div className={styles.container}>
      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={activeTab === 'quick' ? styles.tabBtnActive : styles.tabBtn}
          onClick={() => setActiveTab('quick')}
        >
          <CreditCard size={16} />
          Quick Pay
        </button>
        <button
          className={activeTab === 'node' ? styles.tabBtnActive : styles.tabBtn}
          onClick={() => setActiveTab('node')}
        >
          <Zap size={16} />
          Node Info
        </button>
        <button
          className={activeTab === 'status' ? styles.tabBtnActive : styles.tabBtn}
          onClick={() => setActiveTab('status')}
        >
          <Activity size={16} />
          Status
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'quick' && (
          <div className={styles.tabPane}>
            <div className={styles.tabDescription}>
              FiberPay QuickCard provides a streamlined payment experience. Connect your node to create invoices and send payments over the Fiber Network.
            </div>
            <FiberPayQuickCard
              fiber={fiber}
              network="testnet"
              title="Fiber Quick Pay"
              className={styles.sdkCard}
              onInvoiceCreated={(invoice) => console.log('Invoice:', invoice)}
              onPaymentResult={(result) => console.log('Payment:', result)}
              onError={(err) => console.error(err)}
            />
          </div>
        )}

        {activeTab === 'node' && (
          <div className={styles.tabPane}>
            <div className={styles.tabDescription}>
              Monitor your Fiber node status, CKB address, and channel statistics in real-time.
            </div>
            <NodeInfoPanel
              node={fiber.node}
              network="testnet"
              pollInterval={15000}
              showQrCode={false}
              className={styles.sdkCardPadding}
            />
          </div>
        )}

        {activeTab === 'status' && (
          <div className={styles.tabPane}>
            <StatusItem label="Node State" value={fiber.state} color={fiber.isRunning ? 'var(--accent-cyan)' : undefined} />
            <StatusItem label="Passkey Supported" value={fiber.isPasskeySupported ? 'Yes' : 'No'} />
            <StatusItem label="Passkey Configured" value={fiber.hasPasskeyConfigured ? 'Yes' : 'No'} />
            <StatusItem label="Node Info" value={fiber.nodeInfo ? 'Available' : 'Unavailable'} color={fiber.nodeInfo ? 'var(--accent-cyan)' : undefined} />
            <StatusItem label="Error" value={fiber.error || 'None'} color={fiber.error ? '#ff6b6b' : undefined} />
          </div>
        )}
      </div>
    </div>
  );
}

function StatusItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className={styles.statusItem}>
      <span className={styles.statusLabel}>{label}</span>
      <span className={styles.statusValue} style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}
