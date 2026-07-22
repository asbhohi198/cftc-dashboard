import { NextResponse } from "next/server";
import { COTRecord } from "@/lib/cftc";

// Define spread pairs by sector
const SPREAD_PAIRS_BY_SECTOR: Record<string, { id: string; name: string; leg1: string; leg2: string }[]> = {
  ags: [
    { id: "soybeans-corn", name: "Soybeans - Corn", leg1: "soybeans", leg2: "corn" },
    { id: "soymeal-soyoil", name: "Soymeal - Soyoil", leg1: "soymeal", leg2: "soyoil" },
    { id: "kw-w", name: "Kansas Wheat - Chicago Wheat", leg1: "kansas-wheat", leg2: "chicago-wheat" },
    { id: "mw-kw", name: "Minneapolis Wheat - Kansas Wheat", leg1: "minneapolis-wheat", leg2: "kansas-wheat" },
    { id: "mw-w", name: "Minneapolis Wheat - Chicago Wheat", leg1: "minneapolis-wheat", leg2: "chicago-wheat" },
    { id: "lc-fc", name: "Live Cattle - Feeder Cattle", leg1: "live-cattle", leg2: "feeder-cattle" },
    { id: "lc-lh", name: "Live Cattle - Lean Hogs", leg1: "live-cattle", leg2: "lean-hogs" },
  ],
  energy: [
    { id: "wti-brent", name: "WTI Crude - Brent Crude", leg1: "wti-crude", leg2: "brent-crude" },
    { id: "rbob-ho", name: "RBOB Gasoline - Heating Oil", leg1: "rbob-gasoline", leg2: "heating-oil" },
  ],
  metals: [
    { id: "gold-silver", name: "Gold - Silver", leg1: "gold", leg2: "silver" },
    { id: "platinum-palladium", name: "Platinum - Palladium", leg1: "platinum", leg2: "palladium" },
    { id: "gold-copper", name: "Gold - Copper", leg1: "gold", leg2: "copper" },
  ],
  equities: [
    { id: "sp500-nasdaq", name: "S&P 500 - Nasdaq 100", leg1: "sp500", leg2: "nasdaq100" },
    { id: "sp500-russell", name: "S&P 500 - Russell 2000", leg1: "sp500", leg2: "russell2000" },
    { id: "dow-sp500", name: "Dow Jones - S&P 500", leg1: "dow", leg2: "sp500" },
  ],
  rates: [
    { id: "10y-2y", name: "10-Year - 2-Year", leg1: "10y-note", leg2: "2y-note" },
    { id: "30y-10y", name: "30-Year - 10-Year", leg1: "30y-bond", leg2: "10y-note" },
    { id: "5y-2y", name: "5-Year - 2-Year", leg1: "5y-note", leg2: "2y-note" },
  ],
  fx: [
    { id: "eurusd-gbpusd", name: "EUR/USD - GBP/USD", leg1: "eurusd", leg2: "gbpusd" },
    { id: "audusd-nzdusd", name: "AUD/USD - NZD/USD", leg1: "audusd", leg2: "nzdusd" },
    { id: "usdcad-usdmxn", name: "USD/CAD - USD/MXN", leg1: "usdcad", leg2: "usdmxn" },
  ],
};

interface SpreadDataPoint {
  date: string;
  mmNetSpread: number;
  leg1MmNet: number;
  leg2MmNet: number;
}

interface SpreadData {
  id: string;
  name: string;
  data: SpreadDataPoint[];
  latestSpread: number;
  spreadChange: number;
}

export async function GET(request: Request) {
  const baseUrl = new URL(request.url).origin;
  const { searchParams } = new URL(request.url);
  const sector = searchParams.get("sector") || "ags";

  const spreadPairs = SPREAD_PAIRS_BY_SECTOR[sector] || SPREAD_PAIRS_BY_SECTOR.ags;

  try {
    const results: SpreadData[] = [];

    for (const pair of spreadPairs) {
      // Fetch data for both legs
      const [leg1Res, leg2Res] = await Promise.all([
        fetch(`${baseUrl}/api/cot?contract=${pair.leg1}`, { cache: "no-store" }),
        fetch(`${baseUrl}/api/cot?contract=${pair.leg2}`, { cache: "no-store" }),
      ]);

      const leg1Json = await leg1Res.json();
      const leg2Json = await leg2Res.json();

      if (!leg1Json.success || !leg2Json.success) {
        console.error(`Failed to fetch data for ${pair.name}`);
        continue;
      }

      const leg1Data: COTRecord[] = leg1Json.data;
      const leg2Data: COTRecord[] = leg2Json.data;

      // Create a map of leg2 data by date for easy lookup
      const leg2Map = new Map<string, COTRecord>();
      for (const rec of leg2Data) {
        leg2Map.set(rec.date, rec);
      }

      // Calculate spread for each date where both legs have data
      const spreadData: SpreadDataPoint[] = [];
      for (const leg1Rec of leg1Data) {
        const leg2Rec = leg2Map.get(leg1Rec.date);
        if (leg2Rec) {
          spreadData.push({
            date: leg1Rec.date,
            mmNetSpread: leg1Rec.mmNetAll - leg2Rec.mmNetAll,
            leg1MmNet: leg1Rec.mmNetAll,
            leg2MmNet: leg2Rec.mmNetAll,
          });
        }
      }

      // Sort by date
      spreadData.sort((a, b) => a.date.localeCompare(b.date));

      // Calculate latest spread and change
      const latestSpread = spreadData.length > 0 ? spreadData[spreadData.length - 1].mmNetSpread : 0;
      const previousSpread = spreadData.length > 1 ? spreadData[spreadData.length - 2].mmNetSpread : 0;
      const spreadChange = latestSpread - previousSpread;

      results.push({
        id: pair.id,
        name: pair.name,
        data: spreadData,
        latestSpread,
        spreadChange,
      });
    }

    return NextResponse.json({
      success: true,
      spreads: results,
    });
  } catch (error) {
    console.error("Error in cot-rvs:", error);
    return NextResponse.json(
      { success: false, error: "Failed to calculate MM spreads" },
      { status: 500 }
    );
  }
}
