import { NextRequest, NextResponse } from "next/server";
import { getOrder } from "@/lib/jupiter/ultra";

/** Get swap order/quote from Jupiter Ultra */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const order = await getOrder(body);
    return NextResponse.json(order);
  } catch (error) {
    console.error("Order error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get order" },
      { status: 500 }
    );
  }
}
