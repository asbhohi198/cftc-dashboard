import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { MATIF_CONTRACTS, MatifContractId, MatifRecord, matifToCOTRecord, COTRecord } from "@/lib/cftc";

// Cache for Matif data
let matifCache: Map<MatifContractId, MatifRecord[]> = new Map();
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

interface MatifDataFile {
  updated: string;
  data: Record<MatifContractId, MatifRecord[]>;
}

// Load Matif data from JSON file (updated by scraper script)
async function loadMatifData(): Promise<MatifDataFile | null> {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "matif_cot.json");
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    // Return sample data if file doesn't exist yet
    return getSampleData();
  }
}

// Sample data structure for when the JSON file hasn't been created yet
function getSampleData(): MatifDataFile {
  const today = new Date();
  const lastFriday = new Date(today);
  lastFriday.setDate(today.getDate() - ((today.getDay() + 2) % 7));
  const dateStr = lastFriday.toISOString().split("T")[0];

  const sampleRecord = (name: string): MatifRecord => ({
    date: dateStr,
    reportDate: new Date().toISOString().split("T")[0],
    openInterest: 350000,
    invFirmsLong: 15000,
    invFirmsShort: 12000,
    invFirmsNet: 3000,
    invFirmsTraders: 25,
    invFirmsPctOI: 4.3,
    invFundsLong: 85000,
    invFundsShort: 45000,
    invFundsNet: 40000,
    invFundsTraders: 120,
    invFundsPctOI: 24.3,
    otherFinLong: 8000,
    otherFinShort: 10000,
    otherFinNet: -2000,
    otherFinTraders: 15,
    otherFinPctOI: 2.3,
    commercialLong: 180000,
    commercialShort: 220000,
    commercialNet: -40000,
    commercialTraders: 85,
    commercialPctOI: 51.4,
    emissionsLong: 0,
    emissionsShort: 0,
    emissionsNet: 0,
    emissionsTraders: 0,
    emissionsPctOI: 0,
  });

  return {
    updated: new Date().toISOString(),
    data: {
      "matif-wheat": [sampleRecord("Matif Wheat")],
      "matif-corn": [sampleRecord("Matif Corn")],
      "matif-rapeseed": [sampleRecord("Matif Rapeseed")],
    },
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const contractParam = searchParams.get("contract") as MatifContractId | null;
  const format = searchParams.get("format"); // "cot" to get COTRecord format

  try {
    // Check cache
    if (Date.now() - cacheTimestamp < CACHE_DURATION && matifCache.size > 0) {
      if (contractParam) {
        const data = matifCache.get(contractParam);
        if (!data) {
          return NextResponse.json({ success: false, error: "Contract not found" }, { status: 404 });
        }

        if (format === "cot") {
          // Convert to COTRecord format for compatibility
          const cotData: COTRecord[] = data.map(matifToCOTRecord);
          return NextResponse.json({ success: true, data: cotData });
        }

        return NextResponse.json({ success: true, data });
      }

      // Return all contracts
      const allData: Record<string, MatifRecord[]> = {};
      matifCache.forEach((records, id) => {
        allData[id] = records;
      });
      return NextResponse.json({ success: true, data: allData });
    }

    // Load fresh data
    const fileData = await loadMatifData();
    if (!fileData) {
      return NextResponse.json({ success: false, error: "No data available" }, { status: 500 });
    }

    // Update cache
    matifCache = new Map();
    for (const [id, records] of Object.entries(fileData.data)) {
      matifCache.set(id as MatifContractId, records);
    }
    cacheTimestamp = Date.now();

    if (contractParam) {
      const data = matifCache.get(contractParam);
      if (!data) {
        return NextResponse.json({ success: false, error: "Contract not found" }, { status: 404 });
      }

      if (format === "cot") {
        const cotData: COTRecord[] = data.map(matifToCOTRecord);
        return NextResponse.json({ success: true, data: cotData });
      }

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({
      success: true,
      updated: fileData.updated,
      contracts: Object.keys(MATIF_CONTRACTS),
      data: fileData.data,
    });
  } catch (error) {
    console.error("Error in matif-cot API:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch data" }, { status: 500 });
  }
}
