import { NextResponse } from "next/server";
import { CFTC_CONTRACTS, COTRecord, ContractId } from "@/lib/cftc";

// Data series to screen
const DATA_SERIES = [
  { key: "mmNetAll", label: "Managed Money Net Position" },
  { key: "specNetAll", label: "Spec Net Position" },
  { key: "producerNetAll", label: "Producer Net Position" },
  { key: "swapNetAll", label: "Swap Dealer Net Position" },
  { key: "otherNetAll", label: "Other Reportables Net Position" },
  { key: "nonReptNetAll", label: "Non-Reportables Net Position" },
] as const;

// Individual contracts to screen
const CONTRACTS_TO_SCREEN: { id: string; label: string; contracts: ContractId[] }[] = [
  { id: "corn", label: "Corn", contracts: ["corn"] },
  { id: "chicago-wheat", label: "Chicago Wheat", contracts: ["chicago-wheat"] },
  { id: "kansas-wheat", label: "Kansas Wheat", contracts: ["kansas-wheat"] },
  { id: "minneapolis-wheat", label: "Minneapolis Wheat", contracts: ["minneapolis-wheat"] },
  { id: "soybeans", label: "Soybeans", contracts: ["soybeans"] },
  { id: "soymeal", label: "Soymeal", contracts: ["soymeal"] },
  { id: "soyoil", label: "Soyoil", contracts: ["soyoil"] },
  { id: "all-us-wheat", label: "All US Wheat", contracts: ["chicago-wheat", "kansas-wheat", "minneapolis-wheat"] },
  { id: "all-us-oilseeds", label: "All US Oilseeds", contracts: ["soybeans", "soymeal", "soyoil"] },
  { id: "all-us-grains", label: "All US Grains", contracts: ["corn", "chicago-wheat", "kansas-wheat", "minneapolis-wheat"] },
  { id: "all-us-go", label: "All US G&O", contracts: ["corn", "chicago-wheat", "kansas-wheat", "minneapolis-wheat", "soybeans", "soymeal", "soyoil"] },
  { id: "sugar", label: "Sugar", contracts: ["sugar"] },
  { id: "cotton", label: "Cotton", contracts: ["cotton"] },
  { id: "arabica-coffee", label: "Arabica Coffee", contracts: ["arabica-coffee"] },
  { id: "ny-cocoa", label: "NY Cocoa", contracts: ["ny-cocoa"] },
  { id: "all-us-softs", label: "All US Softs", contracts: ["sugar", "cotton", "arabica-coffee", "ny-cocoa"] },
  { id: "live-cattle", label: "Live Cattle", contracts: ["live-cattle"] },
  { id: "feeder-cattle", label: "Feeder Cattle", contracts: ["feeder-cattle"] },
  { id: "lean-hogs", label: "Lean Hogs", contracts: ["lean-hogs"] },
  { id: "all-livestock", label: "All Livestock", contracts: ["live-cattle", "feeder-cattle", "lean-hogs"] },
  { id: "oats", label: "Oats", contracts: ["oats"] },
  { id: "rough-rice", label: "Rough Rice", contracts: ["rough-rice"] },
];

interface FlaggedSeries {
  seriesKey: string;
  seriesLabel: string;
  latestValue: number;
  percentile: number;
  threshold95: number;
  threshold5: number;
  isHigh: boolean; // true = 95th percentile, false = 5th percentile
  historicalMin: number;
  historicalMax: number;
  historicalData: { date: string; value: number }[];
}

interface CommodityScreening {
  id: string;
  label: string;
  positionDate: string;
  flaggedSeries: FlaggedSeries[];
}

// Calculate percentile of a value within an array
function calculatePercentile(value: number, sortedArray: number[]): number {
  if (sortedArray.length === 0) return 0;
  let count = 0;
  for (const v of sortedArray) {
    if (v < value) count++;
  }
  return (count / sortedArray.length) * 100;
}

// Get the value at a given percentile
function getPercentileValue(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0;
  const index = Math.floor((percentile / 100) * sortedArray.length);
  return sortedArray[Math.min(index, sortedArray.length - 1)];
}

// Sum COTRecords by date
function sumRecordsByDate(datasets: COTRecord[][]): COTRecord[] {
  const byDate = new Map<string, COTRecord>();

  for (const dataset of datasets) {
    for (const rec of dataset) {
      const existing = byDate.get(rec.date);
      if (existing) {
        // Sum all numeric fields
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

  try {
    // Fetch all contract data in parallel
    const contractIds = Object.keys(CFTC_CONTRACTS) as ContractId[];
    const contractDataMap = new Map<ContractId, COTRecord[]>();

    const fetchPromises = contractIds.map(async (contractId) => {
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

    // Screen each commodity
    const results: CommodityScreening[] = [];

    for (const commodity of CONTRACTS_TO_SCREEN) {
      // Get or combine data for this commodity
      let data: COTRecord[] = [];

      if (commodity.contracts.length === 1) {
        data = contractDataMap.get(commodity.contracts[0]) || [];
      } else {
        // Combine multiple contracts
        const datasets = commodity.contracts
          .map((c) => contractDataMap.get(c))
          .filter((d): d is COTRecord[] => d !== undefined && d.length > 0);
        if (datasets.length > 0) {
          data = sumRecordsByDate(datasets);
        }
      }

      if (data.length < 10) {
        // Not enough data
        results.push({
          id: commodity.id,
          label: commodity.label,
          positionDate: "",
          flaggedSeries: [],
        });
        continue;
      }

      const latest = data[data.length - 1];
      const flaggedSeries: FlaggedSeries[] = [];

      // Screen each data series
      for (const series of DATA_SERIES) {
        const values = data.map((d) => d[series.key as keyof COTRecord] as number);
        const sortedValues = [...values].sort((a, b) => a - b);
        const latestValue = latest[series.key as keyof COTRecord] as number;

        const percentile = calculatePercentile(latestValue, sortedValues);
        const threshold95 = getPercentileValue(sortedValues, 95);
        const threshold5 = getPercentileValue(sortedValues, 5);

        // Check if in 95th percentile (high) or 5th percentile (low)
        const isHigh = percentile >= 95;
        const isLow = percentile <= 5;

        if (isHigh || isLow) {
          flaggedSeries.push({
            seriesKey: series.key,
            seriesLabel: series.label,
            latestValue,
            percentile: Math.round(percentile * 10) / 10,
            threshold95,
            threshold5,
            isHigh,
            historicalMin: sortedValues[0],
            historicalMax: sortedValues[sortedValues.length - 1],
            historicalData: data.map((d) => ({
              date: d.date,
              value: d[series.key as keyof COTRecord] as number,
            })),
          });
        }
      }

      results.push({
        id: commodity.id,
        label: commodity.label,
        positionDate: latest.date,
        flaggedSeries,
      });
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error in screening:", error);
    return NextResponse.json(
      { success: false, error: "Failed to screen data" },
      { status: 500 }
    );
  }
}
