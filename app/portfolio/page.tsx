"use client";

import { useEffect, useState } from "react";
import { useSolana } from "@/components/providers/solana-provider";
import { type PortfolioElement } from "@/types/jupiter";
import { ExternalLink, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function StatSkeleton() {
  return <div className="h-12 w-32 rounded-lg bg-white/[0.06] animate-pulse" />;
}

export default function PortfolioPage() {
  const { isConnected, account } = useSolana();
  const [elements, setElements] = useState<PortfolioElement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);
  const [totalPnl, setTotalPnl] = useState(0);

  useEffect(() => {
    if (isConnected && account) {
      fetchPortfolio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, account]);

  const fetchPortfolio = async () => {
    if (!account) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/portfolio?wallet=${account}`);
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      const portfolioData = await res.json();
      const portfolioElements = portfolioData.elements || [];
      setElements(portfolioElements);
      
      let totalVal = 0;
      let totalPnlVal = 0;
      
      for (const element of portfolioElements) {
        totalVal += element.value || 0;
        if (element.data?.assets) {
          for (const asset of element.data.assets) {
            if (asset.attributes?.prediction?.pnlAfterFeesValue) {
              totalPnlVal += asset.attributes.prediction.pnlAfterFeesValue;
            }
          }
        }
      }
      
      setTotalValue(portfolioData.totalValue || totalVal);
      setTotalPnl(totalPnlVal);
    } catch (error) {
      console.error("Failed to fetch portfolio:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <p className="text-6xl">👛</p>
          <h1 className="text-4xl font-semibold tracking-tight">Portfolio</h1>
          <p className="text-white/40">
            Connect your wallet to view positions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-6xl sm:text-7xl font-semibold tracking-tight">
                Portfolio
              </h1>
              <p className="mt-4 text-white/40 text-lg">Your positions and holdings</p>
            </div>
            <button
              onClick={fetchPortfolio}
              disabled={isLoading}
              className="p-3 rounded-full bg-white/[0.06] hover:bg-white/[0.1] transition-apple disabled:opacity-50"
            >
              <RefreshCw className={cn("size-5 text-white/60", isLoading && "animate-spin")} />
            </button>
          </div>

          {/* Stats */}
          <div className="flex gap-16">
            <div>
              <p className="text-sm text-white/40 mb-2">Total Value</p>
              {isLoading ? (
                <StatSkeleton />
              ) : (
                <p className="text-5xl font-semibold tabular-nums tracking-tight">
                  ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-white/40 mb-2">P&L</p>
              {isLoading ? (
                <StatSkeleton />
              ) : (
                <p className={cn(
                  "text-5xl font-semibold tabular-nums tracking-tight",
                  totalPnl >= 0 ? "text-[#30D158]" : "text-[#FF453A]"
                )}>
                  {totalPnl >= 0 ? "+" : ""}{totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-white/40 mb-2">Positions</p>
              {isLoading ? (
                <StatSkeleton />
              ) : (
                <p className="text-5xl font-semibold tabular-nums tracking-tight">
                  {elements.length}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Positions */}
      <section className="px-6 pb-32">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-lg font-medium mb-6">Positions</h2>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 rounded-2xl bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : elements.length === 0 ? (
            <div className="card-elevated rounded-2xl p-12 text-center">
              <p className="text-4xl mb-4">📊</p>
              <p className="text-lg font-medium mb-2">No positions yet</p>
              <p className="text-white/40 text-sm">
                Open positions on Jupiter to see them here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {elements.map((element, index) => (
                <PositionCard key={`${element.platformId}-${index}`} element={element} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function PositionCard({ element }: { element: PortfolioElement }) {
  const { platformId, platformName, platformImage, type, label, value, data } = element;
  const asset = data?.assets?.[0];
  const prediction = asset?.attributes?.prediction;

  if (prediction) {
    return <PredictionCard asset={asset} prediction={prediction} value={value} />;
  }

  return (
    <div className="card-elevated rounded-2xl p-6">
      <div className="flex items-center gap-4">
        {platformImage ? (
          <img src={platformImage} alt={platformName || platformId} className="size-12 rounded-xl" />
        ) : (
          <div className="size-12 rounded-xl bg-white/[0.06] flex items-center justify-center text-sm font-medium text-white/40">
            {(platformName || platformId).slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <p className="font-medium">{platformName || platformId}</p>
          <p className="text-sm text-white/40">{label || type}</p>
        </div>
        <p className="text-2xl font-semibold tabular-nums">${value.toFixed(2)}</p>
      </div>
    </div>
  );
}

function PredictionCard({ asset, prediction, value }: { asset: any; prediction: any; value: number }) {
  const market = prediction.market;
  const isProfit = prediction.pnlAfterFeesValue >= 0;
  const isYes = prediction.sideName === "Yes";

  return (
    <div className="card-elevated rounded-2xl overflow-hidden">
      <div className="p-6">
        <div className="flex items-start gap-4">
          {asset.imageUri && (
            <img 
              src={asset.imageUri} 
              alt={market.eventTitle}
              className="size-16 rounded-xl object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium leading-tight mb-2">{market.eventTitle}</p>
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2 py-0.5 rounded text-sm font-medium",
                isYes ? "bg-[#30D158]/20 text-[#30D158]" : "bg-[#FF453A]/20 text-[#FF453A]"
              )}>
                {prediction.sideName}
              </span>
              <span className="text-white/40 text-sm">{prediction.size} shares</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold tabular-nums">${value.toFixed(2)}</p>
            <p className={cn(
              "text-sm tabular-nums",
              isProfit ? "text-[#30D158]" : "text-[#FF453A]"
            )}>
              {isProfit ? "+" : ""}{prediction.pnlAfterFeesValue.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 border-t border-white/[0.06]">
        <div className="p-4 text-center border-r border-white/[0.06]">
          <p className="text-xs text-white/30 mb-1">Entry</p>
          <p className="font-medium tabular-nums">${prediction.entryPrice.toFixed(2)}</p>
        </div>
        <div className="p-4 text-center border-r border-white/[0.06]">
          <p className="text-xs text-white/30 mb-1">Current</p>
          <p className="font-medium tabular-nums">${prediction.markPrice.toFixed(2)}</p>
        </div>
        <div className="p-4 text-center border-r border-white/[0.06]">
          <p className="text-xs text-white/30 mb-1">Fees</p>
          <p className="font-medium tabular-nums">${prediction.feesPaidValue.toFixed(2)}</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-xs text-white/30 mb-1">Closes</p>
          <p className="font-medium tabular-nums">
            {new Date(market.closeTime).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Footer */}
      {asset.link && (
        <div className="px-6 py-3 border-t border-white/[0.06] flex items-center justify-between">
          <span className="text-xs text-white/30">
            Opened {new Date(prediction.createdAt).toLocaleDateString()}
          </span>
          <a 
            href={asset.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition-apple"
          >
            View on Jupiter
            <ExternalLink className="size-3" />
          </a>
        </div>
      )}
    </div>
  );
}
