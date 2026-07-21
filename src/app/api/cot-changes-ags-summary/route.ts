import { NextResponse } from "next/server";
import { CFTC_CONTRACTS, COTRecord, ContractId } from "@/lib/cftc";

// 14 US Ag commodities matching Excel CFTC_Changes tab
const AGS_COMMODITIES: { id: ContractId; label: string }[] = [
  { id: "corn", label: "Corn" },
  { id: "soybeans", label: "Soybeans" },
  { id: "chicago-wheat", label: "Chicago Wheat" },
  { id: "kansas-wheat", label: "Kansas Wheat" },
  { id: "minneapolis-wheat", label: "Minneapolis Wheat" },
  { id: "soyoil", label: "Soybean Oil" },
  { id: "soymeal", label: "Soybean Meal" },
  { id: "live-cattle", label: "Live Cattle" },
  { id: "lean-hogs", label: "Lean Hogs" },
  { id: "feeder-cattle", label: "Feeder Cattle" },
  { id: "sugar", label: "NY Sugar" },
  { id: "arabica-coffee", label: "NY Coffee" },
  { id: "ny-cocoa", label: "NY Cocoa" },
  { id: "cotton", label: "Cotton" },
];

interface ChangeRow {
  id: string;
  label: string;
  mmNetCurrent: number;
  mmNetPrevious: number;
  mmNetChange: number;
  zScore: number;
  positionDate: string;
  historicalChanges: { date: string; change: number }[];
  // Additional fields for summary charts
  historicalMax: number;
  historicalMin: number;
  pctHistoricalMax: number; // current as % of historical max (can be negative)
  openInterest: number;
  pctOI: number; // MM net as % of open interest
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

// Calculate weekly changes from data
function calculateWeeklyChanges(data: COTRecord[]): number[] {
  const changes: number[] = [];
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i].mmNetAll - data[i - 1].mmNetAll);
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

function calculateRow(data: COTRecord[], label: string, id: string): ChangeRow | null {
  if (data.length < 2) return null;

  const latest = data[data.length - 1];
  const previous = data[data.length - 2];

  const mmNetCurrent = latest.mmNetAll;
  const mmNetPrevious = previous.mmNetAll;
  const mmNetChange = mmNetCurrent - mmNetPrevious;

  // Calculate z-score based on all historical weekly changes
  const weeklyChanges = calculateWeeklyChanges(data);
  const zScore = calculateZScore(mmNetChange, weeklyChanges);

  // Build historical changes array for charting
  const historicalChanges: { date: string; change: number }[] = [];
  for (let i = 1; i < data.length; i++) {
    historicalChanges.push({
      date: data[i].date,
      change: data[i].mmNetAll - data[i - 1].mmNetAll,
    });
  }

  // Calculate historical max/min of MM net position
  const allMmNet = data.map(d => d.mmNetAll);
  const historicalMax = Math.max(...allMmNet);
  const historicalMin = Math.min(...allMmNet);

  // Calculate % of historical max
  // If current is positive, compare to max; if negative, compare to min
  let pctHistoricalMax: number;
  if (mmNetCurrent >= 0) {
    pctHistoricalMax = historicalMax !== 0 ? (mmNetCurrent / historicalMax) * 100 : 0;
  } else {
    pctHistoricalMax = historicalMin !== 0 ? (mmNetCurrent / historicalMin) * 100 : 0;
    // Make it negative to show it's on the short side
    pctHistoricalMax = -pctHistoricalMax;
  }

  // Open interest and % OI
  const openInterest = latest.openInterestAll;
  const pctOI = openInterest !== 0 ? (mmNetCurrent / openInterest) * 100 : 0;

  return {
    id,
    label,
    mmNetCurrent,
    mmNetPrevious,
    mmNetChange,
    zScore,
    positionDate: latest.date,
    historicalChanges,
    historicalMax,
    historicalMin,
    pctHistoricalMax,
    openInterest,
    pctOI,
  };
}

export async function GET(request: Request) {
  const baseUrl = new URL(request.url).origin;

  try {
    // Fetch data for all 14 Ag commodities
    const contractDataMap = new Map<ContractId, COTRecord[]>();

    const fetchPromises = AGS_COMMODITIES.map(async (commodity) => {
      try {
        const res = await fetch(`${baseUrl}/api/cot?contract=${commodity.id}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (json.success && json.data) {
          contractDataMap.set(commodity.id, json.data);
        }
      } catch (e) {
        console.error(`Failed to fetch ${commodity.id}:`, e);
      }
    });

    await Promise.all(fetchPromises);

    // Build rows for each commodity
    const rows: ChangeRow[] = [];
    let latestDate = "";

    for (const commodity of AGS_COMMODITIES) {
      const data = contractDataMap.get(commodity.id);
      if (!data || data.length < 2) continue;

      const row = calculateRow(data, commodity.label, commodity.id);
      if (row) {
        rows.push(row);
        if (row.positionDate > latestDate) {
          latestDate = row.positionDate;
        }
      }
    }

    return NextResponse.json({
      success: true,
      reportDate: latestDate,
      rows,
    });
  } catch (error) {
    console.error("Error in cot-changes-ags-summary:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate Ags summary data" },
      { status: 500 }
    );
  }
}
