import { NextRequest, NextResponse } from "next/server";
import { getPrices } from "@/lib/jupiter/price";

export async function GET(request: NextRequest) {
  const mints = request.nextUrl.searchParams.get("mints")?.split(",") || [];
  
  try {
    const prices = await getPrices(mints);
    return NextResponse.json(prices);
  } catch (error) {
    console.error("Price fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}

