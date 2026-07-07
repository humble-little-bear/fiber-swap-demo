import { type ReactNode } from 'react';
import { useFiberNode } from '@fiber-pay/react';
import { FiberNodeContext } from './FiberNodeContext';
import type { UseFiberNodeOptions } from '@fiber-pay/react';

const CWBTC_UDT_CONFIG: NonNullable<UseFiberNodeOptions['nodeConfig']>['udtWhitelist'] = [
  {
    name: 'cWBTC',
    script: {
      code_hash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
      hash_type: 'type',
      args: '0x9a1086531ed6dc69e0bd44cef5278e03faf3015b31aff60b08fb87663ce8507100000000',
    },
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash: '0xbf6fb538763efec2a70a6a3dcb7242787087e1030c4e7d86585bc63a9d337f5f',
            index: '0x0',
          },
          depType: 'code',
        },
      },
    ],
    autoAcceptAmount: '0x3b9aca00',
  },
];

export function FiberNodeProvider({ children }: { children: ReactNode }) {
  const fiber = useFiberNode({
    network: 'testnet',
    enabled: true,
    nodeConfig: {
      udtWhitelist: CWBTC_UDT_CONFIG,
    },
  });

  return (
    <FiberNodeContext.Provider value={fiber}>{children}</FiberNodeContext.Provider>
  );
}
