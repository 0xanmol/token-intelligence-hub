import { NextRequest, NextResponse } from "next/server";
import { searchTokens } from "@/lib/jupiter/tokens";

/** Token search - used by swap widget and search command */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") || "";
  
  try {
    const tokens = await searchTokens(query);
    return NextResponse.json(tokens);
  } catch (error) {
    console.error("Token search error:", error);
    return NextResponse.json([]);
  }
}
