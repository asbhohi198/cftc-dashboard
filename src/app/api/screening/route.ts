import { NextResponse } from "next/server";
import { CFTC_CONTRACTS, COTRecord, ContractId, AssetCategory } from "@/lib/cftc";

// Data series to screen - net positions
const NET_SERIES = [
  { key: "mmNetAll", label: "Managed Money Net Position" },
  { key: "specNetAll", label: "Spec Net Position" },
  { key: "producerNetAll", label: "Producer Net Position" },
  { key: "swapNetAll", label: "Swap Dealer Net Position" },
  { key: "otherNetAll", label: "Other Reportables Net Position" },
  { key: "nonReptNetAll", label: "Non-Reportables Net Position" },
] as const;

// Data series to screen - % of OI (calculated)
const PCT_OI_SERIES = [
  { netKey: "mmNetAll", label: "Managed Money % OI" },
  { netKey: "specNetAll", label: "Spec % OI" },
  { netKey: "producerNetAll", label: "Producer % OI" },
  { netKey: "swapNetAll", label: "Swap Dealer % OI" },
  { netKey: "otherNetAll", label: "Other Reportables % OI" },
  { netKey: "nonReptNetAll", label: "Non-Reportables % OI" },
] as const;

// Individual contracts to screen
const CONTRACTS_TO_SCREEN: { id: string; label: string; contracts: ContractId[]; category: AssetCategory }[] = [
  // Ags - Grains & Oilseeds
  { id: "corn", label: "Corn", contracts: ["corn"], category: "ags" },
  { id: "chicago-wheat", label: "Chicago Wheat", contracts: ["chicago-wheat"], category: "ags" },
  { id: "kansas-wheat", label: "Kansas Wheat", contracts: ["kansas-wheat"], category: "ags" },
  { id: "minneapolis-wheat", label: "Minneapolis Wheat", contracts: ["minneapolis-wheat"], category: "ags" },
  { id: "soybeans", label: "Soybeans", contracts: ["soybeans"], category: "ags" },
  { id: "soymeal", label: "Soymeal", contracts: ["soymeal"], category: "ags" },
  { id: "soyoil", label: "Soyoil", contracts: ["soyoil"], category: "ags" },
  { id: "all-us-wheat", label: "All US Wheat", contracts: ["chicago-wheat", "kansas-wheat", "minneapolis-wheat"], category: "ags" },
  { id: "all-us-oilseeds", label: "All US Oilseeds", contracts: ["soybeans", "soymeal", "soyoil"], category: "ags" },
  { id: "all-us-grains", label: "All US Grains", contracts: ["corn", "chicago-wheat", "kansas-wheat", "minneapolis-wheat"], category: "ags" },
  { id: "all-us-go", label: "All US G&O", contracts: ["corn", "chicago-wheat", "kansas-wheat", "minneapolis-wheat", "soybeans", "soymeal", "soyoil"], category: "ags" },
  // Ags - Softs
  { id: "sugar", label: "Sugar", contracts: ["sugar"], category: "ags" },
  { id: "cotton", label: "Cotton", contracts: ["cotton"], category: "ags" },
  { id: "arabica-coffee", label: "Arabica Coffee", contracts: ["arabica-coffee"], category: "ags" },
  { id: "ny-cocoa", label: "NY Cocoa", contracts: ["ny-cocoa"], category: "ags" },
  { id: "all-us-softs", label: "All US Softs", contracts: ["sugar", "cotton", "arabica-coffee", "ny-cocoa"], category: "ags" },
  // Ags - Livestock
  { id: "live-cattle", label: "Live Cattle", contracts: ["live-cattle"], category: "ags" },
  { id: "feeder-cattle", label: "Feeder Cattle", contracts: ["feeder-cattle"], category: "ags" },
  { id: "lean-hogs", label: "Lean Hogs", contracts: ["lean-hogs"], category: "ags" },
  { id: "all-livestock", label: "All Livestock", contracts: ["live-cattle", "feeder-cattle", "lean-hogs"], category: "ags" },
  // Ags - Other
  { id: "oats", label: "Oats", contracts: ["oats"], category: "ags" },
  { id: "rough-rice", label: "Rough Rice", contracts: ["rough-rice"], category: "ags" },
  { id: "orange-juice", label: "Orange Juice", contracts: ["orange-juice"], category: "ags" },
  { id: "lumber", label: "Lumber", contracts: ["lumber"], category: "ags" },
  { id: "milk", label: "Class III Milk", contracts: ["milk"], category: "ags" },
  // Energy
  { id: "wti-crude", label: "WTI Crude Oil", contracts: ["wti-crude"], category: "energy" },
  { id: "brent-crude", label: "Brent Crude Oil", contracts: ["brent-crude"], category: "energy" },
  { id: "natural-gas", label: "Natural Gas", contracts: ["natural-gas"], category: "energy" },
  { id: "rbob-gasoline", label: "RBOB Gasoline", contracts: ["rbob-gasoline"], category: "energy" },
  { id: "heating-oil", label: "Heating Oil", contracts: ["heating-oil"], category: "energy" },
  // Metals
  { id: "gold", label: "Gold", contracts: ["gold"], category: "metals" },
  { id: "silver", label: "Silver", contracts: ["silver"], category: "metals" },
  { id: "copper", label: "Copper", contracts: ["copper"], category: "metals" },
  { id: "platinum", label: "Platinum", contracts: ["platinum"], category: "metals" },
  { id: "palladium", label: "Palladium", contracts: ["palladium"], category: "metals" },
  // Equities
  { id: "sp500", label: "S&P 500", contracts: ["sp500"], category: "equities" },
  { id: "nasdaq100", label: "Nasdaq 100", contracts: ["nasdaq100"], category: "equities" },
  { id: "dow", label: "Dow Jones", contracts: ["dow"], category: "equities" },
  { id: "russell2000", label: "Russell 2000", contracts: ["russell2000"], category: "equities" },
  { id: "vix", label: "VIX", contracts: ["vix"], category: "equities" },
  // Rates
  { id: "2y-note", label: "2-Year Note", contracts: ["2y-note"], category: "rates" },
  { id: "5y-note", label: "5-Year Note", contracts: ["5y-note"], category: "rates" },
  { id: "10y-note", label: "10-Year Note", contracts: ["10y-note"], category: "rates" },
  { id: "30y-bond", label: "30-Year Bond", contracts: ["30y-bond"], category: "rates" },
  { id: "fed-funds", label: "Fed Funds", contracts: ["fed-funds"], category: "rates" },
  { id: "sofr", label: "SOFR", contracts: ["sofr"], category: "rates" },
  // FX
  { id: "eurusd", label: "EUR/USD", contracts: ["eurusd"], category: "fx" },
  { id: "usdjpy", label: "USD/JPY", contracts: ["usdjpy"], category: "fx" },
  { id: "gbpusd", label: "GBP/USD", contracts: ["gbpusd"], category: "fx" },
  { id: "usdcad", label: "USD/CAD", contracts: ["usdcad"], category: "fx" },
  { id: "audusd", label: "AUD/USD", contracts: ["audusd"], category: "fx" },
  { id: "usdchf", label: "USD/CHF", contracts: ["usdchf"], category: "fx" },
  { id: "usdmxn", label: "USD/MXN", contracts: ["usdmxn"], category: "fx" },
  { id: "nzdusd", label: "NZD/USD", contracts: ["nzdusd"], category: "fx" },
  { id: "usdzar", label: "USD/ZAR", contracts: ["usdzar"], category: "fx" },
  { id: "usdbrl", label: "USD/BRL", contracts: ["usdbrl"], category: "fx" },
  { id: "dxy", label: "DXY Index", contracts: ["dxy"], category: "fx" },
  // Crypto
  { id: "bitcoin", label: "Bitcoin", contracts: ["bitcoin"], category: "crypto" },
  { id: "ethereum", label: "Ethereum", contracts: ["ethereum"], category: "crypto" },
];

interface FlaggedSeries {
  seriesKey: string;
  seriesLabel: string;
  latestValue: number;
  percentile: number;
  threshold95: number;
  threshold5: number;
  isHigh: boolean; // true = 95th percentile, false = 5th percentile
  isPercentage: boolean; // true if this is a % OI series
  historicalMin: number;
  historicalMax: number;
  historicalData: { date: string; value: number }[];
}

interface CommodityScreening {
  id: string;
  label: string;
  category: AssetCategory;
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
          category: commodity.category,
          positionDate: "",
          flaggedSeries: [],
        });
        continue;
      }

      const latest = data[data.length - 1];
      const flaggedSeries: FlaggedSeries[] = [];

      // Screen net position series
      for (const series of NET_SERIES) {
        const values = data.map((d) => d[series.key as keyof COTRecord] as number);
        const sortedValues = [...values].sort((a, b) => a - b);
        const latestValue = latest[series.key as keyof COTRecord] as number;

        const percentile = calculatePercentile(latestValue, sortedValues);
        const threshold95 = getPercentileValue(sortedValues, 95);
        const threshold5 = getPercentileValue(sortedValues, 5);

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
            isPercentage: false,
            historicalMin: sortedValues[0],
            historicalMax: sortedValues[sortedValues.length - 1],
            historicalData: data.map((d) => ({
              date: d.date,
              value: d[series.key as keyof COTRecord] as number,
            })),
          });
        }
      }

      // Screen % OI series
      for (const series of PCT_OI_SERIES) {
        const values = data.map((d) => {
          const oi = d.openInterestAll;
          const net = d[series.netKey as keyof COTRecord] as number;
          return oi > 0 ? (net / oi) * 100 : 0;
        });
        const sortedValues = [...values].sort((a, b) => a - b);
        const latestOI = latest.openInterestAll;
        const latestNet = latest[series.netKey as keyof COTRecord] as number;
        const latestValue = latestOI > 0 ? (latestNet / latestOI) * 100 : 0;

        const percentile = calculatePercentile(latestValue, sortedValues);
        const threshold95 = getPercentileValue(sortedValues, 95);
        const threshold5 = getPercentileValue(sortedValues, 5);

        const isHigh = percentile >= 95;
        const isLow = percentile <= 5;

        if (isHigh || isLow) {
          flaggedSeries.push({
            seriesKey: `${series.netKey}_pctOI`,
            seriesLabel: series.label,
            latestValue,
            percentile: Math.round(percentile * 10) / 10,
            threshold95,
            threshold5,
            isHigh,
            isPercentage: true,
            historicalMin: sortedValues[0],
            historicalMax: sortedValues[sortedValues.length - 1],
            historicalData: data.map((d) => {
              const oi = d.openInterestAll;
              const net = d[series.netKey as keyof COTRecord] as number;
              return {
                date: d.date,
                value: oi > 0 ? (net / oi) * 100 : 0,
              };
            }),
          });
        }
      }

      results.push({
        id: commodity.id,
        label: commodity.label,
        category: commodity.category,
        positionDate: latest.date,
        flaggedSeries,
      });
    }

    // Get the latest position date from results
    const latestPositionDate = results
      .filter((r) => r.positionDate)
      .map((r) => r.positionDate)
      .sort()
      .pop() || "";

    return NextResponse.json({
      success: true,
      positionDate: latestPositionDate,
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
