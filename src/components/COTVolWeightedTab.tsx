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

interface VolWeightedRow {
  id: string;
  name: string;
  category: string;
  latestDate: string;
  mmNet: number;
  mmNetPctOI: number;
  volatility: number;
  volAdjustedPosition: number;
  change: number;
  changePct: number;
  recordMax: number;
  recordMin: number;
  pctMax: number;
  historicalData: {
    date: string;
    mmNet: number;
    volAdjustedPosition: number;
  }[];
}

interface APIResponse {
  success: boolean;
  sector: string;
  sectorLabel: string;
  reportDate: string;
  totalVolAdj: number;
  totalChange: number;
  contracts: VolWeightedRow[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatChartDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatVolAdj(num: number): string {
  if (Math.abs(num) >= 100) {
    return num.toFixed(0);
  }
  if (Math.abs(num) >= 10) {
    return num.toFixed(1);
  }
  return num.toFixed(2);
}

function formatNumber(num: number): string {
  if (Math.abs(num) >= 1000000) {
    return (num / 1000000).toFixed(0) + "M";
  }
  const inK = num / 1000;
  return inK.toFixed(0) + "K";
}

interface COTVolWeightedTabProps {
  sector: string;
}

export function COTVolWeightedTab({ sector }: COTVolWeightedTabProps) {
  const [data, setData] = useState<VolWeightedRow[]>([]);
  const [sectorLabel, setSectorLabel] = useState<string>("");
  const [reportDate, setReportDate] = useState<string>("");
  const [totalVolAdj, setTotalVolAdj] = useState<number>(0);
  const [totalChange, setTotalChange] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedChart, setExpandedChart] = useState<"volAdj" | "change" | "pctMax" | "total" | string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/cot-vol-weighted?sector=${sector}`);
        const json: APIResponse = await res.json();
        if (json.success) {
          setData(json.contracts);
          setSectorLabel(json.sectorLabel);
          setReportDate(json.reportDate);
          setTotalVolAdj(json.totalVolAdj);
          setTotalChange(json.totalChange);
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

  // Calculate aggregate historical data (sum of all contracts by date)
  // Filter to start from 2011 to align with API's 1-year lookback period
  const VOL_LOOKBACK_START = "2011-01-01";
  const calcAggregate = (rows: VolWeightedRow[]) => {
    if (rows.length === 0) return null;

    const dateMap = new Map<string, { volAdjustedPosition: number; count: number }>();
    for (const row of rows) {
      for (const h of row.historicalData) {
        // Skip dates before 2011 (already filtered in API, but ensure consistency)
        if (h.date < VOL_LOOKBACK_START) continue;
        const existing = dateMap.get(h.date);
        if (existing) {
          existing.volAdjustedPosition += h.volAdjustedPosition;
          existing.count++;
        } else {
          dateMap.set(h.date, { volAdjustedPosition: h.volAdjustedPosition, count: 1 });
        }
      }
    }

    // Include dates where we have at least 75% of contracts (handles missing data for some contracts)
    const minCount = Math.ceil(rows.length * 0.75);
    const historicalData = Array.from(dateMap.entries())
      .filter(([, v]) => v.count >= minCount)
      .map(([date, v]) => ({ date, volAdjustedPosition: v.volAdjustedPosition }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate record max/min from historical
    let recordMax = -Infinity;
    let recordMin = Infinity;
    for (const h of historicalData) {
      if (h.volAdjustedPosition > recordMax) recordMax = h.volAdjustedPosition;
      if (h.volAdjustedPosition < recordMin) recordMin = h.volAdjustedPosition;
    }

    const currentVolAdj = historicalData.length > 0 ? historicalData[historicalData.length - 1].volAdjustedPosition : 0;
    const pctMax = recordMax > 0 ? (currentVolAdj / recordMax) * 100 : 0;

    return {
      volAdjustedPosition: currentVolAdj,
      recordMax: recordMax === -Infinity ? 0 : recordMax,
      recordMin: recordMin === Infinity ? 0 : recordMin,
      pctMax,
      historicalData,
    };
  };

  const totalAgg = calcAggregate(data);

  // Get sector aggregate label
  const getSectorAggLabel = (): string => {
    switch (sector) {
      case "ags": return "All G&O";
      case "softs": return "All Softs";
      case "livestock": return "All Livestock";
      case "energy": return "All Energy";
      case "metals": return "All Metals";
      case "equities": return "All Equities";
      case "rates": return "All Rates";
      case "fx": return "All FX";
      case "crypto": return "All Crypto";
      default: return "Total";
    }
  };

  // Get % Max color
  const getPctMaxColor = (pct: number): string => {
    if (pct >= 80) return "bg-green-500/30 text-green-400";
    if (pct >= 60) return "bg-green-500/20 text-green-400";
    if (pct <= 20) return "bg-red-500/30 text-red-400";
    if (pct <= 40) return "bg-red-500/20 text-red-400";
    return "bg-yellow-500/20 text-yellow-400";
  };

  // Bar chart data for Vol-Adjusted Positions (include aggregate)
  const volAdjChartData = [
    ...data.map(r => ({ name: r.name, value: r.volAdjustedPosition })),
    { name: getSectorAggLabel(), value: totalVolAdj },
  ];

  // Bar chart data for Change WoW (include aggregate)
  const changeChartData = [
    ...data.map(r => ({ name: r.name, value: r.change })),
    { name: getSectorAggLabel(), value: totalChange },
  ];

  // Bar chart data for % Max (include aggregate if available)
  const pctMaxChartData = [
    ...data.map(r => ({ name: r.name, value: r.pctMax })),
    ...(totalAgg ? [{ name: getSectorAggLabel(), value: totalAgg.pctMax }] : []),
  ];

  // Short names for table display
  const getShortName = (name: string): string => {
    const shortNames: Record<string, string> = {
      "Corn": "Corn",
      "Soybeans": "Soy",
      "Chicago Wheat": "C Wht",
      "Kansas Wheat": "K Wht",
      "Minneapolis Wheat": "M Wht",
      "Soybean Oil": "SBO",
      "Soybean Meal": "SM",
      "Canola": "Canola",
      "Oats": "Oats",
      "Live Cattle": "LC",
      "Lean Hogs": "LH",
      "Feeder Cattle": "FC",
      "Sugar #11": "Sugar",
      "Coffee C": "Coffee",
      "Cocoa": "Cocoa",
      "Cotton": "Cotton",
      "WTI Crude Oil": "WTI",
      "Brent Crude Oil": "Brent",
      "Natural Gas": "NatGas",
      "RBOB Gasoline": "RBOB",
      "Heating Oil": "HO",
      "Gold": "Gold",
      "Silver": "Silver",
      "Copper": "Copper",
      "Platinum": "Plat",
      "Palladium": "Pall",
      "S&P 500 E-mini": "ES",
      "Nasdaq 100 E-mini": "NQ",
      "Dow Jones E-mini": "YM",
      "Russell 2000 E-mini": "RTY",
      "VIX Futures": "VIX",
      "10-Year T-Note": "10Y",
      "2-Year T-Note": "2Y",
      "5-Year T-Note": "5Y",
      "30-Year T-Bond": "30Y",
      "SOFR 3-Month": "SOFR",
      "Euro FX": "EUR",
      "Japanese Yen": "JPY",
      "British Pound": "GBP",
      "Canadian Dollar": "CAD",
      "Australian Dollar": "AUD",
      "Swiss Franc": "CHF",
      "NZ Dollar": "NZD",
      "US Dollar Index": "DXY",
      "Bitcoin": "BTC",
      "Ethereum": "ETH",
    };
    return shortNames[name] || name;
  };

  const renderTableRow = (row: VolWeightedRow) => (
    <tr
      key={row.id}
      className="border-b border-zinc-800"
    >
      <td className="py-1.5 px-1 text-center text-white truncate" title={row.name}>{getShortName(row.name)}</td>
      <td className="py-1.5 px-1 text-center font-mono text-white">{formatNumber(row.mmNet)}</td>
      <td className="py-1.5 px-1 text-center font-mono text-zinc-400">{row.mmNetPctOI.toFixed(0)}%</td>
      <td className={`py-1.5 px-1 text-center font-mono font-bold ${row.volAdjustedPosition >= 0 ? "text-green-400" : "text-red-400"}`}>
        {row.volAdjustedPosition >= 0 ? "+" : ""}{formatVolAdj(row.volAdjustedPosition)}
      </td>
      <td className={`py-1.5 px-1 text-center font-mono ${row.change >= 0 ? "text-green-400" : "text-red-400"}`}>
        {row.change >= 0 ? "+" : ""}{formatVolAdj(row.change)}
      </td>
      <td className={`py-1.5 px-1 text-center font-mono font-bold ${getPctMaxColor(row.pctMax)}`}>
        {row.pctMax.toFixed(0)}%
      </td>
    </tr>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              COT - Vol Weighted: {sectorLabel}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              MM Net / 52-Week Rolling Vol = Vol-Adjusted Position (Z-Score)
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-zinc-500">Total Vol-Adj</p>
              <p className={`text-lg font-bold ${totalVolAdj >= 0 ? "text-green-400" : "text-red-400"}`}>
                {totalVolAdj >= 0 ? "+" : ""}{formatVolAdj(totalVolAdj)}
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
      </div>

      {/* Main Content - Table and Charts side by side */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Left: Table (2 cols) */}
        <div className="xl:col-span-2 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-xs table-fixed">
            <thead>
              <tr className="bg-zinc-800/50 border-b border-zinc-700">
                <th className="text-center py-2 px-1 text-zinc-400 font-medium w-[70px]">Cmdty</th>
                <th className="text-center py-2 px-1 text-zinc-400 font-medium">MM Net</th>
                <th className="text-center py-2 px-1 text-zinc-400 font-medium">%OI</th>
                <th className="text-center py-2 px-1 text-zinc-400 font-medium">Vol-Adj</th>
                <th className="text-center py-2 px-1 text-zinc-400 font-medium">Chg</th>
                <th className="text-center py-2 px-1 text-zinc-400 font-medium">%Max</th>
              </tr>
            </thead>
            <tbody>
              {data.map(row => renderTableRow(row))}
              {/* Aggregate row */}
              <tr className="bg-blue-900/20 border-t-2 border-zinc-600">
                <td className="py-1.5 px-1 text-center text-white font-semibold">{getSectorAggLabel()}</td>
                <td className="py-1.5 px-1 text-center font-mono text-zinc-400">-</td>
                <td className="py-1.5 px-1 text-center font-mono text-zinc-400">-</td>
                <td className={`py-1.5 px-1 text-center font-mono font-bold ${totalVolAdj >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {totalVolAdj >= 0 ? "+" : ""}{formatVolAdj(totalVolAdj)}
                </td>
                <td className={`py-1.5 px-1 text-center font-mono font-semibold ${totalChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {totalChange >= 0 ? "+" : ""}{formatVolAdj(totalChange)}
                </td>
                <td className={`py-1.5 px-1 text-center font-mono font-bold ${totalAgg ? getPctMaxColor(totalAgg.pctMax) : "text-zinc-400"}`}>
                  {totalAgg ? `${totalAgg.pctMax.toFixed(0)}%` : "-"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right: Charts Grid (2x2) - 3 cols */}
        <div className="xl:col-span-3 grid grid-cols-2 gap-3">
          {/* Vol-Adjusted Positions Bar Chart */}
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 cursor-pointer hover:border-zinc-600 transition-colors"
            onClick={() => setExpandedChart("volAdj")}
          >
            <h3 className="text-sm font-semibold text-white mb-2">MM Vol-Adjusted Position</h3>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volAdjChartData} margin={{ top: 12, right: 5, left: -25, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#ffffff", fontSize: 9 }}
                    angle={-90}
                    textAnchor="end"
                    height={40}
                    dy={25}
                  />
                  <YAxis
                    tick={{ fill: "#ffffff", fontSize: 11 }}
                    tickFormatter={(v) => formatVolAdj(v)}
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
                    formatter={(value: number) => [formatVolAdj(value), "Vol-Adj"]}
                  />
                  <ReferenceLine y={0} stroke="#52525b" />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    <LabelList
                      dataKey="value"
                      position="top"
                      fill="#ffffff"
                      fontSize={9}
                      formatter={(value: number) => formatVolAdj(value)}
                    />
                    {volAdjChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.value >= 0 ? "#22c55e" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Change WoW Bar Chart */}
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 cursor-pointer hover:border-zinc-600 transition-colors"
            onClick={() => setExpandedChart("change")}
          >
            <h3 className="text-sm font-semibold text-white mb-2">Vol-Adj Chg WoW</h3>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={changeChartData} margin={{ top: 12, right: 5, left: -25, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#ffffff", fontSize: 9 }}
                    angle={-90}
                    textAnchor="end"
                    height={40}
                    dy={25}
                  />
                  <YAxis
                    tick={{ fill: "#ffffff", fontSize: 11 }}
                    tickFormatter={(v) => formatVolAdj(v)}
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
                    formatter={(value: number) => [formatVolAdj(value), "Change"]}
                  />
                  <ReferenceLine y={0} stroke="#52525b" />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    <LabelList
                      dataKey="value"
                      position="top"
                      fill="#ffffff"
                      fontSize={9}
                      formatter={(value: number) => formatVolAdj(value)}
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
            <h3 className="text-sm font-semibold text-white mb-2">Vol-Adj % of Record Max</h3>
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
                    formatter={(value: number) => [`${value.toFixed(0)}%`, "% Max"]}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    <LabelList
                      dataKey="name"
                      position="inside"
                      fill="#ffffff"
                      fontSize={9}
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

          {/* Total Vol-Adj Historical Chart */}
          {totalAgg && (
            <div
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 cursor-pointer hover:border-zinc-600 transition-colors"
              onClick={() => setExpandedChart("total")}
            >
              <h3 className="text-sm font-semibold text-white mb-2">Total Vol-Adj (Historical)</h3>
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
                      tickFormatter={(v) => formatVolAdj(v)}
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
                      formatter={(value: number) => [formatVolAdj(value), "Total Vol-Adj"]}
                    />
                    <ReferenceLine y={0} stroke="#52525b" />
                    <Line
                      type="monotone"
                      dataKey="volAdjustedPosition"
                      name="Total Vol-Adj"
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

      {/* Separator */}
      <div className="border-t border-zinc-700 my-6"></div>

      {/* Individual Commodity Charts */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Individual Commodity Vol-Adjusted Positions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.map((row) => (
            <div
              key={row.id}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 cursor-pointer hover:border-zinc-600 transition-colors"
              onClick={() => setExpandedChart(`individual-${row.id}`)}
            >
              <h4 className="text-sm font-semibold text-white mb-2">{row.name} Vol-Adj</h4>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={row.historicalData} margin={{ top: 5, right: 5, left: -30, bottom: 18 }}>
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
                      tickFormatter={(v) => formatVolAdj(v)}
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
                      formatter={(value: number) => [formatVolAdj(value), "Vol-Adj"]}
                    />
                    <ReferenceLine y={0} stroke="#52525b" />
                    <Line
                      type="monotone"
                      dataKey="volAdjustedPosition"
                      name={`${row.name} Vol-Adj`}
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
                {expandedChart === "volAdj" && "MM Vol-Adjusted Position"}
                {expandedChart === "change" && "Vol-Adj Chg WoW"}
                {expandedChart === "pctMax" && "Vol-Adj % Max"}
                {expandedChart === "total" && "Total Vol-Adjusted Position (Historical)"}
                {expandedChart?.startsWith("individual-") && `${data.find(d => d.id === expandedChart.replace("individual-", ""))?.name || ""} Vol-Adj`}
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
                {(expandedChart === "volAdj" || expandedChart === "change" || expandedChart === "pctMax") ? (
                  <BarChart
                    data={
                      expandedChart === "volAdj" ? volAdjChartData :
                      expandedChart === "change" ? changeChartData :
                      pctMaxChartData
                    }
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
                      tickFormatter={expandedChart === "pctMax" ? (v) => `${v.toFixed(0)}%` : (v) => formatVolAdj(v)}
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
                      itemStyle={{ color: "#ffffff" }}
                      formatter={(value: number) => expandedChart === "pctMax"
                        ? [`${value.toFixed(0)}%`, "% Max"]
                        : [formatVolAdj(value), expandedChart === "change" ? "Change" : "Vol-Adj"]}
                    />
                    {expandedChart !== "pctMax" && <ReferenceLine y={0} stroke="#52525b" />}
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      <LabelList
                        dataKey="value"
                        position="top"
                        fill="#ffffff"
                        fontSize={14}
                        fontWeight="bold"
                        formatter={(value: number) => expandedChart === "pctMax"
                          ? `${value.toFixed(0)}%`
                          : formatVolAdj(value)}
                      />
                      {(expandedChart === "volAdj" ? volAdjChartData :
                        expandedChart === "change" ? changeChartData :
                        pctMaxChartData).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={expandedChart === "pctMax" ? "#3b82f6" :
                            expandedChart === "volAdj" ? (entry.value >= 0 ? "#22c55e" : "#ef4444") :
                            (entry.value >= 0 ? "#3b82f6" : "#ef4444")}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <LineChart
                    data={
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
                        expandedChart === "total" ? totalAgg?.historicalData.length || 100 :
                        expandedChart?.startsWith("individual-") ? data.find(d => d.id === expandedChart.replace("individual-", ""))?.historicalData.length || 100 :
                        100
                      ) / 20)}
                      dy={35}
                    />
                    <YAxis
                      tick={{ fill: "#ffffff", fontSize: 14 }}
                      tickFormatter={(v) => formatVolAdj(v)}
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
                      itemStyle={{ color: "#ffffff" }}
                      labelFormatter={(label) => formatDate(label)}
                      formatter={(value: number) => [formatVolAdj(value), "Vol-Adj"]}
                    />
                    <ReferenceLine y={0} stroke="#52525b" />
                    <Line
                      type="monotone"
                      dataKey="volAdjustedPosition"
                      name="Vol-Adj"
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
