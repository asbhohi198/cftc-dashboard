"use client";

import { useEffect, useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
} from "recharts";
import { X, Maximize2 } from "lucide-react";

interface MMSplitData {
  label: string;
  name: string;
  oc: number;
  nc: number;
  netMM: number;
  ocChange: number;
  ncChange: number;
  netMMChange: number;
}

interface APIResponse {
  success: boolean;
  positionDate: string;
  data: MMSplitData[];
}

function formatNumber(num: number): string {
  return num.toLocaleString("en-US");
}

export function OCNCMMSplitsTab() {
  const [data, setData] = useState<MMSplitData[]>([]);
  const [positionDate, setPositionDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedChart, setExpandedChart] = useState<"positions" | "changes" | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/mm-splits");
        const json: APIResponse = await res.json();

        if (json.success) {
          setData(json.data);
          setPositionDate(json.positionDate);
        } else {
          setError("Failed to fetch data");
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

  // Calculate unified Y-axis domain for both charts (must be before early returns)
  const yAxisDomain = useMemo(() => {
    if (data.length === 0) return [-100000, 300000];
    const allValues = [
      ...data.map((d) => d.oc),
      ...data.map((d) => d.nc),
      ...data.map((d) => d.ocChange),
      ...data.map((d) => d.ncChange),
    ];
    const minVal = Math.min(...allValues, 0);
    const maxVal = Math.max(...allValues, 0);
    // Add 15% padding for labels
    const padding = Math.max(Math.abs(maxVal), Math.abs(minVal)) * 0.15;
    return [Math.floor((minVal - padding) / 10000) * 10000, Math.ceil((maxVal + padding) / 10000) * 10000];
  }, [data]);

  // Prepare chart data for positions
  const positionChartData = useMemo(() => data.map((d) => ({
    name: d.label,
    OC: d.oc,
    NC: d.nc,
  })), [data]);

  // Prepare chart data for changes
  const changesChartData = useMemo(() => data.map((d) => ({
    name: d.label,
    OC: d.ocChange,
    NC: d.ncChange,
  })), [data]);

  // Format label for bars (compact)
  const formatLabel = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-zinc-700 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-zinc-800 rounded"></div>
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
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              OC/NC MM Splits
            </h2>
            <p className="text-xs text-zinc-500">
              Managed Money Old Crop vs New Crop Positions
            </p>
          </div>
          {positionDate && (
            <div className="text-right">
              <p className="text-xs text-zinc-500">Position Date</p>
              <p className="text-sm text-white">
                {new Date(positionDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* OC/NC Reference Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <h3 className="text-md font-semibold text-white mb-3">
          Old Crop / New Crop Contract Months
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="text-left py-1.5 px-2 text-zinc-400 font-medium">Commodity</th>
                <th className="text-left py-1.5 px-2 text-zinc-400 font-medium">Old Crop Months</th>
                <th className="text-left py-1.5 px-2 text-zinc-400 font-medium">New Crop Months</th>
                <th className="text-left py-1.5 px-2 text-zinc-400 font-medium">Last OC</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              <tr className="border-b border-zinc-800">
                <td className="py-1.5 px-2 text-white">Corn (C)</td>
                <td className="py-1.5 px-2">Z, H, K, N, U</td>
                <td className="py-1.5 px-2">Z (Dec)</td>
                <td className="py-1.5 px-2 text-orange-400">U (Sep)</td>
              </tr>
              <tr className="border-b border-zinc-800">
                <td className="py-1.5 px-2 text-white">Chicago Wheat (W)</td>
                <td className="py-1.5 px-2">Z, H, K</td>
                <td className="py-1.5 px-2">N, U, Z</td>
                <td className="py-1.5 px-2 text-orange-400">K (May)</td>
              </tr>
              <tr className="border-b border-zinc-800">
                <td className="py-1.5 px-2 text-white">Kansas Wheat (KW)</td>
                <td className="py-1.5 px-2">Z, H, K</td>
                <td className="py-1.5 px-2">N, U, Z</td>
                <td className="py-1.5 px-2 text-orange-400">K (May)</td>
              </tr>
              <tr className="border-b border-zinc-800">
                <td className="py-1.5 px-2 text-white">Minneapolis Wheat (MW)</td>
                <td className="py-1.5 px-2">Z, H, K, N</td>
                <td className="py-1.5 px-2">U, Z</td>
                <td className="py-1.5 px-2 text-orange-400">N (Jul)</td>
              </tr>
              <tr className="border-b border-zinc-800">
                <td className="py-1.5 px-2 text-white">Soybeans (S)</td>
                <td className="py-1.5 px-2">F, H, K, N, Q</td>
                <td className="py-1.5 px-2">U, X, F</td>
                <td className="py-1.5 px-2 text-orange-400">Q (Aug)</td>
              </tr>
              <tr className="border-b border-zinc-800">
                <td className="py-1.5 px-2 text-white">Soymeal (SM)</td>
                <td className="py-1.5 px-2">Z, F, H, K, N, Q, U</td>
                <td className="py-1.5 px-2">V, Z</td>
                <td className="py-1.5 px-2 text-orange-400">U (Sep)</td>
              </tr>
              <tr className="border-b border-zinc-800">
                <td className="py-1.5 px-2 text-white">Soyoil (BO)</td>
                <td className="py-1.5 px-2">Z, F, H, K, N, Q, U</td>
                <td className="py-1.5 px-2">V, Z</td>
                <td className="py-1.5 px-2 text-orange-400">U (Sep)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-500 mt-2">
          Month codes: F=Jan, H=Mar, K=May, N=Jul, Q=Aug, U=Sep, V=Oct, X=Nov, Z=Dec
        </p>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MM Positions Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <h3 className="text-md font-semibold text-white mb-4">MM</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-2 px-3 text-zinc-400 font-medium">
                    MM
                  </th>
                  <th className="text-right py-2 px-3 text-zinc-400 font-medium">
                    OC
                  </th>
                  <th className="text-right py-2 px-3 text-zinc-400 font-medium">
                    NC
                  </th>
                  <th className="text-right py-2 px-3 text-zinc-400 font-medium">
                    Net MM
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b border-zinc-800 hover:bg-zinc-800/50"
                  >
                    <td className="py-2 px-3 text-white font-medium">
                      {row.label}
                    </td>
                    <td
                      className={`py-2 px-3 text-right ${
                        row.oc >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {formatNumber(row.oc)}
                    </td>
                    <td
                      className={`py-2 px-3 text-right ${
                        row.nc >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {formatNumber(row.nc)}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-medium ${
                        row.netMM >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {formatNumber(row.netMM)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Changes Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <h3 className="text-md font-semibold text-white mb-4">Changes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-2 px-3 text-zinc-400 font-medium">
                    MM
                  </th>
                  <th className="text-right py-2 px-3 text-zinc-400 font-medium">
                    OC
                  </th>
                  <th className="text-right py-2 px-3 text-zinc-400 font-medium">
                    NC
                  </th>
                  <th className="text-right py-2 px-3 text-zinc-400 font-medium">
                    Net MM
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr
                    key={row.label}
                    className="border-b border-zinc-800 hover:bg-zinc-800/50"
                  >
                    <td className="py-2 px-3 text-white font-medium">
                      {row.label}
                    </td>
                    <td
                      className={`py-2 px-3 text-right ${
                        row.ocChange >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {formatNumber(row.ocChange)}
                    </td>
                    <td
                      className={`py-2 px-3 text-right ${
                        row.ncChange >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {formatNumber(row.ncChange)}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-medium ${
                        row.netMMChange >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {formatNumber(row.netMMChange)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bar Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MM OC/NC Positions Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-semibold text-white">
              MM OC/NC Positions
            </h3>
            <button
              onClick={() => setExpandedChart("positions")}
              className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
              title="Expand chart"
            >
              <Maximize2 className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={positionChartData}
                margin={{ top: 25, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  axisLine={{ stroke: "#52525b" }}
                />
                <YAxis
                  domain={yAxisDomain}
                  tick={{ fill: "#a1a1aa", fontSize: 11 }}
                  axisLine={{ stroke: "#52525b" }}
                  tickFormatter={(value) =>
                    value >= 1000 || value <= -1000
                      ? `${(value / 1000).toFixed(0)}k`
                      : value
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#fff" }}
                  formatter={(value: number) => [formatNumber(value), ""]}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 10 }}
                  formatter={(value) => (
                    <span style={{ color: "#a1a1aa" }}>{value}</span>
                  )}
                />
                <ReferenceLine y={0} stroke="#52525b" />
                <Bar dataKey="OC" fill="#f97316" name="OC">
                  <LabelList dataKey="OC" position="top" formatter={formatLabel} style={{ fill: "#a1a1aa", fontSize: 9 }} />
                </Bar>
                <Bar dataKey="NC" fill="#3b82f6" name="NC">
                  <LabelList dataKey="NC" position="top" formatter={formatLabel} style={{ fill: "#a1a1aa", fontSize: 9 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* MM OC/NC Changes Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-semibold text-white">
              MM OC/NC Changes
            </h3>
            <button
              onClick={() => setExpandedChart("changes")}
              className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
              title="Expand chart"
            >
              <Maximize2 className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={changesChartData}
                margin={{ top: 25, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  axisLine={{ stroke: "#52525b" }}
                />
                <YAxis
                  domain={yAxisDomain}
                  tick={{ fill: "#a1a1aa", fontSize: 11 }}
                  axisLine={{ stroke: "#52525b" }}
                  tickFormatter={(value) =>
                    value >= 1000 || value <= -1000
                      ? `${(value / 1000).toFixed(0)}k`
                      : value
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#fff" }}
                  formatter={(value: number) => [formatNumber(value), ""]}
                />
                <Legend
                  wrapperStyle={{ paddingTop: 10 }}
                  formatter={(value) => (
                    <span style={{ color: "#a1a1aa" }}>{value}</span>
                  )}
                />
                <ReferenceLine y={0} stroke="#52525b" />
                <Bar dataKey="OC" fill="#f97316" name="OC">
                  <LabelList dataKey="OC" position="top" formatter={formatLabel} style={{ fill: "#a1a1aa", fontSize: 9 }} />
                </Bar>
                <Bar dataKey="NC" fill="#3b82f6" name="NC">
                  <LabelList dataKey="NC" position="top" formatter={formatLabel} style={{ fill: "#a1a1aa", fontSize: 9 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

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
              <h3 className="text-lg font-semibold text-white">
                {expandedChart === "positions" ? "MM OC/NC Positions" : "MM OC/NC Changes"}
              </h3>
              <button
                onClick={() => setExpandedChart(null)}
                className="p-2 hover:bg-zinc-700 rounded transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            <div className="h-[70vh]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={expandedChart === "positions" ? positionChartData : changesChartData}
                  margin={{ top: 30, right: 40, left: 30, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#a1a1aa", fontSize: 14 }}
                    axisLine={{ stroke: "#52525b" }}
                  />
                  <YAxis
                    domain={yAxisDomain}
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                    axisLine={{ stroke: "#52525b" }}
                    tickFormatter={(value) =>
                      value >= 1000 || value <= -1000
                        ? `${(value / 1000).toFixed(0)}k`
                        : value
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#fff" }}
                    formatter={(value: number) => [formatNumber(value), ""]}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: 10 }}
                    formatter={(value) => (
                      <span style={{ color: "#a1a1aa" }}>{value}</span>
                    )}
                  />
                  <ReferenceLine y={0} stroke="#52525b" />
                  <Bar dataKey="OC" fill="#f97316" name="OC">
                    <LabelList dataKey="OC" position="top" formatter={formatLabel} style={{ fill: "#a1a1aa", fontSize: 11 }} />
                  </Bar>
                  <Bar dataKey="NC" fill="#3b82f6" name="NC">
                    <LabelList dataKey="NC" position="top" formatter={formatLabel} style={{ fill: "#a1a1aa", fontSize: 11 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
