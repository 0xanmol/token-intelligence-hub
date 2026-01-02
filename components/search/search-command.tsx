"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { type TokenInfo } from "@/types/jupiter";

export function SearchCommand() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Cmd+K to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
        setResults([]);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Search on query change
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const search = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/tokens/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("Search failed");
        const tokens = await res.json();
        setResults(tokens.slice(0, 8));
        setSelectedIndex(0);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(search, 200);
    return () => clearTimeout(debounce);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      navigateToToken(results[selectedIndex].mint);
    }
  }, [results, selectedIndex]);

  const navigateToToken = (mint: string) => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    router.push(`/token/${mint}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => {
          setIsOpen(false);
          setQuery("");
          setResults([]);
        }}
      />
      
      {/* Dialog */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl">
        <div className="mx-4 rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden">
          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-white/[0.06]">
            {isLoading ? (
              <Loader2 className="size-5 text-white/30 animate-spin" />
            ) : (
              <Search className="size-5 text-white/30" />
            )}
            <input
              type="text"
              placeholder="Search tokens..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1 bg-transparent text-lg outline-none placeholder:text-white/30"
            />
            <kbd className="px-2 py-1 rounded bg-white/[0.06] text-xs text-white/30 font-mono">
              esc
            </kbd>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="max-h-80 overflow-y-auto py-2">
              {results.map((token, index) => (
                <button
                  key={token.mint}
                  onClick={() => navigateToToken(token.mint)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    index === selectedIndex ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
                  }`}
                >
                  {token.logoURI && !token.logoURI.includes('ipfs') ? (
                    <img 
                      src={token.logoURI} 
                      alt={token.symbol}
                      className="size-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="size-8 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-medium text-white/50">
                      {token.symbol.slice(0, 2)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{token.symbol}</div>
                    <div className="text-sm text-white/40 truncate">{token.name}</div>
                  </div>
                  {token.marketCap && (
                    <div className="text-sm text-white/30 tabular-nums">
                      ${token.marketCap >= 1e9 
                        ? `${(token.marketCap / 1e9).toFixed(1)}B`
                        : `${(token.marketCap / 1e6).toFixed(0)}M`
                      }
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Empty state */}
          {query && !isLoading && results.length === 0 && (
            <div className="py-8 text-center text-white/30">
              No tokens found
            </div>
          )}

          {/* Hint */}
          {!query && (
            <div className="py-8 text-center text-white/30 text-sm">
              Search by name, symbol, or address
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Trigger button for navbar
export function SearchTrigger() {
  const [, setForceUpdate] = useState(0);
  
  const openSearch = () => {
    // Dispatch keyboard event to trigger the search
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };

  return (
    <button
      onClick={openSearch}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-apple text-sm text-white/40"
    >
      <Search className="size-4" />
      <span className="hidden sm:inline">Search</span>
      <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] font-mono">
        ⌘K
      </kbd>
    </button>
  );
}

