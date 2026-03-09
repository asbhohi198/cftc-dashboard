"use client";

import { useEffect, useState, useMemo } from "react";
import { COTChart } from "./COTChart";
import { COTRecord } from "@/lib/cftc";

interface CornTabProps {
  contractId?: string;
}

export function CornTab({ contractId = "corn" }: CornTabProps) {
  const [data, setData] = useState<COTRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contractName, setContractName] = useState("Corn");
  const [isAgs, setIsAgs] = useState(true); // Only show old/new crop for ags
  const [reportType, setReportType] = useState<"disagg" | "tff">("disagg");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/cot?contract=${contractId}`);
        const json = await res.json();

        if (json.success) {
          setData(json.data);
          setContractName(json.contract.name);
          // Only show old/new crop for agricultural commodities
          setIsAgs(json.contract.category === "ags");
          setReportType(json.contract.reportType || "disagg");
        } else {
          setError(json.error || "Failed to fetch data");
        }
      } catch (err) {
        setError("Failed to fetch data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [contractId]);

  // ============================================
  // AGGREGATE DATA - Outright
  // ============================================
  const producerNetData = useMemo(() => data.map((d) => ({
    date: d.date,
    "Net Position": d.producerNetAll,
  })), [data]);

  const swapNetData = useMemo(() => data.map((d) => ({
    date: d.date,
    "Net Position": d.swapNetAll,
  })), [data]);

  const mmNetData = useMemo(() => data.map((d) => ({
    date: d.date,
    "Net Position": d.mmNetAll,
  })), [data]);

  const specNetData = useMemo(() => data.map((d) => ({
    date: d.date,
    "Net Position": d.specNetAll,
  })), [data]);

  const otherNetData = useMemo(() => data.map((d) => ({
    date: d.date,
    "Net Position": d.otherNetAll,
  })), [data]);

  const nonReptNetData = useMemo(() => data.map((d) => ({
    date: d.date,
    "Net Position": d.nonReptNetAll,
  })), [data]);

  const prodNonReptNetData = useMemo(() => data.map((d) => ({
    date: d.date,
    "Net Position": d.producerNetAll + d.nonReptNetAll,
  })), [data]);

  // ============================================
  // AGGREGATE DATA - % OI
  // ============================================
  const producerPctOIData = useMemo(() => data.map((d) => ({
    date: d.date,
    "% OI": d.openInterestAll ? (d.producerNetAll / d.openInterestAll) * 100 : 0,
  })), [data]);

  const swapPctOIData = useMemo(() => data.map((d) => ({
    date: d.date,
    "% OI": d.openInterestAll ? (d.swapNetAll / d.openInterestAll) * 100 : 0,
  })), [data]);

  const mmPctOIData = useMemo(() => data.map((d) => ({
    date: d.date,
    "% OI": d.openInterestAll ? (d.mmNetAll / d.openInterestAll) * 100 : 0,
  })), [data]);

  const specPctOIData = useMemo(() => data.map((d) => ({
    date: d.date,
    "% OI": d.openInterestAll ? (d.specNetAll / d.openInterestAll) * 100 : 0,
  })), [data]);

  const otherPctOIData = useMemo(() => data.map((d) => ({
    date: d.date,
    "% OI": d.openInterestAll ? (d.otherNetAll / d.openInterestAll) * 100 : 0,
  })), [data]);

  const nonReptPctOIData = useMemo(() => data.map((d) => ({
    date: d.date,
    "% OI": d.openInterestAll ? (d.nonReptNetAll / d.openInterestAll) * 100 : 0,
  })), [data]);

  const prodNonReptPctOIData = useMemo(() => data.map((d) => ({
    date: d.date,
    "% OI": d.openInterestAll ? ((d.producerNetAll + d.nonReptNetAll) / d.openInterestAll) * 100 : 0,
  })), [data]);

  // ============================================
  // OLD CROP DATA - Outright
  // ============================================
  const producerOldData = useMemo(() => data.map((d) => ({
    date: d.date,
    "Net Position": d.producerNetOld,
  })), [data]);

  const swapOldData = useMemo(() => data.map((d) => ({
    date: d.date,
    "Net Position": d.swapNetOld,
  })), [data]);

  const mmOldData = useMemo(() => data.map((d) => ({
    date: d.date,
    "Net Position": d.mmNetOld,
  })), [data]);

  const specOldData = useMemo(() => data.map((d) => ({
    date: d.date,
    "Net Position": d.specNetOld,
  })), [data]);

  const otherOldData = useMemo(() => data.map((d) => ({
    date: d.date,
    "Net Position": d.otherNetOld,
  })), [data]);

  const nonReptOldData = useMemo(() => data.map((d) => ({
    date: d.date,
    "Net Position": d.nonReptNetOld,
  })), [data]);

  const prodNonReptOldData = useMemo(() => data.map((d) => ({
    date: d.date,
    "Net Position": d.producerNetOld + d.nonReptNetOld,
  })), [data]);

  // ============================================
  // OLD CROP DATA - % Total (old as % of aggregate)
  // ============================================
  const producerOldPctTotalData = useMemo(() => data.map((d) => ({
    date: d.date,
    "% Total": d.producerNetAll ? (d.producerNetOld / d.producerNetAll) * 100 : 0,
  })), [data]);

  const swapOldPctTotalData = useMemo(() => data.map((d) => ({
    date: d.date,
    "% Total": d.swapNetAll ? (d.swapNetOld / d.swapNetAll) * 100 : 0,
  })), [data]);

  const mmOldPctTotalData = useMemo(() => data.map((d) => ({
    date: d.date,
    "% Total": d.mmNetAll ? (d.mmNetOld / d.mmNetAll) * 100 : 0,
  })), [data]);

  const specOldPctTotalData = useMemo(() => data.map((d) => ({
    date: d.date,
    "% Total": d.specNetAll ? (d.specNetOld / d.specNetAll) * 100 : 0,
  })), [data]);

  const otherOldPctTotalData = useMemo(() => data.map((d) => ({
    date: d.date,
    "% Total": d.otherNetAll ? (d.otherNetOld / d.otherNetAll) * 100 : 0,
  })), [data]);

  const nonReptOldPctTotalData = useMemo(() => data.map((d) => ({
    date: d.date,
    "% Total": d.nonReptNetAll ? (d.nonReptNetOld / d.nonReptNetAll) * 100 : 0,
  })), [data]);

  // Producer + Non-rept Old uses % OI (per user's list)
  const prodNonReptOldPctOIData = useMemo(() => data.map((d) => ({
    date: d.date,
    "% OI": d.openInterestAll ? ((d.producerNetOld + d.nonReptNetOld) / d.openInterestAll) * 100 : 0,
  })), [data]);

  // ============================================
  // NEW CROP DATA - Outright
  // ============================================
  const producerNewData = useMemo(() => data.map((d) => ({
    date: d.date,
    "Net Position": d.producerNetOther,
  })), [data]);

  const swapNewData = useMemo(() => data.map((d) => ({
    date: d.date,
    "Net Position": d.swapNetOther,
  })), [data]);

  const mmNewData = useMemo(() => data.map((d) => ({
    date: d.date,
    "Net Position": d.mmNetOther,
  })), [data]);

  const specNewData = useMemo(() => data.map((d) => ({
    date: d.date,
    "Net Position": d.specNetOther,
  })), [data]);

  const otherNewData = useMemo(() => data.map((d) => ({
    date: d.date,
    "Net Position": d.otherNetOther,
  })), [data]);

  const nonReptNewData = useMemo(() => data.map((d) => ({
    date: d.date,
    "Net Position": d.nonReptNetOther,
  })), [data]);

  const prodNonReptNewData = useMemo(() => data.map((d) => ({
    date: d.date,
    "Net Position": d.producerNetOther + d.nonReptNetOther,
  })), [data]);

  // ============================================
  // NEW CROP DATA - % OI
  // ============================================
  const producerNewPctOIData = useMemo(() => data.map((d) => ({
    date: d.date,
    "% OI": d.openInterestAll ? (d.producerNetOther / d.openInterestAll) * 100 : 0,
  })), [data]);

  const swapNewPctOIData = useMemo(() => data.map((d) => ({
    date: d.date,
    "% OI": d.openInterestAll ? (d.swapNetOther / d.openInterestAll) * 100 : 0,
  })), [data]);

  const mmNewPctOIData = useMemo(() => data.map((d) => ({
    date: d.date,
    "% OI": d.openInterestAll ? (d.mmNetOther / d.openInterestAll) * 100 : 0,
  })), [data]);

  const specNewPctOIData = useMemo(() => data.map((d) => ({
    date: d.date,
    "% OI": d.openInterestAll ? (d.specNetOther / d.openInterestAll) * 100 : 0,
  })), [data]);

  const otherNewPctOIData = useMemo(() => data.map((d) => ({
    date: d.date,
    "% OI": d.openInterestAll ? (d.otherNetOther / d.openInterestAll) * 100 : 0,
  })), [data]);

  const nonReptNewPctOIData = useMemo(() => data.map((d) => ({
    date: d.date,
    "% OI": d.openInterestAll ? (d.nonReptNetOther / d.openInterestAll) * 100 : 0,
  })), [data]);

  const prodNonReptNewPctOIData = useMemo(() => data.map((d) => ({
    date: d.date,
    "% OI": d.openInterestAll ? ((d.producerNetOther + d.nonReptNetOther) / d.openInterestAll) * 100 : 0,
  })), [data]);

  // Line configs
  const netLine = [{ key: "Net Position", name: "Net Position", color: "#f97316" }];
  const pctOILine = [{ key: "% OI", name: "% OI", color: "#f97316" }];
  const pctTotalLine = [{ key: "% Total", name: "% Total", color: "#f97316" }];

  if (error) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      {!loading && data.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">{contractName}</h2>
              <p className="text-xs text-zinc-500">
                CFTC Commitments of Traders - {reportType === "tff" ? "Traders in Financial Futures" : "Disaggregated"} Report
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500">Position Date</p>
              <p className="text-sm text-white">
                {new Date(data[data.length - 1].date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Released</p>
              <p className="text-sm text-zinc-400">
                {(() => {
                  const posDate = new Date(data[data.length - 1].date);
                  const releaseDate = new Date(posDate);
                  releaseDate.setDate(releaseDate.getDate() + 3);
                  return releaseDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                })()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* AGGREGATE DATA SECTION */}
      {/* ========================================= */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white border-b border-zinc-700 pb-2">
          Aggregate Data
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <COTChart
            title={`${contractName} - Managed Money Net Position`}
            data={mmNetData}
            lines={netLine}
            alternateData={mmPctOIData}
            alternateLines={pctOILine}
            alternateLabel="% OI"
            loading={loading}
          />
          <COTChart
            title={`${contractName} - Spec Net Position`}
            data={specNetData}
            lines={netLine}
            alternateData={specPctOIData}
            alternateLines={pctOILine}
            alternateLabel="% OI"
            loading={loading}
          />
          <COTChart
            title={`${contractName} - Producer Net Position`}
            data={producerNetData}
            lines={netLine}
            alternateData={producerPctOIData}
            alternateLines={pctOILine}
            alternateLabel="% OI"
            loading={loading}
          />
          <COTChart
            title={`${contractName} - Swap Dealer Net Position`}
            data={swapNetData}
            lines={netLine}
            alternateData={swapPctOIData}
            alternateLines={pctOILine}
            alternateLabel="% OI"
            loading={loading}
          />
          <COTChart
            title={`${contractName} - Other Reportables Net Position`}
            data={otherNetData}
            lines={netLine}
            alternateData={otherPctOIData}
            alternateLines={pctOILine}
            alternateLabel="% OI"
            loading={loading}
          />
          <COTChart
            title={`${contractName} - Non-Reportables Net Position`}
            data={nonReptNetData}
            lines={netLine}
            alternateData={nonReptPctOIData}
            alternateLines={pctOILine}
            alternateLabel="% OI"
            loading={loading}
          />
          <COTChart
            title={`${contractName} - Producer + Non-Reportables Net Position`}
            data={prodNonReptNetData}
            lines={netLine}
            alternateData={prodNonReptPctOIData}
            alternateLines={pctOILine}
            alternateLabel="% OI"
            loading={loading}
          />
        </div>
      </div>

      {/* ========================================= */}
      {/* OLD CROP DATA SECTION - Only for agricultural commodities */}
      {/* ========================================= */}
      {isAgs && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-zinc-700 pb-2">
            Old Crop Data
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <COTChart
              title={`${contractName} - Managed Money Net Position, Old Crop`}
              data={mmOldData}
              lines={netLine}
              alternateData={mmOldPctTotalData}
              alternateLines={pctTotalLine}
              alternateLabel="% Total"
              loading={loading}
            />
            <COTChart
              title={`${contractName} - Spec Net Position, Old Crop`}
              data={specOldData}
              lines={netLine}
              alternateData={specOldPctTotalData}
              alternateLines={pctTotalLine}
              alternateLabel="% Total"
              loading={loading}
            />
            <COTChart
              title={`${contractName} - Producer Net Position, Old Crop`}
              data={producerOldData}
              lines={netLine}
              alternateData={producerOldPctTotalData}
              alternateLines={pctTotalLine}
              alternateLabel="% Total"
              loading={loading}
            />
            <COTChart
              title={`${contractName} - Swap Dealer Net Position, Old Crop`}
              data={swapOldData}
              lines={netLine}
              alternateData={swapOldPctTotalData}
              alternateLines={pctTotalLine}
              alternateLabel="% Total"
              loading={loading}
            />
            <COTChart
              title={`${contractName} - Other Reportables Net Position, Old Crop`}
              data={otherOldData}
              lines={netLine}
              alternateData={otherOldPctTotalData}
              alternateLines={pctTotalLine}
              alternateLabel="% Total"
              loading={loading}
            />
            <COTChart
              title={`${contractName} - Non-Reportables Net Position, Old Crop`}
              data={nonReptOldData}
              lines={netLine}
              alternateData={nonReptOldPctTotalData}
              alternateLines={pctTotalLine}
              alternateLabel="% Total"
              loading={loading}
            />
            <COTChart
              title={`${contractName} - Producer + Non-Reportables Net Position, Old Crop`}
              data={prodNonReptOldData}
              lines={netLine}
              alternateData={prodNonReptOldPctOIData}
              alternateLines={pctOILine}
              alternateLabel="% OI"
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* NEW CROP DATA SECTION - Only for agricultural commodities */}
      {/* ========================================= */}
      {isAgs && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-zinc-700 pb-2">
            New Crop Data
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <COTChart
              title={`${contractName} - Managed Money Net Position, New Crop`}
              data={mmNewData}
              lines={netLine}
              alternateData={mmNewPctOIData}
              alternateLines={pctOILine}
              alternateLabel="% OI"
              loading={loading}
            />
            <COTChart
              title={`${contractName} - Spec Net Position, New Crop`}
              data={specNewData}
              lines={netLine}
              alternateData={specNewPctOIData}
              alternateLines={pctOILine}
              alternateLabel="% OI"
              loading={loading}
            />
            <COTChart
              title={`${contractName} - Producer Net Position, New Crop`}
              data={producerNewData}
              lines={netLine}
              alternateData={producerNewPctOIData}
              alternateLines={pctOILine}
              alternateLabel="% OI"
              loading={loading}
            />
            <COTChart
              title={`${contractName} - Swap Dealer Net Position, New Crop`}
              data={swapNewData}
              lines={netLine}
              alternateData={swapNewPctOIData}
              alternateLines={pctOILine}
              alternateLabel="% OI"
              loading={loading}
            />
            <COTChart
              title={`${contractName} - Other Reportables Net Position, New Crop`}
              data={otherNewData}
              lines={netLine}
              alternateData={otherNewPctOIData}
              alternateLines={pctOILine}
              alternateLabel="% OI"
              loading={loading}
            />
            <COTChart
              title={`${contractName} - Non-Reportables Net Position, New Crop`}
              data={nonReptNewData}
              lines={netLine}
              alternateData={nonReptNewPctOIData}
              alternateLines={pctOILine}
              alternateLabel="% OI"
              loading={loading}
            />
            <COTChart
              title={`${contractName} - Producer + Non-Reportables Net Position, New Crop`}
              data={prodNonReptNewData}
              lines={netLine}
              alternateData={prodNonReptNewPctOIData}
              alternateLines={pctOILine}
              alternateLabel="% OI"
              loading={loading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
