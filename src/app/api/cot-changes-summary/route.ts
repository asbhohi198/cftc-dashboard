import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import fs from "fs";
import { COTRecord, ContractId } from "@/lib/cftc";

// Fixed order of commodities from Excel CFTC_Changes sheet
// Maps Excel commodity names to CFTC contract IDs (null = no US data available)
const COMMODITY_MAP: { excelName: string; contractId: ContractId | null }[] = [
  { excelName: "Corn", contractId: "corn" },
  { excelName: "Soybeans", contractId: "soybeans" },
  { excelName: "Chicago Wheat", contractId: "chicago-wheat" },
  { excelName: "Kansas Wheat", contractId: "kansas-wheat" },
  { excelName: "Minneapolis Wheat", contractId: "minneapolis-wheat" },
  { excelName: "Matif Wheat", contractId: null }, // European
  { excelName: "Soybean Oil", contractId: "soyoil" },
  { excelName: "Soybean Meal", contractId: "soymeal" },
  { excelName: "Canola", contractId: null }, // Canadian
  { excelName: "Rapeseed", contractId: null }, // European
  { excelName: "Live Cattle", contractId: "live-cattle" },
  { excelName: "Lean Hogs", contractId: "lean-hogs" },
  { excelName: "Feeder Cattle", contractId: "feeder-cattle" },
  { excelName: "NY Sugar", contractId: "sugar" },
  { excelName: "LDN Sugar", contractId: null }, // European
  { excelName: "NY Coffee", contractId: "arabica-coffee" },
  { excelName: "LDN Robusta", contractId: null }, // European
  { excelName: "NY Cocoa", contractId: "ny-cocoa" },
  { excelName: "LDN Cocoa", contractId: null }, // European
  { excelName: "Cotton", contractId: "cotton" },
];

interface SummaryRow {
  id: string;
  commodity: string;
  contractId: ContractId | null;
  netMMWoWChange: number;
  zScore: number;
  hasHistoricalData: boolean;
  historicalChanges: { date: string; change: number }[];
}

interface ExcelRow {
  commodity: string;
  change: number;
  zScore: number;
}

// Read CFTC_Changes sheet from Excel
function readExcelData(): { rows: ExcelRow[]; reportDate: string } {
  const excelPath = "D:/Dashboards/Ag_Dashboard_2024 2.xlsx";
  const fileBuffer = fs.readFileSync(excelPath);
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const sheet = workbook.Sheets["CFTC_Changes"];

  // Read the data - based on analysis, data starts at row 4 (0-indexed: row 3)
  // Column B (1) = Commodity name
  // Column C (2) = Net MM WoW Change
  // Column D (3) = Z-score
  // Report date is at row 1 (0-indexed), column K (10)

  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  const rows: ExcelRow[] = [];
  let reportDate = "";

  // Get report date from cell K2 (row 1, col 10)
  const dateCell = sheet[XLSX.utils.encode_cell({ r: 1, c: 10 })];
  if (dateCell) {
    if (typeof dateCell.v === "number") {
      // Excel date serial number
      const date = XLSX.SSF.parse_date_code(dateCell.v);
      reportDate = `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
    } else if (dateCell.v instanceof Date) {
      reportDate = dateCell.v.toISOString().split("T")[0];
    } else {
      reportDate = String(dateCell.v);
    }
  }

  // Read commodity rows (rows 4-23 in Excel = indices 3-22)
  for (let r = 4; r <= 23; r++) {
    const commodityCell = sheet[XLSX.utils.encode_cell({ r, c: 1 })];
    const changeCell = sheet[XLSX.utils.encode_cell({ r, c: 2 })];
    const zScoreCell = sheet[XLSX.utils.encode_cell({ r, c: 3 })];

    if (commodityCell && changeCell && zScoreCell) {
      rows.push({
        commodity: String(commodityCell.v).trim(),
        change: Number(changeCell.v) || 0,
        zScore: Number(zScoreCell.v) || 0,
      });
    }
  }

  return { rows, reportDate };
}

// Calculate weekly changes from COT records
function calculateWeeklyChanges(data: COTRecord[]): { date: string; change: number }[] {
  const changes: { date: string; change: number }[] = [];
  for (let i = 1; i < data.length; i++) {
    changes.push({
      date: data[i].date,
      change: data[i].mmNetAll - data[i - 1].mmNetAll,
    });
  }
  return changes;
}

export async function GET(request: Request) {
  const baseUrl = new URL(request.url).origin;

  try {
    // Read Excel data
    const { rows: excelRows, reportDate } = readExcelData();

    // Collect all contract IDs we need to fetch
    const contractsToFetch = COMMODITY_MAP
      .filter(c => c.contractId !== null)
      .map(c => c.contractId as ContractId);

    // Fetch historical data for all contracts
    const historicalDataMap = new Map<ContractId, { date: string; change: number }[]>();

    const fetchPromises = contractsToFetch.map(async (contractId) => {
      try {
        const res = await fetch(`${baseUrl}/api/cot?contract=${contractId}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (json.success && json.data && json.data.length > 1) {
          const changes = calculateWeeklyChanges(json.data);
          historicalDataMap.set(contractId, changes);
        }
      } catch (e) {
        console.error(`Failed to fetch historical data for ${contractId}:`, e);
      }
    });

    await Promise.all(fetchPromises);

    // Build summary rows by matching Excel data to COMMODITY_MAP
    const summaryRows: SummaryRow[] = [];

    for (const excelRow of excelRows) {
      // Find matching commodity in our map
      const mapping = COMMODITY_MAP.find(
        m => m.excelName.toLowerCase() === excelRow.commodity.toLowerCase()
      );

      if (mapping) {
        const historicalChanges = mapping.contractId
          ? historicalDataMap.get(mapping.contractId) || []
          : [];

        summaryRows.push({
          id: mapping.excelName.toLowerCase().replace(/\s+/g, "-"),
          commodity: excelRow.commodity,
          contractId: mapping.contractId,
          netMMWoWChange: excelRow.change,
          zScore: excelRow.zScore,
          hasHistoricalData: historicalChanges.length > 0,
          historicalChanges,
        });
      }
    }

    return NextResponse.json({
      success: true,
      reportDate,
      rows: summaryRows,
    });
  } catch (error) {
    console.error("Error in cot-changes-summary:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
