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

interface ChangeRow {
  id: string;
  label: string;
  mmNetCurrent: number;
  mmNetPrevious: number;
  mmNetChange: number;
  zScore: number;
  positionDate: string;
  historicalChanges: { date: string; change: number }[];
  // Additional fields for summary charts
  historicalMax: number;
  historicalMin: number;
  pctHistoricalMax: number;
  openInterest: number;
  pctOI: number;
  // Gross long/short changes
  mmLongChange: number;
  mmShortChange: number;
}

interface APIResponse {
  success: boolean;
  reportDate: string;
  rows: ChangeRow[];
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

export function AgsSummaryTab() {
  const [data, setData] = useState<ChangeRow[]>([]);
  const [reportDate, setReportDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<ChangeRow | null>(null);
  const [expandedChart, setExpandedChart] = useState<ChangeRow | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("5y");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/cot-changes-ags-summary");
        const json: APIResponse = await res.json();
        if (json.success) {
          setData(json.rows);
          setReportDate(json.reportDate);
          // Select first row by default
          if (json.rows.length > 0) {
            setSelectedRow(json.rows[0]);
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
  const getChartData = (row: ChangeRow) => {
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
                <th className="text-right py-3 px-3 text-zinc-400 font-medium">Net MM WoW Chg</th>
                <th className="text-right py-3 px-3 text-zinc-400 font-medium">Z-Score</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-zinc-800 hover:bg-zinc-800/50 cursor-pointer transition-colors ${
                    selectedRow?.id === row.id ? "bg-zinc-800/70" : ""
                  }`}
                  onClick={() => setSelectedRow(row)}
                >
                  <td className="py-2.5 px-4">
                    <span className="text-white">{row.label}</span>
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono ${row.mmNetChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {row.mmNetChange >= 0 ? "+" : ""}{formatNumber(row.mmNetChange)}
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
                  <h3 className="text-md font-semibold text-white">{selectedRow.label}</h3>
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
                    <span className={`text-sm font-mono font-bold ${selectedRow.mmNetChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {selectedRow.mmNetChange >= 0 ? "+" : ""}{formatNumber(selectedRow.mmNetChange)}
                    </span>
                    <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded ${getZScoreBg(selectedRow.zScore)} ${getZScoreColor(selectedRow.zScore)}`}>
                      Z: {selectedRow.zScore >= 0 ? "+" : ""}{selectedRow.zScore.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className="h-[600px] cursor-pointer"
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
                      tick={{ fill: "#71717a", fontSize: 10 }}
                      angle={-90}
                      textAnchor="end"
                      height={80}
                      tickFormatter={formatChartDate}
                      interval={Math.floor(getChartData(selectedRow).length / 12)}
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
                        color: "#ffffff",
                      }}
                      labelStyle={{ color: "#ffffff" }}
                      itemStyle={{ color: "#ffffff" }}
                      formatter={(value: number) => [formatNumber(value), "Change"]}
                      labelFormatter={(label) => formatDate(label)}
                    />
                    <ReferenceLine y={0} stroke="#52525b" />
                    <Bar dataKey="change" radius={[2, 2, 0, 0]}>
                      {getChartData(selectedRow).map((entry, index, arr) => (
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
              <p className="text-xs text-zinc-600 mt-2 text-center">Click chart to expand</p>
            </>
          ) : (
            <div className="h-[600px] flex items-center justify-center">
              <p className="text-zinc-500 text-sm">Select a commodity to view chart</p>
            </div>
          )}
        </div>
      </div>

      {/* 4 Summary Charts Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Sector Summary Charts</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Managed Money Net (F&O) */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-white mb-3">Managed Money Net (F&O)</h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{ top: 20, right: 10, left: 10, bottom: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#71717a", fontSize: 9 }}
                    angle={-90}
                    textAnchor="end"
                    height={80}
                    interval={0}
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
                      color: "#ffffff",
                    }}
                    labelStyle={{ color: "#ffffff" }}
                    itemStyle={{ color: "#ffffff" }}
                    formatter={(value: number) => [formatNumber(value), "MM Net"]}
                  />
                  <ReferenceLine y={0} stroke="#52525b" />
                  <Bar dataKey="mmNetCurrent" radius={[2, 2, 0, 0]} label={{ position: 'top', fill: '#a1a1aa', fontSize: 8, formatter: (v: number) => formatNumber(v) }}>
                    {data.map((entry, index) => (
                      <Cell
                        key={`cell-mmnet-${index}`}
                        fill={entry.mmNetCurrent >= 0 ? "#3b82f6" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Net MM Position as % Historical Max */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-white mb-3">Net MM Position as % Historical Max</h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{ top: 20, right: 10, left: 10, bottom: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#71717a", fontSize: 9 }}
                    angle={-90}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fill: "#71717a", fontSize: 10 }}
                    tickFormatter={(v) => `${v.toFixed(0)}%`}
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
                    formatter={(value: number) => [`${value.toFixed(1)}%`, "% of Max"]}
                  />
                  <ReferenceLine y={0} stroke="#52525b" />
                  <Bar dataKey="pctHistoricalMax" radius={[2, 2, 0, 0]} label={{ position: 'top', fill: '#a1a1aa', fontSize: 8, formatter: (v: number) => `${v.toFixed(0)}%` }}>
                    {data.map((entry, index) => (
                      <Cell
                        key={`cell-pctmax-${index}`}
                        fill={entry.pctHistoricalMax >= 0 ? "#3b82f6" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Managed Money Net Change (WoW) */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-white mb-3">Managed Money Net Change (WoW)</h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{ top: 20, right: 10, left: 10, bottom: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#71717a", fontSize: 9 }}
                    angle={-90}
                    textAnchor="end"
                    height={80}
                    interval={0}
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
                      color: "#ffffff",
                    }}
                    labelStyle={{ color: "#ffffff" }}
                    itemStyle={{ color: "#ffffff" }}
                    formatter={(value: number) => [formatNumber(value), "WoW Change"]}
                  />
                  <ReferenceLine y={0} stroke="#52525b" />
                  <Bar dataKey="mmNetChange" radius={[2, 2, 0, 0]} label={{ position: 'top', fill: '#a1a1aa', fontSize: 8, formatter: (v: number) => formatNumber(v) }}>
                    {data.map((entry, index) => (
                      <Cell
                        key={`cell-change-${index}`}
                        fill={entry.mmNetChange >= 0 ? "#22c55e" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: MM Net Position as % OI */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-white mb-3">MM Net Position as % Open Interest</h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{ top: 20, right: 10, left: 10, bottom: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#71717a", fontSize: 9 }}
                    angle={-90}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fill: "#71717a", fontSize: 10 }}
                    tickFormatter={(v) => `${v.toFixed(0)}%`}
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
                    formatter={(value: number) => [`${value.toFixed(1)}%`, "% of OI"]}
                  />
                  <ReferenceLine y={0} stroke="#52525b" />
                  <Bar dataKey="pctOI" radius={[2, 2, 0, 0]} label={{ position: 'top', fill: '#a1a1aa', fontSize: 8, formatter: (v: number) => `${v.toFixed(0)}%` }}>
                    {data.map((entry, index) => (
                      <Cell
                        key={`cell-pctoi-${index}`}
                        fill={entry.pctOI >= 0 ? "#3b82f6" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Gross Long/Short/Net Changes Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-2">Managed Money Changes: Gross Long, Gross Short & Total Net</h3>
        <p className="text-xs text-zinc-500 mb-4">Week-over-week changes in MM long positions, short positions, and net position</p>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 10, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="label"
                tick={{ fill: "#71717a", fontSize: 9 }}
                angle={-90}
                textAnchor="end"
                height={80}
                interval={0}
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
                  color: "#ffffff",
                }}
                labelStyle={{ color: "#ffffff" }}
                itemStyle={{ color: "#ffffff" }}
                formatter={(value: number, name: string) => [formatNumber(value), name]}
              />
              <ReferenceLine y={0} stroke="#52525b" />
              <Bar dataKey="mmLongChange" name="MM Long" fill="#3b82f6" radius={[2, 2, 0, 0]} label={{ position: 'top', fill: '#a1a1aa', fontSize: 7, formatter: (v: number) => formatNumber(v) }} />
              <Bar dataKey="mmShortChange" name="MM Short" fill="#ef4444" radius={[2, 2, 0, 0]} label={{ position: 'top', fill: '#a1a1aa', fontSize: 7, formatter: (v: number) => formatNumber(v) }} />
              <Bar dataKey="mmNetChange" name="MM Net" fill="#22c55e" radius={[2, 2, 0, 0]} label={{ position: 'top', fill: '#a1a1aa', fontSize: 7, formatter: (v: number) => formatNumber(v) }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-zinc-400">MM Long Change</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-zinc-400">MM Short Change</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-zinc-400">MM Net Change</span>
          </div>
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
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-zinc-500">MM Net Position</p>
                  <p className="text-lg font-bold text-white">{formatNumber(expandedChart.mmNetCurrent)}</p>
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
                        color: "#ffffff",
                      }}
                      labelStyle={{ color: "#ffffff" }}
                      itemStyle={{ color: "#ffffff" }}
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
