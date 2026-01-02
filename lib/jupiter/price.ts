/**
 * Jupiter Price API v3
 * https://dev.jup.ag/docs/price/v3
 */

import { jupiterFetch } from "@/lib/jupiter/client";
import { type PricesResponse } from "@/types/jupiter";

/** Get current USD prices for multiple tokens */
export async function getPrices(mints: string[]): Promise<PricesResponse> {
  const validMints = mints.filter(m => m?.trim());
  if (validMints.length === 0) return {};
  
  return jupiterFetch<PricesResponse>(`/price/v3?ids=${validMints.join(",")}`);
}

/** Get price for a single token */
export async function getPrice(mint: string) {
  const prices = await getPrices([mint]);
  return prices[mint] || null;
}
