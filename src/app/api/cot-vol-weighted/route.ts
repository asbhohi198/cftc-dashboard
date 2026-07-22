import { NextRequest, NextResponse } from "next/server";
import { CFTC_CONTRACTS, ContractId, COTRecord, AssetCategory } from "@/lib/cftc";

// Sector definitions (same as px-weighted)
const SECTORS: Record<string, { label: string; contracts: ContractId[] }> = {
  "ags": {
    label: "Ags - Grains & Oilseeds",
    contracts: ["corn", "soybeans", "chicago-wheat", "kansas-wheat", "soymeal", "soyoil", "canola", "oats"],
  },
  "softs": {
    label: "Ags - Softs",
    contracts: ["sugar", "cotton", "arabica-coffee", "ny-cocoa"],
  },
  "livestock": {
    label: "Ags - Livestock",
    contracts: ["live-cattle", "feeder-cattle", "lean-hogs"],
  },
  "energy": {
    label: "Energy",
    contracts: ["wti-crude", "brent-crude", "natural-gas", "rbob-gasoline", "heating-oil"],
  },
  "metals": {
    label: "Metals",
    contracts: ["gold", "silver", "copper", "platinum", "palladium"],
  },
  "equities": {
    label: "Equities",
    contracts: ["sp500", "nasdaq100", "dow", "russell2000", "vix"],
  },
  "rates": {
    label: "Rates",
    contracts: ["2y-note", "5y-note", "10y-note", "30y-bond", "sofr"],
  },
  "fx": {
    label: "FX",
    contracts: ["eurusd", "usdjpy", "gbpusd", "usdcad", "audusd", "usdchf", "nzdusd", "dxy"],
  },
  "crypto": {
    label: "Crypto",
    contracts: ["bitcoin", "ethereum"],
  },
};

interface VolWeightedRow {
  id: string;
  name: string;
  category: AssetCategory;
  latestDate: string;
  mmNet: number;
  mmNetPctOI: number;
  volatility: number; // Rolling 52-week realized vol of MM position changes
  volAdjustedPosition: number; // MM Net / Volatility (z-score style)
  change: number; // WoW change in vol-adjusted position
  changePct: number;
  recordMax: number;
  recordMin: number;
  pctMax: number;
  historicalData: {
    date: string;
    mmNet: number;
    volAdjustedPosition: number;
  }[];
}

// Calculate rolling standard deviation (52-week = ~52 data points for weekly data)
function calcRollingVolatility(data: number[], windowSize: number = 52): number[] {
  const result: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < windowSize - 1) {
      // Not enough data for full window, use available data
      const window = data.slice(0, i + 1);
      if (window.length < 2) {
        result.push(0);
        continue;
      }
      const mean = window.reduce((a, b) => a + b, 0) / window.length;
      const variance = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;
      result.push(Math.sqrt(variance));
    } else {
      const window = data.slice(i - windowSize + 1, i + 1);
      const mean = window.reduce((a, b) => a + b, 0) / window.length;
      const variance = window.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / window.length;
      result.push(Math.sqrt(variance));
    }
  }

  return result;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sector = searchParams.get("sector") || "ags";
  const baseUrl = new URL(request.url).origin;

  const sectorConfig = SECTORS[sector];
  if (!sectorConfig) {
    return NextResponse.json({
      success: false,
      error: `Invalid sector: ${sector}`,
    });
  }

  try {
    const results: VolWeightedRow[] = [];

    // Fetch COT data for each contract in parallel
    const fetchPromises = sectorConfig.contracts.map(async (contractId) => {
      const contract = CFTC_CONTRACTS[contractId];
      if (!contract) return null;

      try {
        // Use matif-cot endpoint for Matif contracts
        const isMatif = contractId.startsWith("matif-");
        const endpoint = isMatif
          ? `${baseUrl}/api/matif-cot?contract=${contractId}&format=cot`
          : `${baseUrl}/api/cot?contract=${contractId}`;

        const res = await fetch(endpoint, { cache: "no-store" });
        const json = await res.json();

        if (!json.success || !json.data || json.data.length === 0) {
          return null;
        }

        const data: COTRecord[] = json.data;

        // Extract MM net positions
        const mmNetValues = data.map(d => d.mmNetAll);

        // Calculate weekly changes for volatility calculation
        const weeklyChanges: number[] = [];
        for (let i = 1; i < mmNetValues.length; i++) {
          weeklyChanges.push(mmNetValues[i] - mmNetValues[i - 1]);
        }

        // Calculate rolling 52-week volatility of changes
        const rollingVol = calcRollingVolatility(weeklyChanges, 52);

        // Pad the beginning (first value has no change)
        const fullRollingVol = [rollingVol[0] || 1, ...rollingVol];

        // Calculate vol-adjusted positions (z-score: position / volatility)
        const volAdjustedPositions = mmNetValues.map((mmNet, i) => {
          const vol = fullRollingVol[i] || 1;
          // Avoid division by zero - use a minimum volatility floor
          const effectiveVol = Math.max(vol, Math.abs(mmNet) * 0.01 || 1);
          return mmNet / effectiveVol;
        });

        const latest = data[data.length - 1];
        const previous = data.length > 1 ? data[data.length - 2] : null;

        const latestVolAdj = volAdjustedPositions[volAdjustedPositions.length - 1];
        const prevVolAdj = volAdjustedPositions.length > 1 ? volAdjustedPositions[volAdjustedPositions.length - 2] : latestVolAdj;

        const mmNet = latest.mmNetAll;
        const openInterest = latest.openInterestAll || 1;
        const mmNetPctOI = (mmNet / openInterest) * 100;
        const volatility = fullRollingVol[fullRollingVol.length - 1];

        const change = latestVolAdj - prevVolAdj;
        const changePct = prevVolAdj !== 0 ? ((latestVolAdj - prevVolAdj) / Math.abs(prevVolAdj)) * 100 : 0;

        // Calculate historical vol-adjusted data
        const historicalData = data.map((d, i) => ({
          date: d.date,
          mmNet: d.mmNetAll,
          volAdjustedPosition: volAdjustedPositions[i],
        }));

        // Calculate record max/min of vol-adjusted position
        let recordMax = -Infinity;
        let recordMin = Infinity;
        for (const volAdj of volAdjustedPositions) {
          if (volAdj > recordMax) recordMax = volAdj;
          if (volAdj < recordMin) recordMin = volAdj;
        }

        // % of max
        const pctMax = recordMax > 0 ? (latestVolAdj / recordMax) * 100 : 0;

        return {
          id: contractId,
          name: contract.name,
          category: contract.category as AssetCategory,
          latestDate: latest.date,
          mmNet,
          mmNetPctOI,
          volatility,
          volAdjustedPosition: latestVolAdj,
          change,
          changePct,
          recordMax: recordMax === -Infinity ? 0 : recordMax,
          recordMin: recordMin === Infinity ? 0 : recordMin,
          pctMax,
          historicalData,
        } as VolWeightedRow;
      } catch (e) {
        console.error(`Failed to fetch ${contractId}:`, e);
        return null;
      }
    });

    const allData = await Promise.all(fetchPromises);

    for (const data of allData) {
      if (data) results.push(data);
    }

    // Sort by absolute vol-adjusted position
    results.sort((a, b) => Math.abs(b.volAdjustedPosition) - Math.abs(a.volAdjustedPosition));

    // Get latest report date
    const reportDate = results.length > 0 ? results[0].latestDate : "";

    // Calculate sector totals
    const totalVolAdj = results.reduce((sum, r) => sum + r.volAdjustedPosition, 0);
    const totalChange = results.reduce((sum, r) => sum + r.change, 0);

    return NextResponse.json({
      success: true,
      sector,
      sectorLabel: sectorConfig.label,
      reportDate,
      totalVolAdj,
      totalChange,
      contracts: results,
    });
  } catch (error) {
    console.error("Error fetching vol-weighted data:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to fetch data",
    });
  }
}
