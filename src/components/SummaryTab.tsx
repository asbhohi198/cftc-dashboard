"use client";

import { useEffect, useState } from "react";

interface ParticipantData {
  net: number;
  change: number;
  pctOI: number;
}

interface SummaryRow {
  id: string;
  label: string;
  fullName: string;
  isAggregate: boolean;
  positionDate: string;
  openInterest: {
    size: number;
    change: number;
    pctChange: number;
  };
  producer: ParticipantData;
  nonReportables: ParticipantData;
  producerNonRept: ParticipantData;
  swapDealer: ParticipantData;
  managedMoney: ParticipantData;
  otherReportables: ParticipantData;
  spec: ParticipantData;
}

function formatNumber(num: number): string {
  if (Math.abs(num) >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(num) >= 1000) {
    return `${(num / 1000).toFixed(0)}k`;
  }
  return num.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatChange(num: number): string {
  const sign = num >= 0 ? "+" : "";
  return sign + formatNumber(num);
}

function formatPct(num: number): string {
  return (num * 100).toFixed(1) + "%";
}

function formatPctChange(num: number): string {
  const sign = num >= 0 ? "+" : "";
  return sign + (num * 100).toFixed(2) + "%";
}

function getChangeColor(num: number): string {
  if (num > 0) return "text-green-400";
  if (num < 0) return "text-red-400";
  return "text-zinc-400";
}

export function SummaryTab() {
  const [data, setData] = useState<SummaryRow[]>([]);
  const [positionDate, setPositionDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/summary");
        const json = await res.json();

        if (json.success) {
          setData(json.data);
          setPositionDate(json.positionDate);
        } else {
          setError(json.error || "Failed to fetch summary data");
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
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-zinc-700 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-zinc-800 rounded w-1/3 mb-8"></div>
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">COT Summary</h2>
            <p className="text-xs text-zinc-500">
              Weekly position changes across all agricultural commodities
            </p>
          </div>
          {positionDate && (
            <div className="text-right">
              <p className="text-xs text-zinc-500">Position Date</p>
              <p className="text-sm font-medium text-white">
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

      {/* Summary Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              {/* Category Headers */}
              <tr className="bg-zinc-800 border-b border-zinc-700">
                <th className="px-2 py-2 text-left font-semibold text-zinc-300 sticky left-0 bg-zinc-800 z-10" rowSpan={2}>
                  Contract
                </th>
                <th className="px-1 py-1 text-center font-semibold text-zinc-300 border-l border-zinc-700" colSpan={3}>
                  Open Interest
                </th>
                <th className="px-1 py-1 text-center font-semibold text-blue-400 border-l border-zinc-700" colSpan={3}>
                  Producer
                </th>
                <th className="px-1 py-1 text-center font-semibold text-purple-400 border-l border-zinc-700" colSpan={3}>
                  Non-Rep
                </th>
                <th className="px-1 py-1 text-center font-semibold text-cyan-400 border-l border-zinc-700" colSpan={3}>
                  Prod+NonRep
                </th>
                <th className="px-1 py-1 text-center font-semibold text-yellow-400 border-l border-zinc-700" colSpan={3}>
                  Swap Dealer
                </th>
                <th className="px-1 py-1 text-center font-semibold text-orange-400 border-l border-zinc-700" colSpan={3}>
                  Managed Money
                </th>
                <th className="px-1 py-1 text-center font-semibold text-pink-400 border-l border-zinc-700" colSpan={3}>
                  Other Rep
                </th>
                <th className="px-1 py-1 text-center font-semibold text-emerald-400 border-l border-zinc-700" colSpan={3}>
                  Spec
                </th>
              </tr>
              {/* Sub Headers */}
              <tr className="bg-zinc-800/50 border-b border-zinc-700 text-zinc-500">
                {/* Open Interest */}
                <th className="px-1 py-1 text-right font-normal border-l border-zinc-700">Size</th>
                <th className="px-1 py-1 text-right font-normal">Chg</th>
                <th className="px-1 py-1 text-right font-normal">%Chg</th>
                {/* Producer */}
                <th className="px-1 py-1 text-right font-normal border-l border-zinc-700">Net</th>
                <th className="px-1 py-1 text-right font-normal">Chg</th>
                <th className="px-1 py-1 text-right font-normal">%OI</th>
                {/* Non-Reportables */}
                <th className="px-1 py-1 text-right font-normal border-l border-zinc-700">Net</th>
                <th className="px-1 py-1 text-right font-normal">Chg</th>
                <th className="px-1 py-1 text-right font-normal">%OI</th>
                {/* Producer + Non-Rep */}
                <th className="px-1 py-1 text-right font-normal border-l border-zinc-700">Net</th>
                <th className="px-1 py-1 text-right font-normal">Chg</th>
                <th className="px-1 py-1 text-right font-normal">%OI</th>
                {/* Swap Dealer */}
                <th className="px-1 py-1 text-right font-normal border-l border-zinc-700">Net</th>
                <th className="px-1 py-1 text-right font-normal">Chg</th>
                <th className="px-1 py-1 text-right font-normal">%OI</th>
                {/* Managed Money */}
                <th className="px-1 py-1 text-right font-normal border-l border-zinc-700">Net</th>
                <th className="px-1 py-1 text-right font-normal">Chg</th>
                <th className="px-1 py-1 text-right font-normal">%OI</th>
                {/* Other Reportables */}
                <th className="px-1 py-1 text-right font-normal border-l border-zinc-700">Net</th>
                <th className="px-1 py-1 text-right font-normal">Chg</th>
                <th className="px-1 py-1 text-right font-normal">%OI</th>
                {/* Spec */}
                <th className="px-1 py-1 text-right font-normal border-l border-zinc-700">Net</th>
                <th className="px-1 py-1 text-right font-normal">Chg</th>
                <th className="px-1 py-1 text-right font-normal">%OI</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`border-b border-zinc-800 hover:bg-zinc-800/50 ${
                    row.isAggregate ? "bg-zinc-800/30 font-semibold" : ""
                  } ${idx % 2 === 0 ? "" : "bg-zinc-900/50"}`}
                >
                  {/* Contract Label */}
                  <td className="px-2 py-1.5 text-left font-medium text-white sticky left-0 bg-inherit z-10" title={row.fullName}>
                    {row.label}
                  </td>

                  {/* Open Interest */}
                  <td className="px-1 py-1.5 text-right text-zinc-300 border-l border-zinc-800">
                    {formatNumber(row.openInterest.size)}
                  </td>
                  <td className={`px-1 py-1.5 text-right ${getChangeColor(row.openInterest.change)}`}>
                    {formatChange(row.openInterest.change)}
                  </td>
                  <td className={`px-1 py-1.5 text-right ${getChangeColor(row.openInterest.pctChange)}`}>
                    {formatPctChange(row.openInterest.pctChange)}
                  </td>

                  {/* Producer */}
                  <td className="px-1 py-1.5 text-right text-zinc-300 border-l border-zinc-800">
                    {formatNumber(row.producer.net)}
                  </td>
                  <td className={`px-1 py-1.5 text-right ${getChangeColor(row.producer.change)}`}>
                    {formatChange(row.producer.change)}
                  </td>
                  <td className="px-1 py-1.5 text-right text-blue-400/70">
                    {formatPct(row.producer.pctOI)}
                  </td>

                  {/* Non-Reportables */}
                  <td className="px-1 py-1.5 text-right text-zinc-300 border-l border-zinc-800">
                    {formatNumber(row.nonReportables.net)}
                  </td>
                  <td className={`px-1 py-1.5 text-right ${getChangeColor(row.nonReportables.change)}`}>
                    {formatChange(row.nonReportables.change)}
                  </td>
                  <td className="px-1 py-1.5 text-right text-purple-400/70">
                    {formatPct(row.nonReportables.pctOI)}
                  </td>

                  {/* Producer + Non-Rep */}
                  <td className="px-1 py-1.5 text-right text-zinc-300 border-l border-zinc-800">
                    {formatNumber(row.producerNonRept.net)}
                  </td>
                  <td className={`px-1 py-1.5 text-right ${getChangeColor(row.producerNonRept.change)}`}>
                    {formatChange(row.producerNonRept.change)}
                  </td>
                  <td className="px-1 py-1.5 text-right text-cyan-400/70">
                    {formatPct(row.producerNonRept.pctOI)}
                  </td>

                  {/* Swap Dealer */}
                  <td className="px-1 py-1.5 text-right text-zinc-300 border-l border-zinc-800">
                    {formatNumber(row.swapDealer.net)}
                  </td>
                  <td className={`px-1 py-1.5 text-right ${getChangeColor(row.swapDealer.change)}`}>
                    {formatChange(row.swapDealer.change)}
                  </td>
                  <td className="px-1 py-1.5 text-right text-yellow-400/70">
                    {formatPct(row.swapDealer.pctOI)}
                  </td>

                  {/* Managed Money */}
                  <td className="px-1 py-1.5 text-right text-zinc-300 border-l border-zinc-800">
                    {formatNumber(row.managedMoney.net)}
                  </td>
                  <td className={`px-1 py-1.5 text-right ${getChangeColor(row.managedMoney.change)}`}>
                    {formatChange(row.managedMoney.change)}
                  </td>
                  <td className="px-1 py-1.5 text-right text-orange-400/70">
                    {formatPct(row.managedMoney.pctOI)}
                  </td>

                  {/* Other Reportables */}
                  <td className="px-1 py-1.5 text-right text-zinc-300 border-l border-zinc-800">
                    {formatNumber(row.otherReportables.net)}
                  </td>
                  <td className={`px-1 py-1.5 text-right ${getChangeColor(row.otherReportables.change)}`}>
                    {formatChange(row.otherReportables.change)}
                  </td>
                  <td className="px-1 py-1.5 text-right text-pink-400/70">
                    {formatPct(row.otherReportables.pctOI)}
                  </td>

                  {/* Spec */}
                  <td className="px-1 py-1.5 text-right text-zinc-300 border-l border-zinc-800">
                    {formatNumber(row.spec.net)}
                  </td>
                  <td className={`px-1 py-1.5 text-right ${getChangeColor(row.spec.change)}`}>
                    {formatChange(row.spec.change)}
                  </td>
                  <td className="px-1 py-1.5 text-right text-emerald-400/70">
                    {formatPct(row.spec.pctOI)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
        <p className="text-xs text-zinc-500">
          <span className="font-medium text-zinc-400">Note:</span> Spec is defined as Managed Money + Other Reportables.
          Changes are week-over-week. %OI is net position as a percentage of total open interest.
        </p>
      </div>
    </div>
  );
}
