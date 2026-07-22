"use client";

import { useEffect, useState, useMemo } from "react";
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
import { X, ArrowUpDown, AlertTriangle } from "lucide-react";

type TimeRange = "1y" | "2y" | "5y" | "all";
type SortField = "name" | "current" | "change" | "mean" | "stdDev" | "zScore";
type SortDirection = "asc" | "desc";

const TIME_RANGE_OPTIONS: { id: TimeRange; label: string; weeks: number | null }[] = [
  { id: "1y", label: "1Y", weeks: 52 },
  { id: "2y", label: "2Y", weeks: 104 },
  { id: "5y", label: "5Y", weeks: 260 },
  { id: "all", label: "All", weeks: null },
];

interface SpreadDataPoint {
  date: string;
  mmNetSpread: number;
  leg1MmNet: number;
  leg2MmNet: number;
}

interface SpreadData {
  id: string;
  name: string;
  data: SpreadDataPoint[];
  latestSpread: number;
  spreadChange: number;
}

interface SpreadWithStats extends SpreadData {
  mean: number;
  stdDev: number;
  zScore: number;
  timeRange: TimeRange;
}

interface APIResponse {
  success: boolean;
  spreads: SpreadData[];
}

interface COTRVsTabProps {
  sector?: string;
}

function formatNumber(num: number): string {
  if (Math.abs(num) >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  } else if (Math.abs(num) >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return Math.round(num).toLocaleString();
}

function formatChartDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Calculate mean of spread values
function calculateMean(data: SpreadDataPoint[]): number {
  if (data.length === 0) return 0;
  const sum = data.reduce((acc, d) => acc + d.mmNetSpread, 0);
  return sum / data.length;
}

// Calculate standard deviation
function calculateStdDev(data: SpreadDataPoint[], mean: number): number {
  if (data.length < 2) return 0;
  const squaredDiffs = data.map(d => Math.pow(d.mmNetSpread - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / data.length;
  return Math.sqrt(avgSquaredDiff);
}

// Calculate z-score (how many std devs from mean)
function calculateZScore(current: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (current - mean) / stdDev;
}

const SECTOR_TITLES: Record<string, string> = {
  ags: "Agricultural",
  energy: "Energy",
  metals: "Metals",
  equities: "Equities",
  rates: "Rates",
  fx: "FX",
};

// Map spread IDs to short leg symbols for trade instructions
const SPREAD_LEG_SYMBOLS: Record<string, { leg1: string; leg2: string }> = {
  // Ags
  "soybeans-corn": { leg1: "S", leg2: "C" },
  "soymeal-soyoil": { leg1: "SM", leg2: "BO" },
  "kw-w": { leg1: "KW", leg2: "W" },
  "mw-kw": { leg1: "MW", leg2: "KW" },
  "mw-w": { leg1: "MW", leg2: "W" },
  "lc-fc": { leg1: "LC", leg2: "FC" },
  "lc-lh": { leg1: "LC", leg2: "LH" },
  // Energy
  "wti-brent": { leg1: "CL", leg2: "BRN" },
  "rbob-ho": { leg1: "RB", leg2: "HO" },
  // Metals
  "gold-silver": { leg1: "GC", leg2: "SI" },
  "platinum-palladium": { leg1: "PL", leg2: "PA" },
  "gold-copper": { leg1: "GC", leg2: "HG" },
  // Equities
  "sp500-nasdaq": { leg1: "ES", leg2: "NQ" },
  "sp500-russell": { leg1: "ES", leg2: "RTY" },
  "dow-sp500": { leg1: "YM", leg2: "ES" },
  // Rates
  "10y-2y": { leg1: "ZN", leg2: "ZT" },
  "30y-10y": { leg1: "ZB", leg2: "ZN" },
  "5y-2y": { leg1: "ZF", leg2: "ZT" },
  // FX
  "eurusd-gbpusd": { leg1: "EUR", leg2: "GBP" },
  "audusd-nzdusd": { leg1: "AUD", leg2: "NZD" },
  "usdcad-usdmxn": { leg1: "CAD", leg2: "MXN" },
};

function getTradeInstruction(spreadId: string, zScore: number): string {
  const symbols = SPREAD_LEG_SYMBOLS[spreadId];
  if (!symbols) return zScore > 0 ? "FADE LONG" : "FADE SHORT";

  if (zScore > 0) {
    // MM is long the spread, fade by selling leg1/buying leg2
    return `sell ${symbols.leg1}/buy ${symbols.leg2}`;
  } else {
    // MM is short the spread, fade by buying leg1/selling leg2
    return `buy ${symbols.leg1}/sell ${symbols.leg2}`;
  }
}

export function COTRVsTab({ sector = "ags" }: COTRVsTabProps) {
  const [data, setData] = useState<SpreadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSpread, setExpandedSpread] = useState<SpreadWithStats | null>(null);
  const [expandedTimeRange, setExpandedTimeRange] = useState<TimeRange>("all");
  const [sortField, setSortField] = useState<SortField>("zScore");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [chartTimeRanges, setChartTimeRanges] = useState<Record<string, TimeRange>>({});

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/cot-rvs?sector=${sector}`);
        const json: APIResponse = await res.json();
        if (json.success) {
          setData(json.spreads);
          // Initialize time ranges for all charts to "all"
          const initialTimeRanges: Record<string, TimeRange> = {};
          json.spreads.forEach(s => { initialTimeRanges[s.id] = "all"; });
          setChartTimeRanges(initialTimeRanges);
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
  }, [sector]);

  // Calculate stats and add time range for each spread
  const spreadsWithStats: SpreadWithStats[] = useMemo(() => {
    return data.map(spread => {
      const mean = calculateMean(spread.data);
      const stdDev = calculateStdDev(spread.data, mean);
      const zScore = calculateZScore(spread.latestSpread, mean, stdDev);
      return {
        ...spread,
        mean,
        stdDev,
        zScore,
        timeRange: chartTimeRanges[spread.id] || "all",
      };
    });
  }, [data, chartTimeRanges]);

  // Sort data
  const sortedSpreads = useMemo(() => {
    const sorted = [...spreadsWithStats];
    sorted.sort((a, b) => {
      let aVal: number | string, bVal: number | string;
      switch (sortField) {
        case "name":
          aVal = a.name;
          bVal = b.name;
          break;
        case "current":
          aVal = a.latestSpread;
          bVal = b.latestSpread;
          break;
        case "change":
          aVal = a.spreadChange;
          bVal = b.spreadChange;
          break;
        case "mean":
          aVal = a.mean;
          bVal = b.mean;
          break;
        case "stdDev":
          aVal = a.stdDev;
          bVal = b.stdDev;
          break;
        case "zScore":
        default:
          aVal = Math.abs(a.zScore);
          bVal = Math.abs(b.zScore);
          break;
      }
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return sorted;
  }, [spreadsWithStats, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const updateChartTimeRange = (spreadId: string, range: TimeRange) => {
    setChartTimeRanges(prev => ({ ...prev, [spreadId]: range }));
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-zinc-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-48 bg-zinc-800 rounded"></div>
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

  // Filter data based on time range for a specific spread
  const getChartData = (spread: SpreadWithStats) => {
    const range = spread.timeRange;
    const timeOption = TIME_RANGE_OPTIONS.find(t => t.id === range);
    return timeOption?.weeks
      ? spread.data.slice(-timeOption.weeks)
      : spread.data;
  };

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="text-right py-3 px-3 text-zinc-400 font-medium cursor-pointer hover:text-white transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center justify-end gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${sortField === field ? "text-orange-400" : ""}`} />
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            COT Relative Values - {SECTOR_TITLES[sector] || sector}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Net Managed Money spread between related contracts (Leg1 MM Net - Leg2 MM Net)
          </p>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-800/50 border-b border-zinc-700">
              <th
                className="text-left py-3 px-4 text-zinc-400 font-medium cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-1">
                  Spread
                  <ArrowUpDown className={`w-3 h-3 ${sortField === "name" ? "text-orange-400" : ""}`} />
                </div>
              </th>
              <SortHeader field="current" label="Current" />
              <SortHeader field="change" label="WoW Chg" />
              <SortHeader field="mean" label="LT Mean" />
              <SortHeader field="stdDev" label="Std Dev" />
              <SortHeader field="zScore" label="Z-Score" />
              <th className="text-center py-3 px-3 text-zinc-400 font-medium">Signal</th>
            </tr>
          </thead>
          <tbody>
            {sortedSpreads.map((spread) => {
              const isExtreme = Math.abs(spread.zScore) >= 2;
              const zScoreColor = isExtreme ? (spread.zScore > 0 ? "text-green-400" : "text-red-400") :
                                  Math.abs(spread.zScore) >= 1 ? (spread.zScore > 0 ? "text-green-400/70" : "text-red-400/70") : "text-zinc-400";
              const zScoreBg = isExtreme ? (spread.zScore > 0 ? "bg-green-500/20" : "bg-red-500/20") : "";

              return (
                <tr key={spread.id} className={`border-b border-zinc-800 hover:bg-zinc-800/50 ${isExtreme ? "bg-yellow-500/5" : ""}`}>
                  <td className="py-2.5 px-4 text-white font-medium">
                    <div className="flex items-center gap-2">
                      {isExtreme && <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                      {spread.name}
                    </div>
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono ${spread.latestSpread >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {spread.latestSpread >= 0 ? "+" : ""}{formatNumber(spread.latestSpread)}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono ${spread.spreadChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {spread.spreadChange >= 0 ? "+" : ""}{formatNumber(spread.spreadChange)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-zinc-300">
                    {formatNumber(spread.mean)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-zinc-300">
                    {formatNumber(spread.stdDev)}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono font-bold ${zScoreBg} ${zScoreColor}`}>
                    {spread.zScore >= 0 ? "+" : ""}{spread.zScore.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {isExtreme && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                        spread.zScore > 0 ? "bg-red-500/30 text-red-300" : "bg-green-500/30 text-green-300"
                      }`}>
                        {getTradeInstruction(spread.id, spread.zScore)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sortedSpreads.map((spread) => {
          const chartData = getChartData(spread);
          const intervalCount = Math.max(1, Math.floor(chartData.length / 8));
          const isExtreme = Math.abs(spread.zScore) >= 2;

          return (
            <div key={spread.id} className={`bg-zinc-900 border rounded-lg p-4 ${isExtreme ? "border-yellow-500/50" : "border-zinc-800"}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    {isExtreme && <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                    <h3 className="text-md font-semibold text-white">{spread.name}</h3>
                  </div>
                  <p className="text-xs text-zinc-500">MM Net Spread | Z: {spread.zScore >= 0 ? "+" : ""}{spread.zScore.toFixed(2)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <p className={`text-lg font-bold font-mono ${spread.latestSpread >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {spread.latestSpread >= 0 ? "+" : ""}{formatNumber(spread.latestSpread)}
                    </p>
                  </div>
                  {/* Individual Time Range Toggle */}
                  <div className="flex items-center gap-0.5">
                    {TIME_RANGE_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateChartTimeRange(spread.id, option.id);
                        }}
                        className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors ${
                          spread.timeRange === option.id
                            ? "bg-orange-500 text-white"
                            : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-white"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div
                className="h-[280px] cursor-pointer"
                onClick={() => {
                  setExpandedSpread(spread);
                  setExpandedTimeRange(spread.timeRange);
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#ffffff", fontSize: 11 }}
                      angle={-90}
                      textAnchor="start"
                      height={60}
                      interval={intervalCount}
                      tickFormatter={formatChartDate}
                      dy={25}
                      dx={-5}
                    />
                    <YAxis
                      tick={{ fill: "#ffffff", fontSize: 11 }}
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
                      itemStyle={{ color: "#ffffff" }}
                      formatter={(value: number) => [formatNumber(value), "MM Net Spread"]}
                      labelFormatter={(label) => formatFullDate(label)}
                    />
                    <ReferenceLine y={0} stroke="#52525b" strokeWidth={1} />
                    <Line
                      type="monotone"
                      dataKey="mmNetSpread"
                      stroke={isExtreme ? "#eab308" : "#f97316"}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-zinc-600 mt-2 text-center">Click chart to expand</p>
            </div>
          );
        })}
      </div>

      {/* Expanded Modal */}
      {expandedSpread && (() => {
        const timeOption = TIME_RANGE_OPTIONS.find(t => t.id === expandedTimeRange);
        const chartData = timeOption?.weeks
          ? expandedSpread.data.slice(-timeOption.weeks)
          : expandedSpread.data;
        const intervalCount = Math.max(1, Math.floor(chartData.length / 15));
        const isExtreme = Math.abs(expandedSpread.zScore) >= 2;

        return (
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setExpandedSpread(null)}
          >
            <div
              className={`bg-zinc-900 border rounded-lg p-6 max-w-[85vw] w-full max-h-[90vh] overflow-auto ${isExtreme ? "border-yellow-500/50" : "border-zinc-700"}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    {isExtreme && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
                    <h3 className="text-xl font-semibold text-white">
                      {expandedSpread.name}
                    </h3>
                    {isExtreme && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                        expandedSpread.zScore > 0 ? "bg-red-500/30 text-red-300" : "bg-green-500/30 text-green-300"
                      }`}>
                        {getTradeInstruction(expandedSpread.id, expandedSpread.zScore)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400">
                    Net Managed Money Spread ({chartData.length} weeks)
                  </p>
                </div>
                <button
                  onClick={() => setExpandedSpread(null)}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Time Range Toggle */}
              <div className="flex items-center gap-2 mb-4">
                {TIME_RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setExpandedTimeRange(option.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      expandedTimeRange === option.id
                        ? "bg-orange-500 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-5 gap-3 mb-6">
                <div className="bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-zinc-500">Current Spread</p>
                  <p className={`text-lg font-bold font-mono ${expandedSpread.latestSpread >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {expandedSpread.latestSpread >= 0 ? "+" : ""}{formatNumber(expandedSpread.latestSpread)}
                  </p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-zinc-500">WoW Change</p>
                  <p className={`text-lg font-bold font-mono ${expandedSpread.spreadChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {expandedSpread.spreadChange >= 0 ? "+" : ""}{formatNumber(expandedSpread.spreadChange)}
                  </p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-zinc-500">LT Mean</p>
                  <p className="text-lg font-bold font-mono text-white">
                    {formatNumber(expandedSpread.mean)}
                  </p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-zinc-500">Std Dev</p>
                  <p className="text-lg font-bold font-mono text-white">
                    {formatNumber(expandedSpread.stdDev)}
                  </p>
                </div>
                <div className={`rounded-lg p-3 ${isExtreme ? "bg-yellow-500/20" : "bg-zinc-800"}`}>
                  <p className="text-xs text-zinc-500">Z-Score</p>
                  <p className={`text-lg font-bold font-mono ${
                    isExtreme ? "text-yellow-400" :
                    expandedSpread.zScore >= 0 ? "text-green-400" : "text-red-400"
                  }`}>
                    {expandedSpread.zScore >= 0 ? "+" : ""}{expandedSpread.zScore.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Large Chart */}
              <div className="h-[50vh]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#ffffff", fontSize: 12 }}
                      angle={-90}
                      textAnchor="start"
                      height={70}
                      interval={intervalCount}
                      tickFormatter={formatChartDate}
                      dy={30}
                      dx={-5}
                    />
                    <YAxis
                      tick={{ fill: "#ffffff", fontSize: 12 }}
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
                      itemStyle={{ color: "#ffffff" }}
                      formatter={(value: number, name: string) => {
                        if (name === "mmNetSpread") return [formatNumber(value), "Spread"];
                        if (name === "leg1MmNet") return [formatNumber(value), "Leg 1 MM Net"];
                        if (name === "leg2MmNet") return [formatNumber(value), "Leg 2 MM Net"];
                        return [formatNumber(value), name];
                      }}
                      labelFormatter={(label) => formatFullDate(label)}
                    />
                    <ReferenceLine y={0} stroke="#52525b" strokeWidth={2} />
                    <Line
                      type="monotone"
                      dataKey="mmNetSpread"
                      stroke={isExtreme ? "#eab308" : "#f97316"}
                      strokeWidth={2.5}
                      dot={false}
                      name="mmNetSpread"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Leg breakdown */}
              <div className="mt-4 pt-4 border-t border-zinc-700">
                <p className="text-xs text-zinc-500 mb-2">Latest values:</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-zinc-400">
                    Leg 1 MM Net: <span className="text-white font-mono">{formatNumber(expandedSpread.data[expandedSpread.data.length - 1]?.leg1MmNet || 0)}</span>
                  </span>
                  <span className="text-zinc-400">
                    Leg 2 MM Net: <span className="text-white font-mono">{formatNumber(expandedSpread.data[expandedSpread.data.length - 1]?.leg2MmNet || 0)}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
