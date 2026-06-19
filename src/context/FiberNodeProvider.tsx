import { type ReactNode } from 'react';
import { useFiberNode } from '@fiber-pay/react';
import { FiberNodeContext } from './FiberNodeContext';

export function FiberNodeProvider({ children }: { children: ReactNode }) {
  const fiber = useFiberNode({ network: 'testnet', enabled: true });

  return (
    <FiberNodeContext.Provider value={fiber}>{children}</FiberNodeContext.Provider>
  );
}
