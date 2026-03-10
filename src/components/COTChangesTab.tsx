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

type AssetCategory = "ags-grains" | "ags-softs" | "ags-livestock" | "ags-other" | "energy" | "metals" | "equities" | "rates" | "fx" | "crypto";

type TimeRange = "3m" | "6m" | "1y" | "2y" | "5y" | "all";

const TIME_RANGE_OPTIONS: { id: TimeRange; label: string; weeks: number | null }[] = [
  { id: "3m", label: "3M", weeks: 13 },
  { id: "6m", label: "6M", weeks: 26 },
  { id: "1y", label: "1Y", weeks: 52 },
  { id: "2y", label: "2Y", weeks: 104 },
  { id: "5y", label: "5Y", weeks: 260 },
  { id: "all", label: "All", weeks: null },
];

interface ChangeRow {
  id: string;
  label: string;
  isAggregate: boolean;
  mmNetCurrent: number;
  mmNetPrevious: number;
  mmNetChange: number;
  zScore: number;
  positionDate: string;
  historicalChanges: { date: string; change: number }[];
}

interface SectorData {
  sector: AssetCategory;
  label: string;
  reportType: string;
  rows: ChangeRow[];
}

interface APIResponse {
  success: boolean;
  positionDate: string;
  sectors: SectorData[];
}

interface COTChangesTabProps {
  sector: AssetCategory;
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

// Mini chart component for the grid (shows last 2 years / 104 weeks)
function MiniChart({ row, onClick }: { row: ChangeRow; onClick: () => void }) {
  const chartData = row.historicalChanges.slice(-104);
  return (
    <div
      className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 cursor-pointer hover:border-zinc-600 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className={`text-sm font-semibold ${row.isAggregate ? "text-orange-400" : "text-white"}`}>
          {row.label}
        </h4>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono ${row.mmNetChange >= 0 ? "text-green-400" : "text-red-400"}`}>
            {row.mmNetChange >= 0 ? "+" : ""}{formatNumber(row.mmNetChange)}
          </span>
          <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${getZScoreBg(row.zScore)} ${getZScoreColor(row.zScore)}`}>
            {row.zScore >= 0 ? "+" : ""}{row.zScore.toFixed(2)}σ
          </span>
        </div>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 30 }}>
            <XAxis
              dataKey="date"
              tick={{ fill: "#71717a", fontSize: 8 }}
              angle={-90}
              textAnchor="end"
              height={30}
              tickFormatter={formatChartDate}
              interval={Math.floor(chartData.length / 10)}
              dy={15}
            />
            <ReferenceLine y={0} stroke="#52525b" />
            <Bar dataKey="change" radius={[1, 1, 0, 0]}>
              {chartData.map((entry, index, arr) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.change >= 0 ? "#22c55e" : "#ef4444"}
                  opacity={index === arr.length - 1 ? 1 : 0.5}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function COTChangesTab({ sector }: COTChangesTabProps) {
  const [data, setData] = useState<SectorData | null>(null);
  const [positionDate, setPositionDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<ChangeRow | null>(null);
  const [expandedChart, setExpandedChart] = useState<ChangeRow | null>(null);
  const [expandedTimeRange, setExpandedTimeRange] = useState<TimeRange>("1y");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/cot-changes?sector=${sector}`);
        const json: APIResponse = await res.json();
        if (json.success && json.sectors.length > 0) {
          setData(json.sectors[0]);
          setPositionDate(json.positionDate);
          // Select row with highest absolute Z-score by default
          if (json.sectors[0].rows.length > 0) {
            const topRow = json.sectors[0].rows.reduce((max, row) =>
              Math.abs(row.zScore) > Math.abs(max.zScore) ? row : max
            );
            setSelectedRow(topRow);
          }
        } else {
          setError("No data available");
        }
      } catch {
        setError("Failed to fetch data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [sector]);

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-zinc-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-10 bg-zinc-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <p className="text-red-400">{error || "No data available"}</p>
      </div>
    );
  }

  // Sort rows: aggregates at the end, sorted by z-score otherwise
  const sortedRows = [...data.rows].sort((a, b) => {
    if (a.isAggregate !== b.isAggregate) {
      return a.isAggregate ? 1 : -1;
    }
    return Math.abs(b.zScore) - Math.abs(a.zScore);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {data.label} - Managed Money Weekly Changes
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Week-over-week change in MM net position with Z-score
            </p>
          </div>
          {positionDate && (
            <div className="text-right">
              <p className="text-xs text-zinc-500">Position Date</p>
              <p className="text-sm font-medium text-white">{formatDate(positionDate)}</p>
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
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 font-bold rounded">+2σ</span>
              <span>= Large buying</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 font-bold rounded">-2σ</span>
              <span>= Large selling</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-800/50 border-b border-zinc-700">
                <th className="text-left py-3 px-4 text-zinc-400 font-medium">Commodity</th>
                <th className="text-right py-3 px-4 text-zinc-400 font-medium">MM Net</th>
                <th className="text-right py-3 px-4 text-zinc-400 font-medium">WoW Chg</th>
                <th className="text-right py-3 px-4 text-zinc-400 font-medium">Z-Score</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer transition-colors ${
                    selectedRow?.id === row.id ? "bg-zinc-800/70" : ""
                  } ${row.isAggregate ? "bg-zinc-800/30" : ""}`}
                  onClick={() => setSelectedRow(row)}
                >
                  <td className="py-3 px-4">
                    <span className={`${row.isAggregate ? "text-orange-400 font-medium" : "text-white"}`}>
                      {row.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-zinc-300">
                    {formatNumber(row.mmNetCurrent)}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono ${row.mmNetChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {row.mmNetChange >= 0 ? "+" : ""}{formatNumber(row.mmNetChange)}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono font-bold ${getZScoreColor(row.zScore)} ${getZScoreBg(row.zScore)}`}>
                    {row.zScore >= 0 ? "+" : ""}{row.zScore.toFixed(2)}σ
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Chart Panel */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          {selectedRow ? (
            <>
              <h3 className="text-sm font-semibold text-white mb-1">{selectedRow.label}</h3>
              <p className="text-xs text-zinc-500 mb-4">Weekly MM Net Changes (Last 52 Weeks)</p>

              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={selectedRow.historicalChanges.slice(-52)} margin={{ top: 10, right: 10, left: -10, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#71717a", fontSize: 10 }}
                      angle={-90}
                      textAnchor="end"
                      height={100}
                      tickFormatter={formatChartDate}
                      interval={Math.floor(Math.min(52, selectedRow.historicalChanges.length) / 8)}
                      dy={15}
                    />
                    <YAxis
                      tick={{ fill: "#71717a", fontSize: 10 }}
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
                      {selectedRow.historicalChanges.slice(-52).map((entry, index, arr) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.change >= 0 ? "#22c55e" : "#ef4444"}
                          opacity={index === arr.length - 1 ? 1 : 0.6}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-zinc-500">Current Change</p>
                  <p className={`text-lg font-bold ${selectedRow.mmNetChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {selectedRow.mmNetChange >= 0 ? "+" : ""}{formatNumber(selectedRow.mmNetChange)}
                  </p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-zinc-500">Z-Score</p>
                  <p className={`text-lg font-bold ${getZScoreColor(selectedRow.zScore)}`}>
                    {selectedRow.zScore >= 0 ? "+" : ""}{selectedRow.zScore.toFixed(2)}σ
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-zinc-500 text-sm">Select a commodity to view chart</p>
          )}
        </div>
      </div>

      {/* All Charts Grid */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <h3 className="text-md font-semibold text-white mb-4">All Weekly Changes Charts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedRows.map((row) => (
            <MiniChart key={row.id} row={row} onClick={() => setExpandedChart(row)} />
          ))}
        </div>
      </div>

      {/* Expanded Chart Modal */}
      {expandedChart && (() => {
        const timeOption = TIME_RANGE_OPTIONS.find(t => t.id === expandedTimeRange);
        const chartData = timeOption?.weeks
          ? expandedChart.historicalChanges.slice(-timeOption.weeks)
          : expandedChart.historicalChanges;
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
                  <h3 className={`text-lg font-semibold ${expandedChart.isAggregate ? "text-orange-400" : "text-white"}`}>
                    {expandedChart.label}
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
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-zinc-500">MM Net Position</p>
                  <p className="text-lg font-bold text-white">{formatNumber(expandedChart.mmNetCurrent)}</p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-zinc-500">Previous Week</p>
                  <p className="text-lg font-bold text-zinc-400">{formatNumber(expandedChart.mmNetPrevious)}</p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-zinc-500">WoW Change</p>
                  <p className={`text-lg font-bold ${expandedChart.mmNetChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {expandedChart.mmNetChange >= 0 ? "+" : ""}{formatNumber(expandedChart.mmNetChange)}
                  </p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-zinc-500">Z-Score</p>
                  <p className={`text-lg font-bold ${getZScoreColor(expandedChart.zScore)}`}>
                    {expandedChart.zScore >= 0 ? "+" : ""}{expandedChart.zScore.toFixed(2)}σ
                  </p>
                </div>
              </div>

              {/* Large Chart */}
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#71717a", fontSize: 11 }}
                      angle={-90}
                      textAnchor="end"
                      height={100}
                      tickFormatter={formatChartDate}
                      interval={Math.floor(chartData.length / intervalDivisor)}
                      dy={15}
                    />
                    <YAxis
                      tick={{ fill: "#71717a", fontSize: 11 }}
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
                          opacity={index === arr.length - 1 ? 1 : 0.6}
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
