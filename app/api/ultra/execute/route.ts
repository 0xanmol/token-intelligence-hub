import { NextRequest, NextResponse } from "next/server";
import { executeOrder } from "@/lib/jupiter/ultra";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await executeOrder(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Execute error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to execute order" },
      { status: 500 }
    );
  }
}

