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
  LabelList,
} from "recharts";
import { X } from "lucide-react";

interface CITRow {
  id: string;
  name: string;
  latestDate: string;
  indexNet: number;
  indexPctOI: number;
  change: number;
  recordMax: number;
  recordMin: number;
  pctMax: number;
  historicalData: {
    date: string;
    indexNet: number;
    indexPctOI: number;
  }[];
}

interface APIResponse {
  success: boolean;
  sector: string;
  reportDate: string;
  contracts: CITRow[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatChartDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatNumber(num: number): string {
  if (Math.abs(num) >= 1000000) {
    return (num / 1000000).toFixed(0) + "M";
  }
  // Always use K for consistency, 0 decimal places
  const inK = num / 1000;
  return inK.toFixed(0) + "K";
}

// Aggregation groups
const CSWKW_IDS = ["corn", "soybeans", "chicago-wheat", "kansas-wheat"];
const CSWKW_SBO_SM_IDS = ["corn", "soybeans", "chicago-wheat", "kansas-wheat", "soyoil", "soymeal"];
const LIVESTOCK_IDS = ["live-cattle", "lean-hogs", "feeder-cattle"];
const SOFTS_IDS = ["sugar", "arabica-coffee", "ny-cocoa", "cotton"];
const ALL_IDS = [...CSWKW_SBO_SM_IDS, ...LIVESTOCK_IDS, ...SOFTS_IDS];

interface CITIndexTabProps {
  sector: string;
}

export function CITIndexTab({ sector }: CITIndexTabProps) {
  const [data, setData] = useState<CITRow[]>([]);
  const [reportDate, setReportDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedChart, setExpandedChart] = useState<"cswkw" | "cswkw_sbo_sm" | "change" | "pctMax" | "livestock" | "softs" | "total" | string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/cit-index?sector=${sector}`);
        const json: APIResponse = await res.json();
        if (json.success) {
          setData(json.contracts);
          setReportDate(json.reportDate);
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

  // Calculate aggregated data
  const cswkwData = data.filter(d => CSWKW_IDS.includes(d.id));
  const cswkwSboSmData = data.filter(d => CSWKW_SBO_SM_IDS.includes(d.id));

  const calcAggregate = (rows: CITRow[]) => {
    if (rows.length === 0) return null;

    const indexNet = rows.reduce((sum, r) => sum + r.indexNet, 0);
    const change = rows.reduce((sum, r) => sum + r.change, 0);
    const indexPctOI = rows.reduce((sum, r) => sum + r.indexPctOI, 0) / rows.length;

    // For historical, we need to combine all series by date
    const dateMap = new Map<string, { indexNet: number; count: number }>();
    for (const row of rows) {
      for (const h of row.historicalData) {
        const existing = dateMap.get(h.date);
        if (existing) {
          existing.indexNet += h.indexNet;
          existing.count++;
        } else {
          dateMap.set(h.date, { indexNet: h.indexNet, count: 1 });
        }
      }
    }

    // Only include dates where we have all contracts
    const historicalData = Array.from(dateMap.entries())
      .filter(([, v]) => v.count === rows.length)
      .map(([date, v]) => ({ date, indexNet: v.indexNet }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate record max/min from historical
    let recordMax = -Infinity;
    let recordMin = Infinity;
    for (const h of historicalData) {
      if (h.indexNet > recordMax) recordMax = h.indexNet;
      if (h.indexNet < recordMin) recordMin = h.indexNet;
    }

    // % of max (current position as % of record maximum)
    const pctMax = recordMax > 0 ? (indexNet / recordMax) * 100 : 0;

    return {
      indexNet,
      change,
      indexPctOI,
      recordMax: recordMax === -Infinity ? 0 : recordMax,
      recordMin: recordMin === Infinity ? 0 : recordMin,
      pctMax,
      historicalData,
    };
  };

  const cswkwAgg = calcAggregate(cswkwData);
  const cswkwSboSmAgg = calcAggregate(cswkwSboSmData);

  // New aggregations for livestock, softs, and total
  const livestockData = data.filter(d => LIVESTOCK_IDS.includes(d.id));
  const softsData = data.filter(d => SOFTS_IDS.includes(d.id));
  const allData = data.filter(d => ALL_IDS.includes(d.id));

  const livestockAgg = calcAggregate(livestockData);
  const softsAgg = calcAggregate(softsData);
  const totalAgg = calcAggregate(allData);

  // Categorize contracts
  const grains = data.filter(d => ["corn", "soybeans", "chicago-wheat", "kansas-wheat", "soyoil", "soymeal"].includes(d.id));
  const livestock = data.filter(d => ["live-cattle", "lean-hogs", "feeder-cattle"].includes(d.id));
  const softs = data.filter(d => ["sugar", "arabica-coffee", "ny-cocoa", "cotton"].includes(d.id));

  // Get % Max color
  const getPctMaxColor = (pct: number): string => {
    if (pct >= 80) return "bg-green-500/30 text-green-400";
    if (pct >= 60) return "bg-green-500/20 text-green-400";
    if (pct <= 20) return "bg-red-500/30 text-red-400";
    if (pct <= 40) return "bg-red-500/20 text-red-400";
    return "bg-yellow-500/20 text-yellow-400";
  };

  // Bar chart data for Change WoW
  const changeChartData = [
    ...grains.map(r => ({ name: r.name, value: r.change })),
    ...(cswkwAgg ? [{ name: "C+S+W+KW", value: cswkwAgg.change }] : []),
    ...(cswkwSboSmAgg ? [{ name: "C+S+W+KW+SBO+SM", value: cswkwSboSmAgg.change }] : []),
    ...livestock.map(r => ({ name: r.name, value: r.change })),
    ...softs.map(r => ({ name: r.name, value: r.change })),
  ];

  // Bar chart data for % Max
  const pctMaxChartData = [
    ...grains.map(r => ({ name: r.name, value: r.pctMax })),
    ...(cswkwAgg ? [{ name: "C+S+W+KW", value: cswkwAgg.pctMax }] : []),
    ...(cswkwSboSmAgg ? [{ name: "C+S+W+KW+SBO+SM", value: cswkwSboSmAgg.pctMax }] : []),
    ...livestock.map(r => ({ name: r.name, value: r.pctMax })),
    ...softs.map(r => ({ name: r.name, value: r.pctMax })),
  ];

  // Short names for table display
  const getShortName = (name: string): string => {
    const shortNames: Record<string, string> = {
      "Corn": "Corn",
      "Soybeans": "Soy",
      "Chicago Wheat": "C Wht",
      "Kansas Wheat": "K Wht",
      "Soybean Oil": "SBO",
      "Soybean Meal": "SM",
      "Live Cattle": "LC",
      "Lean Hogs": "LH",
      "Feeder Cattle": "FC",
      "NY Sugar": "Sugar",
      "NY Coffee": "Coffee",
      "NY Cocoa": "Cocoa",
      "NY Cotton": "Cotton",
    };
    return shortNames[name] || name;
  };

  const renderTableRow = (row: CITRow, highlight?: string) => (
    <tr
      key={row.id}
      className={`border-b border-zinc-800 ${highlight || ""}`}
    >
      <td className="py-1.5 px-1 text-center text-white truncate" title={row.name}>{getShortName(row.name)}</td>
      <td className="py-1.5 px-1 text-center font-mono text-white">{formatNumber(row.indexNet)}</td>
      <td className="py-1.5 px-1 text-center font-mono text-zinc-400">{row.indexPctOI.toFixed(0)}%</td>
      <td className={`py-1.5 px-1 text-center font-mono ${row.change >= 0 ? "text-green-400" : "text-red-400"}`}>
        {row.change >= 0 ? "+" : ""}{formatNumber(row.change)}
      </td>
      <td className="py-1.5 px-1 text-center font-mono text-zinc-400">{formatNumber(row.recordMax)}</td>
      <td className={`py-1.5 px-1 text-center font-mono font-bold ${getPctMaxColor(row.pctMax)}`}>
        {row.pctMax.toFixed(0)}%
      </td>
      <td className="py-1.5 px-1 text-center font-mono text-zinc-400">{formatNumber(row.recordMin)}</td>
    </tr>
  );

  const renderAggRow = (name: string, agg: NonNullable<typeof cswkwAgg>, bgColor: string) => (
    <tr key={name} className={`border-b border-zinc-800 ${bgColor}`}>
      <td className="py-1.5 px-1 text-center text-white font-semibold truncate" title={name}>{name}</td>
      <td className="py-1.5 px-1 text-center font-mono text-white font-semibold">{formatNumber(agg.indexNet)}</td>
      <td className="py-1.5 px-1 text-center font-mono text-zinc-400">{agg.indexPctOI.toFixed(0)}%</td>
      <td className={`py-1.5 px-1 text-center font-mono font-semibold ${agg.change >= 0 ? "text-green-400" : "text-red-400"}`}>
        {agg.change >= 0 ? "+" : ""}{formatNumber(agg.change)}
      </td>
      <td className="py-1.5 px-1 text-center font-mono text-zinc-400">{formatNumber(agg.recordMax)}</td>
      <td className={`py-1.5 px-1 text-center font-mono font-bold ${getPctMaxColor(agg.pctMax)}`}>
        {agg.pctMax.toFixed(0)}%
      </td>
      <td className="py-1.5 px-1 text-center font-mono text-zinc-400">{formatNumber(agg.recordMin)}</td>
    </tr>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Supplemental Report (CIT) - Index Traders
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Index Trader net positions and % of open interest
            </p>
          </div>
          {reportDate && (
            <div className="text-right">
              <p className="text-xs text-zinc-500">Report Date</p>
              <p className="text-sm font-medium text-white">{formatDate(reportDate)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Table and Charts side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Left: Table (2 cols) */}
        <div className="xl:col-span-2 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-xs table-fixed">
            <thead>
              <tr className="bg-zinc-800/50 border-b border-zinc-700">
                <th className="text-center py-2 px-1 text-zinc-400 font-medium w-[70px]">Cmdty</th>
                <th className="text-center py-2 px-1 text-zinc-400 font-medium">Net</th>
                <th className="text-center py-2 px-1 text-zinc-400 font-medium">%OI</th>
                <th className="text-center py-2 px-1 text-zinc-400 font-medium">Chg</th>
                <th className="text-center py-2 px-1 text-zinc-400 font-medium">Max</th>
                <th className="text-center py-2 px-1 text-zinc-400 font-medium">%Max</th>
                <th className="text-center py-2 px-1 text-zinc-400 font-medium">Min</th>
              </tr>
            </thead>
            <tbody>
              {/* Grains */}
              {grains.map(row => renderTableRow(row))}

              {/* Aggregated rows */}
              {cswkwAgg && renderAggRow("C+S+W+KW", cswkwAgg, "bg-green-900/20")}
              {cswkwSboSmAgg && renderAggRow("C+S+W+KW+SBO+SM", cswkwSboSmAgg, "bg-yellow-900/20")}

              {/* Livestock */}
              {livestock.map(row => renderTableRow(row))}

              {/* Softs */}
              {softs.map(row => renderTableRow(row))}
            </tbody>
          </table>
        </div>

        {/* Right: Charts Grid (2x2) - 3 cols */}
        <div className="xl:col-span-3 grid grid-cols-2 gap-3">
        {/* Change WoW Bar Chart */}
        <div
          className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 cursor-pointer hover:border-zinc-600 transition-colors"
          onClick={() => setExpandedChart("change")}
        >
          <h3 className="text-sm font-semibold text-white mb-2">Index Net Chg WoW</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={changeChartData} margin={{ top: 12, right: 5, left: -25, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#ffffff", fontSize: 7 }}
                  angle={-90}
                  textAnchor="end"
                  height={40}
                  dy={25}
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
                  formatter={(value: number) => [formatNumber(value), "Change"]}
                />
                <ReferenceLine y={0} stroke="#52525b" />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  <LabelList
                    dataKey="value"
                    position="top"
                    fill="#ffffff"
                    fontSize={9}
                    formatter={(value: number) => formatNumber(value)}
                  />
                  {changeChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.value >= 0 ? "#3b82f6" : "#ef4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* % Max Bar Chart */}
        <div
          className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 cursor-pointer hover:border-zinc-600 transition-colors"
          onClick={() => setExpandedChart("pctMax")}
        >
          <h3 className="text-sm font-semibold text-white mb-2">Index Net % of Record Max</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pctMaxChartData} margin={{ top: 12, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="name"
                  tick={false}
                  height={5}
                />
                <YAxis
                  tick={{ fill: "#ffffff", fontSize: 11 }}
                  domain={[0, 100]}
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
                  formatter={(value: number) => [`${value.toFixed(0)}%`, "% Max"]}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  <LabelList
                    dataKey="name"
                    position="inside"
                    fill="#ffffff"
                    fontSize={7}
                    angle={-90}
                  />
                  <LabelList
                    dataKey="value"
                    position="top"
                    fill="#ffffff"
                    fontSize={8}
                    formatter={(value: number) => `${value.toFixed(0)}%`}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* C+S+W+KW Historical Chart */}
        {cswkwAgg && (
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 cursor-pointer hover:border-zinc-600 transition-colors"
            onClick={() => setExpandedChart("cswkw")}
          >
            <h3 className="text-sm font-semibold text-white mb-2">C+S+W+KW Index Net (Historical)</h3>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cswkwAgg.historicalData} margin={{ top: 5, right: 5, left: -20, bottom: 18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#ffffff", fontSize: 9 }}
                    angle={-90}
                    textAnchor="end"
                    height={28}
                    tickFormatter={formatChartDate}
                    interval={Math.floor(cswkwAgg.historicalData.length / 5)}
                    dy={18}
                  />
                  <YAxis
                    tick={{ fill: "#ffffff", fontSize: 9 }}
                    tickFormatter={(v) => formatNumber(v)}
                    domain={[400000, 1000000]}
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
                    labelFormatter={(label) => formatDate(label)}
                    formatter={(value: number) => [formatNumber(value), "Index Total"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="indexNet"
                    name="C+S+W+KW Index Total"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* C+S+W+KW+SBO+SM Historical Chart */}
        {cswkwSboSmAgg && (
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 cursor-pointer hover:border-zinc-600 transition-colors"
            onClick={() => setExpandedChart("cswkw_sbo_sm")}
          >
            <h3 className="text-sm font-semibold text-white mb-2">All Grains Index Net (Historical)</h3>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cswkwSboSmAgg.historicalData} margin={{ top: 5, right: 5, left: -20, bottom: 18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#ffffff", fontSize: 9 }}
                    angle={-90}
                    textAnchor="end"
                    height={28}
                    tickFormatter={formatChartDate}
                    interval={Math.floor(cswkwSboSmAgg.historicalData.length / 5)}
                    dy={18}
                  />
                  <YAxis
                    tick={{ fill: "#ffffff", fontSize: 9 }}
                    tickFormatter={(v) => formatNumber(v)}
                    domain={[400000, 'auto']}
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
                    labelFormatter={(label) => formatDate(label)}
                    formatter={(value: number) => [formatNumber(value), "Index Total"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="indexNet"
                    name="C+S+W+KW+SBO+SM Index Total"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Additional Historical Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Livestock Combined (LC+LH+FC) */}
        {livestockAgg && (
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 cursor-pointer hover:border-zinc-600 transition-colors"
            onClick={() => setExpandedChart("livestock")}
          >
            <h3 className="text-sm font-semibold text-white mb-2">Livestock Index Net (LC+LH+FC)</h3>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={livestockAgg.historicalData} margin={{ top: 5, right: 5, left: -20, bottom: 18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#ffffff", fontSize: 9 }}
                    angle={-90}
                    textAnchor="end"
                    height={28}
                    tickFormatter={formatChartDate}
                    interval={Math.floor(livestockAgg.historicalData.length / 5)}
                    dy={18}
                  />
                  <YAxis
                    tick={{ fill: "#ffffff", fontSize: 9 }}
                    tickFormatter={(v) => formatNumber(v)}
                    domain={[75000, 'auto']}
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
                    labelFormatter={(label) => formatDate(label)}
                    formatter={(value: number) => [formatNumber(value), "Index Total"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="indexNet"
                    name="LC+LH+FC Index Total"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Softs Combined (SB+KC+CC+CT) */}
        {softsAgg && (
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 cursor-pointer hover:border-zinc-600 transition-colors"
            onClick={() => setExpandedChart("softs")}
          >
            <h3 className="text-sm font-semibold text-white mb-2">Softs Index Net (SB+KC+CC+CT)</h3>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={softsAgg.historicalData} margin={{ top: 5, right: 5, left: -20, bottom: 18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#ffffff", fontSize: 9 }}
                    angle={-90}
                    textAnchor="end"
                    height={28}
                    tickFormatter={formatChartDate}
                    interval={Math.floor(softsAgg.historicalData.length / 5)}
                    dy={18}
                  />
                  <YAxis
                    tick={{ fill: "#ffffff", fontSize: 9 }}
                    tickFormatter={(v) => formatNumber(v)}
                    domain={[150000, 'auto']}
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
                    labelFormatter={(label) => formatDate(label)}
                    formatter={(value: number) => [formatNumber(value), "Index Total"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="indexNet"
                    name="SB+KC+CC+CT Index Total"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Total (G+O+LVS+SFTS) */}
        {totalAgg && (
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 cursor-pointer hover:border-zinc-600 transition-colors"
            onClick={() => setExpandedChart("total")}
          >
            <h3 className="text-sm font-semibold text-white mb-2">Total Index Net (G+O+LVS+SFTS)</h3>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={totalAgg.historicalData} margin={{ top: 5, right: 5, left: -20, bottom: 18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#ffffff", fontSize: 9 }}
                    angle={-90}
                    textAnchor="end"
                    height={28}
                    tickFormatter={formatChartDate}
                    interval={Math.floor(totalAgg.historicalData.length / 5)}
                    dy={18}
                  />
                  <YAxis
                    tick={{ fill: "#ffffff", fontSize: 9 }}
                    tickFormatter={(v) => formatNumber(v)}
                    domain={[900000, 'auto']}
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
                    labelFormatter={(label) => formatDate(label)}
                    formatter={(value: number) => [formatNumber(value), "Index Total"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="indexNet"
                    name="G+O+LVS+SFTS Index Total"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="border-t border-zinc-700 my-6"></div>

      {/* Individual Commodity Charts */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Individual Commodity Index Positions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.map((row) => (
            <div
              key={row.id}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 cursor-pointer hover:border-zinc-600 transition-colors"
              onClick={() => setExpandedChart(`individual-${row.id}`)}
            >
              <h4 className="text-sm font-semibold text-white mb-2">{row.name} Index Net</h4>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={row.historicalData} margin={{ top: 5, right: 5, left: -20, bottom: 18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#ffffff", fontSize: 8 }}
                      angle={-90}
                      textAnchor="end"
                      height={25}
                      tickFormatter={formatChartDate}
                      interval={Math.floor(row.historicalData.length / 4)}
                      dy={15}
                    />
                    <YAxis
                      tick={{ fill: "#ffffff", fontSize: 8 }}
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
                      labelFormatter={(label) => formatDate(label)}
                      formatter={(value: number) => [formatNumber(value), "Index Net"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="indexNet"
                      name={`${row.name} Index Net`}
                      stroke="#3b82f6"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Expanded Chart Modal */}
      {expandedChart && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedChart(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {expandedChart === "change" && "CIT Index Position CHG WoW"}
                {expandedChart === "pctMax" && "CIT Index Position % Max"}
                {expandedChart === "cswkw" && "CIT Index Position (Combined C,S,W,KW)"}
                {expandedChart === "cswkw_sbo_sm" && "CIT Index Position (Combined C,S,W,KW,SBO,SM)"}
                {expandedChart === "livestock" && "CIT Index Position - Livestock (LC+LH+FC)"}
                {expandedChart === "softs" && "CIT Index Position - Softs (SB+KC+CC+CT)"}
                {expandedChart === "total" && "CIT Index Position - Total (G+O+LVS+SFTS)"}
                {expandedChart?.startsWith("individual-") && `CIT Index Position - ${data.find(d => d.id === expandedChart.replace("individual-", ""))?.name || ""}`}
              </h3>
              <button
                onClick={() => setExpandedChart(null)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="h-[665px]">
              <ResponsiveContainer width="100%" height="100%">
                {(expandedChart === "change" || expandedChart === "pctMax") ? (
                  <BarChart
                    data={expandedChart === "change" ? changeChartData : pctMaxChartData}
                    margin={{ top: 30, right: 20, left: -5, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#ffffff", fontSize: 14 }}
                      angle={-90}
                      textAnchor="end"
                      height={90}
                      dy={70}
                    />
                    <YAxis
                      tick={{ fill: "#ffffff", fontSize: 14 }}
                      tickFormatter={expandedChart === "pctMax" ? (v) => `${v}%` : (v) => formatNumber(v)}
                      domain={expandedChart === "pctMax" ? [0, 100] : undefined}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "0.5rem",
                        fontSize: "14px",
                        color: "#ffffff",
                      }}
                      labelStyle={{ color: "#ffffff" }}
                      formatter={(value: number) => expandedChart === "pctMax"
                        ? [`${value.toFixed(0)}%`, "% Max"]
                        : [formatNumber(value), "Change"]}
                    />
                    {expandedChart === "change" && <ReferenceLine y={0} stroke="#52525b" />}
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      <LabelList
                        dataKey="value"
                        position="top"
                        fill="#ffffff"
                        fontSize={14}
                        fontWeight="bold"
                        formatter={(value: number) => expandedChart === "pctMax"
                          ? `${value.toFixed(0)}%`
                          : formatNumber(value)}
                      />
                      {(expandedChart === "change" ? changeChartData : pctMaxChartData).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={expandedChart === "change"
                            ? (entry.value >= 0 ? "#3b82f6" : "#ef4444")
                            : "#3b82f6"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <LineChart
                    data={
                      expandedChart === "cswkw" ? cswkwAgg?.historicalData :
                      expandedChart === "cswkw_sbo_sm" ? cswkwSboSmAgg?.historicalData :
                      expandedChart === "livestock" ? livestockAgg?.historicalData :
                      expandedChart === "softs" ? softsAgg?.historicalData :
                      expandedChart === "total" ? totalAgg?.historicalData :
                      expandedChart?.startsWith("individual-") ? data.find(d => d.id === expandedChart.replace("individual-", ""))?.historicalData :
                      totalAgg?.historicalData
                    }
                    margin={{ top: 10, right: 20, left: -5, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#ffffff", fontSize: 14 }}
                      angle={-90}
                      textAnchor="end"
                      height={60}
                      tickFormatter={formatChartDate}
                      interval={Math.floor((
                        expandedChart === "cswkw" ? cswkwAgg?.historicalData.length || 100 :
                        expandedChart === "cswkw_sbo_sm" ? cswkwSboSmAgg?.historicalData.length || 100 :
                        expandedChart === "livestock" ? livestockAgg?.historicalData.length || 100 :
                        expandedChart === "softs" ? softsAgg?.historicalData.length || 100 :
                        expandedChart === "total" ? totalAgg?.historicalData.length || 100 :
                        expandedChart?.startsWith("individual-") ? data.find(d => d.id === expandedChart.replace("individual-", ""))?.historicalData.length || 100 :
                        100
                      ) / 20)}
                      dy={35}
                    />
                    <YAxis
                      tick={{ fill: "#ffffff", fontSize: 14 }}
                      tickFormatter={(v) => formatNumber(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "0.5rem",
                        fontSize: "14px",
                        color: "#ffffff",
                      }}
                      labelStyle={{ color: "#ffffff" }}
                      labelFormatter={(label) => formatDate(label)}
                      formatter={(value: number) => [formatNumber(value), "Index Total"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="indexNet"
                      name="Index Total"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
