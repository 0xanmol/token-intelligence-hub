// ============================================================
// JUPITER API TYPE DEFINITIONS
// All types match Jupiter API responses
// https://dev.jup.ag/docs
// ============================================================

// --- Tokens API ---

export interface TokenInfo {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  tags?: string[];
  organicScore?: number;
  marketCap?: number;
  holders?: number;
}

// --- Price API ---

export interface TokenPrice {
  usdPrice: number;
  decimals: number;
  blockId: number;
  priceChange24h: number;
}

export interface PricesResponse {
  [mint: string]: TokenPrice;
}

// --- Content API (VRFD) ---

export interface TokenContent {
  id: string;
  mint: string;
  type: "text" | "tweet" | "summary" | "news";
  content: string;
  submittedBy: string;
  source?: string;
  citations?: string[];
  status: "approved";
  createdAt: string;
  updatedAt: string;
}

export interface ContentResponse {
  data: TokenContent[];
  hasMore: boolean;
}

export interface CookingTokensResponse {
  data: Array<{
    mint: string;
    content: TokenContent[];
  }>;
}

// --- Portfolio API ---

export interface PortfolioElement {
  platformId: string;
  platformName?: string;
  platformImage?: string;
  type: string;
  label?: string;
  value: number;
  data: any; // Platform-specific data
}

export interface PortfolioResponse {
  date: number;
  owner: string;
  elements: PortfolioElement[];
  totalValue: number;
  duration?: number;
}
