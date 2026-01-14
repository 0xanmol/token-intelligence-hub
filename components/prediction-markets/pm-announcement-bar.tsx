"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

export interface HotMarket {
  eventTitle: string;
  marketTitle: string;
  probability: number;
  marketId: string;
}

interface PMAnnouncementBarProps {
  hotMarket: HotMarket | null;
}

// =============================================================================
// Storage Key
// =============================================================================

const DISMISSED_KEY = "pm-announcement-dismissed";
const DISMISSED_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// =============================================================================
// Component
// =============================================================================

/**
 * Slim announcement bar for prediction markets.
 * Shows the hottest market with live odds. Dismissible for 24 hours.
 */
export function PMAnnouncementBar({ hotMarket }: PMAnnouncementBarProps) {
  const [dismissed, setDismissed] = useState(true); // Start hidden to prevent flash
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if previously dismissed
    const dismissedAt = sessionStorage.getItem(DISMISSED_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < DISMISSED_EXPIRY_MS) {
        return; // Still within dismissed period
      }
    }
    
    // Show the bar with a slight delay for smooth entry
    // Use setTimeout to avoid synchronous setState in effect
    const showTimer = setTimeout(() => setDismissed(false), 0);
    const visibleTimer = setTimeout(() => setIsVisible(true), 100);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(visibleTimer);
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem(DISMISSED_KEY, Date.now().toString());
    // Wait for animation before removing from DOM
    setTimeout(() => setDismissed(true), 300);
  };

  if (dismissed || !hotMarket) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed top-14 left-0 right-0 z-40 transition-all duration-300",
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      )}
    >
      <div className="bg-gradient-to-r from-amber-950/90 via-orange-950/90 to-amber-950/90 border-b border-amber-500/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-4">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-medium text-amber-400/90 uppercase tracking-wide">
              Live
            </span>
          </div>

          {/* Market info */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-white/70 hidden sm:inline">
              {hotMarket.eventTitle}:
            </span>
            <span className="text-white font-medium">
              &ldquo;{hotMarket.marketTitle}&rdquo;
            </span>
            <span className="text-amber-400 font-semibold tabular-nums">
              {hotMarket.probability.toFixed(0)}% Yes
            </span>
          </div>

          {/* CTA */}
          <Link
            href="/predictions"
            className="text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
          >
            Trade
            <svg
              className="w-3 h-3"
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
          </Link>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="absolute right-4 p-1 text-white/40 hover:text-white/70 transition-colors"
            aria-label="Dismiss"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
