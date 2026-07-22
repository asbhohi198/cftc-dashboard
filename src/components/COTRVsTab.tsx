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

type TimeRange = "1y" | "2y" | "5y" | "all";

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

interface APIResponse {
  success: boolean;
  spreads: SpreadData[];
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

export function COTRVsTab() {
  const [data, setData] = useState<SpreadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSpread, setExpandedSpread] = useState<SpreadData | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [expandedTimeRange, setExpandedTimeRange] = useState<TimeRange>("all");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/cot-rvs");
        const json: APIResponse = await res.json();
        if (json.success) {
          setData(json.spreads);
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

  // Filter data based on time range
  const getChartData = (spread: SpreadData, range: TimeRange) => {
    const timeOption = TIME_RANGE_OPTIONS.find(t => t.id === range);
    return timeOption?.weeks
      ? spread.data.slice(-timeOption.weeks)
      : spread.data;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              COT Relative Values
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Net Managed Money spread between related contracts (Leg1 MM Net - Leg2 MM Net)
            </p>
          </div>
          {/* Time Range Toggle */}
          <div className="flex items-center gap-1">
            {TIME_RANGE_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setTimeRange(option.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  timeRange === option.id
                    ? "bg-orange-500 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-800/50 border-b border-zinc-700">
              <th className="text-left py-3 px-4 text-zinc-400 font-medium">Spread</th>
              <th className="text-right py-3 px-3 text-zinc-400 font-medium">Current</th>
              <th className="text-right py-3 px-3 text-zinc-400 font-medium">WoW Chg</th>
              <th className="text-right py-3 px-3 text-zinc-400 font-medium">LT Mean</th>
              <th className="text-right py-3 px-3 text-zinc-400 font-medium">Std Dev</th>
              <th className="text-right py-3 px-3 text-zinc-400 font-medium">Z-Score</th>
            </tr>
          </thead>
          <tbody>
            {data.map((spread) => {
              const mean = calculateMean(spread.data);
              const stdDev = calculateStdDev(spread.data, mean);
              const zScore = calculateZScore(spread.latestSpread, mean, stdDev);
              const zScoreColor = Math.abs(zScore) >= 2 ? (zScore > 0 ? "text-green-400" : "text-red-400") :
                                  Math.abs(zScore) >= 1 ? (zScore > 0 ? "text-green-400/70" : "text-red-400/70") : "text-zinc-400";
              const zScoreBg = Math.abs(zScore) >= 2 ? (zScore > 0 ? "bg-green-500/20" : "bg-red-500/20") : "";

              return (
                <tr key={spread.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                  <td className="py-2.5 px-4 text-white font-medium">{spread.name}</td>
                  <td className={`py-2.5 px-3 text-right font-mono ${spread.latestSpread >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {spread.latestSpread >= 0 ? "+" : ""}{formatNumber(spread.latestSpread)}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono ${spread.spreadChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {spread.spreadChange >= 0 ? "+" : ""}{formatNumber(spread.spreadChange)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-zinc-300">
                    {formatNumber(mean)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-zinc-300">
                    {formatNumber(stdDev)}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono font-bold ${zScoreBg} ${zScoreColor}`}>
                    {zScore >= 0 ? "+" : ""}{zScore.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data.map((spread) => {
          const chartData = getChartData(spread, timeRange);
          const intervalCount = Math.max(1, Math.floor(chartData.length / 8));

          return (
            <div key={spread.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-md font-semibold text-white">{spread.name}</h3>
                  <p className="text-xs text-zinc-500">MM Net Spread</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold font-mono ${spread.latestSpread >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {spread.latestSpread >= 0 ? "+" : ""}{formatNumber(spread.latestSpread)}
                  </p>
                  <p className={`text-xs font-mono ${spread.spreadChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                    WoW: {spread.spreadChange >= 0 ? "+" : ""}{formatNumber(spread.spreadChange)}
                  </p>
                </div>
              </div>
              <div
                className="h-[280px] cursor-pointer"
                onClick={() => setExpandedSpread(spread)}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#ffffff", fontSize: 11 }}
                      angle={-90}
                      textAnchor="start"
                      height={70}
                      interval={intervalCount}
                      tickFormatter={formatChartDate}
                      dy={35}
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
                      stroke="#f97316"
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
        const chartData = getChartData(expandedSpread, expandedTimeRange);
        const intervalCount = Math.max(1, Math.floor(chartData.length / 15));

        return (
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setExpandedSpread(null)}
          >
            <div
              className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-[85vw] w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {expandedSpread.name}
                  </h3>
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
              <div className="grid grid-cols-4 gap-3 mb-6">
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
                  <p className="text-xs text-zinc-500">Period High</p>
                  <p className="text-lg font-bold font-mono text-white">
                    {formatNumber(Math.max(...chartData.map(d => d.mmNetSpread)))}
                  </p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-zinc-500">Period Low</p>
                  <p className="text-lg font-bold font-mono text-white">
                    {formatNumber(Math.min(...chartData.map(d => d.mmNetSpread)))}
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
                      height={80}
                      interval={intervalCount}
                      tickFormatter={formatChartDate}
                      dy={40}
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
                      stroke="#f97316"
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
