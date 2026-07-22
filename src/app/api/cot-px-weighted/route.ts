import { NextRequest, NextResponse } from "next/server";
import { CFTC_CONTRACTS, ContractId, COTRecord, AssetCategory } from "@/lib/cftc";

// Contract specifications for calculating notional value
// Format: { multiplier: contract size, priceUnit: price unit name, currency: currency }
const CONTRACT_SPECS: Record<string, { multiplier: number; priceUnit: string; currency: string; priceEstimate: number }> = {
  // Grains & Oilseeds (prices in cents/bushel, multiplier = bushels per contract)
  "corn": { multiplier: 5000, priceUnit: "c/bu", currency: "USD", priceEstimate: 450 },
  "chicago-wheat": { multiplier: 5000, priceUnit: "c/bu", currency: "USD", priceEstimate: 550 },
  "kansas-wheat": { multiplier: 5000, priceUnit: "c/bu", currency: "USD", priceEstimate: 560 },
  "minneapolis-wheat": { multiplier: 5000, priceUnit: "c/bu", currency: "USD", priceEstimate: 580 },
  "soybeans": { multiplier: 5000, priceUnit: "c/bu", currency: "USD", priceEstimate: 1050 },
  "soymeal": { multiplier: 100, priceUnit: "$/ton", currency: "USD", priceEstimate: 330 },
  "soyoil": { multiplier: 60000, priceUnit: "c/lb", currency: "USD", priceEstimate: 45 },
  "canola": { multiplier: 20, priceUnit: "CAD/MT", currency: "CAD", priceEstimate: 620 },
  "oats": { multiplier: 5000, priceUnit: "c/bu", currency: "USD", priceEstimate: 350 },
  "rough-rice": { multiplier: 2000, priceUnit: "c/cwt", currency: "USD", priceEstimate: 1700 },
  // Matif (prices in EUR/MT)
  "matif-wheat": { multiplier: 50, priceUnit: "EUR/MT", currency: "EUR", priceEstimate: 220 },
  "matif-corn": { multiplier: 50, priceUnit: "EUR/MT", currency: "EUR", priceEstimate: 200 },
  "matif-rapeseed": { multiplier: 50, priceUnit: "EUR/MT", currency: "EUR", priceEstimate: 470 },
  // Softs
  "sugar": { multiplier: 112000, priceUnit: "c/lb", currency: "USD", priceEstimate: 20 },
  "cotton": { multiplier: 50000, priceUnit: "c/lb", currency: "USD", priceEstimate: 75 },
  "arabica-coffee": { multiplier: 37500, priceUnit: "c/lb", currency: "USD", priceEstimate: 220 },
  "ny-cocoa": { multiplier: 10, priceUnit: "$/MT", currency: "USD", priceEstimate: 8000 },
  "orange-juice": { multiplier: 15000, priceUnit: "c/lb", currency: "USD", priceEstimate: 450 },
  // Livestock (prices in c/lb)
  "live-cattle": { multiplier: 40000, priceUnit: "c/lb", currency: "USD", priceEstimate: 185 },
  "feeder-cattle": { multiplier: 50000, priceUnit: "c/lb", currency: "USD", priceEstimate: 250 },
  "lean-hogs": { multiplier: 40000, priceUnit: "c/lb", currency: "USD", priceEstimate: 85 },
  // Energy
  "wti-crude": { multiplier: 1000, priceUnit: "$/bbl", currency: "USD", priceEstimate: 75 },
  "brent-crude": { multiplier: 1000, priceUnit: "$/bbl", currency: "USD", priceEstimate: 78 },
  "natural-gas": { multiplier: 10000, priceUnit: "$/MMBtu", currency: "USD", priceEstimate: 2.5 },
  "rbob-gasoline": { multiplier: 42000, priceUnit: "c/gal", currency: "USD", priceEstimate: 230 },
  "heating-oil": { multiplier: 42000, priceUnit: "c/gal", currency: "USD", priceEstimate: 240 },
  // Metals
  "gold": { multiplier: 100, priceUnit: "$/oz", currency: "USD", priceEstimate: 2350 },
  "silver": { multiplier: 5000, priceUnit: "c/oz", currency: "USD", priceEstimate: 2800 },
  "copper": { multiplier: 25000, priceUnit: "c/lb", currency: "USD", priceEstimate: 420 },
  "platinum": { multiplier: 50, priceUnit: "$/oz", currency: "USD", priceEstimate: 980 },
  "palladium": { multiplier: 100, priceUnit: "$/oz", currency: "USD", priceEstimate: 950 },
  // Equities (point value)
  "sp500": { multiplier: 50, priceUnit: "pts", currency: "USD", priceEstimate: 5500 },
  "nasdaq100": { multiplier: 20, priceUnit: "pts", currency: "USD", priceEstimate: 19500 },
  "dow": { multiplier: 5, priceUnit: "pts", currency: "USD", priceEstimate: 39000 },
  "russell2000": { multiplier: 50, priceUnit: "pts", currency: "USD", priceEstimate: 2050 },
  "vix": { multiplier: 1000, priceUnit: "pts", currency: "USD", priceEstimate: 15 },
  // Rates (face value / DV01 based)
  "2y-note": { multiplier: 2000, priceUnit: "pts", currency: "USD", priceEstimate: 102 },
  "5y-note": { multiplier: 1000, priceUnit: "pts", currency: "USD", priceEstimate: 107 },
  "10y-note": { multiplier: 1000, priceUnit: "pts", currency: "USD", priceEstimate: 110 },
  "30y-bond": { multiplier: 1000, priceUnit: "pts", currency: "USD", priceEstimate: 118 },
  "fed-funds": { multiplier: 4167, priceUnit: "pts", currency: "USD", priceEstimate: 95 },
  "sofr": { multiplier: 2500, priceUnit: "pts", currency: "USD", priceEstimate: 95 },
  // FX (notional per contract)
  "eurusd": { multiplier: 125000, priceUnit: "$/EUR", currency: "USD", priceEstimate: 1.08 },
  "usdjpy": { multiplier: 12500000, priceUnit: "$/100Y", currency: "USD", priceEstimate: 0.0065 },
  "gbpusd": { multiplier: 62500, priceUnit: "$/GBP", currency: "USD", priceEstimate: 1.27 },
  "usdcad": { multiplier: 100000, priceUnit: "$/CAD", currency: "USD", priceEstimate: 0.74 },
  "audusd": { multiplier: 100000, priceUnit: "$/AUD", currency: "USD", priceEstimate: 0.66 },
  "usdchf": { multiplier: 125000, priceUnit: "$/CHF", currency: "USD", priceEstimate: 1.12 },
  "usdmxn": { multiplier: 500000, priceUnit: "$/MXN", currency: "USD", priceEstimate: 0.058 },
  "nzdusd": { multiplier: 100000, priceUnit: "$/NZD", currency: "USD", priceEstimate: 0.61 },
  "usdzar": { multiplier: 500000, priceUnit: "$/ZAR", currency: "USD", priceEstimate: 0.055 },
  "usdbrl": { multiplier: 100000, priceUnit: "$/BRL", currency: "USD", priceEstimate: 0.18 },
  "dxy": { multiplier: 1000, priceUnit: "pts", currency: "USD", priceEstimate: 104 },
  // Crypto
  "bitcoin": { multiplier: 5, priceUnit: "$/BTC", currency: "USD", priceEstimate: 65000 },
  "ethereum": { multiplier: 50, priceUnit: "$/ETH", currency: "USD", priceEstimate: 3200 },
};

// Sector definitions
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

interface PxWeightedRow {
  id: string;
  name: string;
  category: AssetCategory;
  latestDate: string;
  mmNet: number;
  mmNetPctOI: number;
  price: number;
  priceUnit: string;
  notionalValue: number; // MM Net × Price × Multiplier (in millions)
  change: number; // WoW change in notional
  changePct: number; // % change
  recordMax: number;
  recordMin: number;
  pctMax: number;
  currency: string;
  historicalData: {
    date: string;
    mmNet: number;
    notionalValue: number;
  }[];
}

// Calculate notional value in millions
function calcNotional(mmNet: number, contractId: string): number {
  const spec = CONTRACT_SPECS[contractId];
  if (!spec) return 0;

  // Price is in the unit specified (cents, dollars, etc.)
  // For cents-based prices, divide by 100 to get dollars
  let priceInBase = spec.priceEstimate;
  if (spec.priceUnit.includes("c/")) {
    priceInBase = spec.priceEstimate / 100; // Convert cents to dollars
  }

  // Notional = contracts × price × multiplier / 1,000,000 (for millions)
  return (mmNet * priceInBase * spec.multiplier) / 1000000;
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
    const results: PxWeightedRow[] = [];

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
        const latest = data[data.length - 1];
        const previous = data.length > 1 ? data[data.length - 2] : null;

        const spec = CONTRACT_SPECS[contractId];
        if (!spec) return null;

        const mmNet = latest.mmNetAll;
        const openInterest = latest.openInterestAll || 1;
        const mmNetPctOI = (mmNet / openInterest) * 100;

        const notionalValue = calcNotional(mmNet, contractId);
        const prevNotional = previous ? calcNotional(previous.mmNetAll, contractId) : notionalValue;
        const change = notionalValue - prevNotional;
        const changePct = prevNotional !== 0 ? ((notionalValue - prevNotional) / Math.abs(prevNotional)) * 100 : 0;

        // Calculate historical notional values
        const historicalData = data.map((d) => ({
          date: d.date,
          mmNet: d.mmNetAll,
          notionalValue: calcNotional(d.mmNetAll, contractId),
        }));

        // Calculate record max/min of notional
        let recordMax = -Infinity;
        let recordMin = Infinity;
        for (const h of historicalData) {
          if (h.notionalValue > recordMax) recordMax = h.notionalValue;
          if (h.notionalValue < recordMin) recordMin = h.notionalValue;
        }

        // % of max
        const pctMax = recordMax > 0 ? (notionalValue / recordMax) * 100 : 0;

        return {
          id: contractId,
          name: contract.name,
          category: contract.category as AssetCategory,
          latestDate: latest.date,
          mmNet,
          mmNetPctOI,
          price: spec.priceEstimate,
          priceUnit: spec.priceUnit,
          notionalValue,
          change,
          changePct,
          recordMax: recordMax === -Infinity ? 0 : recordMax,
          recordMin: recordMin === Infinity ? 0 : recordMin,
          pctMax,
          currency: spec.currency,
          historicalData,
        } as PxWeightedRow;
      } catch (e) {
        console.error(`Failed to fetch ${contractId}:`, e);
        return null;
      }
    });

    const allData = await Promise.all(fetchPromises);

    for (const data of allData) {
      if (data) results.push(data);
    }

    // Sort by absolute notional value
    results.sort((a, b) => Math.abs(b.notionalValue) - Math.abs(a.notionalValue));

    // Get latest report date
    const reportDate = results.length > 0 ? results[0].latestDate : "";

    // Calculate sector totals
    const totalNotional = results.reduce((sum, r) => sum + r.notionalValue, 0);
    const totalChange = results.reduce((sum, r) => sum + r.change, 0);

    return NextResponse.json({
      success: true,
      sector,
      sectorLabel: sectorConfig.label,
      reportDate,
      totalNotional,
      totalChange,
      contracts: results,
    });
  } catch (error) {
    console.error("Error fetching px-weighted data:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to fetch data",
    });
  }
}
