import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { CFTC_CONTRACTS, ContractId, COTRecord, parseRow, parseTFFRow, getYearsToFetch, getCFTCUrl, ReportType } from "@/lib/cftc";

// In-memory cache
const cache: Map<string, { data: COTRecord[]; timestamp: number }> = new Map();
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

// Define which contracts belong to each sector
const SECTOR_CONTRACTS: Record<string, ContractId[]> = {
  ags: ["corn", "matif-corn", "soybeans", "chicago-wheat", "kansas-wheat", "matif-wheat", "soyoil", "soymeal", "canola", "matif-rapeseed", "sugar", "arabica-coffee", "ny-cocoa", "cotton", "live-cattle", "lean-hogs", "feeder-cattle"],
  energy: ["wti-crude", "brent-crude", "natural-gas", "rbob-gasoline", "heating-oil"],
  metals: ["gold", "silver", "copper", "platinum", "palladium"],
  equities: ["sp500", "nasdaq100", "dow", "russell2000", "vix"],
  rates: ["10y-note", "2y-note", "5y-note", "30y-bond", "fed-funds", "sofr"],
  fx: ["eurusd", "usdjpy", "gbpusd", "usdcad", "audusd", "usdchf", "dxy"],
  crypto: ["bitcoin", "ethereum"],
};

// Check if a contract is a Matif contract
function isMatifContract(contractId: string): boolean {
  return contractId.startsWith("matif-");
}

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
  const cacheKey = `traders_${contractCode}`;
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

export interface TradersContractData {
  id: ContractId;
  name: string;
  // Latest data point
  latestDate: string;
  tradersLong: number;
  tradersShort: number;
  pctLong: number;
  pctShort: number;
  // Historical data for charts
  historicalData: {
    date: string;
    tradersLong: number;
    tradersShort: number;
    pctLong: number;
  }[];
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
  const baseUrl = new URL(request.url).origin;

  try {
    const results: TradersContractData[] = [];

    // Fetch data for each contract in the sector
    for (const contractId of contractIds) {
      const contract = CFTC_CONTRACTS[contractId];
      let records: COTRecord[];

      if (isMatifContract(contractId)) {
        // Fetch Matif data from matif-cot API
        try {
          const res = await fetch(`${baseUrl}/api/matif-cot?contract=${contractId}&format=cot`, {
            cache: "no-store",
          });
          const json = await res.json();
          records = json.success && json.data ? json.data : [];
        } catch {
          records = [];
        }
      } else {
        // Fetch CFTC data from zip files
        records = await fetchAllData(contract.code, contract.reportType);
      }

      if (records.length === 0) continue;

      // Get latest record
      const latestRecord = records[records.length - 1];

      // Use MM traders (Managed Money / Leveraged Funds)
      const tradersLong = latestRecord.tradersMMLong;
      const tradersShort = latestRecord.tradersMMShort;
      const totalTraders = tradersLong + tradersShort;
      const pctLong = totalTraders > 0 ? (tradersLong / totalTraders) * 100 : 50;
      const pctShort = totalTraders > 0 ? (tradersShort / totalTraders) * 100 : 50;

      // Build historical data for charts
      const historicalData = records.map(record => {
        const long = record.tradersMMLong;
        const short = record.tradersMMShort;
        const total = long + short;
        return {
          date: record.date,
          tradersLong: long,
          tradersShort: short,
          pctLong: total > 0 ? (long / total) * 100 : 50,
        };
      });

      results.push({
        id: contractId,
        name: contract.name,
        latestDate: latestRecord.date,
        tradersLong,
        tradersShort,
        pctLong,
        pctShort,
        historicalData,
      });
    }

    // Get the latest report date from the results
    const reportDate = results.length > 0 ? results[0].latestDate : "";

    return NextResponse.json({
      success: true,
      sector,
      reportDate,
      contracts: results,
    });
  } catch (error) {
    console.error("Error fetching traders data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
