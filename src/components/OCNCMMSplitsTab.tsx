"use client";

import { useEffect, useState } from "react";
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
} from "recharts";

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

  // Prepare chart data for positions
  const positionChartData = data.map((d) => ({
    name: d.label,
    OC: d.oc,
    NC: d.nc,
  }));

  // Prepare chart data for changes
  const changesChartData = data.map((d) => ({
    name: d.label,
    OC: d.ocChange,
    NC: d.ncChange,
  }));

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
          <h3 className="text-md font-semibold text-white mb-4">
            MM OC/NC Positions
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={positionChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  axisLine={{ stroke: "#52525b" }}
                />
                <YAxis
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
                <Bar dataKey="OC" fill="#f97316" name="OC" />
                <Bar dataKey="NC" fill="#3b82f6" name="NC" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* MM OC/NC Changes Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <h3 className="text-md font-semibold text-white mb-4">
            MM OC/NC Changes
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={changesChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#a1a1aa", fontSize: 12 }}
                  axisLine={{ stroke: "#52525b" }}
                />
                <YAxis
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
                <Bar dataKey="OC" fill="#f97316" name="OC" />
                <Bar dataKey="NC" fill="#3b82f6" name="NC" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
