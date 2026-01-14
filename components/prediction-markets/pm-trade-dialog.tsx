"use client";

import { useState, useCallback, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type PMEvent,
  type PMMarket,
  getProbability,
  formatPMVolume,
  dollarsToContracts,
} from "@/lib/jupiter/prediction-markets";
import { cn } from "@/lib/utils";

// USDC mint address on Solana mainnet
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// =============================================================================
// Types
// =============================================================================

interface PMTradeDialogProps {
  event: PMEvent;
  market: PMMarket;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSide?: "yes" | "no";
}

type TradeSide = "yes" | "no";

// =============================================================================
// Constants
// =============================================================================

const QUICK_AMOUNTS = [5, 10, 25, 50, 100] as const;
const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  "https://api.mainnet-beta.solana.com";

// =============================================================================
// Helper Components
// =============================================================================

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Dialog for placing prediction market trades.
 * Allows users to select Yes/No, enter amount, and submit orders.
 */
export function PMTradeDialog({
  event,
  market,
  open,
  onOpenChange,
  initialSide = "yes",
}: PMTradeDialogProps) {
  const { publicKey, signTransaction, connected } = useWallet();

  // Form state
  const [side, setSide] = useState<TradeSide>(initialSide);
  const [amount, setAmount] = useState("");

  // Transaction state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Balance state
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Reset side when dialog opens with new initialSide
  useEffect(() => {
    if (open) {
      setSide(initialSide);
    }
  }, [open, initialSide]);

  // Fetch USDC balance via Jupiter Ultra Holdings API
  useEffect(() => {
    async function fetchBalance() {
      if (!publicKey || !open) {
        setUsdcBalance(null);
        return;
      }

      setIsLoadingBalance(true);
      try {
        const res = await fetch(`/api/ultra/holdings?wallet=${publicKey.toBase58()}`);
        if (!res.ok) throw new Error("Failed to fetch holdings");
        
        const holdings = await res.json();
        // Get USDC balance from tokens object
        const usdcHolding = holdings.tokens?.[USDC_MINT];
        setUsdcBalance(usdcHolding?.uiAmount ?? 0);
      } catch {
        // User might not have any holdings
        setUsdcBalance(0);
      } finally {
        setIsLoadingBalance(false);
      }
    }

    fetchBalance();
  }, [publicKey, open]);

  // Calculate prices and payouts
  const yesPrice = market.pricing.buyYesPriceUsd || 0;
  const noPrice = market.pricing.buyNoPriceUsd || 0;
  const selectedPrice = side === "yes" ? yesPrice : noPrice;

  const dollarAmount = parseFloat(amount) || 0;
  const contracts = dollarsToContracts(dollarAmount, selectedPrice);
  const potentialPayout = contracts; // Each contract pays $1 if correct
  const potentialProfit = potentialPayout - dollarAmount;
  const closeDate = new Date(market.closeTime * 1000);

  /**
   * Submit the trade order.
   * Creates order via API, signs transaction, and submits to Solana.
   */
  const handleTrade = useCallback(async () => {
    if (!publicKey || !signTransaction || dollarAmount <= 0) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Step 1: Create order via API
      const orderRes = await fetch("/api/pm/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerPubkey: publicKey.toBase58(),
          marketId: market.marketId,
          isYes: side === "yes",
          isBuy: true,
          contracts,
          maxBuyPriceUsd: selectedPrice, // Required for buy orders - price per contract in micro-dollars
          depositAmount: Math.ceil(dollarAmount * 1_000_000),
        }),
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json();
        throw new Error(errData.error || "Failed to create order");
      }

      const orderData = await orderRes.json();

      if (!orderData.transaction) {
        throw new Error("No transaction returned from API");
      }

      // Step 2: Decode and sign transaction
      const txBuffer = Buffer.from(orderData.transaction, "base64");
      const transaction = VersionedTransaction.deserialize(txBuffer);
      const signedTx = await signTransaction(transaction);

      // Step 3: Send to Solana
      const connection = new Connection(RPC_URL);
      const signature = await connection.sendRawTransaction(
        signedTx.serialize(),
        { skipPreflight: false, maxRetries: 3 }
      );

      // Step 4: Wait for confirmation
      await connection.confirmTransaction(
        {
          signature,
          blockhash: orderData.txMeta.blockhash,
          lastValidBlockHeight: orderData.txMeta.lastValidBlockHeight,
        },
        "confirmed"
      );

      setSuccess(true);
      setAmount("");
    } catch (err) {
      console.error("Trade error:", err);
      setError(err instanceof Error ? err.message : "Trade failed");
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, signTransaction, market.marketId, side, contracts, dollarAmount]);

  const handleClose = () => {
    setAmount("");
    setError(null);
    setSuccess(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-black/95 border-white/10 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold pr-8">
            {event.metadata.title}
          </DialogTitle>
          {market.metadata.title !== event.metadata.title && (
            <p className="text-sm text-white/50">{market.metadata.title}</p>
          )}
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Side Selection */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSide("yes")}
              className={cn(
                "p-4 rounded-xl border-2 transition-all text-center",
                side === "yes"
                  ? "border-[#30D158] bg-[#30D158]/10"
                  : "border-white/10 hover:border-white/20"
              )}
            >
              <div
                className={cn(
                  "text-2xl font-bold",
                  side === "yes" ? "text-[#30D158]" : "text-white/60"
                )}
              >
                Yes
              </div>
              <div className="text-xs text-white/40 mt-1">
                {getProbability(yesPrice).toFixed(0)}¢
              </div>
            </button>
            <button
              onClick={() => setSide("no")}
              className={cn(
                "p-4 rounded-xl border-2 transition-all text-center",
                side === "no"
                  ? "border-[#FF453A] bg-[#FF453A]/10"
                  : "border-white/10 hover:border-white/20"
              )}
            >
              <div
                className={cn(
                  "text-2xl font-bold",
                  side === "no" ? "text-[#FF453A]" : "text-white/60"
                )}
              >
                No
              </div>
              <div className="text-xs text-white/40 mt-1">
                {getProbability(noPrice).toFixed(0)}¢
              </div>
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-white/50">
                Amount (USD)
              </label>
              {connected && (
                <div className="text-sm text-white/50">
                  {isLoadingBalance ? (
                    <span className="text-white/30">Loading...</span>
                  ) : usdcBalance !== null ? (
                    <span>
                      Balance:{" "}
                      <span className="text-white/70 font-medium tabular-nums">
                        ${usdcBalance.toFixed(2)}
                      </span>
                    </span>
                  ) : null}
                </div>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                $
              </span>
              <Input
                type="number"
                placeholder="10.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={cn(
                  "pl-8 h-12 text-lg bg-white/5 border-white/10 focus:border-white/20",
                  usdcBalance !== null && dollarAmount > usdcBalance && "border-[#FF453A]/50 focus:border-[#FF453A]"
                )}
                min="1"
                step="1"
              />
              {usdcBalance !== null && usdcBalance > 0 && (
                <button
                  onClick={() => setAmount(Math.floor(usdcBalance).toString())}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white/70 transition-colors px-2 py-1 rounded bg-white/5 hover:bg-white/10"
                >
                  Max
                </button>
              )}
            </div>
            {usdcBalance !== null && dollarAmount > usdcBalance && (
              <p className="text-xs text-[#FF453A] mt-1">
                Insufficient balance
              </p>
            )}
            <div className="flex gap-2 mt-2">
              {QUICK_AMOUNTS.map((val) => (
                <button
                  key={val}
                  onClick={() => setAmount(val.toString())}
                  className={cn(
                    "flex-1 py-1.5 text-xs bg-white/5 rounded-lg hover:bg-white/10 transition-colors",
                    usdcBalance !== null && val > usdcBalance
                      ? "text-white/20 cursor-not-allowed"
                      : "text-white/50"
                  )}
                  disabled={usdcBalance !== null && val > usdcBalance}
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          {dollarAmount > 0 && (
            <div className="p-4 bg-white/5 rounded-xl space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Contracts</span>
                <span className="font-medium">{contracts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Potential payout</span>
                <span className="font-medium">${potentialPayout.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Potential profit</span>
                <span
                  className={cn(
                    "font-medium",
                    potentialProfit > 0 ? "text-[#30D158]" : "text-white/70"
                  )}
                >
                  +${potentialProfit.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-white/10 pt-2 mt-2">
                <div className="flex justify-between text-xs text-white/40">
                  <span>Closes</span>
                  <span>
                    {closeDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-[#FF453A]/10 border border-[#FF453A]/20 rounded-lg text-sm text-[#FF453A]">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3 bg-[#30D158]/10 border border-[#30D158]/20 rounded-lg text-sm text-[#30D158]">
              Order placed successfully! 🎉
            </div>
          )}

          {/* Submit Button */}
          {!connected ? (
            <Button
              className="w-full h-12 text-base font-medium bg-white/10 hover:bg-white/15"
              disabled
            >
              Connect Wallet to Trade
            </Button>
          ) : (
            <Button
              onClick={handleTrade}
              disabled={
                isLoading ||
                dollarAmount <= 0 ||
                success ||
                (usdcBalance !== null && dollarAmount > usdcBalance)
              }
              className={cn(
                "w-full h-12 text-base font-medium transition-all",
                side === "yes"
                  ? "bg-[#30D158] hover:bg-[#30D158]/90 text-black"
                  : "bg-[#FF453A] hover:bg-[#FF453A]/90 text-white"
              )}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner />
                  Processing...
                </span>
              ) : success ? (
                "Done!"
              ) : usdcBalance !== null && dollarAmount > usdcBalance ? (
                "Insufficient Balance"
              ) : (
                `Buy ${side === "yes" ? "Yes" : "No"} for $${dollarAmount.toFixed(2)}`
              )}
            </Button>
          )}

          {/* Footer */}
          <p className="text-xs text-white/30 text-center">
            Volume: {formatPMVolume(market.pricing.volume)} • Powered by Jupiter
            PM
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
