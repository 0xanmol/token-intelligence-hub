/**
 * Jupiter Portfolio API
 * https://dev.jup.ag/docs/portfolio
 * 
 * Tracks wallet positions across DeFi protocols.
 */

import { jupiterFetch } from "@/lib/jupiter/client";
import { type PortfolioResponse } from "@/types/jupiter";

/** Get all positions for a wallet */
export async function getPositions(address: string): Promise<PortfolioResponse> {
  return jupiterFetch<PortfolioResponse>(`/portfolio/v2/${address}`);
}

/** Get list of supported platforms */
export async function getPlatforms() {
  return jupiterFetch(`/portfolio/v2/platforms`);
}
