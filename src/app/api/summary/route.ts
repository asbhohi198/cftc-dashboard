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

interface SummaryRow {
  id: string;
  label: string;
  fullName: string;
  isAggregate: boolean;
  positionDate: string;
  openInterest: {
    size: number;
    change: number;
    pctChange: number;
  };
  producer: {
    net: number;
    change: number;
    pctOI: number;
  };
  nonReportables: {
    net: number;
    change: number;
    pctOI: number;
  };
  producerNonRept: {
    net: number;
    change: number;
    pctOI: number;
  };
  swapDealer: {
    net: number;
    change: number;
    pctOI: number;
  };
  managedMoney: {
    net: number;
    change: number;
    pctOI: number;
  };
  otherReportables: {
    net: number;
    change: number;
    pctOI: number;
  };
  spec: {
    net: number;
    change: number;
    pctOI: number;
  };
}

function calculateRow(data: COTRecord[], label: string, fullName: string, id: string, isAggregate: boolean): SummaryRow | null {
  if (data.length < 2) return null;

  const latest = data[data.length - 1];
  const previous = data[data.length - 2];

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
      change: oiChange,
      pctChange: oiPctChange,
    },
    producer: {
      net: producerNet,
      change: producerChange,
      pctOI: producerPctOI,
    },
    nonReportables: {
      net: nonReptNet,
      change: nonReptChange,
      pctOI: nonReptPctOI,
    },
    producerNonRept: {
      net: prodNonReptNet,
      change: prodNonReptChange,
      pctOI: prodNonReptPctOI,
    },
    swapDealer: {
      net: swapNet,
      change: swapChange,
      pctOI: swapPctOI,
    },
    managedMoney: {
      net: mmNet,
      change: mmChange,
      pctOI: mmPctOI,
    },
    otherReportables: {
      net: otherNet,
      change: otherChange,
      pctOI: otherPctOI,
    },
    spec: {
      net: specNet,
      change: specChange,
      pctOI: specPctOI,
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

    // Get latest position date
    const latestDate = rows.length > 0 ? rows[0].positionDate : "";

    return NextResponse.json({
      success: true,
      positionDate: latestDate,
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
