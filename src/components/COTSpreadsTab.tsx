"use client";

import { useEffect, useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label,
  Line,
  ComposedChart,
  Cell,
} from "recharts";
import { X } from "lucide-react";

interface CombinedData {
  id: string;
  name: string;
  mmNetAll: number;
  mmNetPctOI: number;
  openInterest: number;
  spread: number;
  spread_pct: number;
  spread_unit: string;
  spread_months: string;
  spread_date: string;
  cot_date: string;
}

interface ScatterPoint {
  x: number;
  xPctOI: number;
  y: number;
  name: string;
}

interface HistoricalPoint {
  date: string;
  mmNetAll: number;
  mmNetPctOI: number;
  spread: number;
  spread_pct: number;
}

interface Regression {
  slope: number;
  intercept: number;
  r2: number;
}

interface APIResponse {
  success: boolean;
  updated: string;
  summary: CombinedData[];
  mainScatter: {
    points: ScatterPoint[];
    regressionPctOI: Regression;
    regressionAbs: Regression;
  };
  historicalScatter: Record<string, HistoricalPoint[]>;
}

type XAxisMode = "pctOI" | "absolute";

function formatNumber(num: number): string {
  if (Math.abs(num) >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  } else if (Math.abs(num) >= 1000) {
    return (num / 1000).toFixed(0) + "K";
  }
  return Math.round(num).toLocaleString();
}

// Commodity codes for scatter plot labels (Ags only)
const COMMODITY_CODES: Record<string, string> = {
  "Corn": "C",
  "Soybeans": "S",
  "Chicago Wheat": "W",
  "Kansas Wheat": "KW",
  "Soyoil": "BO",
  "Soymeal": "SM",
  "NY Sugar": "SB",
  "NY Coffee": "KC",
  "NY Cocoa": "CC",
  "Cotton": "CT",
  "Live Cattle": "LC",
  "Lean Hogs": "LH",
  "Feeder Cattle": "FC",
};

// Get color for spread percentage (green = backwardation/bullish, red = contango/bearish)
function getSpreadColor(pct: number): string {
  if (pct >= 105) return "#22c55e"; // Strong backwardation - bright green
  if (pct >= 102) return "#4ade80"; // Moderate backwardation - green
  if (pct >= 100) return "#86efac"; // Slight backwardation - light green
  if (pct >= 98) return "#fde68a"; // Slight contango - yellow
  if (pct >= 95) return "#fca5a5"; // Moderate contango - light red
  return "#ef4444"; // Strong contango - red
}

// Custom X-axis tick with vertical rotation
const CustomXAxisTick = ({ x, y, payload }: { x?: number; y?: number; payload?: { value: number } }) => {
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
        {formatNumber(payload?.value || 0)}
      </text>
    </g>
  );
};

// Custom scatter dot with commodity code label
const LabeledScatterDot = (props: { cx?: number; cy?: number; payload?: ScatterPoint }) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload) return null;

  const code = COMMODITY_CODES[payload.name] || payload.name.slice(0, 2);

  return (
    <g>
      <circle cx={cx} cy={cy} r={4} fill="#3b82f6" />
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        fill="#ffffff"
        fontSize={9}
        fontWeight="bold"
      >
        {code}
      </text>
    </g>
  );
};

export function COTSpreadsTab() {
  const [data, setData] = useState<APIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedChart, setExpandedChart] = useState<{ id: string; name: string } | null>(null);
  const [xAxisMode, setXAxisMode] = useState<XAxisMode>("pctOI");
  const [mainScatterExpanded, setMainScatterExpanded] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/cot-spreads");
        const json: APIResponse = await res.json();
        if (json.success) {
          setData(json);
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
          <div className="h-96 bg-zinc-800 rounded"></div>
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

  const { summary, mainScatter, historicalScatter } = data;

  // Get current regression based on mode
  const currentRegression = xAxisMode === "pctOI" ? mainScatter.regressionPctOI : mainScatter.regressionAbs;

  // Generate regression line points based on mode
  const regressionPoints = [];
  if (mainScatter.points.length > 0) {
    const xValues = mainScatter.points.map(p => xAxisMode === "pctOI" ? p.xPctOI : p.x);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    regressionPoints.push({
      x: minX,
      y: currentRegression.slope * minX + currentRegression.intercept,
    });
    regressionPoints.push({
      x: maxX,
      y: currentRegression.slope * maxX + currentRegression.intercept,
    });
  }

  // Transform points for current mode
  const scatterPoints = mainScatter.points.map(p => ({
    x: xAxisMode === "pctOI" ? p.xPctOI : p.x,
    y: p.y,
    name: p.name,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white">
          COT Positioning vs. Curve Structure
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Net MM Position vs. 1-3 Month Spread (%) | Updated: {new Date(data.updated).toLocaleDateString()}
        </p>
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-6 text-xs text-zinc-500">
            <div className="flex items-center gap-2">
              <span className="text-green-400 font-semibold">BUY:</span>
              <span>Upper Left (MM short + backwardation)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-400 font-semibold">SELL:</span>
              <span>Bottom Right (MM long + contango)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Section: Table + Scatter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-orange-400 mb-3">
            Ag Dashboard - CFTC Charts
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-2 px-2 text-zinc-400 font-medium">Commodity</th>
                  <th className="text-center py-2 px-2 text-zinc-400 font-medium">Net MM</th>
                  <th className="text-center py-2 px-2 text-zinc-400 font-medium">1-3 Months</th>
                  <th className="text-center py-2 px-2 text-zinc-400 font-medium">1-3 Sprd</th>
                  <th className="text-center py-2 px-2 text-zinc-400 font-medium">1-3 %</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                    <td className="py-2 px-2 text-white font-medium">{item.name}</td>
                    <td className="py-2 px-2 text-center text-zinc-300">
                      {formatNumber(item.mmNetAll)}
                    </td>
                    <td className="py-2 px-2 text-center text-zinc-400">
                      {item.spread_months || "-"}
                    </td>
                    <td className="py-2 px-2 text-center text-zinc-300">
                      {item.spread >= 0 ? "+" : ""}{item.spread.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-bold"
                        style={{
                          backgroundColor: getSpreadColor(item.spread_pct),
                          color: item.spread_pct >= 98 && item.spread_pct <= 102 ? "#000" : "#fff",
                        }}
                      >
                        {item.spread_pct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Main Scatter Plot */}
        <div
          className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 cursor-pointer hover:border-zinc-600 transition-colors"
          onClick={() => setMainScatterExpanded(true)}
        >
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-orange-400">
              {xAxisMode === "pctOI" ? "Net MM as % OI" : "Net MM Position"} vs. 1-3 Month Curve (%)
            </h3>
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                className={`px-2 py-1 text-xs rounded ${xAxisMode === "pctOI" ? "bg-orange-500 text-white" : "bg-zinc-700 text-zinc-300"}`}
                onClick={() => setXAxisMode("pctOI")}
              >
                % OI
              </button>
              <button
                className={`px-2 py-1 text-xs rounded ${xAxisMode === "absolute" ? "bg-orange-500 text-white" : "bg-zinc-700 text-zinc-300"}`}
                onClick={() => setXAxisMode("absolute")}
              >
                Contracts
              </button>
            </div>
          </div>
          <p className="text-xs text-zinc-500 mb-3">
            R² = {currentRegression.r2.toFixed(4)}
          </p>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart margin={{ top: 20, right: 20, left: 10, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                type="number"
                dataKey="x"
                tick={{ fill: "#ffffff", fontSize: 10 }}
                domain={["auto", "auto"]}
                tickFormatter={(v) => xAxisMode === "pctOI" ? `${v.toFixed(0)}%` : formatNumber(v)}
              >
                <Label value={xAxisMode === "pctOI" ? "Net MM as % of OI" : "Net MM Position (contracts)"} position="bottom" offset={10} fill="#9ca3af" fontSize={11} />
              </XAxis>
              <YAxis
                type="number"
                dataKey="y"
                domain={[85, 115]}
                tick={{ fill: "#ffffff", fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
              >
                <Label value="1-3 Month Curve (%)" angle={-90} position="insideLeft" fill="#9ca3af" fontSize={11} />
              </YAxis>
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
                  if (name === "y") return [`${value.toFixed(1)}%`, "1-3 %"];
                  return [xAxisMode === "pctOI" ? `${value.toFixed(1)}%` : formatNumber(value), xAxisMode === "pctOI" ? "% OI" : "Net MM"];
                }}
              />
              <ReferenceLine y={100} stroke="#52525b" strokeDasharray="5 5" />
              <ReferenceLine x={0} stroke="#52525b" strokeDasharray="5 5" />

              {/* Quadrant labels */}
              <text x={50} y={40} fill="#22c55e" fontSize={14} fontWeight="bold">BUY</text>
              <text x={350} y={320} fill="#ef4444" fontSize={14} fontWeight="bold">SELL</text>

              {/* Regression line */}
              <Line
                data={regressionPoints}
                type="linear"
                dataKey="y"
                stroke="#6b7280"
                strokeDasharray="5 5"
                dot={false}
              />

              {/* Data points with labels */}
              <Scatter
                data={scatterPoints}
                fill="#3b82f6"
                shape={<LabeledScatterDot />}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="mt-2 text-xs text-zinc-500 text-center">
            Click to expand | Click commodity charts below for historical scatter
          </div>
        </div>
      </div>

      {/* Individual Scatter Plots */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">
          Historical COT vs. Spread by Commodity
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {summary.map((item) => {
            const points = historicalScatter[item.id] || [];
            const latestPoint = points.length > 0 ? points[points.length - 1] : null;

            return (
              <div
                key={item.id}
                className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 cursor-pointer hover:border-zinc-600 transition-colors"
                onClick={() => setExpandedChart({ id: item.id, name: item.name })}
              >
                <h4 className="text-sm font-bold text-orange-400 mb-2">{item.name}</h4>
                <ResponsiveContainer width="100%" height={180}>
                  <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                    <XAxis
                      type="number"
                      dataKey="mmNetAll"
                      tick={{ fill: "#9ca3af", fontSize: 9 }}
                      tickFormatter={(v) => formatNumber(v)}
                    />
                    <YAxis
                      type="number"
                      dataKey="spread"
                      tick={{ fill: "#9ca3af", fontSize: 9 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "0.5rem",
                        fontSize: "11px",
                        color: "#ffffff",
                      }}
                      labelStyle={{ color: "#ffffff" }}
                      itemStyle={{ color: "#ffffff" }}
                      formatter={(value: number, name: string) => {
                        if (name === "spread") return [value.toFixed(2), "Spread"];
                        return [formatNumber(value), "Net MM"];
                      }}
                    />
                    <Scatter data={points} fill="#6b7280" fillOpacity={0.5}>
                      {points.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={index === points.length - 1 ? "#ef4444" : "#6b7280"}
                          r={index === points.length - 1 ? 6 : 3}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
                {latestPoint && (
                  <div className="text-xs text-zinc-400 mt-1 text-center">
                    Latest: ({formatNumber(latestPoint.mmNetAll)}, {latestPoint.spread.toFixed(1)})
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded Chart Modal */}
      {expandedChart && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedChart(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-[85vw] w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {expandedChart.name}: COT Net MM Position vs. Spread
                </h3>
                <p className="text-sm text-zinc-400">
                  Historical relationship between positioning and curve structure
                </p>
              </div>
              <button
                onClick={() => setExpandedChart(null)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {(() => {
              const points = historicalScatter[expandedChart.id] || [];
              const latestPoint = points.length > 0 ? points[points.length - 1] : null;

              return (
                <>
                  <div style={{ height: "60vh" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis
                          type="number"
                          dataKey="mmNetAll"
                          tick={{ fill: "#ffffff", fontSize: 12 }}
                          tickFormatter={(v) => formatNumber(v)}
                        >
                          <Label value="Net MM Position (contracts)" position="bottom" offset={40} fill="#9ca3af" fontSize={12} />
                        </XAxis>
                        <YAxis
                          type="number"
                          dataKey="spread"
                          tick={{ fill: "#ffffff", fontSize: 12 }}
                        >
                          <Label value="1-3 Month Spread" angle={-90} position="insideLeft" fill="#9ca3af" fontSize={12} />
                        </YAxis>
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
                            if (name === "spread") return [value.toFixed(2), "Spread"];
                            return [formatNumber(value), "Net MM"];
                          }}
                          labelFormatter={(_, payload) => {
                            if (payload && payload[0]) {
                              const point = payload[0].payload as HistoricalPoint;
                              return `Date: ${point.date}`;
                            }
                            return "";
                          }}
                        />
                        <Scatter data={points} fill="#3b82f6" fillOpacity={0.6}>
                          {points.map((entry, index) => (
                            <Cell
                              key={index}
                              fill={index === points.length - 1 ? "#ef4444" : "#3b82f6"}
                              r={index === points.length - 1 ? 8 : 4}
                            />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  {latestPoint && (
                    <div className="mt-4 p-3 bg-zinc-800 rounded-lg">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                          <span className="text-white font-semibold">Latest Point:</span>
                        </div>
                        <span className="text-zinc-300">
                          Date: {latestPoint.date} | Net MM: {formatNumber(latestPoint.mmNetAll)} | Spread: {latestPoint.spread.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Expanded Main Scatter Modal */}
      {mainScatterExpanded && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setMainScatterExpanded(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-[90vw] w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {xAxisMode === "pctOI" ? "Net MM as % OI" : "Net MM Position"} vs. 1-3 Month Curve (%)
                </h3>
                <p className="text-sm text-zinc-400">
                  R² = {currentRegression.r2.toFixed(4)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-1">
                  <button
                    className={`px-3 py-1.5 text-sm rounded ${xAxisMode === "pctOI" ? "bg-orange-500 text-white" : "bg-zinc-700 text-zinc-300"}`}
                    onClick={() => setXAxisMode("pctOI")}
                  >
                    % OI
                  </button>
                  <button
                    className={`px-3 py-1.5 text-sm rounded ${xAxisMode === "absolute" ? "bg-orange-500 text-white" : "bg-zinc-700 text-zinc-300"}`}
                    onClick={() => setXAxisMode("absolute")}
                  >
                    Contracts
                  </button>
                </div>
                <button
                  onClick={() => setMainScatterExpanded(false)}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div style={{ height: "65vh" }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    tick={{ fill: "#ffffff", fontSize: 12 }}
                    domain={["auto", "auto"]}
                    tickFormatter={(v) => xAxisMode === "pctOI" ? `${v.toFixed(0)}%` : formatNumber(v)}
                  >
                    <Label value={xAxisMode === "pctOI" ? "Net MM as % of OI" : "Net MM Position (contracts)"} position="bottom" offset={40} fill="#9ca3af" fontSize={12} />
                  </XAxis>
                  <YAxis
                    type="number"
                    dataKey="y"
                    domain={[85, 115]}
                    tick={{ fill: "#ffffff", fontSize: 12 }}
                    tickFormatter={(v) => `${v}%`}
                  >
                    <Label value="1-3 Month Curve (%)" angle={-90} position="insideLeft" fill="#9ca3af" fontSize={12} />
                  </YAxis>
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
                      if (name === "y") return [`${value.toFixed(1)}%`, "1-3 %"];
                      return [xAxisMode === "pctOI" ? `${value.toFixed(1)}%` : formatNumber(value), xAxisMode === "pctOI" ? "% OI" : "Net MM"];
                    }}
                  />
                  <ReferenceLine y={100} stroke="#52525b" strokeDasharray="5 5" />
                  <ReferenceLine x={0} stroke="#52525b" strokeDasharray="5 5" />

                  {/* Quadrant labels */}
                  <text x={60} y={50} fill="#22c55e" fontSize={16} fontWeight="bold">BUY</text>
                  <text x={700} y={500} fill="#ef4444" fontSize={16} fontWeight="bold">SELL</text>

                  {/* Regression line */}
                  <Line
                    data={regressionPoints}
                    type="linear"
                    dataKey="y"
                    stroke="#6b7280"
                    strokeDasharray="5 5"
                    dot={false}
                  />

                  {/* Data points with labels */}
                  <Scatter
                    data={scatterPoints}
                    fill="#3b82f6"
                    shape={<LabeledScatterDot />}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
