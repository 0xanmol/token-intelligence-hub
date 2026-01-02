/**
 * Jupiter Content API (VRFD)
 * https://dev.jup.ag/docs/tokens/v2/content
 * 
 * Access verified content for Solana tokens.
 * Content types: summaries, news, tweets, community posts.
 */

import { jupiterFetch } from "@/lib/jupiter/client";
import { type TokenContent, type TokenInfo } from "@/types/jupiter";

/** Get VRFD content for specific tokens */
export async function getContent(mints: string[]): Promise<TokenContent[]> {
  if (mints.length === 0) return [];
  
  const response = await jupiterFetch<any>(`/tokens/v2/content?mints=${mints.join(",")}`);
  
  return response.data.flatMap((tokenData: any) => 
    parseTokenContent(tokenData.mint, tokenData)
  );
}

/** Get trending "cooking" tokens with content */
export async function getCookingTokens(): Promise<any[]> {
  const response = await jupiterFetch<any>(`/tokens/v2/content/cooking`);
  
  if (Array.isArray(response)) return response;
  if (response?.data) return response.data;
  return [];
}

/** Get paginated content feed from trending tokens */
export async function getContentFeed(page = 1, type?: string) {
  const cookingData = await getCookingTokens();
  
  const allContent: TokenContent[] = [];
  const tokensMap: Record<string, TokenInfo> = {};
  
  for (const item of cookingData) {
    const mint = item.mint;
    if (!mint) continue;
    
    // Extract token info from cooking response
    if (!tokensMap[mint]) {
      tokensMap[mint] = {
        mint,
        name: item.name || item.symbol || mint.slice(0, 8),
        symbol: item.symbol || mint.slice(0, 4),
        decimals: item.decimals || 9,
        logoURI: item.logoURI || item.icon || item.image,
      };
    }
    
    // Parse all content types
    const content = parseTokenContent(mint, item);
    const filtered = type && type !== "all" 
      ? content.filter(c => c.type === type)
      : content;
    
    allContent.push(...filtered);
  }
  
  // Paginate results
  const perPage = 50;
  const start = (page - 1) * perPage;
  
  return {
    data: allContent.slice(start, start + perPage),
    hasMore: start + perPage < allContent.length,
    tokensMap,
  };
}

// --- Helpers ---

function parseTokenContent(mint: string, data: any): TokenContent[] {
  const content: TokenContent[] = [];
  
  // Regular contents (tweets, text)
  if (Array.isArray(data.contents)) {
    for (const item of data.contents) {
      const text = item.content || item.text || "";
      if (!text.trim()) continue;
      
      content.push({
        id: item.contentId || item.id || `content-${Math.random()}`,
        mint,
        type: item.contentType || item.type || "text",
        content: text,
        submittedBy: typeof item.submittedBy === "object" 
          ? item.submittedBy?.username || "unknown"
          : item.submittedBy || "unknown",
        source: item.url || item.source,
        citations: item.citations || [],
        status: "approved",
        createdAt: item.postedAt || item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString(),
      });
    }
  }
  
  // Token summary (AI-generated)
  if (data.tokenSummary) {
    const text = data.tokenSummary.summaryFull || data.tokenSummary.summaryShort || "";
    if (text.trim()) {
      content.push({
        id: `${mint}-token-summary`,
        mint,
        type: "summary",
        content: text,
        submittedBy: "jupiter",
        citations: data.tokenSummary.citations || [],
        status: "approved",
        createdAt: data.tokenSummary.updatedAt || new Date().toISOString(),
        updatedAt: data.tokenSummary.updatedAt || new Date().toISOString(),
      });
    }
  }
  
  // News summary
  if (data.newsSummary) {
    const text = data.newsSummary.summaryFull || data.newsSummary.summaryShort || "";
    if (text.trim()) {
      content.push({
        id: `${mint}-news-summary`,
        mint,
        type: "news",
        content: text,
        submittedBy: "jupiter",
        citations: data.newsSummary.citations || [],
        status: "approved",
        createdAt: data.newsSummary.updatedAt || new Date().toISOString(),
        updatedAt: data.newsSummary.updatedAt || new Date().toISOString(),
      });
    }
  }
  
  return content;
}
