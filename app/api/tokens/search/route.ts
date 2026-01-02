import { NextRequest, NextResponse } from "next/server";
import { searchTokens } from "@/lib/jupiter/tokens";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") || "";
  
  try {
    const tokens = await searchTokens(query);
    return NextResponse.json(tokens);
  } catch (error) {
    console.error("Token search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

