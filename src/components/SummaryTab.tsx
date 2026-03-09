"use client";

import React, { useEffect, useState } from "react";

interface ChangeData {
  value: number;
  isSignificant: boolean;
}

interface PctOIData {
  value: number;
  isExtreme: boolean;
  isHigh: boolean;
}

interface ParticipantData {
  net: number;
  change: ChangeData;
  pctOI: PctOIData;
}

type ReportType = "disagg" | "tff";

interface SummaryRow {
  id: string;
  label: string;
  fullName: string;
  isAggregate: boolean;
  positionDate: string;
  reportType: ReportType;
  openInterest: {
    size: number;
    change: ChangeData;
    pctChange: number;
  };
  // Disaggregated
  producer?: ParticipantData;
  swapDealer?: ParticipantData;
  managedMoney?: ParticipantData;
  otherReportables?: ParticipantData;
  // TFF
  dealer?: ParticipantData;
  assetManager?: ParticipantData;
  leveragedFunds?: ParticipantData;
  otherTFF?: ParticipantData;
  // Common
  nonReportables?: ParticipantData;
  spec: ParticipantData;
}

interface SectorData {
  sector: string;
  label: string;
  reportType: ReportType;
  rows: SummaryRow[];
}

interface ReportDate {
  positionDate: string;
  releaseDate: string;
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

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getChangeColor(num: number): string {
  if (num > 0) return "text-green-400";
  if (num < 0) return "text-red-400";
  return "text-zinc-400";
}

// Render participant data cells
function ParticipantCells({ data, baseColor }: { data: ParticipantData; baseColor: string }) {
  return (
    <>
      <td className="px-1 py-1.5 text-right text-zinc-300 border-l border-zinc-800">
        {formatNumber(data.net)}
      </td>
      <td className={`px-1 py-1.5 text-right ${getChangeColor(data.change.value)} ${data.change.isSignificant ? "font-bold bg-yellow-500/20" : ""}`}>
        {formatChange(data.change.value)}
      </td>
      <td className={`px-1 py-1.5 text-right ${data.pctOI.isExtreme ? (data.pctOI.isHigh ? "font-bold bg-green-500/20 text-green-400" : "font-bold bg-red-500/20 text-red-400") : baseColor}`}>
        {formatPct(data.pctOI.value)}
      </td>
    </>
  );
}

// Disaggregated table for ags/energy
function DisaggregatedTable({ rows }: { rows: SummaryRow[] }) {
  return (
    <table className="w-full text-xs">
      <thead>
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
          <th className="px-1 py-1 text-center font-semibold text-yellow-400 border-l border-zinc-700" colSpan={3}>
            Swap Dealer
          </th>
          <th className="px-1 py-1 text-center font-semibold text-orange-400 border-l border-zinc-700" colSpan={3}>
            Managed Money
          </th>
          <th className="px-1 py-1 text-center font-semibold text-pink-400 border-l border-zinc-700" colSpan={3}>
            Other Rep
          </th>
          <th className="px-1 py-1 text-center font-semibold text-purple-400 border-l border-zinc-700" colSpan={3}>
            Non-Rep
          </th>
          <th className="px-1 py-1 text-center font-semibold text-emerald-400 border-l border-zinc-700" colSpan={3}>
            Spec
          </th>
        </tr>
        <tr className="bg-zinc-800/50 border-b border-zinc-700 text-zinc-500">
          <th className="px-1 py-1 text-right font-normal border-l border-zinc-700">Size</th>
          <th className="px-1 py-1 text-right font-normal">Chg</th>
          <th className="px-1 py-1 text-right font-normal">%Chg</th>
          {[...Array(6)].map((_, i) => (
            <React.Fragment key={i}>
              <th className="px-1 py-1 text-right font-normal border-l border-zinc-700">Net</th>
              <th className="px-1 py-1 text-right font-normal">Chg</th>
              <th className="px-1 py-1 text-right font-normal">%OI</th>
            </React.Fragment>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr
            key={row.id}
            className={`border-b border-zinc-800 hover:bg-zinc-800/50 ${
              row.isAggregate ? "bg-zinc-800/30 font-semibold" : ""
            } ${idx % 2 === 0 ? "" : "bg-zinc-900/50"}`}
          >
            <td className="px-2 py-1.5 text-left font-medium text-white sticky left-0 bg-inherit z-10" title={row.fullName}>
              {row.label}
            </td>
            <td className="px-1 py-1.5 text-right text-zinc-300 border-l border-zinc-800">
              {formatNumber(row.openInterest.size)}
            </td>
            <td className={`px-1 py-1.5 text-right ${getChangeColor(row.openInterest.change.value)} ${row.openInterest.change.isSignificant ? "font-bold bg-yellow-500/20" : ""}`}>
              {formatChange(row.openInterest.change.value)}
            </td>
            <td className={`px-1 py-1.5 text-right ${getChangeColor(row.openInterest.pctChange)}`}>
              {formatPctChange(row.openInterest.pctChange)}
            </td>
            {row.producer && <ParticipantCells data={row.producer} baseColor="text-blue-400/70" />}
            {row.swapDealer && <ParticipantCells data={row.swapDealer} baseColor="text-yellow-400/70" />}
            {row.managedMoney && <ParticipantCells data={row.managedMoney} baseColor="text-orange-400/70" />}
            {row.otherReportables && <ParticipantCells data={row.otherReportables} baseColor="text-pink-400/70" />}
            {row.nonReportables && <ParticipantCells data={row.nonReportables} baseColor="text-purple-400/70" />}
            <ParticipantCells data={row.spec} baseColor="text-emerald-400/70" />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// TFF table for equities/rates/fx/crypto
function TFFTable({ rows }: { rows: SummaryRow[] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="bg-zinc-800 border-b border-zinc-700">
          <th className="px-2 py-2 text-left font-semibold text-zinc-300 sticky left-0 bg-zinc-800 z-10" rowSpan={2}>
            Contract
          </th>
          <th className="px-1 py-1 text-center font-semibold text-zinc-300 border-l border-zinc-700" colSpan={3}>
            Open Interest
          </th>
          <th className="px-1 py-1 text-center font-semibold text-blue-400 border-l border-zinc-700" colSpan={3}>
            Dealer
          </th>
          <th className="px-1 py-1 text-center font-semibold text-yellow-400 border-l border-zinc-700" colSpan={3}>
            Asset Manager
          </th>
          <th className="px-1 py-1 text-center font-semibold text-orange-400 border-l border-zinc-700" colSpan={3}>
            Leveraged Funds
          </th>
          <th className="px-1 py-1 text-center font-semibold text-pink-400 border-l border-zinc-700" colSpan={3}>
            Other Rep
          </th>
          <th className="px-1 py-1 text-center font-semibold text-purple-400 border-l border-zinc-700" colSpan={3}>
            Non-Rep
          </th>
          <th className="px-1 py-1 text-center font-semibold text-emerald-400 border-l border-zinc-700" colSpan={3}>
            Spec
          </th>
        </tr>
        <tr className="bg-zinc-800/50 border-b border-zinc-700 text-zinc-500">
          <th className="px-1 py-1 text-right font-normal border-l border-zinc-700">Size</th>
          <th className="px-1 py-1 text-right font-normal">Chg</th>
          <th className="px-1 py-1 text-right font-normal">%Chg</th>
          {[...Array(6)].map((_, i) => (
            <React.Fragment key={i}>
              <th className="px-1 py-1 text-right font-normal border-l border-zinc-700">Net</th>
              <th className="px-1 py-1 text-right font-normal">Chg</th>
              <th className="px-1 py-1 text-right font-normal">%OI</th>
            </React.Fragment>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr
            key={row.id}
            className={`border-b border-zinc-800 hover:bg-zinc-800/50 ${
              row.isAggregate ? "bg-zinc-800/30 font-semibold" : ""
            } ${idx % 2 === 0 ? "" : "bg-zinc-900/50"}`}
          >
            <td className="px-2 py-1.5 text-left font-medium text-white sticky left-0 bg-inherit z-10" title={row.fullName}>
              {row.label}
            </td>
            <td className="px-1 py-1.5 text-right text-zinc-300 border-l border-zinc-800">
              {formatNumber(row.openInterest.size)}
            </td>
            <td className={`px-1 py-1.5 text-right ${getChangeColor(row.openInterest.change.value)} ${row.openInterest.change.isSignificant ? "font-bold bg-yellow-500/20" : ""}`}>
              {formatChange(row.openInterest.change.value)}
            </td>
            <td className={`px-1 py-1.5 text-right ${getChangeColor(row.openInterest.pctChange)}`}>
              {formatPctChange(row.openInterest.pctChange)}
            </td>
            {row.dealer && <ParticipantCells data={row.dealer} baseColor="text-blue-400/70" />}
            {row.assetManager && <ParticipantCells data={row.assetManager} baseColor="text-yellow-400/70" />}
            {row.leveragedFunds && <ParticipantCells data={row.leveragedFunds} baseColor="text-orange-400/70" />}
            {row.otherTFF && <ParticipantCells data={row.otherTFF} baseColor="text-pink-400/70" />}
            {row.nonReportables && <ParticipantCells data={row.nonReportables} baseColor="text-purple-400/70" />}
            <ParticipantCells data={row.spec} baseColor="text-emerald-400/70" />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SummaryTab() {
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [latestReport, setLatestReport] = useState<ReportDate | null>(null);
  const [priorReport, setPriorReport] = useState<ReportDate | null>(null);
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
          setSectors(json.sectors);
          setLatestReport(json.latestReport);
          setPriorReport(json.priorReport);
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
    <div className="space-y-6">
      {/* Header with Report Dates */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">COT Summary</h2>
            <p className="text-xs text-zinc-500">
              Weekly position changes across all asset classes
            </p>
          </div>
          <div className="flex items-center gap-8">
            {latestReport && (
              <div className="text-right">
                <p className="text-xs text-zinc-500 font-medium">Latest Report</p>
                <p className="text-sm font-medium text-white">
                  Position: {formatDate(latestReport.positionDate)}
                </p>
                <p className="text-xs text-zinc-400">
                  Released: {formatDate(latestReport.releaseDate)}
                </p>
              </div>
            )}
            {priorReport && (
              <div className="text-right border-l border-zinc-700 pl-8">
                <p className="text-xs text-zinc-500 font-medium">Prior Report</p>
                <p className="text-sm font-medium text-zinc-400">
                  Position: {formatDate(priorReport.positionDate)}
                </p>
                <p className="text-xs text-zinc-500">
                  Released: {formatDate(priorReport.releaseDate)}
                </p>
              </div>
            )}
          </div>
        </div>
        {/* Note/Legend */}
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <div className="flex flex-wrap items-center gap-6 text-xs text-zinc-500">
            <div>
              <span className="font-medium text-zinc-400">Note:</span> Spec = MM/Lev Funds + Other Reportables. Changes are week-over-week.
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 font-bold rounded">Chg</span>
              <span>= Change &gt; 2 std dev</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 font-bold rounded">%OI</span>
              <span>= 98th percentile</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 font-bold rounded">%OI</span>
              <span>= 2nd percentile</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sector Tables */}
      {sectors.map((sector) => (
        <div key={sector.sector} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-700 bg-zinc-800/50">
            <h3 className="text-md font-semibold text-white">{sector.label}</h3>
            <p className="text-xs text-zinc-500">
              {sector.reportType === "disagg" ? "Disaggregated Report" : "Traders in Financial Futures (TFF)"}
            </p>
          </div>
          <div className="overflow-x-auto">
            {sector.reportType === "disagg" ? (
              <DisaggregatedTable rows={sector.rows} />
            ) : (
              <TFFTable rows={sector.rows} />
            )}
          </div>
        </div>
      ))}

    </div>
  );
}
