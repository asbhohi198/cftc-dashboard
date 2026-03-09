import { NextResponse } from "next/server";
import { CFTC_CONTRACTS, COTRecord, ContractId, ReportType } from "@/lib/cftc";

type AssetCategory = "ags" | "energy" | "equities" | "rates" | "fx" | "crypto";

// Commodities organized by sector
const SECTOR_COMMODITIES: Record<AssetCategory, { id: ContractId; label: string }[]> = {
  ags: [
    { id: "corn", label: "C" },
    { id: "chicago-wheat", label: "W" },
    { id: "kansas-wheat", label: "KW" },
    { id: "minneapolis-wheat", label: "MW" },
    { id: "soybeans", label: "S" },
    { id: "soymeal", label: "SM" },
    { id: "soyoil", label: "BO" },
    { id: "oats", label: "O" },
    { id: "sugar", label: "SB" },
    { id: "cotton", label: "CT" },
    { id: "live-cattle", label: "LC" },
    { id: "feeder-cattle", label: "FC" },
    { id: "lean-hogs", label: "LH" },
    { id: "arabica-coffee", label: "KC" },
    { id: "rough-rice", label: "RR" },
    { id: "ny-cocoa", label: "CC" },
  ],
  energy: [
    { id: "wti-crude", label: "CL" },
    { id: "natural-gas", label: "NG" },
    { id: "rbob-gasoline", label: "RB" },
    { id: "heating-oil", label: "HO" },
  ],
  equities: [
    { id: "sp500", label: "ES" },
    { id: "nasdaq100", label: "NQ" },
    { id: "dow", label: "YM" },
    { id: "russell2000", label: "RTY" },
    { id: "vix", label: "VX" },
  ],
  rates: [
    { id: "2y-note", label: "ZT" },
    { id: "5y-note", label: "ZF" },
    { id: "10y-note", label: "ZN" },
    { id: "30y-bond", label: "ZB" },
    { id: "fed-funds", label: "FF" },
    { id: "sofr", label: "SR3" },
  ],
  fx: [
    { id: "eurusd", label: "EUR" },
    { id: "usdjpy", label: "JPY" },
    { id: "gbpusd", label: "GBP" },
    { id: "usdcad", label: "CAD" },
    { id: "audusd", label: "AUD" },
    { id: "usdchf", label: "CHF" },
    { id: "usdmxn", label: "MXN" },
    { id: "nzdusd", label: "NZD" },
    { id: "dxy", label: "DXY" },
  ],
  crypto: [
    { id: "bitcoin", label: "BTC" },
    { id: "ethereum", label: "ETH" },
  ],
};

// Aggregate groups per sector
const SECTOR_AGGREGATES: Record<AssetCategory, { id: string; label: string; contracts: ContractId[]; insertAfter: string }[]> = {
  ags: [
    { id: "all-wheat", label: "All W", contracts: ["chicago-wheat", "kansas-wheat", "minneapolis-wheat"], insertAfter: "MW" },
  ],
  energy: [],
  equities: [],
  rates: [],
  fx: [],
  crypto: [],
};

const SECTOR_LABELS: Record<AssetCategory, string> = {
  ags: "Agricultural",
  energy: "Energy",
  equities: "Equities",
  rates: "Rates",
  fx: "FX",
  crypto: "Crypto",
};

interface ChangeData {
  value: number;
  isSignificant: boolean;
}

interface PctOIData {
  value: number;
  isExtreme: boolean;
  isHigh: boolean;
}

interface ParticipantData {
  net: number;
  change: ChangeData;
  pctOI: PctOIData;
}

interface SummaryRow {
  id: string;
  label: string;
  fullName: string;
  isAggregate: boolean;
  positionDate: string;
  reportType: ReportType;
  openInterest: {
    size: number;
    change: ChangeData;
    pctChange: number;
  };
  // Disaggregated report categories (ags, energy)
  producer?: ParticipantData;
  swapDealer?: ParticipantData;
  managedMoney?: ParticipantData;
  otherReportables?: ParticipantData;
  // TFF report categories (equities, rates, fx, crypto)
  dealer?: ParticipantData;
  assetManager?: ParticipantData;
  leveragedFunds?: ParticipantData;
  otherTFF?: ParticipantData;
  // Common
  nonReportables?: ParticipantData;
  spec: ParticipantData; // MM+Other for disagg, LevFunds+Other for TFF
}

interface SectorData {
  sector: AssetCategory;
  label: string;
  reportType: ReportType;
  rows: SummaryRow[];
}

// Calculate standard deviation
function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

// Calculate percentile of a value within an array
function calculatePercentile(value: number, values: number[]): number {
  if (values.length === 0) return 50;
  const sorted = [...values].sort((a, b) => a - b);
  let count = 0;
  for (const v of sorted) {
    if (v < value) count++;
  }
  return (count / sorted.length) * 100;
}

// Calculate weekly changes for a series
function calculateWeeklyChanges(data: COTRecord[], getValue: (r: COTRecord) => number): number[] {
  const changes: number[] = [];
  for (let i = 1; i < data.length; i++) {
    changes.push(getValue(data[i]) - getValue(data[i - 1]));
  }
  return changes;
}

// Calculate %OI values for a series
function calculatePctOIValues(data: COTRecord[], getNet: (r: COTRecord) => number): number[] {
  return data.map(r => r.openInterestAll > 0 ? getNet(r) / r.openInterestAll : 0);
}

function isSignificant(change: number, stdDev: number): boolean {
  return stdDev > 0 && Math.abs(change) > 2 * stdDev;
}

function isExtreme(percentile: number): boolean {
  return percentile >= 98 || percentile <= 2;
}

function isHigh(percentile: number): boolean {
  return percentile >= 98;
}

function calculateParticipantData(
  data: COTRecord[],
  latest: COTRecord,
  previous: COTRecord,
  getNet: (r: COTRecord) => number
): ParticipantData {
  const latestNet = getNet(latest);
  const previousNet = getNet(previous);
  const change = latestNet - previousNet;
  const pctOI = latest.openInterestAll > 0 ? latestNet / latest.openInterestAll : 0;

  const weeklyChanges = calculateWeeklyChanges(data, getNet);
  const stdDev = calculateStdDev(weeklyChanges);

  const pctOIValues = calculatePctOIValues(data, getNet);
  const percentile = calculatePercentile(pctOI, pctOIValues);

  return {
    net: latestNet,
    change: { value: change, isSignificant: isSignificant(change, stdDev) },
    pctOI: { value: pctOI, isExtreme: isExtreme(percentile), isHigh: isHigh(percentile) },
  };
}

function calculateRow(data: COTRecord[], label: string, fullName: string, id: string, isAggregate: boolean, reportType: ReportType): SummaryRow | null {
  if (data.length < 2) return null;

  const latest = data[data.length - 1];
  const previous = data[data.length - 2];

  // Open Interest
  const oiChange = latest.openInterestAll - previous.openInterestAll;
  const oiPctChange = previous.openInterestAll ? oiChange / previous.openInterestAll : 0;
  const oiWeeklyChanges = calculateWeeklyChanges(data, r => r.openInterestAll);
  const oiStdDev = calculateStdDev(oiWeeklyChanges);

  const baseRow: SummaryRow = {
    id,
    label,
    fullName,
    isAggregate,
    positionDate: latest.date,
    reportType,
    openInterest: {
      size: latest.openInterestAll,
      change: { value: oiChange, isSignificant: isSignificant(oiChange, oiStdDev) },
      pctChange: oiPctChange,
    },
    spec: { net: 0, change: { value: 0, isSignificant: false }, pctOI: { value: 0, isExtreme: false, isHigh: false } },
  };

  if (reportType === "disagg") {
    // Disaggregated report (ags, energy)
    const producer = calculateParticipantData(data, latest, previous, r => r.producerNetAll);
    const swapDealer = calculateParticipantData(data, latest, previous, r => r.swapNetAll);
    const managedMoney = calculateParticipantData(data, latest, previous, r => r.mmNetAll);
    const otherReportables = calculateParticipantData(data, latest, previous, r => r.otherNetAll);
    const nonReportables = calculateParticipantData(data, latest, previous, r => r.nonReptNetAll);
    const spec = calculateParticipantData(data, latest, previous, r => r.mmNetAll + r.otherNetAll);

    return {
      ...baseRow,
      producer,
      swapDealer,
      managedMoney,
      otherReportables,
      nonReportables,
      spec,
    };
  } else {
    // TFF report (equities, rates, fx, crypto)
    // In TFF: Dealer=Producer, AssetManager=SwapDealer, LeveragedFunds=MM, Other=Other
    const dealer = calculateParticipantData(data, latest, previous, r => r.producerNetAll);
    const assetManager = calculateParticipantData(data, latest, previous, r => r.swapNetAll);
    const leveragedFunds = calculateParticipantData(data, latest, previous, r => r.mmNetAll);
    const otherTFF = calculateParticipantData(data, latest, previous, r => r.otherNetAll);
    const nonReportables = calculateParticipantData(data, latest, previous, r => r.nonReptNetAll);
    const spec = calculateParticipantData(data, latest, previous, r => r.mmNetAll + r.otherNetAll);

    return {
      ...baseRow,
      dealer,
      assetManager,
      leveragedFunds,
      otherTFF,
      nonReportables,
      spec,
    };
  }
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

  try {
    // Fetch all commodity data
    const allContractIds = Object.values(SECTOR_COMMODITIES).flat().map(c => c.id);
    const contractDataMap = new Map<ContractId, COTRecord[]>();

    const fetchPromises = allContractIds.map(async (contractId) => {
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

    for (const sector of Object.keys(SECTOR_COMMODITIES) as AssetCategory[]) {
      const commodities = SECTOR_COMMODITIES[sector];
      const aggregates = SECTOR_AGGREGATES[sector];
      const rows: SummaryRow[] = [];

      // Determine report type from first commodity
      const firstContract = commodities[0]?.id;
      const reportType = firstContract ? CFTC_CONTRACTS[firstContract].reportType : "disagg";

      // Individual commodities
      for (const commodity of commodities) {
        const data = contractDataMap.get(commodity.id);
        if (!data || data.length < 2) continue;

        const contract = CFTC_CONTRACTS[commodity.id];
        const row = calculateRow(data, commodity.label, contract.name, commodity.id, false, contract.reportType);
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
          const row = calculateRow(combinedData, group.label, group.label, group.id, true, reportType);
          if (row) {
            const insertIdx = rows.findIndex((r) => r.label === group.insertAfter);
            if (insertIdx !== -1) {
              rows.splice(insertIdx + 1, 0, row);
            } else {
              rows.push(row);
            }
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

    // Get dates from the first commodity with data
    let latestDate = "";
    let priorDate = "";
    for (const contractId of allContractIds) {
      const data = contractDataMap.get(contractId);
      if (data && data.length >= 2) {
        latestDate = data[data.length - 1].date;
        priorDate = data[data.length - 2].date;
        break;
      }
    }

    // Calculate release dates (position date + 3 days)
    const latestReleaseDate = latestDate ? addDays(latestDate, 3) : "";
    const priorReleaseDate = priorDate ? addDays(priorDate, 3) : "";

    return NextResponse.json({
      success: true,
      latestReport: {
        positionDate: latestDate,
        releaseDate: latestReleaseDate,
      },
      priorReport: {
        positionDate: priorDate,
        releaseDate: priorReleaseDate,
      },
      sectors,
    });
  } catch (error) {
    console.error("Error in summary:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}
