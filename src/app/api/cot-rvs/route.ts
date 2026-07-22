import { NextResponse } from "next/server";
import { COTRecord } from "@/lib/cftc";

// Define the spread pairs
const SPREAD_PAIRS = [
  { id: "soybeans-corn", name: "Soybeans - Corn", leg1: "soybeans", leg2: "corn" },
  { id: "soymeal-soyoil", name: "Soymeal - Soyoil", leg1: "soymeal", leg2: "soyoil" },
  { id: "kw-w", name: "Kansas Wheat - Chicago Wheat", leg1: "kansas-wheat", leg2: "chicago-wheat" },
  { id: "mw-kw", name: "Minneapolis Wheat - Kansas Wheat", leg1: "minneapolis-wheat", leg2: "kansas-wheat" },
  { id: "mw-w", name: "Minneapolis Wheat - Chicago Wheat", leg1: "minneapolis-wheat", leg2: "chicago-wheat" },
];

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

  try {
    const results: SpreadData[] = [];

    for (const pair of SPREAD_PAIRS) {
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
