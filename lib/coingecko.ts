/**
 * Historical Price Data
 * 
 * Fetches price history from free APIs:
 * 1. CoinGecko (best for major tokens, rate limited)
 * 2. GeckoTerminal via DexScreener pool lookup (works for all DEX tokens)
 */

interface PricePoint {
  timestamp: number;
  price: number;
}

/** Get historical USD prices (tries CoinGecko, falls back to GeckoTerminal) */
export async function getHistoricalPrices(mint: string, days = 1): Promise<PricePoint[]> {
  const cgPrices = await fetchFromCoinGecko(mint, days);
  if (cgPrices.length > 0) return cgPrices;

  const gtPrices = await fetchFromGeckoTerminal(mint, days);
  if (gtPrices.length > 0) return gtPrices;

  return [];
}

async function fetchFromCoinGecko(mint: string, days: number): Promise<PricePoint[]> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/solana/contract/${mint}/market_chart?vs_currency=usd&days=${days}`,
      { headers: { Accept: "application/json" }, next: { revalidate: 300 } }
    );

    if (!res.ok) return [];

    const data = await res.json();
    if (!data.prices?.length) return [];

    return data.prices.map((p: [number, number]) => ({ timestamp: p[0], price: p[1] }));
  } catch {
    return [];
  }
}

async function fetchFromGeckoTerminal(mint: string, days: number): Promise<PricePoint[]> {
  try {
    // Find main pool via DexScreener
    const poolRes = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
      { headers: { Accept: "application/json" }, next: { revalidate: 600 } }
    );
    if (!poolRes.ok) return [];

    const poolData = await poolRes.json();
    const poolAddress = poolData?.pairs?.[0]?.pairAddress;
    if (!poolAddress) return [];

    // Fetch OHLCV from GeckoTerminal
    const timeframe = days <= 1 ? "hour" : "day";
    const limit = days <= 1 ? 24 : Math.min(days * 24, 100);

    const res = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolAddress}/ohlcv/${timeframe}?aggregate=1&limit=${limit}`,
      { headers: { Accept: "application/json" }, next: { revalidate: 300 } }
    );
    if (!res.ok) return [];

    const data = await res.json();
    const ohlcv = data?.data?.attributes?.ohlcv_list;
    if (!ohlcv?.length) return [];

    // OHLCV: [timestamp, open, high, low, close, volume] - use close price
    return ohlcv
      .map((c: [number, number, number, number, number, number]) => ({
        timestamp: c[0] * 1000,
        price: c[4],
      }))
      .reverse();
  } catch {
    return [];
  }
}
