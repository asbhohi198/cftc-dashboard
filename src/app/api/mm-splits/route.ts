import { NextResponse } from "next/server";

// Contract configurations for G&O
const GO_CONTRACTS = [
  { id: "corn", label: "C", name: "Corn" },
  { id: "chicago-wheat", label: "W", name: "Chicago Wheat" },
  { id: "kansas-wheat", label: "KW", name: "Kansas Wheat" },
  { id: "minneapolis-wheat", label: "MW", name: "Minneapolis Wheat" },
  { id: "soybeans", label: "S", name: "Soybeans" },
  { id: "soymeal", label: "SM", name: "Soymeal" },
  { id: "soyoil", label: "BO", name: "Soyoil" },
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

export async function GET() {
  try {
    // Fetch data for all contracts in parallel
    const results = await Promise.all(
      GO_CONTRACTS.map(async (contract) => {
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000";

        const res = await fetch(`${baseUrl}/api/cot?contract=${contract.id}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          return null;
        }

        const json = await res.json();
        if (!json.success || !json.data || json.data.length < 2) {
          return null;
        }

        const data = json.data;
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
        } as MMSplitData;
      })
    );

    // Filter out any failed requests
    const validResults = results.filter((r): r is MMSplitData => r !== null);

    // Get the position date from the first successful result
    let positionDate = "";
    for (const contract of GO_CONTRACTS) {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

      const res = await fetch(`${baseUrl}/api/cot?contract=${contract.id}`, {
        cache: "no-store",
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data && json.data.length > 0) {
          positionDate = json.data[json.data.length - 1].date;
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      positionDate,
      data: validResults,
    });
  } catch (error) {
    console.error("Error fetching MM splits data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
