"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { X } from "lucide-react";

interface CITRow {
  id: string;
  name: string;
  latestDate: string;
  indexNet: number;
  mmNet: number;
  mmMinusIndex: number;
  rollMin: number;
  rollMax: number;
  rollZScore: number;
  pctOfMin: number;
  historicalData: {
    date: string;
    indexNet: number;
    mmNet: number;
    mmMinusIndex: number;
  }[];
}

interface APIResponse {
  success: boolean;
  sector: string;
  reportDate: string;
  contracts: CITRow[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatChartDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatNumber(num: number): string {
  if (Math.abs(num) >= 1000000) {
    return (num / 1000000).toFixed(0) + "M";
  }
  const inK = num / 1000;
  return inK.toFixed(0) + "K";
}

// GSCI Roll Window Configuration
// Roll windows are typically 5th-9th business day of the month
const GSCI_CONTRACT_MONTHS: Record<string, number[]> = {
  "corn": [3, 5, 7, 9, 12], // Mar, May, Jul, Sep, Dec
  "soybeans": [1, 3, 5, 7, 8, 9, 11], // Jan, Mar, May, Jul, Aug, Sep, Nov
  "chicago-wheat": [3, 5, 7, 9, 12],
  "kansas-wheat": [3, 5, 7, 9, 12],
  "soyoil": [1, 3, 5, 7, 8, 9, 10, 12],
  "soymeal": [1, 3, 5, 7, 8, 9, 10, 12],
  "live-cattle": [2, 4, 6, 8, 10, 12],
  "lean-hogs": [2, 4, 5, 6, 7, 8, 10, 12],
  "feeder-cattle": [1, 3, 4, 5, 8, 9, 10, 11],
  "sugar": [3, 5, 7, 10],
  "arabica-coffee": [3, 5, 7, 9, 12],
  "ny-cocoa": [3, 5, 7, 9, 12],
  "cotton": [3, 5, 7, 10, 12],
};

const MONTH_CODES: Record<number, string> = {
  1: "F", 2: "G", 3: "H", 4: "J", 5: "K", 6: "M",
  7: "N", 8: "Q", 9: "U", 10: "V", 11: "X", 12: "Z"
};

const MONTH_NAMES: Record<number, string> = {
  1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
  7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec"
};

const COMMODITY_SYMBOLS: Record<string, string> = {
  "corn": "C",
  "soybeans": "S",
  "chicago-wheat": "W",
  "kansas-wheat": "KW",
  "soyoil": "BO",
  "soymeal": "SM",
  "live-cattle": "LC",
  "lean-hogs": "LH",
  "feeder-cattle": "FC",
  "sugar": "SB",
  "arabica-coffee": "KC",
  "ny-cocoa": "CC",
  "cotton": "CT",
};

function getNextRollWindow(commodityId: string): { spread: string; rollDates: string } {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();

  const contractMonths = GSCI_CONTRACT_MONTHS[commodityId] || [3, 5, 7, 9, 12];
  const symbol = COMMODITY_SYMBOLS[commodityId] || commodityId.toUpperCase();

  // Find the next contract month (the one we're rolling FROM)
  let frontMonth = -1;
  let frontYear = currentYear;

  for (const month of contractMonths) {
    if (month > currentMonth) {
      frontMonth = month;
      break;
    }
  }

  // If no month found this year, use first month of next year
  if (frontMonth === -1) {
    frontMonth = contractMonths[0];
    frontYear = currentYear + 1;
  }

  // Find the back month (what we're rolling TO)
  const frontIdx = contractMonths.indexOf(frontMonth);
  let backMonth: number;
  let backYear = frontYear;

  if (frontIdx < contractMonths.length - 1) {
    backMonth = contractMonths[frontIdx + 1];
  } else {
    backMonth = contractMonths[0];
    backYear = frontYear + 1;
  }

  // Format spread name
  const frontCode = MONTH_CODES[frontMonth];
  const backCode = MONTH_CODES[backMonth];
  const frontYearShort = frontYear.toString().slice(-2);
  const backYearShort = backYear.toString().slice(-2);

  const spread = `${symbol}${frontCode}${frontYearShort}/${symbol}${backCode}${backYearShort}`;

  // Calculate roll window dates (5th-9th business day of front month)
  // Approximate: assume roll window is around 7th-11th calendar day
  const rollStart = new Date(frontYear, frontMonth - 1, 5);
  const rollEnd = new Date(frontYear, frontMonth - 1, 9);

  const rollDates = `${MONTH_NAMES[frontMonth]} ${rollStart.getDate()}-${rollEnd.getDate()}`;

  return { spread, rollDates };
}

function getSignal(commodityId: string, name: string, zScore: number): string | null {
  if (Math.abs(zScore) < 1.5) return null;

  const { spread, rollDates } = getNextRollWindow(commodityId);

  if (zScore <= -1.5) {
    // Negative Z-score: Index much larger than MM, heavy sell pressure on roll
    // Signal: Buy the spread (buy nearby, sell deferred) to fade the pressure
    return `BUY ${spread} into roll (${rollDates})`;
  } else {
    // Positive Z-score: MM larger than Index, less roll pressure
    // Signal: Sell the spread (sell nearby, buy deferred)
    return `SELL ${spread} into roll (${rollDates})`;
  }
}

export function CITRollTab() {
  const [data, setData] = useState<CITRow[]>([]);
  const [reportDate, setReportDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/cit-index?sector=ags`);
        const json: APIResponse = await res.json();
        if (json.success) {
          // Sort by Z-score (most negative first = most selling pressure)
          const sorted = [...json.contracts].sort((a, b) => a.rollZScore - b.rollZScore);
          setData(sorted);
          setReportDate(json.reportDate);
        } else {
          setError("Failed to load data");
        }
      } catch {
        setError("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-zinc-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-10 bg-zinc-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  // Get color for % of min
  const getPctOfMinColor = (pct: number): string => {
    if (pct >= 80) return "text-red-400"; // Close to historical min (bad for rolls)
    if (pct >= 50) return "text-orange-400";
    if (pct <= -50) return "text-green-400"; // Far from min (good)
    return "text-zinc-400";
  };

  // Get color for Z-score
  const getZScoreColor = (z: number): string => {
    if (z <= -2) return "bg-red-500/30 text-red-400";
    if (z <= -1) return "bg-orange-500/20 text-orange-400";
    if (z >= 2) return "bg-green-500/30 text-green-400";
    if (z >= 1) return "bg-green-500/20 text-green-400";
    return "text-zinc-400";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              CIT Roll Position Analysis
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Net MM - Index Position: Measures roll pressure. Negative = Index larger than MM. Ranked by Z-score.
            </p>
          </div>
          {reportDate && (
            <div className="text-right">
              <p className="text-xs text-zinc-500">Report Date</p>
              <p className="text-sm font-medium text-white">{formatDate(reportDate)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-800/50 border-b border-zinc-700">
              <th className="text-left py-3 px-4 text-zinc-400 font-medium">Commodity</th>
              <th className="text-center py-3 px-4 text-zinc-400 font-medium">Net MM</th>
              <th className="text-center py-3 px-4 text-zinc-400 font-medium">Index</th>
              <th className="text-center py-3 px-4 text-zinc-400 font-medium">Min</th>
              <th className="text-center py-3 px-4 text-zinc-400 font-medium">Net MM - Index</th>
              <th className="text-center py-3 px-4 text-zinc-400 font-medium">Max</th>
              <th className="text-center py-3 px-4 text-zinc-400 font-medium">% of Min</th>
              <th className="text-center py-3 px-4 text-zinc-400 font-medium">Z-Score</th>
              <th className="text-left py-3 px-4 text-zinc-400 font-medium">Signal</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const signal = getSignal(row.id, row.name, row.rollZScore);
              return (
              <tr key={row.id} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                <td className="py-2 px-4 text-white font-medium">{row.name}</td>
                <td className={`py-2 px-4 text-center font-mono ${row.mmNet >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {row.mmNet.toLocaleString()}
                </td>
                <td className="py-2 px-4 text-center font-mono text-blue-400">
                  {row.indexNet.toLocaleString()}
                </td>
                <td className="py-2 px-4 text-center font-mono text-zinc-400">{formatNumber(row.rollMin)}</td>
                <td className={`py-2 px-4 text-center font-mono font-bold ${row.mmMinusIndex >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {formatNumber(row.mmMinusIndex)}
                </td>
                <td className="py-2 px-4 text-center font-mono text-zinc-400">{formatNumber(row.rollMax)}</td>
                <td className={`py-2 px-4 text-center font-mono ${getPctOfMinColor(row.pctOfMin)}`}>
                  {row.pctOfMin.toFixed(0)}%
                </td>
                <td className={`py-2 px-4 text-center font-mono font-bold rounded ${getZScoreColor(row.rollZScore)}`}>
                  {row.rollZScore.toFixed(2)}
                </td>
                <td className={`py-2 px-4 text-left text-xs ${signal?.startsWith("BUY") ? "text-green-400" : signal?.startsWith("SELL") ? "text-red-400" : "text-zinc-500"}`}>
                  {signal || "-"}
                </td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>

      {/* Separator */}
      <div className="border-t border-zinc-700 my-6"></div>

      {/* Individual Commodity Charts */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Individual Commodity Roll Positions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.map((row) => (
            <div
              key={row.id}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 cursor-pointer hover:border-zinc-600 transition-colors"
              onClick={() => setExpandedChart(row.id)}
            >
              <h4 className="text-sm font-semibold text-white mb-2">{row.name} Net MM - Index</h4>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={row.historicalData} margin={{ top: 5, right: 5, left: -20, bottom: 18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#ffffff", fontSize: 8 }}
                      angle={-90}
                      textAnchor="end"
                      height={25}
                      tickFormatter={formatChartDate}
                      interval={Math.floor(row.historicalData.length / 4)}
                      dy={15}
                    />
                    <YAxis
                      tick={{ fill: "#ffffff", fontSize: 8 }}
                      tickFormatter={(v) => formatNumber(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "0.5rem",
                        fontSize: "12px",
                        color: "#ffffff",
                      }}
                      labelStyle={{ color: "#ffffff" }}
                      labelFormatter={(label) => formatDate(label)}
                      formatter={(value: number) => [formatNumber(value), "MM - Index"]}
                    />
                    <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="mmMinusIndex"
                      name={`${row.name} MM - Index`}
                      stroke="#3b82f6"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Expanded Chart Modal */}
      {expandedChart && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedChart(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {data.find(d => d.id === expandedChart)?.name} - Net MM - Index Position
              </h3>
              <button
                onClick={() => setExpandedChart(null)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="h-[665px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.find(d => d.id === expandedChart)?.historicalData}
                  margin={{ top: 10, right: 20, left: -5, bottom: 50 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#ffffff", fontSize: 14 }}
                    angle={-90}
                    textAnchor="end"
                    height={60}
                    tickFormatter={formatChartDate}
                    interval={Math.floor((data.find(d => d.id === expandedChart)?.historicalData.length || 100) / 20)}
                    dy={35}
                  />
                  <YAxis
                    tick={{ fill: "#ffffff", fontSize: 14 }}
                    tickFormatter={(v) => formatNumber(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "0.5rem",
                      fontSize: "14px",
                      color: "#ffffff",
                    }}
                    labelStyle={{ color: "#ffffff" }}
                    labelFormatter={(label) => formatDate(label)}
                    formatter={(value: number) => [formatNumber(value), "MM - Index"]}
                  />
                  <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="mmMinusIndex"
                    name="MM - Index"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
