import { NextRequest, NextResponse } from "next/server";
import { getPositions } from "@/lib/jupiter/portfolio";

export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get("wallet");
  
  if (!wallet) {
    return NextResponse.json({ error: "Wallet required" }, { status: 400 });
  }
  
  try {
    const positions = await getPositions(wallet);
    return NextResponse.json(positions);
  } catch (error) {
    console.error("Portfolio error:", error);
    return NextResponse.json({ error: "Failed to fetch portfolio" }, { status: 500 });
  }
}

