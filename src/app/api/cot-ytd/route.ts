import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { CFTC_CONTRACTS, ContractId, COTRecord, parseRow, parseTFFRow, getYearsToFetch, getCFTCUrl, ReportType } from "@/lib/cftc";

// In-memory cache
const cache: Map<string, { data: COTRecord[]; timestamp: number }> = new Map();
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

// Define which contracts belong to each sector
const SECTOR_CONTRACTS: Record<string, ContractId[]> = {
  ags: ["corn", "soybeans", "chicago-wheat", "kansas-wheat", "soyoil", "soymeal", "sugar", "arabica-coffee", "ny-cocoa", "cotton", "live-cattle", "lean-hogs", "feeder-cattle"],
  energy: ["wti-crude", "brent-crude", "natural-gas", "rbob-gasoline", "heating-oil"],
  metals: ["gold", "silver", "copper", "platinum", "palladium"],
  equities: ["sp500", "nasdaq100", "dow", "russell2000", "vix"],
  rates: ["10y-note", "2y-note", "5y-note", "30y-bond", "fed-funds", "sofr"],
  fx: ["eurusd", "usdjpy", "gbpusd", "usdcad", "audusd", "usdchf", "dxy"],
  crypto: ["bitcoin", "ethereum"],
};

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

async function fetchAllData(contractCode: string, reportType: ReportType): Promise<COTRecord[]> {
  const cacheKey = `ytd_${contractCode}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
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
  cache.set(cacheKey, { data: allRecords, timestamp: Date.now() });

  return allRecords;
}

// Get the week number of the year (1-52)
function getWeekOfYear(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

// Calculate cumulative YTD changes for each year
function calculateYTDData(records: COTRecord[]): {
  years: number[];
  weeklyData: { week: number; [year: number]: number }[];
} {
  // Group records by year
  const byYear: Record<number, COTRecord[]> = {};
  for (const record of records) {
    const year = parseInt(record.date.substring(0, 4));
    if (!byYear[year]) byYear[year] = [];
    byYear[year].push(record);
  }

  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);

  // Calculate cumulative changes for each year
  const yearCumulativeData: Record<number, { week: number; cumulative: number }[]> = {};

  for (const year of years) {
    const yearRecords = byYear[year].sort((a, b) => a.date.localeCompare(b.date));
    if (yearRecords.length === 0) continue;

    // Find the first record of the year (baseline)
    const baseline = yearRecords[0].mmNetAll;

    yearCumulativeData[year] = yearRecords.map(record => {
      const date = new Date(record.date);
      const week = getWeekOfYear(date);
      const cumulative = record.mmNetAll - baseline;
      return { week, cumulative };
    });
  }

  // Create weekly data structure (weeks 1-52)
  const weeklyData: { week: number; [year: number]: number }[] = [];
  for (let week = 1; week <= 52; week++) {
    const weekData: { week: number; [year: number]: number } = { week };
    for (const year of years) {
      const yearData = yearCumulativeData[year];
      if (!yearData) continue;

      // Find the record for this week (or the closest earlier week)
      const weekRecord = yearData.filter(d => d.week <= week).pop();
      if (weekRecord) {
        weekData[year] = weekRecord.cumulative;
      }
    }
    weeklyData.push(weekData);
  }

  return { years, weeklyData };
}

export interface YTDContractData {
  id: ContractId;
  name: string;
  years: number[];
  weeklyData: { week: number; [year: number]: number }[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sector = searchParams.get("sector");

  if (!sector || !SECTOR_CONTRACTS[sector]) {
    return NextResponse.json(
      { success: false, error: "Invalid sector. Valid sectors: ags, energy, metals, equities, rates, fx, crypto" },
      { status: 400 }
    );
  }

  const contractIds = SECTOR_CONTRACTS[sector];

  try {
    const results: YTDContractData[] = [];

    // Fetch data for each contract in the sector
    for (const contractId of contractIds) {
      const contract = CFTC_CONTRACTS[contractId];
      const records = await fetchAllData(contract.code, contract.reportType);

      if (records.length === 0) continue;

      const { years, weeklyData } = calculateYTDData(records);

      results.push({
        id: contractId,
        name: contract.name,
        years,
        weeklyData,
      });
    }

    return NextResponse.json({
      success: true,
      sector,
      contracts: results,
    });
  } catch (error) {
    console.error("Error fetching YTD data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
