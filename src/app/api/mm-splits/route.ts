import { NextResponse } from "next/server";
import JSZip from "jszip";
import { CFTC_CONTRACTS, COTRecord, parseRow, getCFTCUrl } from "@/lib/cftc";

// Contract configurations for G&O
const GO_CONTRACTS = [
  { id: "corn" as const, label: "C", name: "Corn" },
  { id: "chicago-wheat" as const, label: "W", name: "Chicago Wheat" },
  { id: "kansas-wheat" as const, label: "KW", name: "Kansas Wheat" },
  { id: "minneapolis-wheat" as const, label: "MW", name: "Minneapolis Wheat" },
  { id: "soybeans" as const, label: "S", name: "Soybeans" },
  { id: "soymeal" as const, label: "SM", name: "Soymeal" },
  { id: "soyoil" as const, label: "BO", name: "Soyoil" },
];

interface MMSplitData {
  label: string;
  name: string;
  oc: number;
  nc: number;
  netMM: number;
  ocChange: number;
  ncChange: number;
  netMMChange: number;
}

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
      if (!line.includes(`"${contractCode}"`)) continue;

      const record = parseRow(line);
      if (record) {
        records.push(record);
      }
    }

    return records;
  } catch {
    return [];
  }
}

async function fetchContractData(contractCode: string): Promise<COTRecord[]> {
  const cacheKey = `mm_splits_${contractCode}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const currentYear = new Date().getFullYear();
  // Only fetch last 2 years for speed - we just need latest data
  const years = [currentYear - 1, currentYear];

  const allRecords: COTRecord[] = [];

  const batchResults = await Promise.all(
    years.map(year => fetchYearData(year, contractCode))
  );

  for (const records of batchResults) {
    allRecords.push(...records);
  }

  allRecords.sort((a, b) => a.date.localeCompare(b.date));

  cache.set(cacheKey, { data: allRecords, timestamp: Date.now() });

  return allRecords;
}

export async function GET() {
  try {
    // Fetch data for all contracts in parallel
    const results = await Promise.all(
      GO_CONTRACTS.map(async (contract) => {
        const contractConfig = CFTC_CONTRACTS[contract.id];
        const data = await fetchContractData(contractConfig.code);

        if (data.length < 2) {
          return null;
        }

        const latest = data[data.length - 1];
        const previous = data[data.length - 2];

        return {
          label: contract.label,
          name: contract.name,
          oc: latest.mmNetOld,
          nc: latest.mmNetOther,
          netMM: latest.mmNetAll,
          ocChange: latest.mmNetOld - previous.mmNetOld,
          ncChange: latest.mmNetOther - previous.mmNetOther,
          netMMChange: latest.mmNetAll - previous.mmNetAll,
          positionDate: latest.date,
        };
      })
    );

    // Filter out any failed requests
    const validResults = results.filter((r): r is MMSplitData & { positionDate: string } => r !== null);

    // Get position date from first result
    const positionDate = validResults.length > 0 ? validResults[0].positionDate : "";

    // Remove positionDate from individual items
    const finalData: MMSplitData[] = validResults.map(({ positionDate: _, ...rest }) => rest);

    return NextResponse.json({
      success: true,
      positionDate,
      data: finalData,
    });
  } catch (error) {
    console.error("Error fetching MM splits data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
