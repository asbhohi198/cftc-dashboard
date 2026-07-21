"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { X } from "lucide-react";

interface WeeklyDataPoint {
  week: number;
  [year: number]: number;
}

interface ContractData {
  id: string;
  name: string;
  years: number[];
  weeklyData: WeeklyDataPoint[];
}

interface APIResponse {
  success: boolean;
  sector: string;
  contracts: ContractData[];
}

// Color palette for historical years (muted colors)
const YEAR_COLORS: Record<number, string> = {
  2010: "#6b7280",
  2011: "#9ca3af",
  2012: "#a78bfa",
  2013: "#818cf8",
  2014: "#60a5fa",
  2015: "#38bdf8",
  2016: "#22d3d8",
  2017: "#34d399",
  2018: "#4ade80",
  2019: "#a3e635",
  2020: "#fbbf24",
  2021: "#fb923c",
  2022: "#f472b6",
  2023: "#c084fc",
  2024: "#22d3ee",
};

// Current year gets white for emphasis
const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_YEAR_COLOR = "#ffffff";

function formatNumber(num: number): string {
  if (Math.abs(num) >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  } else if (Math.abs(num) >= 1000) {
    return (num / 1000).toFixed(0) + "K";
  }
  return Math.round(num).toLocaleString();
}

// Convert week number to month abbreviation
function weekToMonth(week: number): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // Approximate: each month is ~4.33 weeks
  const monthIndex = Math.min(Math.floor((week - 1) / 4.33), 11);
  return months[monthIndex];
}

// Custom X-axis tick with vertical rotation
const CustomXAxisTick = (props: { x?: number; y?: number; payload?: { value: number } }) => {
  const { x = 0, y = 0, payload } = props;
  const month = weekToMonth(payload?.value || 1);
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        fill="#ffffff"
        fontSize={11}
        transform="rotate(-90)"
      >
        {month}
      </text>
    </g>
  );
};

interface COTYTDTabProps {
  sector: string;
}

export function COTYTDTab({ sector }: COTYTDTabProps) {
  const [data, setData] = useState<ContractData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedChart, setExpandedChart] = useState<ContractData | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/cot-ytd?sector=${sector}`);
        const json: APIResponse = await res.json();
        if (json.success) {
          setData(json.contracts);
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
      </div>
    );
  }

  const getYearColor = (year: number): string => {
    if (year === CURRENT_YEAR) return CURRENT_YEAR_COLOR;
    return YEAR_COLORS[year] || "#71717a";
  };

  const renderChart = (contract: ContractData, isExpanded: boolean = false) => {
    const chartMargin = isExpanded
      ? { top: 20, right: 20, left: -15, bottom: 20 }
      : { top: 10, right: 5, left: -20, bottom: 15 };

    // Get years to display (show all years, current year last for z-order)
    const sortedYears = [...contract.years].sort((a, b) => {
      if (a === CURRENT_YEAR) return 1;
      if (b === CURRENT_YEAR) return -1;
      return a - b;
    });

    // Show ticks at start of each month (approximately weeks 1, 5, 9, 14, 18, 22, 27, 31, 35, 40, 44, 48)
    const monthStartWeeks = [1, 5, 9, 14, 18, 22, 27, 31, 35, 40, 44, 48];

    return (
      <ResponsiveContainer width="100%" height={isExpanded ? "100%" : 350}>
        <LineChart data={contract.weeklyData} margin={chartMargin}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="week"
            tick={<CustomXAxisTick />}
            ticks={monthStartWeeks}
            height={40}
          />
          <YAxis
            tick={{ fill: "#ffffff", fontSize: isExpanded ? 13 : 11 }}
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
            labelFormatter={(week) => `Week ${week}`}
            formatter={(value: number, name: string) => [formatNumber(value), name]}
          />
          <ReferenceLine y={0} stroke="#52525b" />
          {isExpanded && (
            <Legend
              wrapperStyle={{ paddingTop: 10 }}
              formatter={(value) => <span style={{ color: "#ffffff", fontSize: 12 }}>{value}</span>}
            />
          )}
          {sortedYears.map((year) => (
            <Line
              key={year}
              type="monotone"
              dataKey={year.toString()}
              name={year.toString()}
              stroke={getYearColor(year)}
              strokeWidth={year === CURRENT_YEAR ? 4 : 1}
              dot={false}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white">
          YTD Cumulative MM Net Position Change
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Cumulative change in Managed Money net position from January 1st of each year
        </p>
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <div className="flex items-center gap-2">
              <div className="w-6 h-1 bg-white rounded"></div>
              <span className="text-white font-semibold">{CURRENT_YEAR} (Current)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-zinc-500 rounded"></div>
              <span>Historical years</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data.map((contract) => (
          <div
            key={contract.id}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
          >
            <h3 className="text-xl font-bold text-orange-400 mb-1">
              {contract.name}
            </h3>
            <p className="text-xs text-zinc-500 mb-3">
              Cumulative Net Change in MM Net Position from Jan 1
            </p>
            <div
              className="cursor-pointer"
              onClick={() => setExpandedChart(contract)}
            >
              {renderChart(contract, false)}
            </div>
            <p className="text-xs text-zinc-600 mt-2 text-center">
              Click chart to expand
            </p>
          </div>
        ))}
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
                  {expandedChart.name}
                </h3>
                <p className="text-sm text-zinc-400">
                  Cumulative Net Change in MM Net Position from Jan 1
                </p>
              </div>
              <button
                onClick={() => setExpandedChart(null)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Year Legend */}
            <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-zinc-800">
              {expandedChart.years.map((year) => (
                <div key={year} className="flex items-center gap-1.5">
                  <div
                    className="w-4 rounded"
                    style={{
                      backgroundColor: getYearColor(year),
                      height: year === CURRENT_YEAR ? 3 : 2,
                    }}
                  ></div>
                  <span
                    className={`text-xs ${
                      year === CURRENT_YEAR
                        ? "text-white font-bold"
                        : "text-zinc-400"
                    }`}
                  >
                    {year}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ height: "70vh" }}>{renderChart(expandedChart, true)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
