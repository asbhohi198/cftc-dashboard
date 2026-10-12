import { NextResponse } from "next/server";
import { cotCache } from "../cot/route";

export async function GET() {
  // Clear the COT cache
  cotCache.clear();

  return NextResponse.json({
    success: true,
    message: "Cache cleared successfully",
    timestamp: new Date().toISOString(),
  });
}
