import { Header } from './components/Header'
import { SwapCard } from './components/SwapCard'
import { NodeStatusBadge } from './components/NodeStatusBadge'
import { FiberNodeProvider } from './context/FiberNodeProvider'
import styles from './components/App.module.css'

function AppContent() {
  return (
    <div className={styles.container}>
      <Header />

      <main className={styles.main}>
        {/* Hero text */}
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>Pay Lightning Invoice with CKB</h1>
          <p className={styles.heroSubtitle}>
            Cross-chain payment proxy powered by the Fiber Network on Nervos CKB.
          </p>
        </div>

        <NodeStatusBadge />

        {/* Testnet safety notice */}
        <div className={styles.notice}>
          <span className={styles.noticeIcon}>⚠️</span>
          <div className={styles.noticeBody}>
            <strong>This is a testnet demo. Do not send mainnet funds.</strong>
            <br />
            请使用 testnet Lightning invoice（以 lntb 开头）。
          </div>
        </div>

        {/* Swap Card */}
        <SwapCard />
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        Built with{' '}
        <span className={styles.footerBrand}>@fiber-pay/react</span> · Testnet Demo
      </footer>
    </div>
  )
}

function App() {
  return (
    <FiberNodeProvider>
      <AppContent />
    </FiberNodeProvider>
  )
}

export default App
