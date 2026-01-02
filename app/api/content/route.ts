import { NextRequest, NextResponse } from "next/server";
import { getContentFeed } from "@/lib/jupiter/content";

/**
 * API Route: /api/content
 * 
 * Proxies content feed requests to Jupiter API.
 * This keeps the API key server-side while allowing client components
 * to fetch content with pagination and filtering.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const type = searchParams.get("type") || "all";

  try {
    const data = await getContentFeed(page, type);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Content API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch content" },
      { status: 500 }
    );
  }
}

