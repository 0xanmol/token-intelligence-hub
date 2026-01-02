// Server-only config (NOT exposed to browser)
export const config = {
  jupiterApiKey: process.env.JUPITER_API_KEY || "",
} as const;

// Public config (safe for browser, prefixed with NEXT_PUBLIC_)
export const publicConfig = {
  solanaRpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
} as const;
