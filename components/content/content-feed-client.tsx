"use client";

import { useState, useEffect } from "react";
import { ContentCard } from "@/components/content/content-card";
import { useContentFeedParams } from "@/hooks/use-content-feed-params";
import { type TokenContent, type TokenInfo } from "@/types/jupiter";

export function ContentFeedClient() {
  const [params, setParams] = useContentFeedParams();
  const [content, setContent] = useState<TokenContent[]>([]);
  const [tokensMap, setTokensMap] = useState<Record<string, TokenInfo>>({});
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.page, params.type]);

  const fetchContent = async () => {
    setIsLoading(true);
    try {
      const page = parseInt(params.page) || 1;
      // Use API route to keep API key server-side
      const res = await fetch(`/api/content?page=${page}&type=${params.type}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const feedData = await res.json();
      setContent(feedData.data || []);
      setTokensMap(feedData.tokensMap || {});
      setHasMore(feedData.hasMore || false);
    } catch (error) {
      console.error("Failed to fetch content feed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextPage = () => {
    const currentPage = parseInt(params.page) || 1;
    setParams({ page: String(currentPage + 1) });
  };

  const handlePrevPage = () => {
    const currentPage = parseInt(params.page) || 1;
    if (currentPage > 1) {
      setParams({ page: String(currentPage - 1) });
    }
  };

  const currentPage = parseInt(params.page) || 1;

  const contentTypes = [
    { value: "all", label: "All" },
    { value: "tweet", label: "Tweets" },
    { value: "news", label: "News" },
    { value: "summary", label: "Summaries" },
  ];

  return (
    <div className="space-y-10">
      {/* Filters - Minimal pill style */}
      <div className="flex items-center gap-2">
        {contentTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => setParams({ type: type.value, page: "1" })}
            className={`px-4 py-2 rounded-full text-sm transition-apple ${
              params.type === type.value
                ? "bg-white text-black"
                : "bg-white/[0.06] text-white/60 hover:bg-white/[0.1] hover:text-white"
            }`}
          >
            {type.label}
          </button>
        ))}
        
        {!isLoading && (
          <span className="ml-4 text-sm text-white/30">
            {content.length} items
          </span>
        )}
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-white/[0.03] animate-pulse break-inside-avoid mb-4" />
          ))}
        </div>
      ) : content.length === 0 ? (
        <div className="py-20">
          <p className="text-white/30">No content available</p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4">
          {content.map((item) => (
            <div key={item.id} className="break-inside-avoid mb-4">
              <ContentCard content={item} tokenInfo={tokensMap[item.mint]} />
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-center gap-8 pt-8">
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1 || isLoading}
          className="text-sm text-white/40 hover:text-white disabled:text-white/10 disabled:cursor-not-allowed transition-apple"
        >
          Previous
        </button>
        <span className="text-sm text-white/30 tabular-nums">
          {currentPage}
        </span>
        <button
          onClick={handleNextPage}
          disabled={!hasMore || isLoading}
          className="text-sm text-white/40 hover:text-white disabled:text-white/10 disabled:cursor-not-allowed transition-apple"
        >
          Next
        </button>
      </div>
    </div>
  );
}
