"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { X } from "lucide-react";

type TimeRange = "3m" | "6m" | "1y" | "2y" | "5y" | "all";
type ViewMode = "outright" | "percent";

interface DataPoint {
  date: string;
  [key: string]: number | string;
}

interface ChartLine {
  key: string;
  name: string;
  color: string;
}

interface COTChartProps {
  title: string;
  data: DataPoint[];
  lines: ChartLine[];
  loading?: boolean;
  showZeroLine?: boolean;
  // Optional alternate view (% OI or % Total)
  alternateData?: DataPoint[];
  alternateLines?: ChartLine[];
  alternateLabel?: string; // e.g., "% OI" or "% Total"
}

const TIME_RANGES: { id: TimeRange; label: string }[] = [
  { id: "3m", label: "3M" },
  { id: "6m", label: "6M" },
  { id: "1y", label: "1Y" },
  { id: "2y", label: "2Y" },
  { id: "5y", label: "5Y" },
  { id: "all", label: "All" },
];

function filterByTimeRange(data: DataPoint[], range: TimeRange): DataPoint[] {
  if (range === "all" || data.length === 0) return data;

  const now = new Date();
  let cutoff: Date;

  switch (range) {
    case "3m":
      cutoff = new Date(now.setMonth(now.getMonth() - 3));
      break;
    case "6m":
      cutoff = new Date(now.setMonth(now.getMonth() - 6));
      break;
    case "1y":
      cutoff = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    case "2y":
      cutoff = new Date(now.setFullYear(now.getFullYear() - 2));
      break;
    case "5y":
      cutoff = new Date(now.setFullYear(now.getFullYear() - 5));
      break;
    default:
      return data;
  }

  const cutoffStr = cutoff.toISOString().split("T")[0];
  return data.filter((d) => d.date >= cutoffStr);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatNumber(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return (value / 1000000).toFixed(1) + "M";
  } else if (Math.abs(value) >= 1000) {
    return (value / 1000).toFixed(0) + "K";
  }
  return value.toFixed(0);
}

function formatPercent(value: number): string {
  return value.toFixed(1) + "%";
}

// Get yearly tick indices for small charts
function getYearlyTicks(data: DataPoint[]): number[] {
  if (data.length === 0) return [];

  const ticks: number[] = [];
  let lastYear = -1;

  data.forEach((d, index) => {
    const year = new Date(d.date).getFullYear();
    if (year !== lastYear) {
      ticks.push(index);
      lastYear = year;
    }
  });

  return ticks;
}

// Get 6-month tick indices for expanded charts
function getSixMonthTicks(data: DataPoint[]): number[] {
  if (data.length === 0) return [];

  const ticks: number[] = [];
  let lastKey = "";

  data.forEach((d, index) => {
    const date = new Date(d.date);
    const month = date.getMonth();
    const year = date.getFullYear();
    // Show Jan and Jul of each year
    const key = `${year}-${month < 6 ? 0 : 6}`;
    if (key !== lastKey) {
      ticks.push(index);
      lastKey = key;
    }
  });

  return ticks;
}

export function COTChart({
  title,
  data,
  lines,
  loading = false,
  showZeroLine = true,
  alternateData,
  alternateLines,
  alternateLabel,
}: COTChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("outright");

  const hasAlternate = alternateData && alternateLines && alternateLabel;
  const isPercentView = viewMode === "percent" && hasAlternate;

  const activeData = isPercentView ? alternateData! : data;
  const activeLines = isPercentView ? alternateLines! : lines;

  const filteredData = useMemo(
    () => filterByTimeRange(activeData, timeRange),
    [activeData, timeRange]
  );

  const yearlyTicks = useMemo(() => getYearlyTicks(filteredData), [filteredData]);
  const sixMonthTicks = useMemo(() => getSixMonthTicks(filteredData), [filteredData]);

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  const ChartContent = ({ expanded = false }: { expanded?: boolean }) => {
    const height = expanded ? 400 : 250;
    const ticks = expanded ? sixMonthTicks : yearlyTicks;

    return (
      <div style={{ height }}>
        {filteredData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-zinc-500 text-sm">No data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={filteredData}
              margin={{ top: 20, right: 10, left: 5, bottom: 5 }}
            >
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: "#71717a", fontSize: 10, dy: 25 }}
                axisLine={{ stroke: "#3f3f46" }}
                tickLine={{ stroke: "#3f3f46" }}
                ticks={ticks.map(i => filteredData[i]?.date).filter(Boolean)}
                angle={-90}
                textAnchor="end"
                height={expanded ? 70 : 60}
                interval={0}
              />
              <YAxis
                tickFormatter={isPercentView ? formatPercent : formatNumber}
                tick={{ fill: "#71717a", fontSize: 10 }}
                axisLine={{ stroke: "#3f3f46" }}
                tickLine={{ stroke: "#3f3f46" }}
                width={55}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#a1a1aa" }}
                formatter={(value: number, name: string) => [
                  isPercentView ? formatPercent(value) : formatNumber(value) + " contracts",
                  name,
                ]}
                labelFormatter={(label) => {
                  const date = new Date(label);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                }}
              />
              <Legend
                verticalAlign="top"
                height={24}
                wrapperStyle={{ fontSize: "11px" }}
              />
              {showZeroLine && (
                <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
              )}
              {activeLines.map((line) => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.name}
                  stroke={line.color}
                  dot={false}
                  strokeWidth={expanded ? 2 : 1.5}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    );
  };

  const ViewToggle = ({ size = "small" }: { size?: "small" | "large" }) => {
    if (!hasAlternate) return null;

    const btnClass = size === "large"
      ? "px-3 py-1 text-sm rounded transition-colors"
      : "px-2 py-0.5 text-xs rounded transition-colors";

    return (
      <div className="flex gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); setViewMode("outright"); }}
          className={`${btnClass} ${
            viewMode === "outright"
              ? "bg-blue-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          Outright
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setViewMode("percent"); }}
          className={`${btnClass} ${
            viewMode === "percent"
              ? "bg-blue-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          {alternateLabel}
        </button>
      </div>
    );
  };

  return (
    <>
      {/* Small Chart */}
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 cursor-pointer hover:border-zinc-700 transition-colors"
        onClick={() => setIsExpanded(true)}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2 gap-2">
          <h3 className="text-sm font-semibold text-white truncate">{title}</h3>
          <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <ViewToggle size="small" />
            <div className="flex gap-1">
              {TIME_RANGES.map((range) => (
                <button
                  key={range.id}
                  onClick={() => setTimeRange(range.id)}
                  className={`px-2 py-0.5 text-xs rounded transition-colors ${
                    timeRange === range.id
                      ? "bg-orange-500 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart */}
        <ChartContent expanded={false} />

        {/* Stats */}
        {filteredData.length > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-800 flex flex-wrap justify-center gap-6">
            {activeLines.map((line) => {
              const latest = filteredData[filteredData.length - 1];
              const previous = filteredData[filteredData.length - 2];
              const value = latest[line.key] as number;
              const prevValue = previous ? (previous[line.key] as number) : value;
              const change = value - prevValue;

              return (
                <div key={line.key} className="text-center min-w-[80px]">
                  <p className="text-xs text-zinc-500">{line.name}</p>
                  <p className="text-sm font-medium" style={{ color: line.color }}>
                    {isPercentView ? formatPercent(value) : formatNumber(value)}
                  </p>
                  <p
                    className={`text-xs ${
                      change >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {change >= 0 ? "+" : ""}
                    {isPercentView ? formatPercent(change) : formatNumber(change)} WoW
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Click hint */}
        <p className="text-xs text-zinc-600 text-center mt-2">Click to expand</p>
      </div>

      {/* Expanded Modal */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              <div className="flex items-center gap-4">
                <ViewToggle size="large" />
                <div className="flex gap-1">
                  {TIME_RANGES.map((range) => (
                    <button
                      key={range.id}
                      onClick={() => setTimeRange(range.id)}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        timeRange === range.id
                          ? "bg-orange-500 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>
            </div>

            {/* Expanded Chart */}
            <ChartContent expanded={true} />

            {/* Stats */}
            {filteredData.length > 0 && (
              <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-wrap justify-center gap-8">
                {activeLines.map((line) => {
                  const latest = filteredData[filteredData.length - 1];
                  const previous = filteredData[filteredData.length - 2];
                  const value = latest[line.key] as number;
                  const prevValue = previous ? (previous[line.key] as number) : value;
                  const change = value - prevValue;

                  return (
                    <div key={line.key} className="text-center min-w-[100px]">
                      <p className="text-sm text-zinc-500">{line.name}</p>
                      <p className="text-xl font-medium" style={{ color: line.color }}>
                        {isPercentView ? formatPercent(value) : formatNumber(value)}
                      </p>
                      <p
                        className={`text-sm ${
                          change >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {change >= 0 ? "+" : ""}
                        {isPercentView ? formatPercent(change) : formatNumber(change)} WoW
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
