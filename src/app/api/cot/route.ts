import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { CFTC_CONTRACTS, ContractId, COTRecord, parseRow, getYearsToFetch, getCFTCUrl } from "@/lib/cftc";

// In-memory cache
const cache: Map<string, { data: COTRecord[]; timestamp: number }> = new Map();
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

async function fetchYearData(year: number, contractCode: string): Promise<COTRecord[]> {
  const url = getCFTCUrl(year);

  try {
    const response = await fetch(url, {
      headers: { "Accept-Encoding": "gzip, deflate" },
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`);
      return [];
    }

    const arrayBuffer = await response.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Find the txt file in the zip
    const txtFile = Object.keys(zip.files).find(name => name.endsWith('.txt'));
    if (!txtFile) {
      console.error(`No txt file found in ${url}`);
      return [];
    }

    const content = await zip.files[txtFile].async("string");
    const lines = content.split("\n");

    const records: COTRecord[] = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check if this row is for our contract
      if (!line.includes(`"${contractCode}"`)) continue;

      const record = parseRow(line);
      if (record) {
        records.push(record);
      }
    }

    return records;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return [];
  }
}

async function fetchAllData(contractCode: string): Promise<COTRecord[]> {
  const years = getYearsToFetch();
  const allRecords: COTRecord[] = [];

  // Fetch all years in parallel (batched to avoid overwhelming)
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

  // Sort by date ascending
  allRecords.sort((a, b) => a.date.localeCompare(b.date));

  return allRecords;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contractId = searchParams.get("contract") as ContractId;

  if (!contractId || !CFTC_CONTRACTS[contractId]) {
    return NextResponse.json(
      { success: false, error: "Invalid contract ID" },
      { status: 400 }
    );
  }

  const contract = CFTC_CONTRACTS[contractId];
  const cacheKey = `cot_${contractId}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json({
      success: true,
      contract: {
        id: contractId,
        name: contract.name,
        exchange: contract.exchange,
        code: contract.code,
      },
      data: cached.data,
      cached: true,
    });
  }

  try {
    const data = await fetchAllData(contract.code);

    // Update cache
    cache.set(cacheKey, { data, timestamp: Date.now() });

    return NextResponse.json({
      success: true,
      contract: {
        id: contractId,
        name: contract.name,
        exchange: contract.exchange,
        code: contract.code,
      },
      data,
      cached: false,
    });
  } catch (error) {
    console.error("Error fetching COT data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
