"use client";

import { useState, useRef, useEffect } from "react";
import { useSolana } from "@/components/providers/solana-provider";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Copy, ExternalLink, LogOut, Check } from "lucide-react";

function truncateAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function WalletConnectButton() {
  const { isConnected, account, disconnect, walletIcon, walletName } = useSolana();
  const { setVisible } = useWalletModal();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const copyAddress = async () => {
    if (account) {
      await navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openExplorer = () => {
    if (account) {
      window.open(`https://solscan.io/account/${account}`, "_blank");
      setIsOpen(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setIsOpen(false);
  };

  if (!isConnected || !account) {
    return (
      <button 
        onClick={() => setVisible(true)}
        className="px-4 py-2 rounded-full bg-white text-black text-[13px] font-medium hover:bg-white/90 transition-apple"
      >
        Connect
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/[0.06] text-[13px] font-medium text-white/80 hover:bg-white/[0.1] hover:text-white transition-apple"
      >
        {walletIcon && (
          <img src={walletIcon} alt={walletName || "wallet"} className="size-4 rounded-sm" />
        )}
        <span className="font-mono">{truncateAddress(account)}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-zinc-900 border border-white/10 shadow-xl overflow-hidden z-50">
          {/* Wallet info header */}
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              {walletIcon && (
                <img src={walletIcon} alt={walletName || "wallet"} className="size-5 rounded-sm" />
              )}
              <span className="text-sm font-medium">{walletName || "Wallet"}</span>
            </div>
            <p className="text-xs text-white/40 font-mono mt-1">{truncateAddress(account)}</p>
          </div>
          
          <button
            onClick={copyAddress}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white transition-apple"
          >
            {copied ? <Check className="size-4 text-[#30D158]" /> : <Copy className="size-4" />}
            {copied ? "Copied!" : "Copy Address"}
          </button>
          <button
            onClick={openExplorer}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white transition-apple"
          >
            <ExternalLink className="size-4" />
            View on Solscan
          </button>
          <div className="border-t border-white/[0.06]" />
          <button
            onClick={handleDisconnect}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#FF453A] hover:bg-white/[0.06] transition-apple"
          >
            <LogOut className="size-4" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
