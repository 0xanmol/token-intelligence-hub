import { NextRequest, NextResponse } from "next/server";
import { getHoldings } from "@/lib/jupiter/ultra";

/** Get wallet token holdings for swap widget */
export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");
  
  if (!wallet) {
    return NextResponse.json({ error: "Wallet required" }, { status: 400 });
  }
  
  try {
    const holdings = await getHoldings(wallet);
    // Log for debugging balance issues
    console.log("Holdings for", wallet.slice(0, 8) + "...", JSON.stringify(holdings, null, 2).slice(0, 500));
    return NextResponse.json(holdings);
  } catch (error) {
    console.error("Holdings error:", error);
    return NextResponse.json({ error: "Failed to fetch holdings" }, { status: 500 });
  }
}
