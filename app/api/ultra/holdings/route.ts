import { NextRequest, NextResponse } from "next/server";
import { getHoldings } from "@/lib/jupiter/ultra";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");
  
  if (!wallet) {
    return NextResponse.json({ error: "Wallet required" }, { status: 400 });
  }
  
  try {
    const holdings = await getHoldings(wallet);
    return NextResponse.json(holdings);
  } catch (error) {
    console.error("Holdings error:", error);
    return NextResponse.json({ error: "Failed to fetch holdings" }, { status: 500 });
  }
}

