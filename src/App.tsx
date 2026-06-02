import { Header } from './components/Header'
import { SwapCard } from './components/SwapCard'
import { NodeInfoSection } from './components/NodeInfoSection'
import styles from './components/App.module.css'

function App() {
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

        {/* Swap Card */}
        <SwapCard />

        {/* Fiber SDK Integration Section */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.dot} />
            <span className={styles.sectionLabel}>Fiber SDK Integration</span>
          </div>
          <NodeInfoSection />
        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        Built with{' '}
        <span className={styles.footerBrand}>@fiber-pay/react</span> · Demo only · No real transactions
      </footer>
    </div>
  )
}

export default App
