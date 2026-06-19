import { useCallback } from 'react';
import { useFiberPayment, type FiberBrowserNode } from '@fiber-pay/react';

export function useOrderPayment(fiberNode: FiberBrowserNode | null, incomingInvoice: string) {
  const { payInvoice, isPaying, paymentResult, error: paymentError } = useFiberPayment(fiberNode);

  const handlePayWithNode = useCallback(async () => {
    if (!fiberNode || !incomingInvoice) return;
    await payInvoice(incomingInvoice);
  }, [fiberNode, incomingInvoice, payInvoice]);

  return {
    handlePayWithNode,
    isPaying,
    paymentResult,
    paymentError,
  };
}
