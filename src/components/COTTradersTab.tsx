"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Legend,
  LabelList,
} from "recharts";
import { X, ChevronUp, ChevronDown } from "lucide-react";

type TimeRange = "1y" | "2y" | "5y" | "all";
type SortField = "name" | "tradersLong" | "tradersShort" | "pctLong";
type SortDirection = "asc" | "desc";
type ChartViewMode = "number" | "percent";

const TIME_RANGE_OPTIONS: { id: TimeRange; label: string; weeks: number | null }[] = [
  { id: "1y", label: "1Y", weeks: 52 },
  { id: "2y", label: "2Y", weeks: 104 },
  { id: "5y", label: "5Y", weeks: 260 },
  { id: "all", label: "All", weeks: null },
];

interface TradersRow {
  id: string;
  name: string;
  latestDate: string;
  tradersLong: number;
  tradersShort: number;
  pctLong: number;
  pctShort: number;
  historicalData: {
    date: string;
    tradersLong: number;
    tradersShort: number;
    pctLong: number;
  }[];
}

interface APIResponse {
  success: boolean;
  sector: string;
  reportDate: string;
  contracts: TradersRow[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatChartDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

interface COTTradersTabProps {
  sector: string;
}

export function COTTradersTab({ sector }: COTTradersTabProps) {
  const [data, setData] = useState<TradersRow[]>([]);
  const [reportDate, setReportDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<TradersRow | null>(null);
  const [expandedChart, setExpandedChart] = useState<TradersRow | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("5y");
  const [expandedTimeRange, setExpandedTimeRange] = useState<TimeRange>("all");
  const [chartViewMode, setChartViewMode] = useState<ChartViewMode>("number");
  const [expandedChartViewMode, setExpandedChartViewMode] = useState<ChartViewMode>("number");
  const [sortField, setSortField] = useState<SortField>("pctLong");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/cot-traders?sector=${sector}`);
        const json: APIResponse = await res.json();
        if (json.success) {
          setData(json.contracts);
          setReportDate(json.reportDate);
          // Select first row by default
          if (json.contracts.length > 0) {
            setSelectedRow(json.contracts[0]);
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
  }, [sector]);

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

  // Handle column sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "name" ? "asc" : "desc");
    }
  };

  // Sort data
  const sortedData = [...data].sort((a, b) => {
    let comparison = 0;
    if (sortField === "name") {
      comparison = a.name.localeCompare(b.name);
    } else {
      comparison = a[sortField] - b[sortField];
    }
    return sortDirection === "asc" ? comparison : -comparison;
  });

  // Get chart data based on time range (with computed pctShort)
  const getChartData = (row: TradersRow) => {
    const timeOption = TIME_RANGE_OPTIONS.find(t => t.id === timeRange);
    const slicedData = timeOption?.weeks
      ? row.historicalData.slice(-timeOption.weeks)
      : row.historicalData;
    return slicedData.map(d => ({ ...d, pctShort: 100 - d.pctLong }));
  };

  // Get chart data for expanded modal (with computed pctShort)
  const getExpandedChartData = (row: TradersRow) => {
    const timeOption = TIME_RANGE_OPTIONS.find(t => t.id === expandedTimeRange);
    const slicedData = timeOption?.weeks
      ? row.historicalData.slice(-timeOption.weeks)
      : row.historicalData;
    return slicedData.map(d => ({ ...d, pctShort: 100 - d.pctLong }));
  };

  // Get % Long color
  const getPctLongColor = (pct: number): string => {
    if (pct >= 70) return "text-green-400";
    if (pct >= 55) return "text-green-400/70";
    if (pct <= 30) return "text-red-400";
    if (pct <= 45) return "text-red-400/70";
    return "text-zinc-400";
  };

  // Bar chart data for % Long/Short overview
  // Show positive % for long bias (>=50%), negative % for short bias (<50%)
  const barChartData = data.map(row => ({
    name: row.name,
    pctLong: row.pctLong,
    pctShort: row.pctShort,
    displayValue: row.pctLong >= 50 ? row.pctLong : -row.pctShort,
    isLong: row.pctLong >= 50,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Number of Traders - MM (Managed Money)
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Number of traders holding long vs short positions in Managed Money category
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
              <span className="font-medium text-zinc-400">% Long:</span> Percentage of MM traders holding long positions
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 font-bold rounded">&gt;70%</span>
              <span>= Crowded Long</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 font-bold rounded">&lt;30%</span>
              <span>= Crowded Short</span>
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
                <th
                  className="text-left py-3 px-4 text-zinc-400 font-medium cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("name")}
                >
                  <span className="flex items-center gap-1">
                    Commodity
                    {sortField === "name" && (sortDirection === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </span>
                </th>
                <th
                  className="text-right py-3 px-2 text-zinc-400 font-medium cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("tradersLong")}
                >
                  <span className="flex items-center justify-end gap-1">
                    Long
                    {sortField === "tradersLong" && (sortDirection === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </span>
                </th>
                <th
                  className="text-right py-3 px-2 text-zinc-400 font-medium cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("tradersShort")}
                >
                  <span className="flex items-center justify-end gap-1">
                    Short
                    {sortField === "tradersShort" && (sortDirection === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </span>
                </th>
                <th
                  className="text-right py-3 px-3 text-zinc-400 font-medium cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort("pctLong")}
                >
                  <span className="flex items-center justify-end gap-1">
                    % Long
                    {sortField === "pctLong" && (sortDirection === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-zinc-800 transition-colors hover:bg-zinc-800/50 cursor-pointer ${
                    selectedRow?.id === row.id ? "bg-zinc-800/70" : ""
                  }`}
                  onClick={() => setSelectedRow(row)}
                >
                  <td className="py-2.5 px-4 text-white">{row.name}</td>
                  <td className="py-2.5 px-2 text-right font-mono text-blue-400">
                    {row.tradersLong}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-red-400">
                    {row.tradersShort}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono font-bold ${getPctLongColor(row.pctLong)}`}>
                    {row.pctLong.toFixed(1)}%
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
              {/* Header Row */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-md font-semibold text-white">{selectedRow.name}</h3>
                  <p className="text-xs text-zinc-500">
                    {chartViewMode === "number" ? "Number of Traders Long vs Short" : "% Long"} ({getChartData(selectedRow).length} weeks)
                  </p>
                </div>
                {/* Latest value badge */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono">
                    <span className="text-blue-400">{selectedRow.tradersLong}L</span>
                    {" / "}
                    <span className="text-red-400">{selectedRow.tradersShort}S</span>
                  </span>
                  <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded ${
                    selectedRow.pctLong >= 55 ? "bg-green-500/20 text-green-400" :
                    selectedRow.pctLong <= 45 ? "bg-red-500/20 text-red-400" :
                    "bg-zinc-800 text-zinc-400"
                  }`}>
                    {selectedRow.pctLong.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Toggles Row */}
              <div className="flex items-center gap-4 mb-4 pb-3 border-b border-zinc-800">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setChartViewMode("number")}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      chartViewMode === "number"
                        ? "bg-blue-500 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                    }`}
                  >
                    #
                  </button>
                  <button
                    onClick={() => setChartViewMode("percent")}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      chartViewMode === "percent"
                        ? "bg-blue-500 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                    }`}
                  >
                    %
                  </button>
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

              <div
                className="h-[400px] cursor-pointer"
                onClick={() => setExpandedChart(selectedRow)}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={getChartData(selectedRow)}
                    margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#ffffff", fontSize: 12 }}
                      angle={-90}
                      textAnchor="end"
                      height={50}
                      tickFormatter={formatChartDate}
                      interval={Math.floor(getChartData(selectedRow).length / 12)}
                      dy={25}
                    />
                    <YAxis
                      tick={{ fill: "#ffffff", fontSize: 12 }}
                      domain={chartViewMode === "percent" ? [0, 100] : ["auto", "auto"]}
                      tickFormatter={chartViewMode === "percent" ? (v) => `${v}%` : undefined}
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
                      labelFormatter={(label) => formatDate(label)}
                      formatter={chartViewMode === "percent" ? (value: number, name: string) => [`${value.toFixed(1)}%`, name] : undefined}
                    />
                    <Legend />
                    {chartViewMode === "number" ? (
                      <>
                        <Line
                          type="monotone"
                          dataKey="tradersLong"
                          name="Long"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="tradersShort"
                          name="Short"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={false}
                        />
                      </>
                    ) : (
                      <>
                        <ReferenceLine y={50} stroke="#52525b" strokeDasharray="3 3" />
                        <Line
                          type="monotone"
                          dataKey="pctLong"
                          name="% Long"
                          stroke="#22c55e"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="pctShort"
                          name="% Short"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={false}
                        />
                      </>
                    )}
                  </LineChart>
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

      {/* % Traders Long/Short Bar Chart Overview */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <h3 className="text-md font-semibold text-white mb-4">% Traders Long/Short by Commodity</h3>
        <div className="h-[450px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barChartData}
              margin={{ top: 20, right: 10, left: 10, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="name"
                tick={{ fill: "#ffffff", fontSize: 12 }}
                angle={-90}
                textAnchor="end"
                height={70}
                dy={45}
              />
              <YAxis
                tick={{ fill: "#ffffff", fontSize: 12 }}
                domain={[-100, 100]}
                tickFormatter={(v) => `${v}%`}
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
                formatter={(value: number) => [`${value > 0 ? value.toFixed(1) : value.toFixed(1)}%`, value >= 0 ? "% Long" : "% Short"]}
              />
              <ReferenceLine y={0} stroke="#52525b" />
              <Bar dataKey="displayValue" radius={[4, 4, 0, 0]}>
                <LabelList
                  dataKey="displayValue"
                  position="top"
                  fill="#ffffff"
                  fontSize={13}
                  formatter={(value: number) => `${value > 0 ? value.toFixed(0) : value.toFixed(0)}%`}
                />
                {barChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isLong ? "#22c55e" : "#ef4444"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Individual Historical Charts Grid */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <h3 className="text-md font-semibold text-white mb-4">Historical % Long by Commodity (since 2010)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map((row) => {
            return (
              <div
                key={row.id}
                className="bg-zinc-800/50 rounded-lg p-3 cursor-pointer hover:bg-zinc-800 transition-colors"
                onClick={() => setExpandedChart(row)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-white">{row.name}</h4>
                  <span className={`text-xs font-mono font-bold ${getPctLongColor(row.pctLong)}`}>
                    {row.pctLong.toFixed(1)}%
                  </span>
                </div>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={row.historicalData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <ReferenceLine y={50} stroke="#52525b" strokeDasharray="3 3" />
                      <Line
                        type="monotone"
                        dataKey="pctLong"
                        stroke="#22c55e"
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded Chart Modal */}
      {expandedChart && (() => {
        const chartData = getExpandedChartData(expandedChart);
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
                    {expandedChart.name}
                  </h3>
                  <p className="text-sm text-zinc-400">
                    {expandedChartViewMode === "number" ? "Number of Traders Long vs Short" : "% Long"} ({chartData.length} weeks)
                  </p>
                </div>
                <button
                  onClick={() => setExpandedChart(null)}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* View Mode and Time Range Toggles */}
              <div className="flex items-center gap-4 mb-4">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setExpandedChartViewMode("number")}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      expandedChartViewMode === "number"
                        ? "bg-blue-500 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                    }`}
                  >
                    #
                  </button>
                  <button
                    onClick={() => setExpandedChartViewMode("percent")}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      expandedChartViewMode === "percent"
                        ? "bg-blue-500 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                    }`}
                  >
                    %
                  </button>
                </div>
                {/* Time Range Toggle */}
                <div className="flex items-center gap-1">
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
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-zinc-500">Traders Long</p>
                  <p className="text-lg font-bold text-blue-400">
                    {expandedChart.tradersLong}
                  </p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-zinc-500">Traders Short</p>
                  <p className="text-lg font-bold text-red-400">
                    {expandedChart.tradersShort}
                  </p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3">
                  <p className="text-xs text-zinc-500">% Long</p>
                  <p className={`text-lg font-bold ${getPctLongColor(expandedChart.pctLong)}`}>
                    {expandedChart.pctLong.toFixed(1)}%
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
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#ffffff", fontSize: 11 }}
                      angle={-90}
                      textAnchor="end"
                      height={150}
                      tickFormatter={formatChartDate}
                      interval={Math.floor(chartData.length / intervalDivisor)}
                      dy={25}
                    />
                    <YAxis
                      tick={{ fill: "#ffffff", fontSize: 11 }}
                      domain={expandedChartViewMode === "percent" ? [0, 100] : ["auto", "auto"]}
                      tickFormatter={expandedChartViewMode === "percent" ? (v) => `${v}%` : undefined}
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
                      labelFormatter={(label) => formatDate(label)}
                      formatter={expandedChartViewMode === "percent" ? (value: number) => [`${value.toFixed(1)}%`, "% Long"] : undefined}
                    />
                    <Legend />
                    {expandedChartViewMode === "number" ? (
                      <>
                        <Line
                          type="monotone"
                          dataKey="tradersLong"
                          name="Long"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="tradersShort"
                          name="Short"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={false}
                        />
                      </>
                    ) : (
                      <>
                        <ReferenceLine y={50} stroke="#52525b" strokeDasharray="3 3" />
                        <Line
                          type="monotone"
                          dataKey="pctLong"
                          name="% Long"
                          stroke="#22c55e"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="pctShort"
                          name="% Short"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={false}
                        />
                      </>
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
