import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// In-memory cache
let dataCache: CotVsPriceData | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

interface WeeklyDataPoint {
  date: string;
  mm_net: number;
  mm_change: number;
  price: number;
  price_change: number;
  price_change_pct: number;
}

interface CommodityResult {
  id: string;
  name: string;
  sector: string;
  currentMMNet: number;
  currentPrice: number;
  latestDate: string;
  recordMaxPosition: number;
  recordMinPosition: number;
  beta: number;
  rSquared: number;
  correlation: number;
  priceToMaxLong: number;
  priceToMaxShort: number;
  contractsToMaxLong: number;
  contractsToMaxShort: number;
  weeklyData: WeeklyDataPoint[];
}

interface CotVsPriceData {
  updated: string;
  data: CommodityResult[];
}

// Sectors for filtering
const SECTOR_MAPPING: Record<string, string[]> = {
  "ags-grains": ["corn", "chicago-wheat", "kansas-wheat", "soybeans", "soymeal", "soyoil", "canola"],
  "ags-softs": ["sugar", "cotton", "arabica-coffee", "ny-cocoa"],
  "ags-livestock": ["live-cattle", "feeder-cattle", "lean-hogs"],
  "energy": ["wti-crude", "brent-crude", "natural-gas", "rbob-gasoline", "heating-oil"],
  "metals": ["gold", "silver", "copper", "platinum", "palladium"],
  "equities": ["sp500", "nasdaq100"],
  "rates": ["10y-note", "2y-note", "5y-note", "30y-bond"],
  "fx": ["eurusd", "usdjpy", "gbpusd", "audusd"],
};

async function loadData(): Promise<CotVsPriceData | null> {
  if (dataCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return dataCache;
  }

  try {
    const filePath = path.join(process.cwd(), "public", "data", "cot_vs_price.json");
    const fileContent = await fs.readFile(filePath, "utf-8");
    dataCache = JSON.parse(fileContent);
    cacheTimestamp = Date.now();
    return dataCache;
  } catch {
    // Return null if file doesn't exist
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sector = searchParams.get("sector") || "ags-grains";
  const contractId = searchParams.get("contract");

  try {
    const data = await loadData();

    if (!data) {
      return NextResponse.json({
        success: false,
        error: "COT vs Price data not available. Run export_cot_vs_price.py to generate data.",
      });
    }

    // If specific contract requested
    if (contractId) {
      const result = data.data.find(d => d.id === contractId);
      if (!result) {
        return NextResponse.json({
          success: false,
          error: "Contract not found",
        });
      }
      return NextResponse.json({
        success: true,
        updated: data.updated,
        data: [result],
      });
    }

    // Filter by sector
    const sectorContracts = SECTOR_MAPPING[sector] || [];
    const filteredData = data.data.filter(d => sectorContracts.includes(d.id));

    return NextResponse.json({
      success: true,
      updated: data.updated,
      sector,
      data: filteredData,
    });
  } catch (error) {
    console.error("Error in COT vs Price API:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to fetch data",
    });
  }
}
