import { Header } from './components/Header'
import { SwapCard } from './components/SwapCard'
import { NodeStatusBadge } from './components/NodeStatusBadge'
import { FaucetPage } from './components/FaucetPage'
import { FiberNodeProvider } from './context/FiberNodeProvider'
import styles from './components/App.module.css'

function AppContent() {
  const isFaucetPage = window.location.pathname === '/faucet'

  return (
    <div className={styles.container}>
      <Header />

      <main className={styles.main}>
        {isFaucetPage ? (
          <>
            <div className={styles.hero}>
              <h1 className={styles.heroTitle}>Test cWBTC Faucet</h1>
              <p className={styles.heroSubtitle}>
                Get test cWBTC for Fiber CCH payments on CKB testnet.
              </p>
            </div>

            <FaucetPage />
          </>
        ) : (
          <>
            <div className={styles.hero}>
              <h1 className={styles.heroTitle}>Swap between cWBTC and Lightning BTC</h1>
              <p className={styles.heroSubtitle}>
                Both directions through a Fiber CCH node. cWBTC is a test CKB UDT we issued as
                fake wrapped BTC for this demo.{' '}
                Claim it from the <a href="/faucet" className={styles.heroLink}>faucet</a>.
              </p>
            </div>

            <NodeStatusBadge />

            <SwapCard />
          </>
        )}
      </main>

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
