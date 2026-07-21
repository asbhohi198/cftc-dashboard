"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { X } from "lucide-react";

type TimeRange = "1y" | "2y" | "5y" | "all";

const TIME_RANGE_OPTIONS: { id: TimeRange; label: string; weeks: number | null }[] = [
  { id: "1y", label: "1Y", weeks: 52 },
  { id: "2y", label: "2Y", weeks: 104 },
  { id: "5y", label: "5Y", weeks: 260 },
  { id: "all", label: "All", weeks: null },
];

interface SummaryRow {
  id: string;
  commodity: string;
  contractId: string | null;
  netMMWoWChange: number;
  zScore: number;
  hasHistoricalData: boolean;
  historicalChanges: { date: string; change: number }[];
}

interface APIResponse {
  success: boolean;
  reportDate: string;
  rows: SummaryRow[];
}

function formatNumber(num: number): string {
  if (Math.abs(num) >= 1000000) {
    return (num / 1000000).toFixed(2) + "M";
  } else if (Math.abs(num) >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toLocaleString();
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatChartDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function getZScoreColor(zScore: number): string {
  const absZ = Math.abs(zScore);
  if (absZ >= 2) return zScore > 0 ? "text-green-400" : "text-red-400";
  if (absZ >= 1) return zScore > 0 ? "text-green-400/70" : "text-red-400/70";
  return "text-zinc-400";
}

function getZScoreBg(zScore: number): string {
  const absZ = Math.abs(zScore);
  if (absZ >= 2) return zScore > 0 ? "bg-green-500/20" : "bg-red-500/20";
  return "";
}

export function COTChangesSummaryTab() {
  const [data, setData] = useState<SummaryRow[]>([]);
  const [reportDate, setReportDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<SummaryRow | null>(null);
  const [expandedChart, setExpandedChart] = useState<SummaryRow | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("2y");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/cot-changes-summary");
        const json: APIResponse = await res.json();
        if (json.success) {
          setData(json.rows);
          setReportDate(json.reportDate);
          // Select first row with historical data by default
          const firstWithHistory = json.rows.find(r => r.hasHistoricalData);
          if (firstWithHistory) {
            setSelectedRow(firstWithHistory);
          }
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
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
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

  // Get chart data based on time range
  const getChartData = (row: SummaryRow) => {
    const timeOption = TIME_RANGE_OPTIONS.find(t => t.id === timeRange);
    return timeOption?.weeks
      ? row.historicalChanges.slice(-timeOption.weeks)
      : row.historicalChanges;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Ag Weekly Changes Summary
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Week-over-week change in Managed Money net position with Z-score
            </p>
          </div>
          {reportDate && (
            <div className="text-right">
              <p className="text-xs text-zinc-500">Report Date</p>
              <p className="text-sm font-medium text-white">{formatDate(reportDate)}</p>
            </div>
          )}
        </div>
        {/* Legend */}
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <div className="flex flex-wrap items-center gap-6 text-xs text-zinc-500">
            <div>
              <span className="font-medium text-zinc-400">Note:</span> Z-Score measures how extreme the weekly change is relative to historical changes.
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 font-bold rounded">+2</span>
              <span>= Large buying</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 font-bold rounded">-2</span>
              <span>= Large selling</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-800/50 border-b border-zinc-700">
                <th className="text-left py-3 px-4 text-zinc-400 font-medium">Commodity</th>
                <th className="text-right py-3 px-3 text-zinc-400 font-medium">WoW Chg</th>
                <th className="text-right py-3 px-3 text-zinc-400 font-medium">Z</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-zinc-800 transition-colors ${
                    row.hasHistoricalData
                      ? "hover:bg-zinc-800/50 cursor-pointer"
                      : "opacity-60"
                  } ${selectedRow?.id === row.id ? "bg-zinc-800/70" : ""}`}
                  onClick={() => row.hasHistoricalData && setSelectedRow(row)}
                >
                  <td className="py-2.5 px-4">
                    <span className={`${row.hasHistoricalData ? "text-white" : "text-zinc-500"}`}>
                      {row.commodity}
                    </span>
                    {!row.hasHistoricalData && (
                      <span className="ml-1 text-xs text-zinc-600">(EU)</span>
                    )}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono ${row.netMMWoWChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {row.netMMWoWChange >= 0 ? "+" : ""}{formatNumber(row.netMMWoWChange)}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono font-bold ${getZScoreBg(row.zScore)} ${getZScoreColor(row.zScore)}`}>
                    {row.zScore >= 0 ? "+" : ""}{row.zScore.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Chart Panel */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          {selectedRow ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-md font-semibold text-white">{selectedRow.commodity}</h3>
                  <p className="text-xs text-zinc-500">
                    Weekly MM Net Changes ({getChartData(selectedRow).length} weeks)
                  </p>
                </div>
                <div className="flex items-center gap-4">
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
                  {/* Latest value badge */}
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-mono font-bold ${selectedRow.netMMWoWChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {selectedRow.netMMWoWChange >= 0 ? "+" : ""}{formatNumber(selectedRow.netMMWoWChange)}
                    </span>
                    <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded ${getZScoreBg(selectedRow.zScore)} ${getZScoreColor(selectedRow.zScore)}`}>
                      Z: {selectedRow.zScore >= 0 ? "+" : ""}{selectedRow.zScore.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="h-[400px] cursor-pointer"
                onClick={() => setExpandedChart(selectedRow)}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getChartData(selectedRow)}
                    margin={{ top: 10, right: 10, left: 0, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#ffffff", fontSize: 10 }}
                      angle={-90}
                      textAnchor="end"
                      height={80}
                      tickFormatter={formatChartDate}
                      interval={Math.floor(getChartData(selectedRow).length / 12)}
                      dy={15}
                    />
                    <YAxis
                      tick={{ fill: "#ffffff", fontSize: 10 }}
                      tickFormatter={(v) => formatNumber(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "0.5rem",
                        fontSize: "12px",
                      }}
                      formatter={(value: number) => [formatNumber(value), "Change"]}
                      labelFormatter={(label) => formatDate(label)}
                    />
                    <ReferenceLine y={0} stroke="#52525b" />
                    <Bar dataKey="change" radius={[2, 2, 0, 0]}>
                      {getChartData(selectedRow).map((entry, index, arr) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.change >= 0 ? "#22c55e" : "#ef4444"}
                                                  />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-zinc-600 mt-2 text-center">Click chart to expand</p>
            </>
          ) : (
            <div className="h-[400px] flex items-center justify-center">
              <p className="text-zinc-500 text-sm">Select a commodity to view chart</p>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Chart Modal */}
      {expandedChart && (() => {
        const chartData = getChartData(expandedChart);
        const intervalDivisor = chartData.length > 100 ? 20 : chartData.length > 50 ? 12 : 8;

        return (
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setExpandedChart(null)}
          >
            <div
              className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {expandedChart.commodity}
                  </h3>
                  <p className="text-sm text-zinc-400">
                    Weekly MM Net Changes ({chartData.length} weeks)
                  </p>
                </div>
                <button
                  onClick={() => setExpandedChart(null)}
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
                    onClick={() => setTimeRange(option.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      timeRange === option.id
                        ? "bg-orange-500 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-zinc-500">Latest WoW Change</p>
                  <p className={`text-lg font-bold ${expandedChart.netMMWoWChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {expandedChart.netMMWoWChange >= 0 ? "+" : ""}{formatNumber(expandedChart.netMMWoWChange)}
                  </p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-zinc-500">Z-Score</p>
                  <p className={`text-lg font-bold ${getZScoreColor(expandedChart.zScore)}`}>
                    {expandedChart.zScore >= 0 ? "+" : ""}{expandedChart.zScore.toFixed(2)}
                  </p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-zinc-500">Report Date</p>
                  <p className="text-lg font-bold text-white">{formatDate(reportDate)}</p>
                </div>
              </div>

              {/* Large Chart */}
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#ffffff", fontSize: 11 }}
                      angle={-90}
                      textAnchor="end"
                      height={100}
                      tickFormatter={formatChartDate}
                      interval={Math.floor(chartData.length / intervalDivisor)}
                      dy={15}
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
                      }}
                      formatter={(value: number) => [formatNumber(value), "Change"]}
                      labelFormatter={(label) => formatDate(label)}
                    />
                    <ReferenceLine y={0} stroke="#52525b" strokeWidth={2} />
                    <Bar dataKey="change" radius={[3, 3, 0, 0]}>
                      {chartData.map((entry, index, arr) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.change >= 0 ? "#22c55e" : "#ef4444"}
                                                  />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
