import { useMemo, type ReactNode } from 'react';
import { useFiberNode } from '@fiber-pay/react';
import { FiberNodeContext } from './FiberNodeContext';

export function FiberNodeProvider({ children }: { children: ReactNode }) {
  const fiber = useFiberNode({ network: 'testnet', enabled: true });
  const value = useMemo(() => fiber, [fiber]);

  return (
    <FiberNodeContext.Provider value={value}>{children}</FiberNodeContext.Provider>
  );
}
