import { NextResponse } from "next/server";
import { CFTC_CONTRACTS, COTRecord, ContractId } from "@/lib/cftc";

// Commodities to include in summary (matching Excel file)
const SUMMARY_COMMODITIES: { id: ContractId; label: string }[] = [
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
];

// Aggregate commodity groups
const AGGREGATE_GROUPS: { id: string; label: string; contracts: ContractId[] }[] = [
  { id: "all-wheat", label: "All W", contracts: ["chicago-wheat", "kansas-wheat", "minneapolis-wheat"] },
];

interface ChangeData {
  value: number;
  isSignificant: boolean; // > 1 std dev
}

interface PctOIData {
  value: number;
  isExtreme: boolean; // 95th or 5th percentile
  isHigh: boolean; // true = 95th, false = 5th
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
  openInterest: {
    size: number;
    change: ChangeData;
    pctChange: number;
  };
  producer: ParticipantData;
  nonReportables: ParticipantData;
  producerNonRept: ParticipantData;
  swapDealer: ParticipantData;
  managedMoney: ParticipantData;
  otherReportables: ParticipantData;
  spec: ParticipantData;
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

interface StdDevs {
  oi: number;
  producer: number;
  nonRept: number;
  prodNonRept: number;
  swap: number;
  mm: number;
  other: number;
  spec: number;
}

interface PctOIPercentiles {
  producer: number;
  nonRept: number;
  prodNonRept: number;
  swap: number;
  mm: number;
  other: number;
  spec: number;
}

function calculateStdDevs(data: COTRecord[]): StdDevs {
  return {
    oi: calculateStdDev(calculateWeeklyChanges(data, r => r.openInterestAll)),
    producer: calculateStdDev(calculateWeeklyChanges(data, r => r.producerNetAll)),
    nonRept: calculateStdDev(calculateWeeklyChanges(data, r => r.nonReptNetAll)),
    prodNonRept: calculateStdDev(calculateWeeklyChanges(data, r => r.producerNetAll + r.nonReptNetAll)),
    swap: calculateStdDev(calculateWeeklyChanges(data, r => r.swapNetAll)),
    mm: calculateStdDev(calculateWeeklyChanges(data, r => r.mmNetAll)),
    other: calculateStdDev(calculateWeeklyChanges(data, r => r.otherNetAll)),
    spec: calculateStdDev(calculateWeeklyChanges(data, r => r.mmNetAll + r.otherNetAll)),
  };
}

function calculatePctOIPercentiles(data: COTRecord[], latest: COTRecord): PctOIPercentiles {
  const latestOI = latest.openInterestAll;

  const producerPctOI = latestOI > 0 ? latest.producerNetAll / latestOI : 0;
  const nonReptPctOI = latestOI > 0 ? latest.nonReptNetAll / latestOI : 0;
  const prodNonReptPctOI = latestOI > 0 ? (latest.producerNetAll + latest.nonReptNetAll) / latestOI : 0;
  const swapPctOI = latestOI > 0 ? latest.swapNetAll / latestOI : 0;
  const mmPctOI = latestOI > 0 ? latest.mmNetAll / latestOI : 0;
  const otherPctOI = latestOI > 0 ? latest.otherNetAll / latestOI : 0;
  const specPctOI = latestOI > 0 ? (latest.mmNetAll + latest.otherNetAll) / latestOI : 0;

  return {
    producer: calculatePercentile(producerPctOI, calculatePctOIValues(data, r => r.producerNetAll)),
    nonRept: calculatePercentile(nonReptPctOI, calculatePctOIValues(data, r => r.nonReptNetAll)),
    prodNonRept: calculatePercentile(prodNonReptPctOI, calculatePctOIValues(data, r => r.producerNetAll + r.nonReptNetAll)),
    swap: calculatePercentile(swapPctOI, calculatePctOIValues(data, r => r.swapNetAll)),
    mm: calculatePercentile(mmPctOI, calculatePctOIValues(data, r => r.mmNetAll)),
    other: calculatePercentile(otherPctOI, calculatePctOIValues(data, r => r.otherNetAll)),
    spec: calculatePercentile(specPctOI, calculatePctOIValues(data, r => r.mmNetAll + r.otherNetAll)),
  };
}

function isSignificant(change: number, stdDev: number): boolean {
  return stdDev > 0 && Math.abs(change) > stdDev;
}

function isExtreme(percentile: number): boolean {
  return percentile >= 95 || percentile <= 5;
}

function isHigh(percentile: number): boolean {
  return percentile >= 95;
}

function calculateRow(data: COTRecord[], label: string, fullName: string, id: string, isAggregate: boolean): SummaryRow | null {
  if (data.length < 2) return null;

  const latest = data[data.length - 1];
  const previous = data[data.length - 2];

  // Calculate standard deviations using all historical data
  const stdDevs = calculateStdDevs(data);

  // Calculate percentiles for %OI values
  const pctOIPercentiles = calculatePctOIPercentiles(data, latest);

  const oiChange = latest.openInterestAll - previous.openInterestAll;
  const oiPctChange = previous.openInterestAll ? oiChange / previous.openInterestAll : 0;

  const producerNet = latest.producerNetAll;
  const producerChange = producerNet - previous.producerNetAll;
  const producerPctOI = latest.openInterestAll ? producerNet / latest.openInterestAll : 0;

  const nonReptNet = latest.nonReptNetAll;
  const nonReptChange = nonReptNet - previous.nonReptNetAll;
  const nonReptPctOI = latest.openInterestAll ? nonReptNet / latest.openInterestAll : 0;

  const prodNonReptNet = producerNet + nonReptNet;
  const prodNonReptChange = producerChange + nonReptChange;
  const prodNonReptPctOI = latest.openInterestAll ? prodNonReptNet / latest.openInterestAll : 0;

  const swapNet = latest.swapNetAll;
  const swapChange = swapNet - previous.swapNetAll;
  const swapPctOI = latest.openInterestAll ? swapNet / latest.openInterestAll : 0;

  const mmNet = latest.mmNetAll;
  const mmChange = mmNet - previous.mmNetAll;
  const mmPctOI = latest.openInterestAll ? mmNet / latest.openInterestAll : 0;

  const otherNet = latest.otherNetAll;
  const otherChange = otherNet - previous.otherNetAll;
  const otherPctOI = latest.openInterestAll ? otherNet / latest.openInterestAll : 0;

  // Spec is defined as Managed Money + Other Reportables
  const specNet = mmNet + otherNet;
  const specChange = mmChange + otherChange;
  const specPctOI = latest.openInterestAll ? specNet / latest.openInterestAll : 0;

  return {
    id,
    label,
    fullName,
    isAggregate,
    positionDate: latest.date,
    openInterest: {
      size: latest.openInterestAll,
      change: { value: oiChange, isSignificant: isSignificant(oiChange, stdDevs.oi) },
      pctChange: oiPctChange,
    },
    producer: {
      net: producerNet,
      change: { value: producerChange, isSignificant: isSignificant(producerChange, stdDevs.producer) },
      pctOI: { value: producerPctOI, isExtreme: isExtreme(pctOIPercentiles.producer), isHigh: isHigh(pctOIPercentiles.producer) },
    },
    nonReportables: {
      net: nonReptNet,
      change: { value: nonReptChange, isSignificant: isSignificant(nonReptChange, stdDevs.nonRept) },
      pctOI: { value: nonReptPctOI, isExtreme: isExtreme(pctOIPercentiles.nonRept), isHigh: isHigh(pctOIPercentiles.nonRept) },
    },
    producerNonRept: {
      net: prodNonReptNet,
      change: { value: prodNonReptChange, isSignificant: isSignificant(prodNonReptChange, stdDevs.prodNonRept) },
      pctOI: { value: prodNonReptPctOI, isExtreme: isExtreme(pctOIPercentiles.prodNonRept), isHigh: isHigh(pctOIPercentiles.prodNonRept) },
    },
    swapDealer: {
      net: swapNet,
      change: { value: swapChange, isSignificant: isSignificant(swapChange, stdDevs.swap) },
      pctOI: { value: swapPctOI, isExtreme: isExtreme(pctOIPercentiles.swap), isHigh: isHigh(pctOIPercentiles.swap) },
    },
    managedMoney: {
      net: mmNet,
      change: { value: mmChange, isSignificant: isSignificant(mmChange, stdDevs.mm) },
      pctOI: { value: mmPctOI, isExtreme: isExtreme(pctOIPercentiles.mm), isHigh: isHigh(pctOIPercentiles.mm) },
    },
    otherReportables: {
      net: otherNet,
      change: { value: otherChange, isSignificant: isSignificant(otherChange, stdDevs.other) },
      pctOI: { value: otherPctOI, isExtreme: isExtreme(pctOIPercentiles.other), isHigh: isHigh(pctOIPercentiles.other) },
    },
    spec: {
      net: specNet,
      change: { value: specChange, isSignificant: isSignificant(specChange, stdDevs.spec) },
      pctOI: { value: specPctOI, isExtreme: isExtreme(pctOIPercentiles.spec), isHigh: isHigh(pctOIPercentiles.spec) },
    },
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

  try {
    // Fetch all commodity data
    const contractDataMap = new Map<ContractId, COTRecord[]>();

    const fetchPromises = SUMMARY_COMMODITIES.map(async (commodity) => {
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

    // Build summary rows
    const rows: SummaryRow[] = [];

    // Individual commodities
    for (const commodity of SUMMARY_COMMODITIES) {
      const data = contractDataMap.get(commodity.id);
      if (!data || data.length < 2) continue;

      const contract = CFTC_CONTRACTS[commodity.id];
      const row = calculateRow(data, commodity.label, contract.name, commodity.id, false);
      if (row) {
        rows.push(row);
      }
    }

    // Aggregate groups
    for (const group of AGGREGATE_GROUPS) {
      const datasets = group.contracts
        .map((c) => contractDataMap.get(c))
        .filter((d): d is COTRecord[] => d !== undefined && d.length > 0);

      if (datasets.length > 0) {
        const combinedData = sumRecordsByDate(datasets);
        const row = calculateRow(combinedData, group.label, group.label, group.id, true);
        if (row) {
          // Insert after individual wheats (after MW)
          const mwIndex = rows.findIndex((r) => r.label === "MW");
          if (mwIndex !== -1) {
            rows.splice(mwIndex + 1, 0, row);
          } else {
            rows.push(row);
          }
        }
      }
    }

    // Get dates from the first commodity with data
    let latestDate = "";
    let priorDate = "";
    for (const commodity of SUMMARY_COMMODITIES) {
      const data = contractDataMap.get(commodity.id);
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
      data: rows,
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
