import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import JSZip from "jszip";
import { CFTC_CONTRACTS, ContractId, COTRecord, parseRow, parseTFFRow, getYearsToFetch, getCFTCUrl, ReportType } from "@/lib/cftc";

// In-memory cache for COT data
const cotCache: Map<string, { data: COTRecord[]; timestamp: number }> = new Map();
const COT_CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

// Spread data cache
let spreadDataCache: SpreadData | null = null;
let spreadDataTimestamp = 0;
const SPREAD_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

interface SpreadSummary {
  id: string;
  name: string;
  spread: number;
  spread_pct: number;
  spread_unit: string;
  date: string;
  front_symbol: string;
  third_symbol: string;
}

interface SpreadHistoricalPoint {
  date: string;
  front_price: number;
  third_price: number;
  spread: number;
  spread_pct: number;
}

interface SpreadData {
  updated: string;
  summary: SpreadSummary[];
  historical: Record<string, SpreadHistoricalPoint[]>;
}

interface CombinedData {
  id: string;
  name: string;
  mmNetAll: number;
  spread: number;
  spread_pct: number;
  spread_unit: string;
  spread_date: string;
  cot_date: string;
}

interface ScatterPoint {
  date: string;
  mmNetAll: number;
  spread: number;
  spread_pct: number;
}

// Fetch COT data for a single contract
async function fetchYearData(year: number, contractCode: string, reportType: ReportType): Promise<COTRecord[]> {
  const url = getCFTCUrl(year, reportType);

  try {
    const response = await fetch(url, {
      headers: { "Accept-Encoding": "gzip, deflate" },
    });

    if (!response.ok) {
      return [];
    }

    const arrayBuffer = await response.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    const txtFile = Object.keys(zip.files).find(name => name.endsWith('.txt'));
    if (!txtFile) {
      return [];
    }

    const content = await zip.files[txtFile].async("string");
    const lines = content.split("\n");

    const records: COTRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const hasContract = reportType === "tff"
        ? line.includes(`,${contractCode},`) || line.includes(`,${contractCode} ,`)
        : line.includes(`"${contractCode}"`);

      if (!hasContract) continue;

      const record = reportType === "tff" ? parseTFFRow(line) : parseRow(line);
      if (record) {
        records.push(record);
      }
    }

    return records;
  } catch {
    return [];
  }
}

async function fetchCOTData(contractCode: string, reportType: ReportType): Promise<COTRecord[]> {
  const cacheKey = `spreads_${contractCode}`;
  const cached = cotCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < COT_CACHE_DURATION) {
    return cached.data;
  }

  const years = getYearsToFetch();
  const allRecords: COTRecord[] = [];

  const batchSize = 4;
  for (let i = 0; i < years.length; i += batchSize) {
    const batch = years.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(year => fetchYearData(year, contractCode, reportType))
    );
    for (const records of batchResults) {
      allRecords.push(...records);
    }
  }

  allRecords.sort((a, b) => a.date.localeCompare(b.date));
  cotCache.set(cacheKey, { data: allRecords, timestamp: Date.now() });

  return allRecords;
}

// Load spread data from JSON file
async function loadSpreadData(): Promise<SpreadData | null> {
  if (spreadDataCache && Date.now() - spreadDataTimestamp < SPREAD_CACHE_DURATION) {
    return spreadDataCache;
  }

  try {
    const filePath = path.join(process.cwd(), "public", "data", "cot_spreads.json");
    const fileContent = await fs.readFile(filePath, "utf-8");
    spreadDataCache = JSON.parse(fileContent);
    spreadDataTimestamp = Date.now();
    return spreadDataCache;
  } catch {
    // Return sample data if file doesn't exist yet
    return getSampleData();
  }
}

// Sample data for when the JSON file hasn't been created yet
function getSampleData(): SpreadData {
  return {
    updated: new Date().toISOString(),
    summary: [
      { id: "corn", name: "Corn", spread: 26, spread_pct: 106, spread_unit: "c/bu", date: "2026-07-18", front_symbol: "ZC-2026U", third_symbol: "ZC-2026Z" },
      { id: "soybeans", name: "Soybeans", spread: -5, spread_pct: 100, spread_unit: "c/bu", date: "2026-07-18", front_symbol: "ZS-2026Q", third_symbol: "ZS-2026X" },
      { id: "chicago-wheat", name: "Chicago Wheat", spread: -35, spread_pct: 94, spread_unit: "c/bu", date: "2026-07-18", front_symbol: "ZW-2026U", third_symbol: "ZW-2026Z" },
      { id: "kansas-wheat", name: "Kansas Wheat", spread: -31, spread_pct: 94, spread_unit: "c/bu", date: "2026-07-18", front_symbol: "KE-2026U", third_symbol: "KE-2026Z" },
      { id: "soyoil", name: "Soyoil", spread: 0, spread_pct: 100, spread_unit: "c/lb", date: "2026-07-18", front_symbol: "ZL-2026U", third_symbol: "ZL-2026Z" },
      { id: "soymeal", name: "Soymeal", spread: -10, spread_pct: 97, spread_unit: "$/ton", date: "2026-07-18", front_symbol: "ZM-2026U", third_symbol: "ZM-2026Z" },
      { id: "sugar", name: "NY Sugar", spread: 0, spread_pct: 100, spread_unit: "c/lb", date: "2026-07-18", front_symbol: "SB-2026V", third_symbol: "SB-2027H" },
      { id: "arabica-coffee", name: "NY Coffee", spread: 21, spread_pct: 105, spread_unit: "c/lb", date: "2026-07-18", front_symbol: "KC-2026U", third_symbol: "KC-2026Z" },
      { id: "ny-cocoa", name: "NY Cocoa", spread: 609, spread_pct: 107, spread_unit: "$/ton", date: "2026-07-18", front_symbol: "CC-2026U", third_symbol: "CC-2026Z" },
      { id: "cotton", name: "Cotton", spread: -2, spread_pct: 97, spread_unit: "c/lb", date: "2026-07-18", front_symbol: "CT-2026V", third_symbol: "CT-2026Z" },
      { id: "live-cattle", name: "Live Cattle", spread: 7, spread_pct: 103, spread_unit: "c/lb", date: "2026-07-18", front_symbol: "LE-2026Q", third_symbol: "LE-2026Z" },
      { id: "lean-hogs", name: "Lean Hogs", spread: -7, spread_pct: 93, spread_unit: "c/lb", date: "2026-07-18", front_symbol: "HE-2026Q", third_symbol: "HE-2026V" },
    ],
    historical: {}
  };
}

// Calculate linear regression
function linearRegression(data: { x: number; y: number }[]): { slope: number; intercept: number; r2: number } {
  const n = data.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0 };

  const sumX = data.reduce((sum, p) => sum + p.x, 0);
  const sumY = data.reduce((sum, p) => sum + p.y, 0);
  const sumXY = data.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumX2 = data.reduce((sum, p) => sum + p.x * p.x, 0);
  const sumY2 = data.reduce((sum, p) => sum + p.y * p.y, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const yMean = sumY / n;
  const ssTot = data.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
  const ssRes = data.reduce((sum, p) => sum + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

export async function GET() {
  try {
    // Load spread data
    const spreadData = await loadSpreadData();
    if (!spreadData) {
      return NextResponse.json(
        { success: false, error: "No spread data available" },
        { status: 500 }
      );
    }

    // Fetch latest COT data for each commodity in the summary
    const combinedData: CombinedData[] = [];
    const scatterData: Record<string, ScatterPoint[]> = {};

    for (const spread of spreadData.summary) {
      const contractId = spread.id as ContractId;
      const contract = CFTC_CONTRACTS[contractId];

      if (!contract) continue;

      // Fetch COT data
      const cotRecords = await fetchCOTData(contract.code, contract.reportType);
      const latestCOT = cotRecords[cotRecords.length - 1];

      if (latestCOT) {
        combinedData.push({
          id: spread.id,
          name: spread.name,
          mmNetAll: latestCOT.mmNetAll,
          spread: spread.spread,
          spread_pct: spread.spread_pct,
          spread_unit: spread.spread_unit,
          spread_date: spread.date,
          cot_date: latestCOT.date,
        });
      }

      // Build historical scatter data if available
      const historicalSpreads = spreadData.historical[spread.id] || [];
      if (historicalSpreads.length > 0 && cotRecords.length > 0) {
        // Create a map of COT data by date
        const cotByDate = new Map<string, COTRecord>();
        for (const rec of cotRecords) {
          cotByDate.set(rec.date, rec);
        }

        // Match spread dates with COT dates
        const points: ScatterPoint[] = [];
        for (const spreadPoint of historicalSpreads) {
          // Find COT record for this date or closest prior date
          const cotRecord = cotByDate.get(spreadPoint.date);
          if (cotRecord) {
            points.push({
              date: spreadPoint.date,
              mmNetAll: cotRecord.mmNetAll,
              spread: spreadPoint.spread,
              spread_pct: spreadPoint.spread_pct,
            });
          }
        }

        // Keep at most 500 points to avoid too much data
        if (points.length > 500) {
          const step = Math.floor(points.length / 500);
          scatterData[spread.id] = points.filter((_, i) => i % step === 0 || i === points.length - 1);
        } else {
          scatterData[spread.id] = points;
        }
      }
    }

    // Calculate regression for the main scatter plot
    const mainScatterPoints = combinedData.map(d => ({
      x: d.mmNetAll,
      y: d.spread_pct,
      name: d.name,
    }));

    const regression = linearRegression(mainScatterPoints.map(p => ({ x: p.x, y: p.y })));

    return NextResponse.json({
      success: true,
      updated: spreadData.updated,
      summary: combinedData,
      mainScatter: {
        points: mainScatterPoints,
        regression: {
          slope: regression.slope,
          intercept: regression.intercept,
          r2: regression.r2,
        },
      },
      historicalScatter: scatterData,
    });
  } catch (error) {
    console.error("Error in cot-spreads API:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
