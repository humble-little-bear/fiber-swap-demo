import { Wifi, WifiOff, Zap } from 'lucide-react';
import { useNodeInfo } from '../hooks/useNodeInfo';
import styles from './NodeStatusBadge.module.css';

export function NodeStatusBadge() {
  const { data, loading } = useNodeInfo();

  const online = data?.online ?? false;

  return (
    <div className={styles.badge}>
      {loading ? (
        <span className={styles.loading}>Checking node…</span>
      ) : (
        <>
          <span className={online ? styles.dotOnline : styles.dotOffline}>
            {online ? <Wifi size={14} /> : <WifiOff size={14} />}
          </span>
          <span className={online ? styles.textOnline : styles.textOffline}>
            {online ? 'Backend Online' : 'Backend Offline'}
          </span>
          {online && data && (
            <span className={styles.channels}>
              <Zap size={12} />
              {data.channel_count} channels
            </span>
          )}
        </>
      )}
    </div>
  );
}
