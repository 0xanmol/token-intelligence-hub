/**
 * Jupiter Ultra API
 * https://dev.jup.ag/docs/ultra
 * 
 * Ultra provides gasless swaps with MEV protection.
 * Flow: getOrder → sign transaction → executeOrder
 */

import { jupiterFetch } from "@/lib/jupiter/client";

interface OrderParams {
  inputMint: string;
  outputMint: string;
  amount: string;       // Raw amount in smallest units
  slippageBps?: number; // Slippage tolerance (50 = 0.5%)
  taker?: string;       // Wallet address (required to get transaction)
}

interface OrderResponse {
  transaction: string | null; // Base64 unsigned tx (null if no taker)
  requestId: string;          // Use with execute endpoint
  inAmount?: string;
  outAmount?: string;
}

interface ExecuteParams {
  signedTransaction: string;  // Base64 signed tx
  requestId: string;
}

interface ExecuteResponse {
  signature?: string;
  status?: string;
}

/** Get swap order/quote. Pass taker address to get signable transaction. */
export async function getOrder(params: OrderParams): Promise<OrderResponse> {
  const query = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount,
    ...(params.slippageBps && { slippageBps: params.slippageBps.toString() }),
    ...(params.taker && { taker: params.taker }),
  });
  
  return jupiterFetch<OrderResponse>(`/ultra/v1/order?${query}`);
}

/** Execute signed swap transaction */
export async function executeOrder(params: ExecuteParams): Promise<ExecuteResponse> {
  return jupiterFetch<ExecuteResponse>(`/ultra/v1/execute`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/** Get token holdings for a wallet */
export async function getHoldings(address: string) {
  return jupiterFetch(`/ultra/v1/holdings/${address}`);
}
