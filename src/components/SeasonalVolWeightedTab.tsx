"use client";

import { useEffect, useState, useMemo } from "react";
import { SeasonalCOTChart, YearRange } from "./SeasonalCOTChart";
import { ArrowUp, ArrowDown } from "lucide-react";

// Get current day of year
function getCurrentDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// Get day of year from date string
function getDayOfYear(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const start = new Date(year, 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// Check if current year value is record max/min for this day of year
function checkRecordStatus(
  data: { date: string; value: number }[],
  tolerance: number = 7
): { isMax: boolean; isMin: boolean; currentValue: number | null } {
  const currentYear = new Date().getFullYear();
  const currentDayOfYear = getCurrentDayOfYear();

  let currentValue: number | null = null;
  let currentDayFound = 0;
  const historicalValues: number[] = [];

  data.forEach((d) => {
    const [year] = d.date.split("-").map(Number);
    const dayOfYear = getDayOfYear(d.date);

    if (Math.abs(dayOfYear - currentDayOfYear) <= tolerance) {
      if (year === currentYear) {
        if (currentValue === null || Math.abs(dayOfYear - currentDayOfYear) < Math.abs(currentDayFound - currentDayOfYear)) {
          currentValue = d.value;
          currentDayFound = dayOfYear;
        }
      } else {
        historicalValues.push(d.value);
      }
    }
  });

  if (currentValue === null || historicalValues.length === 0) {
    return { isMax: false, isMin: false, currentValue: null };
  }

  const historicalMax = Math.max(...historicalValues);
  const historicalMin = Math.min(...historicalValues);

  return {
    isMax: currentValue > historicalMax,
    isMin: currentValue < historicalMin,
    currentValue,
  };
}

interface VolWeightedRow {
  id: string;
  name: string;
  category: string;
  latestDate: string;
  mmNet: number;
  mmNetPctOI: number;
  volatility: number;
  volAdjustedPosition: number;
  change: number;
  changePct: number;
  recordMax: number;
  recordMin: number;
  pctMax: number;
  historicalData: {
    date: string;
    mmNet: number;
    volAdjustedPosition: number;
  }[];
}

interface APIResponse {
  success: boolean;
  sector: string;
  sectorLabel: string;
  reportDate: string;
  totalVolAdj: number;
  totalChange: number;
  contracts: VolWeightedRow[];
}

const SECTOR_LABELS: Record<string, string> = {
  ags: "Grains & Oilseeds",
  softs: "Softs",
  livestock: "Livestock",
  energy: "Energy",
  metals: "Metals",
  equities: "Equities",
  rates: "Rates",
  fx: "FX",
  crypto: "Crypto",
};

interface SeasonalVolWeightedTabProps {
  sector?: string;
}

export function SeasonalVolWeightedTab({ sector = "ags" }: SeasonalVolWeightedTabProps) {
  const [contracts, setContracts] = useState<VolWeightedRow[]>([]);
  const [sectorLabel, setSectorLabel] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yearRange, setYearRange] = useState<YearRange>("all");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/cot-vol-weighted?sector=${sector}`);
        const json: APIResponse = await res.json();

        if (json.success) {
          setContracts(json.contracts);
          setSectorLabel(json.sectorLabel || SECTOR_LABELS[sector] || sector);
        } else {
          setError("Failed to fetch data");
        }
      } catch (err) {
        setError("Failed to fetch data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [sector]);

  // Transform contract data to chart format
  const chartDataByContract = useMemo(() => {
    return contracts.map((contract) => ({
      id: contract.id,
      name: contract.name,
      volAdjData: contract.historicalData.map((d) => ({
        date: d.date,
        value: d.volAdjustedPosition,
      })),
      mmNetData: contract.historicalData.map((d) => ({
        date: d.date,
        value: d.mmNet,
      })),
    }));
  }, [contracts]);

  // Calculate record status for each contract
  const recordStatuses = useMemo(() => {
    if (chartDataByContract.length === 0) return [];

    const records: { name: string; isMax: boolean; isMin: boolean }[] = [];

    chartDataByContract.forEach(({ name, volAdjData }) => {
      const status = checkRecordStatus(volAdjData);
      if (status.isMax || status.isMin) {
        records.push({ name: `${name} Vol-Adj`, isMax: status.isMax, isMin: status.isMin });
      }
    });

    return records;
  }, [chartDataByContract]);

  if (error) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      {!loading && contracts.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                COT - Vol Weighted: {sectorLabel} - Seasonal View
              </h2>
              <p className="text-xs text-zinc-500">
                Day-of-year overlay comparing multiple years (Vol-Adjusted Positions)
              </p>
              {/* Record Highs/Lows */}
              {recordStatuses.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {recordStatuses.map((record, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        record.isMax
                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                          : "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {record.isMax ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {record.name}: Record {record.isMax ? "High" : "Low"}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              {/* Year Range Toggle */}
              <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
                {(["5", "10", "15", "all"] as YearRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => setYearRange(range)}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      yearRange === range
                        ? "bg-orange-500 text-white"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-700"
                    }`}
                  >
                    {range === "all" ? "All" : `${range}Y`}
                  </button>
                ))}
              </div>
              {/* Legend */}
              <div className="flex items-center gap-3 text-xs text-zinc-500 border-l border-zinc-700 pl-4">
                <div className="flex items-center gap-1">
                  <div className="w-6 h-1 bg-white rounded"></div>
                  <span className="text-white font-medium">{new Date().getFullYear()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-0.5 bg-zinc-500 rounded"></div>
                  <span>Historical</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vol-Adjusted Position Charts */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white border-b border-zinc-700 pb-2">
          MM Vol-Adjusted Position - Seasonal
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {chartDataByContract.map((contract) => (
            <SeasonalCOTChart
              key={contract.id}
              title={`${contract.name} Vol-Adj`}
              data={contract.volAdjData}
              yearRange={yearRange}
              loading={loading}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
