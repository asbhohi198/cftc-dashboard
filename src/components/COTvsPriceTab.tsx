"use client";

import { useEffect, useState } from "react";
import {
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
} from "recharts";
import { X, TrendingUp, TrendingDown } from "lucide-react";

interface WeeklyDataPoint {
  date: string;
  mm_net: number;
  mm_change: number;
  price: number;
  price_change: number;
  price_change_pct: number;
}

interface CommodityResult {
  id: string;
  name: string;
  sector: string;
  currentMMNet: number;
  currentPrice: number;
  latestDate: string;
  recordMaxPosition: number;
  recordMinPosition: number;
  beta: number;
  rSquared: number;
  correlation: number;
  priceToMaxLong: number;
  priceToMaxShort: number;
  contractsToMaxLong: number;
  contractsToMaxShort: number;
  weeklyData: WeeklyDataPoint[];
}

interface APIResponse {
  success: boolean;
  updated?: string;
  sector?: string;
  data: CommodityResult[];
  error?: string;
}

const SECTORS = [
  { id: "ags-grains", label: "Ags - Grains & Oilseeds" },
  { id: "ags-softs", label: "Ags - Softs" },
  { id: "ags-livestock", label: "Ags - Livestock" },
  { id: "energy", label: "Energy" },
  { id: "metals", label: "Metals" },
  { id: "equities", label: "Equities" },
  { id: "rates", label: "Rates" },
  { id: "fx", label: "FX" },
];

function formatNumber(num: number): string {
  if (Math.abs(num) >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  } else if (Math.abs(num) >= 1000) {
    return (num / 1000).toFixed(0) + "K";
  }
  return Math.round(num).toLocaleString();
}

function formatPrice(num: number): string {
  if (num >= 1000) {
    return num.toFixed(2);
  } else if (num >= 1) {
    return num.toFixed(2);
  } else {
    return num.toFixed(4);
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
}

// Custom X-axis tick with vertical rotation
const CustomXAxisTick = (props: { x?: number; y?: number; payload?: { value: string } }) => {
  const { x = 0, y = 0, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={15}
        textAnchor="end"
        fill="#ffffff"
        fontSize={10}
        transform="rotate(-90)"
      >
        {payload?.value ? formatDate(payload.value) : ""}
      </text>
    </g>
  );
};

export function COTvsPriceTab() {
  const [sector, setSector] = useState("ags-grains");
  const [data, setData] = useState<CommodityResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState<string>("");
  const [expandedChart, setExpandedChart] = useState<{ commodity: CommodityResult; type: "scatter" | "timeseries" } | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/cot-vs-price?sector=${sector}`);
        const json: APIResponse = await res.json();
        if (json.success && json.data) {
          setData(json.data);
          setUpdated(json.updated || "");
        } else {
          setError(json.error || "Failed to load data");
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[400px] bg-zinc-800 rounded"></div>
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
        <p className="text-zinc-500 text-sm mt-2">
          Make sure the data export script has been run: <code>python scripts/export_cot_vs_price.py</code>
        </p>
      </div>
    );
  }

  const renderScatterChart = (commodity: CommodityResult, isExpanded: boolean = false) => {
    const chartMargin = isExpanded
      ? { top: 20, right: 30, left: 10, bottom: 20 }
      : { top: 10, right: 10, left: -10, bottom: 10 };

    // Prepare scatter data: mm_change vs price_change_pct
    const scatterData = commodity.weeklyData.map((d) => ({
      x: d.mm_change,
      y: d.price_change_pct,
      date: d.date,
    }));

    // Calculate regression line endpoints
    const xValues = scatterData.map((d) => d.x);
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);

    const regressionLine = [
      { x: xMin, y: commodity.beta * xMin },
      { x: xMax, y: commodity.beta * xMax },
    ];

    return (
      <ResponsiveContainer width="100%" height={isExpanded ? "100%" : 250}>
        <ScatterChart margin={chartMargin}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="x"
            type="number"
            tick={{ fill: "#ffffff", fontSize: isExpanded ? 12 : 10 }}
            tickFormatter={(v) => formatNumber(v)}
            label={isExpanded ? { value: "MM Position Change (contracts)", position: "bottom", fill: "#a1a1aa", fontSize: 12 } : undefined}
          />
          <YAxis
            dataKey="y"
            type="number"
            tick={{ fill: "#ffffff", fontSize: isExpanded ? 12 : 10 }}
            tickFormatter={(v) => `${v.toFixed(1)}%`}
            label={isExpanded ? { value: "Price Change (%)", angle: -90, position: "insideLeft", fill: "#a1a1aa", fontSize: 12 } : undefined}
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
              if (name === "x") return [formatNumber(value), "MM Change"];
              return [`${value.toFixed(2)}%`, "Price Change"];
            }}
          />
          <ReferenceLine x={0} stroke="#52525b" />
          <ReferenceLine y={0} stroke="#52525b" />
          <Scatter data={scatterData} fill="#3b82f6" opacity={0.6} />
          {/* Regression line */}
          <Scatter data={regressionLine} fill="#f97316" line={{ stroke: "#f97316", strokeWidth: 2 }} shape={() => null} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  };

  const renderTimeSeriesChart = (commodity: CommodityResult, isExpanded: boolean = false) => {
    const chartMargin = isExpanded
      ? { top: 20, right: 60, left: 10, bottom: 60 }
      : { top: 10, right: 40, left: -10, bottom: 40 };

    // Sample data for performance (every 4th point for small chart, every 2nd for expanded)
    const step = isExpanded ? 2 : 4;
    const sampledData = commodity.weeklyData.filter((_, i) => i % step === 0);

    // Get tick positions (approximately every 6 months for expanded, yearly for small)
    const tickInterval = isExpanded ? 26 : 52;
    const ticks = sampledData
      .filter((_, i) => i % Math.floor(tickInterval / step) === 0)
      .map((d) => d.date);

    return (
      <ResponsiveContainer width="100%" height={isExpanded ? "100%" : 250}>
        <ComposedChart data={sampledData} margin={chartMargin}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="date"
            tick={<CustomXAxisTick />}
            ticks={ticks}
            height={50}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: "#3b82f6", fontSize: isExpanded ? 12 : 10 }}
            tickFormatter={(v) => formatNumber(v)}
            label={isExpanded ? { value: "MM Net Position", angle: -90, position: "insideLeft", fill: "#3b82f6", fontSize: 12 } : undefined}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: "#22c55e", fontSize: isExpanded ? 12 : 10 }}
            tickFormatter={(v) => formatPrice(v)}
            label={isExpanded ? { value: "Price", angle: 90, position: "insideRight", fill: "#22c55e", fontSize: 12 } : undefined}
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
              if (name === "MM Net") return [formatNumber(value), name];
              return [formatPrice(value), name];
            }}
          />
          <ReferenceLine yAxisId="left" y={0} stroke="#52525b" />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="mm_net"
            name="MM Net"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="price"
            name="Price"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Sector Dropdown */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">COT vs Price Analysis</h2>
            <p className="text-xs text-zinc-500 mt-1">
              Analyzing relationship between MM position changes and price movements (since 2016)
            </p>
            {updated && (
              <p className="text-xs text-zinc-600 mt-1">
                Last updated: {new Date(updated).toLocaleDateString()}
              </p>
            )}
          </div>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {SECTORS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-800/50 text-zinc-400 text-xs uppercase">
                <th className="text-left p-3">Commodity</th>
                <th className="text-center p-3">Current MM Net</th>
                <th className="text-center p-3">Current Price</th>
                <th className="text-center p-3">Beta</th>
                <th className="text-center p-3">R²</th>
                <th className="text-center p-3">Price to Max Long</th>
                <th className="text-center p-3">Price to Max Short</th>
              </tr>
            </thead>
            <tbody>
              {data.map((commodity) => {
                const priceChangeToMaxLong = ((commodity.priceToMaxLong - commodity.currentPrice) / commodity.currentPrice) * 100;
                const priceChangeToMaxShort = ((commodity.priceToMaxShort - commodity.currentPrice) / commodity.currentPrice) * 100;

                return (
                  <tr key={commodity.id} className="border-t border-zinc-800 hover:bg-zinc-800/30">
                    <td className="p-3 font-medium text-white">{commodity.name}</td>
                    <td className={`p-3 text-center ${commodity.currentMMNet >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {formatNumber(commodity.currentMMNet)}
                    </td>
                    <td className="p-3 text-center text-white">
                      {formatPrice(commodity.currentPrice)}
                    </td>
                    <td className={`p-3 text-center ${commodity.beta >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {(commodity.beta * 10000).toFixed(4)}
                    </td>
                    <td className={`p-3 text-center ${commodity.rSquared >= 0.1 ? "text-green-400" : "text-zinc-500"}`}>
                      {(commodity.rSquared * 100).toFixed(1)}%
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <TrendingUp className="w-3 h-3 text-green-400" />
                        <span className="text-white">{formatPrice(commodity.priceToMaxLong)}</span>
                        <span className="text-green-400 text-xs">
                          ({priceChangeToMaxLong >= 0 ? "+" : ""}{priceChangeToMaxLong.toFixed(1)}%)
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <TrendingDown className="w-3 h-3 text-red-400" />
                        <span className="text-white">{formatPrice(commodity.priceToMaxShort)}</span>
                        <span className="text-red-400 text-xs">
                          ({priceChangeToMaxShort >= 0 ? "+" : ""}{priceChangeToMaxShort.toFixed(1)}%)
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual Commodity Charts */}
      {data.map((commodity) => (
        <div key={commodity.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Charts Column (3/4) */}
            <div className="lg:col-span-3 space-y-4">
              <h3 className="text-xl font-bold text-orange-400">{commodity.name}</h3>

              {/* Scatter Chart */}
              <div className="bg-zinc-800/30 rounded-lg p-3">
                <h4 className="text-sm font-medium text-zinc-400 mb-2">
                  Position Change vs Price Change (Scatter)
                </h4>
                <div
                  className="cursor-pointer"
                  onClick={() => setExpandedChart({ commodity, type: "scatter" })}
                >
                  {renderScatterChart(commodity, false)}
                </div>
              </div>

              {/* Time Series Chart */}
              <div className="bg-zinc-800/30 rounded-lg p-3">
                <h4 className="text-sm font-medium text-zinc-400 mb-2">
                  MM Net Position vs Price (Time Series)
                </h4>
                <div
                  className="cursor-pointer"
                  onClick={() => setExpandedChart({ commodity, type: "timeseries" })}
                >
                  {renderTimeSeriesChart(commodity, false)}
                </div>
              </div>
              <p className="text-xs text-zinc-600 text-center">Click charts to expand</p>
            </div>

            {/* Stats Panel (1/4) */}
            <div className="space-y-4">
              {/* Regression Stats */}
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-zinc-400 mb-3">Regression Stats</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Beta (per 10K contracts):</span>
                    <span className={commodity.beta >= 0 ? "text-green-400" : "text-red-400"}>
                      {(commodity.beta * 10000).toFixed(4)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">R²:</span>
                    <span className={commodity.rSquared >= 0.1 ? "text-green-400" : "text-zinc-400"}>
                      {(commodity.rSquared * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Correlation:</span>
                    <span className={commodity.correlation >= 0 ? "text-green-400" : "text-red-400"}>
                      {(commodity.correlation * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Current Position */}
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-zinc-400 mb-3">Current Position</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">MM Net:</span>
                    <span className={commodity.currentMMNet >= 0 ? "text-green-400" : "text-red-400"}>
                      {formatNumber(commodity.currentMMNet)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Price:</span>
                    <span className="text-white">{formatPrice(commodity.currentPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">As of:</span>
                    <span className="text-zinc-400">{commodity.latestDate}</span>
                  </div>
                </div>
              </div>

              {/* Record Positions */}
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-zinc-400 mb-3">Record Positions (2016+)</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Record Long:</span>
                    <span className="text-green-400">{formatNumber(commodity.recordMaxPosition)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Record Short:</span>
                    <span className="text-red-400">{formatNumber(commodity.recordMinPosition)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">To Max Long:</span>
                    <span className="text-zinc-400">{formatNumber(commodity.contractsToMaxLong)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">To Max Short:</span>
                    <span className="text-zinc-400">{formatNumber(commodity.contractsToMaxShort)}</span>
                  </div>
                </div>
              </div>

              {/* Price Targets */}
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-zinc-400 mb-3">Implied Price Targets</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-zinc-500">If MM goes to record long:</span>
                    </div>
                    <div className="text-lg font-bold text-green-400">
                      {formatPrice(commodity.priceToMaxLong)}
                    </div>
                    <div className="text-xs text-green-400/70">
                      {((commodity.priceToMaxLong - commodity.currentPrice) / commodity.currentPrice * 100).toFixed(1)}% from current
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingDown className="w-4 h-4 text-red-400" />
                      <span className="text-xs text-zinc-500">If MM goes to record short:</span>
                    </div>
                    <div className="text-lg font-bold text-red-400">
                      {formatPrice(commodity.priceToMaxShort)}
                    </div>
                    <div className="text-xs text-red-400/70">
                      {((commodity.priceToMaxShort - commodity.currentPrice) / commodity.currentPrice * 100).toFixed(1)}% from current
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
            className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-[90vw] w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {expandedChart.commodity.name}
                </h3>
                <p className="text-sm text-zinc-400">
                  {expandedChart.type === "scatter"
                    ? "Position Change vs Price Change"
                    : "MM Net Position vs Price"}
                </p>
              </div>
              <button
                onClick={() => setExpandedChart(null)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div style={{ height: "70vh" }}>
              {expandedChart.type === "scatter"
                ? renderScatterChart(expandedChart.commodity, true)
                : renderTimeSeriesChart(expandedChart.commodity, true)}
            </div>

            {/* Stats below expanded chart */}
            <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-zinc-500">Beta (per 10K):</span>
                <span className="ml-2 text-white">{(expandedChart.commodity.beta * 10000).toFixed(4)}%</span>
              </div>
              <div>
                <span className="text-zinc-500">R²:</span>
                <span className="ml-2 text-white">{(expandedChart.commodity.rSquared * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-zinc-500">Current MM Net:</span>
                <span className="ml-2 text-white">{formatNumber(expandedChart.commodity.currentMMNet)}</span>
              </div>
              <div>
                <span className="text-zinc-500">Current Price:</span>
                <span className="ml-2 text-white">{formatPrice(expandedChart.commodity.currentPrice)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
