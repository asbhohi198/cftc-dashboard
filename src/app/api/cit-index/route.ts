import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { CIT_CONTRACTS, CITContractId, CITRecord, parseCITRow, getYearsToFetch, getCITUrl } from "@/lib/cftc";

// In-memory cache
const cache: Map<string, { data: CITRecord[]; timestamp: number }> = new Map();
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

async function fetchYearData(year: number, contractCode: string): Promise<CITRecord[]> {
  const url = getCITUrl(year);

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

    const records: CITRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check if this line contains our contract code
      if (!line.includes(`"${contractCode}"`)) continue;

      const record = parseCITRow(line);
      if (record) {
        records.push(record);
      }
    }

    return records;
  } catch {
    return [];
  }
}

async function fetchAllData(contractCode: string): Promise<CITRecord[]> {
  const cacheKey = `cit_${contractCode}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  // CIT data goes back to 2006
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = 2006; y <= currentYear; y++) {
    years.push(y);
  }

  const allRecords: CITRecord[] = [];

  const batchSize = 4;
  for (let i = 0; i < years.length; i += batchSize) {
    const batch = years.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(year => fetchYearData(year, contractCode))
    );
    for (const records of batchResults) {
      allRecords.push(...records);
    }
  }

  allRecords.sort((a, b) => a.date.localeCompare(b.date));
  cache.set(cacheKey, { data: allRecords, timestamp: Date.now() });

  return allRecords;
}

export interface CITContractData {
  id: CITContractId;
  name: string;
  // Latest data point
  latestDate: string;
  indexNet: number;
  indexPctOI: number;
  mmNet: number; // Money Manager (Non-Commercial) net position
  mmMinusIndex: number; // MM Net - Index Net (roll pressure indicator)
  change: number; // Week-over-week change
  isChangeSignificant: boolean; // > 2 std dev
  isPctOIExtreme: boolean; // 98th or 2nd percentile
  isPctOIHigh: boolean; // true if 98th, false if 2nd
  recordMax: number;
  recordMin: number;
  pctMax: number; // Current as % of record max
  // Roll position stats
  rollMin: number; // Historical min of (MM - Index)
  rollMax: number; // Historical max of (MM - Index)
  rollZScore: number; // Z-score of current (MM - Index)
  pctOfMin: number; // Current as % of historical min
  // Historical data for charts
  historicalData: {
    date: string;
    indexNet: number;
    indexPctOI: number;
    mmNet: number;
    mmMinusIndex: number;
  }[];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sector = searchParams.get("sector") || "ags";

  // CIT only available for ags
  if (sector !== "ags") {
    return NextResponse.json({
      success: false,
      error: "CIT report only available for agricultural commodities",
    });
  }

  try {
    const contractIds = Object.keys(CIT_CONTRACTS) as CITContractId[];
    const results: CITContractData[] = [];

    // Fetch all contracts in parallel
    const allDataPromises = contractIds.map(async (contractId) => {
      const contract = CIT_CONTRACTS[contractId];
      const records = await fetchAllData(contract.code);

      if (records.length === 0) {
        return null;
      }

      // Get latest record and previous for change calculation
      const latest = records[records.length - 1];
      const previous = records.length > 1 ? records[records.length - 2] : null;
      const change = previous ? latest.indexNet - previous.indexNet : 0;

      // Calculate weekly changes for std dev calculation
      const weeklyChanges: number[] = [];
      for (let i = 1; i < records.length; i++) {
        weeklyChanges.push(records[i].indexNet - records[i - 1].indexNet);
      }

      // Calculate std dev of changes
      let isChangeSignificant = false;
      if (weeklyChanges.length > 10) {
        const mean = weeklyChanges.reduce((a, b) => a + b, 0) / weeklyChanges.length;
        const variance = weeklyChanges.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / weeklyChanges.length;
        const stdDev = Math.sqrt(variance);
        isChangeSignificant = Math.abs(change) > 2 * stdDev;
      }

      // Calculate percentile for %OI
      const pctOIValues = records.map(r => r.indexPctOI).sort((a, b) => a - b);
      const currentPctOI = latest.indexPctOI;
      const rank = pctOIValues.filter(v => v < currentPctOI).length;
      const percentile = (rank / pctOIValues.length) * 100;
      const isPctOIExtreme = percentile >= 98 || percentile <= 2;
      const isPctOIHigh = percentile >= 98;

      // Calculate record max/min
      let recordMax = -Infinity;
      let recordMin = Infinity;
      for (const r of records) {
        if (r.indexNet > recordMax) recordMax = r.indexNet;
        if (r.indexNet < recordMin) recordMin = r.indexNet;
      }

      // % of max (current position as % of record maximum)
      const pctMax = recordMax > 0 ? (latest.indexNet / recordMax) * 100 : 0;

      // Calculate roll position metrics (MM - Index)
      const rollValues = records.map(r => r.nonCommNet - r.indexNet);
      let rollMin = Math.min(...rollValues);
      let rollMax = Math.max(...rollValues);
      const currentRoll = latest.nonCommNet - latest.indexNet;

      // Calculate Z-score for roll position
      const rollMean = rollValues.reduce((a, b) => a + b, 0) / rollValues.length;
      const rollVariance = rollValues.reduce((sum, val) => sum + Math.pow(val - rollMean, 2), 0) / rollValues.length;
      const rollStdDev = Math.sqrt(rollVariance);
      const rollZScore = rollStdDev > 0 ? (currentRoll - rollMean) / rollStdDev : 0;

      // % of min (current as % of historical minimum - for tracking extremes)
      const pctOfMin = rollMin < 0 ? (currentRoll / rollMin) * 100 : 0;

      // Historical data for charts
      const historicalData = records.map(r => ({
        date: r.date,
        indexNet: r.indexNet,
        indexPctOI: r.indexPctOI,
        mmNet: r.nonCommNet,
        mmMinusIndex: r.nonCommNet - r.indexNet,
      }));

      return {
        id: contractId,
        name: contract.name,
        latestDate: latest.date,
        indexNet: latest.indexNet,
        indexPctOI: latest.indexPctOI,
        mmNet: latest.nonCommNet,
        mmMinusIndex: currentRoll,
        change,
        isChangeSignificant,
        isPctOIExtreme,
        isPctOIHigh,
        recordMax: recordMax === -Infinity ? 0 : recordMax,
        recordMin: recordMin === Infinity ? 0 : recordMin,
        pctMax,
        rollMin,
        rollMax,
        rollZScore,
        pctOfMin,
        historicalData,
      } as CITContractData;
    });

    const allData = await Promise.all(allDataPromises);

    for (const data of allData) {
      if (data) results.push(data);
    }

    // Get latest report date
    const reportDate = results.length > 0 ? results[0].latestDate : "";

    return NextResponse.json({
      success: true,
      sector,
      reportDate,
      contracts: results,
    });
  } catch (error) {
    console.error("Error fetching CIT data:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to fetch CIT data",
    });
  }
}
