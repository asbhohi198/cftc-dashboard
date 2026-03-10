import { NextResponse } from "next/server";
import { CFTC_CONTRACTS, COTRecord, ContractId, ReportType } from "@/lib/cftc";

type AssetCategory = "ags-grains" | "ags-softs" | "ags-livestock" | "ags-other" | "energy" | "metals" | "equities" | "rates" | "fx" | "crypto";

// Commodities organized by sector for COT Changes
const SECTOR_COMMODITIES: Record<AssetCategory, { id: ContractId; label: string }[]> = {
  "ags-grains": [
    { id: "corn", label: "Corn" },
    { id: "chicago-wheat", label: "Chicago Wheat" },
    { id: "kansas-wheat", label: "Kansas Wheat" },
    { id: "minneapolis-wheat", label: "Minneapolis Wheat" },
    { id: "soybeans", label: "Soybeans" },
    { id: "soymeal", label: "Soybean Meal" },
    { id: "soyoil", label: "Soybean Oil" },
  ],
  "ags-softs": [
    { id: "sugar", label: "Sugar" },
    { id: "cotton", label: "Cotton" },
    { id: "arabica-coffee", label: "Coffee" },
    { id: "ny-cocoa", label: "Cocoa" },
    { id: "orange-juice", label: "Orange Juice" },
  ],
  "ags-livestock": [
    { id: "live-cattle", label: "Live Cattle" },
    { id: "feeder-cattle", label: "Feeder Cattle" },
    { id: "lean-hogs", label: "Lean Hogs" },
  ],
  "ags-other": [
    { id: "oats", label: "Oats" },
    { id: "rough-rice", label: "Rough Rice" },
    { id: "lumber", label: "Lumber" },
    { id: "milk", label: "Class III Milk" },
  ],
  energy: [
    { id: "wti-crude", label: "WTI Crude" },
    { id: "brent-crude", label: "Brent Crude" },
    { id: "natural-gas", label: "Natural Gas" },
    { id: "rbob-gasoline", label: "RBOB Gasoline" },
    { id: "heating-oil", label: "Heating Oil" },
  ],
  metals: [
    { id: "gold", label: "Gold" },
    { id: "silver", label: "Silver" },
    { id: "copper", label: "Copper" },
    { id: "platinum", label: "Platinum" },
    { id: "palladium", label: "Palladium" },
  ],
  equities: [
    { id: "sp500", label: "S&P 500" },
    { id: "nasdaq100", label: "Nasdaq 100" },
    { id: "dow", label: "Dow Jones" },
    { id: "russell2000", label: "Russell 2000" },
    { id: "vix", label: "VIX" },
  ],
  rates: [
    { id: "2y-note", label: "2-Year Note" },
    { id: "5y-note", label: "5-Year Note" },
    { id: "10y-note", label: "10-Year Note" },
    { id: "30y-bond", label: "30-Year Bond" },
    { id: "fed-funds", label: "Fed Funds" },
    { id: "sofr", label: "SOFR" },
  ],
  fx: [
    { id: "eurusd", label: "EUR/USD" },
    { id: "usdjpy", label: "USD/JPY" },
    { id: "gbpusd", label: "GBP/USD" },
    { id: "usdcad", label: "USD/CAD" },
    { id: "audusd", label: "AUD/USD" },
    { id: "usdchf", label: "USD/CHF" },
    { id: "usdmxn", label: "USD/MXN" },
    { id: "nzdusd", label: "NZD/USD" },
    { id: "usdzar", label: "USD/ZAR" },
    { id: "usdbrl", label: "USD/BRL" },
    { id: "dxy", label: "DXY Index" },
  ],
  crypto: [
    { id: "bitcoin", label: "Bitcoin" },
    { id: "ethereum", label: "Ethereum" },
  ],
};

// Aggregate groups for each sector
const SECTOR_AGGREGATES: Record<AssetCategory, { id: string; label: string; contracts: ContractId[] }[]> = {
  "ags-grains": [
    { id: "all-us-wheat", label: "All US Wheat", contracts: ["chicago-wheat", "kansas-wheat", "minneapolis-wheat"] },
    { id: "all-us-grains", label: "All US Grains", contracts: ["corn", "chicago-wheat", "kansas-wheat", "minneapolis-wheat"] },
    { id: "all-us-oilseeds", label: "All US Oilseeds", contracts: ["soybeans", "soymeal", "soyoil"] },
    { id: "all-us-go", label: "All US G&O", contracts: ["corn", "chicago-wheat", "kansas-wheat", "minneapolis-wheat", "soybeans", "soymeal", "soyoil"] },
  ],
  "ags-softs": [
    { id: "all-us-softs", label: "All US Softs", contracts: ["sugar", "cotton", "arabica-coffee", "ny-cocoa"] },
  ],
  "ags-livestock": [
    { id: "all-livestock", label: "All Livestock", contracts: ["live-cattle", "feeder-cattle", "lean-hogs"] },
  ],
  "ags-other": [],
  energy: [],
  metals: [],
  equities: [],
  rates: [],
  fx: [],
  crypto: [],
};

const SECTOR_LABELS: Record<AssetCategory, string> = {
  "ags-grains": "Ags - Grains & Oilseeds",
  "ags-softs": "Ags - Softs",
  "ags-livestock": "Ags - Livestock",
  "ags-other": "Ags - Other",
  energy: "Energy",
  metals: "Metals",
  equities: "Equities",
  rates: "Rates",
  fx: "FX",
  crypto: "Crypto",
};

interface ChangeRow {
  id: string;
  label: string;
  isAggregate: boolean;
  mmNetCurrent: number;
  mmNetPrevious: number;
  // 1-week change
  mmNetChange: number;
  zScore1w: number;
  // 2-week change
  mmNetChange2w: number;
  zScore2w: number;
  // 3-week change
  mmNetChange3w: number;
  zScore3w: number;
  positionDate: string;
  // Historical weekly changes for charting
  historicalChanges: { date: string; change: number }[];
}

interface SectorData {
  sector: AssetCategory;
  label: string;
  reportType: ReportType;
  rows: ChangeRow[];
}

// Calculate standard deviation
function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

// Calculate mean
function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Calculate weekly changes
function calculateWeeklyChanges(data: COTRecord[]): number[] {
  const changes: number[] = [];
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i].mmNetAll - data[i - 1].mmNetAll);
  }
  return changes;
}

// Calculate N-week changes (change from N weeks ago to now)
function calculateNWeekChanges(data: COTRecord[], n: number): number[] {
  const changes: number[] = [];
  for (let i = n; i < data.length; i++) {
    changes.push(data[i].mmNetAll - data[i - n].mmNetAll);
  }
  return changes;
}

// Calculate z-score for a value given an array
function calculateZScore(value: number, values: number[]): number {
  const mean = calculateMean(values);
  const stdDev = calculateStdDev(values);
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

function calculateRow(data: COTRecord[], label: string, id: string, isAggregate: boolean): ChangeRow | null {
  if (data.length < 4) return null; // Need at least 4 data points for 3-week change

  const latest = data[data.length - 1];
  const previous = data[data.length - 2];
  const twoWeeksAgo = data[data.length - 3];
  const threeWeeksAgo = data[data.length - 4];

  const mmNetCurrent = latest.mmNetAll;
  const mmNetPrevious = previous.mmNetAll;

  // 1-week change
  const mmNetChange = mmNetCurrent - mmNetPrevious;
  const weeklyChanges = calculateWeeklyChanges(data);
  const zScore1w = calculateZScore(mmNetChange, weeklyChanges);

  // 2-week change
  const mmNetChange2w = mmNetCurrent - twoWeeksAgo.mmNetAll;
  const twoWeekChanges = calculateNWeekChanges(data, 2);
  const zScore2w = calculateZScore(mmNetChange2w, twoWeekChanges);

  // 3-week change
  const mmNetChange3w = mmNetCurrent - threeWeeksAgo.mmNetAll;
  const threeWeekChanges = calculateNWeekChanges(data, 3);
  const zScore3w = calculateZScore(mmNetChange3w, threeWeekChanges);

  // Get ALL historical weekly changes for charting
  const allChanges: { date: string; change: number }[] = [];
  for (let i = 1; i < data.length; i++) {
    allChanges.push({
      date: data[i].date,
      change: data[i].mmNetAll - data[i - 1].mmNetAll,
    });
  }

  return {
    id,
    label,
    isAggregate,
    mmNetCurrent,
    mmNetPrevious,
    mmNetChange,
    zScore1w,
    mmNetChange2w,
    zScore2w,
    mmNetChange3w,
    zScore3w,
    positionDate: latest.date,
    historicalChanges: allChanges,
  };
}

// Sum multiple COTRecord arrays by date
function sumRecordsByDate(datasets: COTRecord[][]): COTRecord[] {
  const byDate = new Map<string, COTRecord>();

  for (const dataset of datasets) {
    for (const rec of dataset) {
      const existing = byDate.get(rec.date);
      if (existing) {
        const summed: COTRecord = { ...existing };
        for (const key of Object.keys(rec) as (keyof COTRecord)[]) {
          if (key !== "date" && typeof rec[key] === "number") {
            (summed[key] as number) = (existing[key] as number) + (rec[key] as number);
          }
        }
        byDate.set(rec.date, summed);
      } else {
        byDate.set(rec.date, { ...rec });
      }
    }
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function GET(request: Request) {
  const baseUrl = new URL(request.url).origin;
  const { searchParams } = new URL(request.url);
  const sectorParam = searchParams.get("sector") as AssetCategory | null;

  try {
    // Determine which sectors to fetch
    const sectorsToFetch: AssetCategory[] = sectorParam
      ? [sectorParam]
      : Object.keys(SECTOR_COMMODITIES) as AssetCategory[];

    // Collect all contract IDs we need
    const allContractIds = new Set<ContractId>();
    for (const sector of sectorsToFetch) {
      for (const commodity of SECTOR_COMMODITIES[sector]) {
        allContractIds.add(commodity.id);
      }
      for (const aggregate of SECTOR_AGGREGATES[sector]) {
        for (const contractId of aggregate.contracts) {
          allContractIds.add(contractId);
        }
      }
    }

    // Fetch all contract data
    const contractDataMap = new Map<ContractId, COTRecord[]>();

    const fetchPromises = Array.from(allContractIds).map(async (contractId) => {
      try {
        const res = await fetch(`${baseUrl}/api/cot?contract=${contractId}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (json.success && json.data) {
          contractDataMap.set(contractId, json.data);
        }
      } catch (e) {
        console.error(`Failed to fetch ${contractId}:`, e);
      }
    });

    await Promise.all(fetchPromises);

    // Build sector data
    const sectors: SectorData[] = [];

    for (const sector of sectorsToFetch) {
      const commodities = SECTOR_COMMODITIES[sector];
      const aggregates = SECTOR_AGGREGATES[sector];
      const rows: ChangeRow[] = [];

      // Determine report type from first commodity
      const firstContract = commodities[0]?.id;
      const reportType = firstContract ? CFTC_CONTRACTS[firstContract].reportType : "disagg";

      // Individual commodities
      for (const commodity of commodities) {
        const data = contractDataMap.get(commodity.id);
        if (!data || data.length < 2) continue;

        const row = calculateRow(data, commodity.label, commodity.id, false);
        if (row) {
          rows.push(row);
        }
      }

      // Aggregate groups
      for (const group of aggregates) {
        const datasets = group.contracts
          .map((c) => contractDataMap.get(c))
          .filter((d): d is COTRecord[] => d !== undefined && d.length > 0);

        if (datasets.length > 0) {
          const combinedData = sumRecordsByDate(datasets);
          const row = calculateRow(combinedData, group.label, group.id, true);
          if (row) {
            rows.push(row);
          }
        }
      }

      if (rows.length > 0) {
        sectors.push({
          sector,
          label: SECTOR_LABELS[sector],
          reportType,
          rows,
        });
      }
    }

    // Get latest position date
    let latestDate = "";
    for (const sector of sectors) {
      for (const row of sector.rows) {
        if (row.positionDate > latestDate) {
          latestDate = row.positionDate;
        }
      }
    }

    return NextResponse.json({
      success: true,
      positionDate: latestDate,
      sectors,
    });
  } catch (error) {
    console.error("Error in cot-changes:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate COT changes data" },
      { status: 500 }
    );
  }
}
