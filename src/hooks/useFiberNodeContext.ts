import { useContext } from 'react';
import { FiberNodeContext } from '../context/FiberNodeContext';

export function useFiberNodeContext() {
  const ctx = useContext(FiberNodeContext);
  if (!ctx) {
    throw new Error('useFiberNodeContext must be used within FiberNodeProvider');
  }
  return ctx;
}
