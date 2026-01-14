"use client";

import { useState } from "react";
import Image from "next/image";
import {
  getProbability,
  formatPMVolume,
  type PMEvent,
  type PMMarket,
} from "@/lib/jupiter/prediction-markets";
import { PMTradeDialog } from "./pm-trade-dialog";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface PMEventCardProps {
  event: PMEvent;
}

interface MarketRowProps {
  market: PMMarket;
  onTrade: (market: PMMarket, side: "yes" | "no") => void;
}

// =============================================================================
// Components
// =============================================================================

/** Individual market row with probability and Yes/No trade buttons */
function MarketRow({ market, onTrade }: MarketRowProps) {
  const probability = getProbability(market.pricing.buyYesPriceUsd);

  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div className="flex-1 min-w-0 pr-4">
        <span className="text-sm text-white/80">{market.metadata.title}</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-white/90 w-12 text-right tabular-nums">
          {probability.toFixed(0)}%
        </span>

        <div className="flex items-center gap-1 text-sm">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTrade(market, "yes");
            }}
            className="px-3 py-1.5 rounded-md bg-[#30D158]/15 text-[#30D158] font-medium hover:bg-[#30D158]/25 transition-colors"
          >
            Yes
          </button>
          <span className="text-white/20">/</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTrade(market, "no");
            }}
            className="px-3 py-1.5 rounded-md bg-[#FF453A]/15 text-[#FF453A] font-medium hover:bg-[#FF453A]/25 transition-colors"
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
}

/** Jupiter logo badge overlay for event images */
function JupiterBadge() {
  return (
    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-[#c7f284] to-[#00bef0] flex items-center justify-center">
      <svg
        className="w-3 h-3 text-black"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    </div>
  );
}

/** Live status indicator badge */
function LiveBadge() {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#30D158]/10 border border-[#30D158]/20">
      <div className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-pulse" />
      <span className="text-xs font-medium text-[#30D158]">Live</span>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Prediction market event card displaying multiple markets with trade buttons.
 * Shows up to 3 markets initially with "Show More" expansion.
 */
export function PMEventCard({ event }: PMEventCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<PMMarket | null>(null);
  const [selectedSide, setSelectedSide] = useState<"yes" | "no">("yes");

  // Filter and sort markets by volume (highest first)
  const tradableMarkets = event.markets
    .filter((m) => m.status === "open" && m.metadata.isTradable)
    .sort((a, b) => (b.pricing.volume || 0) - (a.pricing.volume || 0));

  const visibleMarkets = expanded ? tradableMarkets : tradableMarkets.slice(0, 3);
  const hasMoreMarkets = tradableMarkets.length > 3;
  const totalVolume = tradableMarkets.reduce(
    (sum, m) => sum + (m.pricing.volume || 0),
    0
  );

  const handleTrade = (market: PMMarket, side: "yes" | "no") => {
    setSelectedMarket(market);
    setSelectedSide(side);
    setDialogOpen(true);
  };

  // Don't render if no tradable markets
  if (tradableMarkets.length === 0) {
    return null;
  }

  return (
    <>
      <div className="card-elevated rounded-2xl overflow-hidden">
        {/* Event Header */}
        <div className="p-5 pb-3">
          <div className="flex items-start gap-3">
            {event.metadata.imageUrl && (
              <div className="relative flex-shrink-0">
                <Image
                  src={event.metadata.imageUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-xl object-cover"
                  unoptimized
                />
                <JupiterBadge />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base leading-snug">
                {event.metadata.title}
              </h3>
            </div>
            {event.isLive && <LiveBadge />}
          </div>
        </div>

        {/* Markets List */}
        <div className="px-5">
          {visibleMarkets.map((market) => (
            <MarketRow
              key={market.marketId}
              market={market}
              onTrade={handleTrade}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex items-center justify-between">
          {hasMoreMarkets ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-sm text-white/50 hover:text-white/80 transition-colors"
            >
              {expanded ? "Show Less" : "Show More"}
              <svg
                className={cn(
                  "w-4 h-4 transition-transform",
                  expanded && "rotate-180"
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ) : (
            <div />
          )}

          <span className="text-sm text-white/40 tabular-nums">
            {formatPMVolume(totalVolume)} vol
          </span>
        </div>
      </div>

      {/* Trade Dialog */}
      {selectedMarket && (
        <PMTradeDialog
          event={event}
          market={selectedMarket}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          initialSide={selectedSide}
        />
      )}
    </>
  );
}
