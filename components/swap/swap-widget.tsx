"use client";

import { useState, useEffect } from "react";
import { ArrowDown, Loader2 } from "lucide-react";
import { useSolana } from "@/components/providers/solana-provider";
import { type TokenInfo } from "@/types/jupiter";
import { VersionedTransaction } from "@solana/web3.js";
import { cn } from "@/lib/utils";

interface SwapWidgetProps {
  defaultOutputMint?: string;
}

const SOL_MINT = "So11111111111111111111111111111111111111112";

interface TokenWithBalance extends TokenInfo {
  balance: number;
}

export function SwapWidget({ defaultOutputMint }: SwapWidgetProps) {
  const { isConnected, account, signTransaction } = useSolana();

  const [inputAmount, setInputAmount] = useState("");
  const [outputAmount, setOutputAmount] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [outputToken, setOutputToken] = useState<TokenInfo | null>(null);
  const [availableTokens, setAvailableTokens] = useState<TokenWithBalance[]>([
    { mint: SOL_MINT, symbol: "SOL", name: "Solana", decimals: 9, balance: 0 }
  ]);
  const [inputMint, setInputMint] = useState(SOL_MINT);
  const [outputMint, setOutputMint] = useState(defaultOutputMint || SOL_MINT);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [showTokenSelect, setShowTokenSelect] = useState(false);

  useEffect(() => {
    async function fetchHoldings() {
      if (!account) {
        setAvailableTokens([]);
        return;
      }

      setIsLoadingTokens(true);
      try {
        const holdingsRes = await fetch(`/api/ultra/holdings?wallet=${account}`);
        if (!holdingsRes.ok) throw new Error("Failed to fetch holdings");
        const holdingsResponse = await holdingsRes.json();
        const allHoldings: any[] = [];
        
        if (holdingsResponse?.uiAmount !== undefined) {
          allHoldings.push({
            mint: SOL_MINT,
            symbol: "SOL",
            name: "Solana",
            decimals: 9,
            uiAmount: holdingsResponse.uiAmount,
          });
        }
        
        const tokensObj = holdingsResponse?.tokens;
        if (tokensObj && typeof tokensObj === 'object') {
          Object.entries(tokensObj).forEach(([mint, tokenDataArray]: [string, any]) => {
            const tokenData = Array.isArray(tokenDataArray) ? tokenDataArray[0] : tokenDataArray;
            if (tokenData) {
              allHoldings.push({ mint, ...tokenData });
            }
          });
        }
        
        if (allHoldings.length > 0) {
          const mints = allHoldings
            .map((h: any) => h.mint || h.address)
            .filter((m: string) => m && m !== SOL_MINT);
          
          let tokenInfos: TokenInfo[] = [];
          if (mints.length > 0) {
            const tokensRes = await fetch(`/api/tokens/search?q=${mints.slice(0, 20).join(",")}`);
            if (tokensRes.ok) tokenInfos = await tokensRes.json();
          }
          
          const tokensWithBalances: TokenWithBalance[] = allHoldings
            .slice(0, 20)
            .map((holding: any) => {
              const mint = holding.mint || holding.address;
              const tokenInfo = tokenInfos.find((t: TokenInfo) => t.mint === mint);
              const decimals = tokenInfo?.decimals || holding.decimals || 9;
              
              let balance = 0;
              const rawBalance = holding.balance || holding.amount || holding.uiAmount || 0;
              
              if (holding.uiAmount !== undefined) {
                balance = holding.uiAmount;
              } else if (typeof rawBalance === 'string') {
                balance = parseFloat(rawBalance) / Math.pow(10, decimals);
              } else {
                balance = rawBalance / Math.pow(10, decimals);
              }
              
              return {
                mint,
                name: tokenInfo?.name || holding.name || holding.symbol || mint.slice(0, 8),
                symbol: tokenInfo?.symbol || holding.symbol || mint.slice(0, 4),
                decimals,
                logoURI: tokenInfo?.logoURI || holding.logoURI || holding.icon,
                balance,
              } as TokenWithBalance;
            })
            .filter((t: TokenWithBalance) => t.balance > 0);
          
          setAvailableTokens(tokensWithBalances);
        }
      } catch (err) {
        console.error("Failed to fetch holdings:", err);
      } finally {
        setIsLoadingTokens(false);
      }
    }

    fetchHoldings();
  }, [account]);

  useEffect(() => {
    async function fetchOutputToken() {
      if (!outputMint || outputMint === inputMint) return;
      try {
        const res = await fetch(`/api/tokens/search?q=${outputMint}`);
        if (res.ok) {
          const tokens = await res.json();
          if (tokens.length > 0) setOutputToken(tokens[0]);
        }
      } catch (err) {
        console.error("Failed to fetch output token:", err);
      }
    }
    fetchOutputToken();
  }, [outputMint, inputMint]);

  useEffect(() => {
    async function fetchQuote() {
      if (!inputAmount || parseFloat(inputAmount) <= 0 || !inputMint || !outputMint) {
        setOutputAmount("");
        return;
      }
      if (inputMint === outputMint) {
        setOutputAmount(inputAmount);
        return;
      }

      setIsFetchingQuote(true);
      try {
        const inputTokenInfo = availableTokens.find(t => t.mint === inputMint);
        const inputDecimals = inputTokenInfo?.decimals || 9;
        const amountInLamports = Math.floor(parseFloat(inputAmount) * Math.pow(10, inputDecimals)).toString();

        const orderRes = await fetch("/api/ultra/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inputMint,
            outputMint,
            amount: amountInLamports,
            slippageBps: 50,
          }),
        });
        if (!orderRes.ok) throw new Error("Failed to get quote");
        const orderResponse = await orderRes.json();

        if (orderResponse.outAmount) {
          const outputDecimals = outputToken?.decimals || 9;
          const outputValue = parseFloat(orderResponse.outAmount) / Math.pow(10, outputDecimals);
          setOutputAmount(outputValue.toFixed(6));
        }
      } catch (err) {
        console.error("Failed to fetch quote:", err);
      } finally {
        setIsFetchingQuote(false);
      }
    }

    const debounce = setTimeout(fetchQuote, 500);
    return () => clearTimeout(debounce);
  }, [inputAmount, inputMint, outputMint, availableTokens, outputToken]);

  const handleSwap = async () => {
    if (!isConnected || !account || !signTransaction) {
      setError("Connect wallet to swap");
      return;
    }
    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      setError("Enter an amount");
      return;
    }
    if (inputMint === outputMint) {
      setError("Select different tokens");
      return;
    }

    const inputTokenInfo = availableTokens.find(t => t.mint === inputMint);
    if (inputTokenInfo && parseFloat(inputAmount) > inputTokenInfo.balance) {
      setError(`Insufficient ${inputTokenInfo.symbol}`);
      return;
    }

    setIsSwapping(true);
    setError(null);
    setSuccess(false);

    try {
      const inputDecimals = inputTokenInfo?.decimals || 9;
      const amountInLamports = Math.floor(parseFloat(inputAmount) * Math.pow(10, inputDecimals)).toString();

      const orderRes = await fetch("/api/ultra/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputMint,
          outputMint,
          amount: amountInLamports,
          slippageBps: 50,
          taker: account,
        }),
      });
      if (!orderRes.ok) throw new Error("Failed to get order");
      const orderResponse = await orderRes.json();

      if (!orderResponse.transaction) {
        throw new Error("No transaction returned");
      }

      const transactionBytes = Buffer.from(orderResponse.transaction, 'base64');
      const transaction = VersionedTransaction.deserialize(transactionBytes);
      const signedTransaction = await signTransaction(transaction);
      const signedTransactionBase64 = Buffer.from(signedTransaction.serialize()).toString('base64');

      const executeRes = await fetch("/api/ultra/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signedTransaction: signedTransactionBase64,
          requestId: orderResponse.requestId,
        }),
      });
      if (!executeRes.ok) throw new Error("Failed to execute swap");
      const executeResponse = await executeRes.json();

      if (executeResponse.signature) {
        setSuccess(true);
        setInputAmount("");
        setOutputAmount("");
        setTimeout(() => setSuccess(false), 5000);
      } else {
        throw new Error("Transaction failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Swap failed");
    } finally {
      setIsSwapping(false);
    }
  };

  const selectedInputToken = availableTokens.find(t => t.mint === inputMint);

  return (
    <div className="space-y-4">
      {/* Input */}
      <div>
        <div className="flex items-center justify-between text-xs text-white/40 mb-2">
          <span>You pay</span>
          <span>
            Balance: {selectedInputToken?.balance?.toFixed(4) || "0"}
            {selectedInputToken && (
              <button 
                onClick={() => {
                  const max = inputMint === SOL_MINT 
                    ? Math.max(0, selectedInputToken.balance - 0.01)
                    : selectedInputToken.balance;
                  setInputAmount(max.toString());
                }}
                className="ml-2 text-[#0A84FF] hover:text-[#0A84FF]/80"
              >
                MAX
              </button>
            )}
          </span>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.04]">
          <input
            type="number"
            placeholder="0"
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            disabled={!isConnected}
            className="flex-1 min-w-0 bg-transparent text-2xl font-medium outline-none placeholder:text-white/20 tabular-nums [&::-webkit-inner-spin-button]:appearance-none"
          />
          <div className="relative shrink-0">
            <button 
              onClick={() => setShowTokenSelect(!showTokenSelect)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] transition-apple text-sm font-medium"
            >
              {selectedInputToken?.symbol || "SOL"}
            </button>
            
            {/* Token selector dropdown */}
            {showTokenSelect && (
              <div className="absolute top-full right-0 mt-2 w-48 p-2 rounded-xl bg-zinc-900 border border-white/10 max-h-48 overflow-y-auto space-y-1 z-50 shadow-xl">
                {availableTokens.map((token) => (
                  <button
                    key={token.mint}
                    onClick={() => {
                      setInputMint(token.mint);
                      setShowTokenSelect(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.06] transition-apple text-left"
                  >
                    <span className="font-medium">{token.symbol}</span>
                    <span className="text-xs text-white/40 tabular-nums">{token.balance.toFixed(4)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Swap direction */}
      <div className="flex justify-center">
        <button
          onClick={() => {
            const temp = inputMint;
            setInputMint(outputMint);
            setOutputMint(temp);
            setInputAmount(outputAmount);
            setOutputAmount(inputAmount);
          }}
          className="p-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] transition-apple"
        >
          <ArrowDown className="size-4 text-white/60" />
        </button>
      </div>

      {/* Output */}
      <div>
        <div className="text-xs text-white/40 mb-2">You receive</div>
        <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.04]">
          <div className="flex-1 text-2xl font-medium tabular-nums">
            {isFetchingQuote ? (
              <Loader2 className="size-5 animate-spin text-white/30" />
            ) : (
              <span className={outputAmount ? "" : "text-white/20"}>
                {outputAmount || "0"}
              </span>
            )}
          </div>
          <span className="text-sm font-medium text-white/60">
            {outputToken?.symbol || (outputMint === SOL_MINT ? "SOL" : outputMint.slice(0, 4))}
          </span>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <p className="text-sm text-[#FF453A] text-center">{error}</p>
      )}
      {success && (
        <p className="text-sm text-[#30D158] text-center">Swap successful ✓</p>
      )}

      {/* Button */}
      <button
        onClick={handleSwap}
        disabled={!isConnected || isSwapping || !inputAmount || parseFloat(inputAmount) <= 0}
        className={cn(
          "w-full py-4 rounded-xl font-medium transition-apple",
          isConnected && inputAmount && parseFloat(inputAmount) > 0
            ? "bg-[#0A84FF] text-white hover:bg-[#0A84FF]/90"
            : "bg-white/[0.06] text-white/30 cursor-not-allowed"
        )}
      >
        {isSwapping ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Swapping...
          </span>
        ) : !isConnected ? (
          "Connect Wallet"
        ) : !inputAmount || parseFloat(inputAmount) <= 0 ? (
          "Enter Amount"
        ) : (
          "Swap"
        )}
      </button>

      {isLoadingTokens && (
        <p className="text-xs text-white/30 text-center">Loading tokens...</p>
      )}
    </div>
  );
}
