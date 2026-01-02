/**
 * Jupiter Tokens API v2
 * https://dev.jup.ag/docs/tokens/search
 */

import { jupiterFetch } from "@/lib/jupiter/client";
import { type TokenInfo } from "@/types/jupiter";

// API returns object or array depending on endpoint
function toArray(response: unknown): unknown[] {
  if (Array.isArray(response)) return response;
  if (response && typeof response === "object") return Object.values(response);
  return [];
}

// Map API fields to our TokenInfo (handles id→mint, icon→logoURI)
function mapToken(data: unknown): TokenInfo {
  const t = data as Record<string, unknown>;
  return {
    mint: (t.id || t.mint) as string,
    name: t.name as string,
    symbol: t.symbol as string,
    decimals: t.decimals as number,
    logoURI: (t.icon || t.logoURI) as string | undefined,
    tags: t.tags as string[] | undefined,
    organicScore: t.organicScore as number | undefined,
    marketCap: t.marketCap as number | undefined,
    holders: (t.holders || t.holderCount) as number | undefined,
  };
}

/** Search tokens by name, symbol, or mint address */
export async function searchTokens(query: string): Promise<TokenInfo[]> {
  if (!query?.trim()) return [];
  const response = await jupiterFetch<unknown>(`/tokens/v2/search?query=${encodeURIComponent(query)}`);
  return toArray(response).map(mapToken);
}

/** Get tokens by tag (verified, lst) */
export async function getTokensByTag(tag: "verified" | "lst"): Promise<TokenInfo[]> {
  const response = await jupiterFetch<unknown>(`/tokens/v2/tag?query=${tag}`);
  return toArray(response).map(mapToken);
}

/** Get trending/top tokens by category and time interval */
export async function getTokensByCategory(
  category: "toporganicscore" | "toptraded" | "toptrending",
  interval: "5m" | "1h" | "6h" | "24h" = "5m",
  limit = 50
): Promise<TokenInfo[]> {
  const response = await jupiterFetch<unknown>(`/tokens/v2/${category}/${interval}?limit=${limit}`);
  return toArray(response).map(mapToken);
}

/** Get recently created tokens */
export async function getRecentTokens(): Promise<TokenInfo[]> {
  const response = await jupiterFetch<unknown>(`/tokens/v2/recent`);
  return toArray(response).map(mapToken);
}

/** Get single token info by mint address */
export async function getTokenInfo(mint: string): Promise<TokenInfo | null> {
  if (!mint?.trim()) return null;
  const tokens = await searchTokens(mint);
  return tokens.find(t => t.mint === mint) || null;
}
