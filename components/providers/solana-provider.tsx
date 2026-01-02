"use client"; // JUSTIFIED: uses wallet state management

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

// Import wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css";

/**
 * useSolana Hook
 * 
 * Provides wallet connection state and methods.
 * Wraps useWallet and useConnection from wallet-adapter-react.
 */
export function useSolana() {
  const wallet = useWallet();
  const { connection } = useConnection();
  
  return {
    // Connection state
    connection,
    
    // Wallet state
    publicKey: wallet.publicKey,
    connected: wallet.connected,
    connecting: wallet.connecting,
    disconnecting: wallet.disconnecting,
    wallet: wallet.wallet,
    wallets: wallet.wallets,
    
    // Wallet address as string (for convenience)
    account: wallet.publicKey?.toBase58() || null,
    isConnected: wallet.connected,
    
    // Wallet adapter info (icon, name)
    walletIcon: wallet.wallet?.adapter.icon,
    walletName: wallet.wallet?.adapter.name,
    
    // Methods
    connect: wallet.connect,
    disconnect: wallet.disconnect,
    select: wallet.select,
    
    // Transaction methods - these are what we need for Jupiter Ultra!
    signTransaction: wallet.signTransaction,
    signAllTransactions: wallet.signAllTransactions,
    sendTransaction: wallet.sendTransaction,
  };
}

/**
 * Solana Provider Component
 * 
 * Wraps the app with Solana wallet adapter providers.
 * Provides wallet connection and RPC connection to the app.
 */
export function SolanaProvider({ children }: { children: React.ReactNode }) {
  const network = WalletAdapterNetwork.Mainnet;
  
  // Use a public RPC endpoint - you can replace with your own
  const endpoint = useMemo(() => {
    // Try to use environment variable first, fallback to public endpoint
    return process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl(network);
  }, [network]);

  // Wallet adapters - empty array uses Wallet Standard auto-detection
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
