import { useNodeInfo } from '../hooks/useNodeInfo';
import styles from './NodeStatusBadge.module.css';

export function NodeStatusBadge() {
  const { data, loading } = useNodeInfo(10000);

  const isOnline = data?.online ?? false;

  return (
    <div className={styles.badge} title={data ? `Peers: ${data.peer_count} | Channels: ${data.channel_count}` : 'Checking node status...'}>
      <span className={`${styles.dot} ${isOnline ? styles.dotOnline : styles.dotOffline}`} />
      <span className={styles.label}>
        {loading ? 'Checking…' : isOnline ? 'FNN Online' : 'FNN Offline'}
      </span>
    </div>
  );
}
