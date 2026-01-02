import { jupiterFetch } from "@/lib/jupiter/client";
import { type TokenContent, type CookingTokensResponse, type TokenInfo } from "@/types/jupiter";

/**
 * Jupiter Content API Client
 * 
 * Access VRFD-verified content for Solana tokens.
 * All content is curated and verified by Jupiter VRFD.
 * 
 * Content Types:
 * - Summaries: AI-generated with citations
 * - News: News summaries with sources  
 * - Tweets: Verified social media posts
 * - Text: Community-submitted content
 * 
 * API Reference: https://dev.jup.ag/docs/tokens/v2/content
 */

/**
 * Get VRFD content for specific tokens
 * 
 * Returns all verified content for the provided token mints.
 * Content includes summaries, news, tweets, and community posts.
 * 
 * @param mints - Array of token mint addresses
 * @returns Array of content items
 * 
 * @example
 * ```typescript
 * const content = await getContent(['So11111...']);
 * content.forEach(item => {
 *   console.log(`${item.type}: ${item.content}`);
 * });
 * ```
 */
export async function getContent(mints: string[]): Promise<TokenContent[]> {
  if (mints.length === 0) {
    return [];
  }
  
  const mintsParam = mints.join(",");
  const response = await jupiterFetch<any>(
    `/tokens/v2/content?mints=${mintsParam}`
  );
  
  // Response structure: { data: [{ mint, contents: [...], newsSummary, tokenSummary }] }
  const allContent: TokenContent[] = [];
  
  response.data.forEach((tokenData: any) => {
    const mint = tokenData.mint;
    
    // Add regular contents
    if (tokenData.contents && Array.isArray(tokenData.contents)) {
      tokenData.contents.forEach((item: any) => {
        allContent.push({
          id: item.contentId || item.id || `content-${Math.random()}`,
          mint: mint,
          type: item.contentType || item.type || "text",
          content: item.content || item.text || "",
          submittedBy: typeof item.submittedBy === 'object' 
            ? item.submittedBy?.username || "unknown"
            : item.submittedBy || "unknown",
          source: item.content || item.url || item.source,
          citations: item.citations || [],
          status: "approved",
          createdAt: item.postedAt || item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
        });
      });
    }
    
    // Add token summary as a content item
    if (tokenData.tokenSummary) {
      allContent.push({
        id: `${mint}-token-summary`,
        mint: mint,
        type: "summary",
        content: tokenData.tokenSummary.summaryFull || tokenData.tokenSummary.summaryShort,
        submittedBy: "jupiter",
        citations: tokenData.tokenSummary.citations || [],
        status: "approved",
        createdAt: tokenData.tokenSummary.updatedAt,
        updatedAt: tokenData.tokenSummary.updatedAt,
      });
    }
    
    // Add news summary as a content item
    if (tokenData.newsSummary) {
      allContent.push({
        id: `${mint}-news-summary`,
        mint: mint,
        type: "news",
        content: tokenData.newsSummary.summaryFull || tokenData.newsSummary.summaryShort,
        submittedBy: "jupiter",
        citations: tokenData.newsSummary.citations || [],
        status: "approved",
        createdAt: tokenData.newsSummary.updatedAt,
        updatedAt: tokenData.newsSummary.updatedAt,
      });
    }
  });
  
  return allContent;
}

/**
 * Get trending "cooking" tokens
 * 
 * Returns tokens that are currently trending on Jupiter
 * with their associated VRFD content.
 * 
 * @returns Array of trending tokens with content
 * 
 * @example
 * ```typescript
 * const trending = await getCookingTokens();
 * console.log(`${trending.length} tokens are trending`);
 * ```
 */
export async function getCookingTokens() {
  const response = await jupiterFetch<CookingTokensResponse>(
    `/tokens/v2/content/cooking`
  );
  
  if (Array.isArray(response)) return response;
  if (response && typeof response === "object" && "data" in response) return response.data;
  return [];
}

/**
 * Get content feed from trending "cooking" tokens
 * 
 * Uses the cooking endpoint which returns both content AND token metadata,
 * eliminating the need for a separate token search call.
 */
export async function getContentFeed(page: number = 1, type?: string) {
  const cookingData = await getCookingTokens();
  
  const allContent: TokenContent[] = [];
  const tokensMap: Record<string, TokenInfo> = {};
  
  cookingData.forEach((item: any) => {
    const mint = item.mint;
    
    // Extract token metadata from cooking response (no extra API call needed)
    if (mint && !tokensMap[mint]) {
      tokensMap[mint] = {
        mint,
        name: item.name || item.symbol || mint.slice(0, 8),
        symbol: item.symbol || mint.slice(0, 4),
        decimals: item.decimals || 9,
        logoURI: item.logoURI || item.icon || item.image,
      };
    }
    
    // Process contents array
    if (item.contents && Array.isArray(item.contents)) {
      item.contents.forEach((contentItem: any) => {
        const contentType = contentItem.contentType || contentItem.type || "text";
        const contentText = contentItem.content || contentItem.text || "";
        
        if ((!type || type === "all" || contentType === type) && contentText.trim()) {
          allContent.push({
            id: contentItem.contentId || contentItem.id || `content-${Math.random()}`,
            mint,
            type: contentType,
            content: contentText,
            submittedBy: typeof contentItem.submittedBy === 'object' 
              ? contentItem.submittedBy?.username || "unknown"
              : contentItem.submittedBy || "unknown",
            source: contentItem.url || contentItem.source,
            citations: contentItem.citations || [],
            status: "approved",
            createdAt: contentItem.postedAt || contentItem.createdAt || new Date().toISOString(),
            updatedAt: contentItem.updatedAt || new Date().toISOString(),
          });
        }
      });
    }
    
    // Token summary
    if (item.tokenSummary && (!type || type === "all" || type === "summary")) {
      const content = item.tokenSummary.summaryFull || item.tokenSummary.summaryShort || "";
      if (content.trim()) {
        allContent.push({
          id: `${mint}-token-summary`,
          mint,
          type: "summary",
          content,
          submittedBy: "jupiter",
          citations: item.tokenSummary.citations || [],
          status: "approved",
          createdAt: item.tokenSummary.updatedAt || new Date().toISOString(),
          updatedAt: item.tokenSummary.updatedAt || new Date().toISOString(),
        });
      }
    }
    
    // News summary
    if (item.newsSummary && (!type || type === "all" || type === "news")) {
      const content = item.newsSummary.summaryFull || item.newsSummary.summaryShort || "";
      if (content.trim()) {
        allContent.push({
          id: `${mint}-news-summary`,
          mint,
          type: "news",
          content,
          submittedBy: "jupiter",
          citations: item.newsSummary.citations || [],
          status: "approved",
          createdAt: item.newsSummary.updatedAt || new Date().toISOString(),
          updatedAt: item.newsSummary.updatedAt || new Date().toISOString(),
        });
      }
    }
  });
  
  // Paginate
  const itemsPerPage = 50;
  const startIndex = (page - 1) * itemsPerPage;
  const paginatedContent = allContent.slice(startIndex, startIndex + itemsPerPage);
  
  return {
    data: paginatedContent,
    hasMore: startIndex + itemsPerPage < allContent.length,
    tokensMap,
  };
}

