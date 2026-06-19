import { useContext } from 'react';
import { FiberNodeContext } from '../context/FiberNodeContext';
import type { UseFiberNodeResult } from '@fiber-pay/react';

/**
 * Optional variant of useFiberNodeContext. Returns null when the component is
 * rendered outside FiberNodeProvider instead of throwing. Use this for
 * components that should be reusable without mandating the provider.
 */
export function useFiberNodeContextOptional(): UseFiberNodeResult | null {
  return useContext(FiberNodeContext);
}
