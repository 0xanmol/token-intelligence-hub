"use client";

import React, { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
  useConnection,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";

import "@solana/wallet-adapter-react-ui/styles.css";

/** Convenience hook for wallet state and methods */
export function useSolana() {
  const wallet = useWallet();
  const { connection } = useConnection();
  
  return {
    connection,
    
    // Wallet state
    isConnected: wallet.connected,
    account: wallet.publicKey?.toBase58() || null,
    wallet: wallet.wallet,
    
    // Wallet adapter info
    walletIcon: wallet.wallet?.adapter.icon,
    walletName: wallet.wallet?.adapter.name,
    
    // Methods
    disconnect: wallet.disconnect,
    signTransaction: wallet.signTransaction,
  };
}

/** Wallet providers wrapper */
export function SolanaProvider({ children }: { children: React.ReactNode }) {
  const network = WalletAdapterNetwork.Mainnet;
  
  const endpoint = useMemo(
    () => process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl(network),
    [network]
  );

  // Empty array = use Wallet Standard auto-detection
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
