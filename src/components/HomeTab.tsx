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
import { TrendingUp, TrendingDown, AlertTriangle, X, Maximize2 } from "lucide-react";

interface FlaggedSeries {
  seriesKey: string;
  seriesLabel: string;
  latestValue: number;
  percentile: number;
  threshold95: number;
  threshold5: number;
  isHigh: boolean;
  isPercentage: boolean;
  historicalMin: number;
  historicalMax: number;
  historicalData: { date: string; value: number }[];
}

interface CommodityScreening {
  id: string;
  label: string;
  positionDate: string;
  flaggedSeries: FlaggedSeries[];
}

interface APIResponse {
  success: boolean;
  positionDate: string;
  data: CommodityScreening[];
}

function formatNumber(num: number): string {
  if (Math.abs(num) >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(num) >= 1000) {
    return `${(num / 1000).toFixed(0)}k`;
  }
  return num.toLocaleString("en-US");
}

function formatValue(num: number, isPercentage: boolean): string {
  if (isPercentage) {
    return `${num.toFixed(1)}%`;
  }
  return formatNumber(num);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

interface ExpandedChartData {
  commodity: string;
  series: FlaggedSeries;
}

// Custom tick component for vertical x-axis labels (mini charts)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTickMini(props: any) {
  const { x, y, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        fill="#71717a"
        fontSize={9}
        transform="rotate(-90)"
      >
        {formatDate(payload.value)}
      </text>
    </g>
  );
}

// Custom tick component for vertical x-axis labels (expanded charts)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTickExpanded(props: any) {
  const { x, y, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        fill="#a1a1aa"
        fontSize={11}
        transform="rotate(-90)"
      >
        {formatDate(payload.value)}
      </text>
    </g>
  );
}

export function HomeTab() {
  const [data, setData] = useState<CommodityScreening[]>([]);
  const [positionDate, setPositionDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedChart, setExpandedChart] = useState<ExpandedChartData | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/screening");
        const json: APIResponse = await res.json();

        if (json.success) {
          setData(json.data);
          setPositionDate(json.positionDate);
        } else {
          setError("Failed to fetch screening data");
        }
      } catch (err) {
        setError("Failed to fetch data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Count total flagged series
  const totalFlagged = useMemo(() => {
    return data.reduce((sum, c) => sum + c.flaggedSeries.length, 0);
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-zinc-700 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-zinc-800 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-32 bg-zinc-800 rounded"></div>
              ))}
            </div>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              95th Percentile Screening
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Data series where the latest value is in the 95th or 5th percentile of historical data
            </p>
          </div>
          <div className="flex items-center gap-6">
            {positionDate && (
              <div className="text-right">
                <p className="text-xs text-zinc-500">Report Date</p>
                <p className="text-sm font-medium text-white">
                  {new Date(positionDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
            {positionDate && (
              <div className="text-right">
                <p className="text-xs text-zinc-500">Release Date</p>
                <p className="text-sm font-medium text-zinc-400">
                  {(() => {
                    const date = new Date(positionDate);
                    date.setDate(date.getDate() + 3);
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                  })()}
                </p>
              </div>
            )}
            <div className="text-right border-l border-zinc-700 pl-6">
              <p className="text-2xl font-bold text-white">{totalFlagged}</p>
              <p className="text-xs text-zinc-500">Flagged Series</p>
            </div>
          </div>
        </div>
      </div>

      {/* Commodity Sections */}
      {data.map((commodity) => (
        <div
          key={commodity.id}
          className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden"
        >
          {/* Commodity Header */}
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-md font-semibold text-white">{commodity.label}</h3>
              {commodity.flaggedSeries.length > 0 && (
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                  {commodity.flaggedSeries.length} flagged
                </span>
              )}
            </div>
            {commodity.positionDate && (
              <p className="text-xs text-zinc-500">
                {new Date(commodity.positionDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>

          {/* Flagged Series */}
          <div className="p-4">
            {commodity.flaggedSeries.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-4">
                No data series in extreme percentiles
              </p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {commodity.flaggedSeries.map((series) => (
                  <div
                    key={series.seriesKey}
                    className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4"
                  >
                    {/* Series Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {series.isHigh ? (
                          <TrendingUp className="w-4 h-4 text-green-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-400" />
                        )}
                        <h4 className="text-sm font-medium text-white">
                          {series.seriesLabel}
                        </h4>
                      </div>
                      <button
                        onClick={() => setExpandedChart({ commodity: commodity.label, series })}
                        className="p-1 hover:bg-zinc-700 rounded transition-colors"
                        title="Expand chart"
                      >
                        <Maximize2 className="w-4 h-4 text-zinc-400" />
                      </button>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                      <div className="bg-zinc-900/50 rounded p-2">
                        <p className="text-zinc-500">Current</p>
                        <p className={`font-semibold ${series.isHigh ? "text-green-400" : "text-red-400"}`}>
                          {formatValue(series.latestValue, series.isPercentage)}
                        </p>
                      </div>
                      <div className="bg-zinc-900/50 rounded p-2">
                        <p className="text-zinc-500">Percentile</p>
                        <p className={`font-semibold ${series.isHigh ? "text-green-400" : "text-red-400"}`}>
                          {series.percentile.toFixed(1)}%
                        </p>
                      </div>
                      <div className="bg-zinc-900/50 rounded p-2">
                        <p className="text-zinc-500">{series.isHigh ? "95th" : "5th"} Threshold</p>
                        <p className="font-semibold text-zinc-300">
                          {formatValue(series.isHigh ? series.threshold95 : series.threshold5, series.isPercentage)}
                        </p>
                      </div>
                    </div>

                    {/* Mini Chart */}
                    <div className="h-36">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={series.historicalData.slice(-104)} // Last 2 years
                          margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis
                            dataKey="date"
                            tick={CustomTickMini}
                            axisLine={{ stroke: "#3f3f46" }}
                            interval="preserveStartEnd"
                            height={50}
                          />
                          <YAxis
                            tick={{ fill: "#71717a", fontSize: 9 }}
                            axisLine={{ stroke: "#3f3f46" }}
                            tickFormatter={(v) => series.isPercentage ? `${v.toFixed(0)}%` : formatNumber(v)}
                            width={40}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#18181b",
                              border: "1px solid #3f3f46",
                              borderRadius: "6px",
                              fontSize: "11px",
                            }}
                            labelFormatter={(label) => formatDate(label as string)}
                            formatter={(value: number) => [formatValue(value, series.isPercentage), ""]}
                          />
                          <ReferenceLine
                            y={series.threshold95}
                            stroke="#22c55e"
                            strokeDasharray="3 3"
                            strokeWidth={1}
                          />
                          <ReferenceLine
                            y={series.threshold5}
                            stroke="#ef4444"
                            strokeDasharray="3 3"
                            strokeWidth={1}
                          />
                          <ReferenceLine y={0} stroke="#52525b" />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={series.isHigh ? "#22c55e" : "#ef4444"}
                            strokeWidth={1.5}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Range Info */}
                    <div className="flex justify-between text-xs text-zinc-500 mt-2">
                      <span>Min: {formatValue(series.historicalMin, series.isPercentage)}</span>
                      <span>Max: {formatValue(series.historicalMax, series.isPercentage)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Expanded Chart Modal */}
      {expandedChart && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedChart(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-5xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {expandedChart.commodity} - {expandedChart.series.seriesLabel}
                </h3>
                <p className="text-sm text-zinc-400">
                  {expandedChart.series.isHigh ? "95th" : "5th"} Percentile Alert
                </p>
              </div>
              <button
                onClick={() => setExpandedChart(null)}
                className="p-2 hover:bg-zinc-700 rounded transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-5 gap-4 mb-4">
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-500">Current Value</p>
                <p className={`text-lg font-bold ${expandedChart.series.isHigh ? "text-green-400" : "text-red-400"}`}>
                  {formatValue(expandedChart.series.latestValue, expandedChart.series.isPercentage)}
                </p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-500">Percentile</p>
                <p className={`text-lg font-bold ${expandedChart.series.isHigh ? "text-green-400" : "text-red-400"}`}>
                  {expandedChart.series.percentile.toFixed(1)}%
                </p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-500">95th Threshold</p>
                <p className="text-lg font-bold text-green-400">
                  {formatValue(expandedChart.series.threshold95, expandedChart.series.isPercentage)}
                </p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-500">5th Threshold</p>
                <p className="text-lg font-bold text-red-400">
                  {formatValue(expandedChart.series.threshold5, expandedChart.series.isPercentage)}
                </p>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-500">Historical Range</p>
                <p className="text-lg font-bold text-zinc-300">
                  {formatValue(expandedChart.series.historicalMin, expandedChart.series.isPercentage)} to {formatValue(expandedChart.series.historicalMax, expandedChart.series.isPercentage)}
                </p>
              </div>
            </div>

            {/* Full Chart */}
            <div className="h-[50vh]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={expandedChart.series.historicalData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis
                    dataKey="date"
                    tick={CustomTickExpanded}
                    axisLine={{ stroke: "#52525b" }}
                    interval="preserveStartEnd"
                    height={70}
                  />
                  <YAxis
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    axisLine={{ stroke: "#52525b" }}
                    tickFormatter={(v) => expandedChart.series.isPercentage ? `${v.toFixed(0)}%` : formatNumber(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                    }}
                    labelFormatter={(label) => new Date(label as string).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    formatter={(value: number) => [formatValue(value, expandedChart.series.isPercentage), ""]}
                  />
                  <ReferenceLine
                    y={expandedChart.series.threshold95}
                    stroke="#22c55e"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    label={{ value: "95th", fill: "#22c55e", fontSize: 11 }}
                  />
                  <ReferenceLine
                    y={expandedChart.series.threshold5}
                    stroke="#ef4444"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    label={{ value: "5th", fill: "#ef4444", fontSize: 11 }}
                  />
                  <ReferenceLine y={0} stroke="#52525b" />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#f97316"
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
