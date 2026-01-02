"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { TokenCard } from "@/components/token/token-card";
import { useSearchParams } from "@/hooks/use-search-params";
import { type TokenInfo, type PricesResponse } from "@/types/jupiter";

export function SearchContent() {
  const [params, setParams] = useSearchParams();
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [prices, setPrices] = useState<PricesResponse>({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchInput, setSearchInput] = useState(params.query);

  useEffect(() => {
    if (params.query) {
      fetchTokens();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.query]);

  const fetchTokens = async () => {
    if (!params.query) return;

    setIsLoading(true);
    try {
      // Use API routes to keep API key server-side
      const tokensRes = await fetch(`/api/tokens/search?q=${encodeURIComponent(params.query)}`);
      if (!tokensRes.ok) throw new Error("Search failed");
      const tokensData = await tokensRes.json();
      setTokens(tokensData);

      const mints = tokensData.map((t: TokenInfo) => t.mint);
      if (mints.length > 0) {
        const pricesRes = await fetch(`/api/prices?mints=${mints.join(",")}`);
        if (pricesRes.ok) {
          const pricesData = await pricesRes.json();
          setPrices(pricesData);
        }
      }
    } catch (error) {
      console.error("Failed to fetch tokens:", error);
      setTokens([]);
      setPrices({});
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setParams({ query: searchInput });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="space-y-12">
      {/* Search Input - Apple style */}
      <div className="max-w-2xl">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 size-5 text-white/30" />
          <input
            type="text"
            placeholder="Search tokens..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleKeyPress}
            className="w-full h-14 pl-14 pr-6 rounded-2xl bg-white/[0.06] border-0 text-base placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 transition-apple"
          />
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <div className="py-20">
          <p className="text-white/30">
            {params.query
              ? "No tokens found"
              : "Enter a search term to find tokens"
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tokens.map((token) => (
            <TokenCard
              key={token.mint}
              tokenInfo={token}
              price={prices[token.mint] || null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
