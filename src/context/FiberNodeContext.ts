import { createContext } from 'react';
import type { UseFiberNodeResult } from '@fiber-pay/react';

export const FiberNodeContext = createContext<UseFiberNodeResult | null>(null);
