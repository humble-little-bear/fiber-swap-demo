import { useState, useCallback } from 'react';
import { Header } from './components/Header'
import { SwapCard } from './components/SwapCard'
import { NodeStatusBadge } from './components/NodeStatusBadge'
import styles from './components/App.module.css'

interface ActiveOrder {
  paymentHash: string;
  incomingInvoice: string;
  outgoingPayReq: string;
}

function App() {
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);

  const handleOrderCreated = useCallback((
    paymentHash: string,
    incomingInvoice: string,
    outgoingPayReq: string
  ) => {
    setActiveOrder({ paymentHash, incomingInvoice, outgoingPayReq });
  }, []);

  const handleCloseOrder = useCallback(() => {
    setActiveOrder(null);
  }, []);

  return (
    <div className={styles.container}>
      <Header />

      <main className={styles.main}>
        {/* Hero text */}
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>Swap over Fiber Network</h1>
          <p className={styles.heroSubtitle}>
            Lightning-fast, low-cost token swaps powered by the Fiber Network on Nervos CKB.
          </p>
        </div>

        <NodeStatusBadge />

        {/* Swap Card */}
        <SwapCard onOrderCreated={handleOrderCreated} />

        {/* Order Panel */}
        {activeOrder && (
          <OrderPanel
            paymentHash={activeOrder.paymentHash}
            incomingInvoice={activeOrder.incomingInvoice}
            outgoingPayReq={activeOrder.outgoingPayReq}
            onClose={handleCloseOrder}
          />
        )}
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        Built with{' '}
        <span className={styles.footerBrand}>@fiber-pay/react</span> · Testnet Demo
      </footer>
    </div>
  )
}

export default App
