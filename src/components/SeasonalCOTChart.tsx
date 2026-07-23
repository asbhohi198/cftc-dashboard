"use client";

import { useMemo, useState } from "react";
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

// Color palette for historical years
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
  2025: "#10b981",
  2026: "#f59e0b",
  2027: "#ef4444",
};

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_YEAR_COLOR = "#ffffff";

// Month labels for x-axis
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Day of year to month conversion
function dayToMonth(day: number): string {
  const monthDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
  for (let i = 0; i < 12; i++) {
    if (day <= monthDays[i + 1]) {
      return MONTH_LABELS[i];
    }
  }
  return "Dec";
}

// Get day of year from date
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatNumber(num: number): string {
  if (Math.abs(num) >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  } else if (Math.abs(num) >= 1000) {
    return (num / 1000).toFixed(0) + "K";
  }
  return Math.round(num).toLocaleString();
}

// Custom X-axis tick with vertical rotation
const CustomXAxisTick = (props: { x?: number; y?: number; payload?: { value: number } }) => {
  const { x = 0, y = 0, payload } = props;
  const month = dayToMonth(payload?.value || 1);
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

export type YearRange = "5" | "10" | "15" | "all";

interface SeasonalCOTChartProps {
  title: string;
  data: { date: string; value: number }[];
  yearRange: YearRange;
  loading?: boolean;
  color?: string;
}

export function SeasonalCOTChart({
  title,
  data,
  yearRange,
  loading = false,
  color = "#3b82f6",
}: SeasonalCOTChartProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Transform data to seasonal format
  const { chartData, years } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartData: [], years: [] };
    }

    const minYear = yearRange === "all" ? 0 : CURRENT_YEAR - parseInt(yearRange);
    const byDay: Record<number, Record<string, number>> = {};
    const yearsSet = new Set<number>();

    data.forEach((d) => {
      const date = new Date(d.date);
      const year = date.getFullYear();
      if (year < minYear) return;
      if (d.value === undefined || d.value === null) return;

      yearsSet.add(year);
      const dayOfYear = getDayOfYear(date);
      if (!byDay[dayOfYear]) byDay[dayOfYear] = {};
      // Use string key for year to ensure Recharts can match dataKey
      byDay[dayOfYear][year.toString()] = d.value;
    });

    // Convert to chart format
    const chartData = Object.entries(byDay)
      .map(([day, yearValues]) => ({
        day: parseInt(day),
        ...yearValues,
      }))
      .sort((a, b) => a.day - b.day);

    // Sort years so current year renders last (on top)
    const years = Array.from(yearsSet).sort((a, b) => {
      if (a === CURRENT_YEAR) return 1;
      if (b === CURRENT_YEAR) return -1;
      return a - b;
    });

    return { chartData, years };
  }, [data, yearRange]);

  const getYearColor = (year: number): string => {
    if (year === CURRENT_YEAR) return CURRENT_YEAR_COLOR;
    return YEAR_COLORS[year] || "#71717a";
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="h-6 bg-zinc-700 rounded w-1/3 mb-4 animate-pulse"></div>
        <div className="h-[200px] bg-zinc-800 rounded animate-pulse"></div>
      </div>
    );
  }

  // Month start days for x-axis ticks
  const monthStartDays = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];

  const renderChart = (expanded: boolean) => {
    const chartMargin = expanded
      ? { top: 20, right: 20, left: -15, bottom: 30 }
      : { top: 5, right: 5, left: -30, bottom: 15 };

    return (
      <ResponsiveContainer width="100%" height={expanded ? 500 : 200}>
        <LineChart data={chartData} margin={chartMargin}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="day"
            tick={<CustomXAxisTick />}
            ticks={monthStartDays}
            domain={[1, 365]}
            height={expanded ? 40 : 30}
          />
          <YAxis
            tick={{ fill: "#ffffff", fontSize: expanded ? 12 : 10 }}
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
            itemStyle={{ color: "#ffffff" }}
            labelFormatter={(day) => dayToMonth(day as number)}
            formatter={(value: number, name: string) => [formatNumber(value), name]}
          />
          <ReferenceLine y={0} stroke="#52525b" />
          {expanded && (
            <Legend
              wrapperStyle={{ paddingTop: 10 }}
              formatter={(value) => (
                <span style={{ color: "#ffffff", fontSize: 11 }}>{value}</span>
              )}
            />
          )}
          {years.map((year) => (
            <Line
              key={year}
              type="monotone"
              dataKey={year.toString()}
              name={year.toString()}
              stroke={getYearColor(year)}
              strokeWidth={year === CURRENT_YEAR ? 3 : 1}
              dot={false}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <>
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 cursor-pointer hover:border-zinc-600 transition-colors"
        onClick={() => setIsExpanded(true)}
      >
        <h4 className="text-sm font-medium text-white mb-2 truncate" title={title}>
          {title}
        </h4>
        {renderChart(false)}
      </div>

      {/* Expanded Modal */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{title} (Seasonal)</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="mb-4 flex items-center gap-4 text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-white rounded"></div>
                <span className="text-white font-semibold">{CURRENT_YEAR} (Current)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-zinc-500 rounded"></div>
                <span>Historical years</span>
              </div>
            </div>
            {renderChart(true)}
          </div>
        </div>
      )}
    </>
  );
}
