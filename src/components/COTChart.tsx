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

type TimeRange = "3m" | "6m" | "1y" | "2y" | "5y" | "all";

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

export function COTChart({
  title,
  data,
  lines,
  loading = false,
  showZeroLine = true,
}: COTChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("all");

  const filteredData = useMemo(
    () => filterByTimeRange(data, timeRange),
    [data, timeRange]
  );

  // Calculate tick interval based on data length
  const tickInterval = useMemo(() => {
    const len = filteredData.length;
    if (len <= 20) return 0;
    if (len <= 50) return Math.floor(len / 10);
    if (len <= 100) return Math.floor(len / 8);
    if (len <= 200) return Math.floor(len / 6);
    return Math.floor(len / 5);
  }, [filteredData.length]);

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
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

      {/* Chart */}
      <div className="h-[280px]">
        {filteredData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-zinc-500 text-sm">No data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={filteredData}
              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
            >
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fill: "#71717a", fontSize: 10 }}
                axisLine={{ stroke: "#3f3f46" }}
                tickLine={{ stroke: "#3f3f46" }}
                interval={tickInterval}
              />
              <YAxis
                tickFormatter={formatNumber}
                tick={{ fill: "#71717a", fontSize: 10 }}
                axisLine={{ stroke: "#3f3f46" }}
                tickLine={{ stroke: "#3f3f46" }}
                width={50}
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
                  formatNumber(value) + " contracts",
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
                wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
              />
              {showZeroLine && (
                <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
              )}
              {lines.map((line) => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.name}
                  stroke={line.color}
                  dot={false}
                  strokeWidth={1.5}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Stats */}
      {filteredData.length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-800 grid grid-cols-2 md:grid-cols-4 gap-3">
          {lines.map((line) => {
            const latest = filteredData[filteredData.length - 1];
            const previous = filteredData[filteredData.length - 2];
            const value = latest[line.key] as number;
            const prevValue = previous ? (previous[line.key] as number) : value;
            const change = value - prevValue;

            return (
              <div key={line.key} className="text-center">
                <p className="text-xs text-zinc-500">{line.name}</p>
                <p className="text-sm font-medium" style={{ color: line.color }}>
                  {formatNumber(value)}
                </p>
                <p
                  className={`text-xs ${
                    change >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {change >= 0 ? "+" : ""}
                  {formatNumber(change)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
