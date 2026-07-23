"use client";

import { useEffect, useState, useMemo } from "react";
import { SeasonalCOTChart, YearRange } from "./SeasonalCOTChart";
import { COTRecord } from "@/lib/cftc";

interface SeasonalTabProps {
  contractId?: string;
}

export function SeasonalTab({ contractId = "corn" }: SeasonalTabProps) {
  const [data, setData] = useState<COTRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contractName, setContractName] = useState("Contract");
  const [isAgs, setIsAgs] = useState(true);
  const [reportType, setReportType] = useState<"disagg" | "tff" | "matif">("disagg");
  const [yearRange, setYearRange] = useState<YearRange>("all");

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
  // AGGREGATE DATA
  // ============================================
  const mmNetData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.mmNetAll,
  })), [data]);

  const specNetData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.specNetAll,
  })), [data]);

  const producerNetData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.producerNetAll,
  })), [data]);

  const swapNetData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.swapNetAll,
  })), [data]);

  const otherNetData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.otherNetAll,
  })), [data]);

  const nonReptNetData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.nonReptNetAll,
  })), [data]);

  const prodNonReptNetData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.producerNetAll + d.nonReptNetAll,
  })), [data]);

  // % OI versions
  const mmPctOIData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.openInterestAll ? (d.mmNetAll / d.openInterestAll) * 100 : 0,
  })), [data]);

  const specPctOIData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.openInterestAll ? (d.specNetAll / d.openInterestAll) * 100 : 0,
  })), [data]);

  const producerPctOIData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.openInterestAll ? (d.producerNetAll / d.openInterestAll) * 100 : 0,
  })), [data]);

  const swapPctOIData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.openInterestAll ? (d.swapNetAll / d.openInterestAll) * 100 : 0,
  })), [data]);

  const otherPctOIData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.openInterestAll ? (d.otherNetAll / d.openInterestAll) * 100 : 0,
  })), [data]);

  const nonReptPctOIData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.openInterestAll ? (d.nonReptNetAll / d.openInterestAll) * 100 : 0,
  })), [data]);

  const prodNonReptPctOIData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.openInterestAll ? ((d.producerNetAll + d.nonReptNetAll) / d.openInterestAll) * 100 : 0,
  })), [data]);

  // ============================================
  // OLD CROP DATA
  // ============================================
  const mmOldData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.mmNetOld,
  })), [data]);

  const specOldData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.specNetOld,
  })), [data]);

  const producerOldData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.producerNetOld,
  })), [data]);

  const swapOldData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.swapNetOld,
  })), [data]);

  const otherOldData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.otherNetOld,
  })), [data]);

  const nonReptOldData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.nonReptNetOld,
  })), [data]);

  const prodNonReptOldData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.producerNetOld + d.nonReptNetOld,
  })), [data]);

  // ============================================
  // NEW CROP DATA
  // ============================================
  const mmNewData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.mmNetOther,
  })), [data]);

  const specNewData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.specNetOther,
  })), [data]);

  const producerNewData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.producerNetOther,
  })), [data]);

  const swapNewData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.swapNetOther,
  })), [data]);

  const otherNewData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.otherNetOther,
  })), [data]);

  const nonReptNewData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.nonReptNetOther,
  })), [data]);

  const prodNonReptNewData = useMemo(() => data.map((d) => ({
    date: d.date,
    value: d.producerNetOther + d.nonReptNetOther,
  })), [data]);

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
      {!loading && data.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">{contractName} - Seasonal View</h2>
              <p className="text-xs text-zinc-500">
                Day-of-year overlay comparing multiple years
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Year Range Toggle */}
              <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
                {(["5", "10", "15", "all"] as YearRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => setYearRange(range)}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      yearRange === range
                        ? "bg-orange-500 text-white"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-700"
                    }`}
                  >
                    {range === "all" ? "All" : `${range}Y`}
                  </button>
                ))}
              </div>
              {/* Legend */}
              <div className="flex items-center gap-3 text-xs text-zinc-500 border-l border-zinc-700 pl-4">
                <div className="flex items-center gap-1">
                  <div className="w-6 h-1 bg-white rounded"></div>
                  <span className="text-white font-medium">{new Date().getFullYear()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-0.5 bg-zinc-500 rounded"></div>
                  <span>Historical</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* AGGREGATE DATA SECTION */}
      {/* ========================================= */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white border-b border-zinc-700 pb-2">
          Aggregate Data - Net Positions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <SeasonalCOTChart
            title={`MM Net Position`}
            data={mmNetData}
            yearRange={yearRange}
            loading={loading}
          />
          <SeasonalCOTChart
            title={`Spec Net Position`}
            data={specNetData}
            yearRange={yearRange}
            loading={loading}
          />
          <SeasonalCOTChart
            title={`Producer Net Position`}
            data={producerNetData}
            yearRange={yearRange}
            loading={loading}
          />
          <SeasonalCOTChart
            title={`Swap Dealer Net Position`}
            data={swapNetData}
            yearRange={yearRange}
            loading={loading}
          />
          <SeasonalCOTChart
            title={`Other Reportables Net Position`}
            data={otherNetData}
            yearRange={yearRange}
            loading={loading}
          />
          {reportType !== "matif" && (
            <>
              <SeasonalCOTChart
                title={`Non-Reportables Net Position`}
                data={nonReptNetData}
                yearRange={yearRange}
                loading={loading}
              />
              <SeasonalCOTChart
                title={`Producer + Non-Rept Net Position`}
                data={prodNonReptNetData}
                yearRange={yearRange}
                loading={loading}
              />
            </>
          )}
        </div>

        <h3 className="text-lg font-semibold text-white border-b border-zinc-700 pb-2 mt-8">
          Aggregate Data - % of Open Interest
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <SeasonalCOTChart
            title={`MM Net % OI`}
            data={mmPctOIData}
            yearRange={yearRange}
            loading={loading}
          />
          <SeasonalCOTChart
            title={`Spec Net % OI`}
            data={specPctOIData}
            yearRange={yearRange}
            loading={loading}
          />
          <SeasonalCOTChart
            title={`Producer Net % OI`}
            data={producerPctOIData}
            yearRange={yearRange}
            loading={loading}
          />
          <SeasonalCOTChart
            title={`Swap Dealer Net % OI`}
            data={swapPctOIData}
            yearRange={yearRange}
            loading={loading}
          />
          <SeasonalCOTChart
            title={`Other Reportables Net % OI`}
            data={otherPctOIData}
            yearRange={yearRange}
            loading={loading}
          />
          {reportType !== "matif" && (
            <>
              <SeasonalCOTChart
                title={`Non-Reportables Net % OI`}
                data={nonReptPctOIData}
                yearRange={yearRange}
                loading={loading}
              />
              <SeasonalCOTChart
                title={`Producer + Non-Rept % OI`}
                data={prodNonReptPctOIData}
                yearRange={yearRange}
                loading={loading}
              />
            </>
          )}
        </div>
      </div>

      {/* ========================================= */}
      {/* OLD CROP DATA SECTION */}
      {/* ========================================= */}
      {isAgs && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-zinc-700 pb-2">
            Old Crop Data - Net Positions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <SeasonalCOTChart
              title={`MM Net Position (Old Crop)`}
              data={mmOldData}
              yearRange={yearRange}
              loading={loading}
            />
            <SeasonalCOTChart
              title={`Spec Net Position (Old Crop)`}
              data={specOldData}
              yearRange={yearRange}
              loading={loading}
            />
            <SeasonalCOTChart
              title={`Producer Net Position (Old Crop)`}
              data={producerOldData}
              yearRange={yearRange}
              loading={loading}
            />
            <SeasonalCOTChart
              title={`Swap Dealer Net Position (Old Crop)`}
              data={swapOldData}
              yearRange={yearRange}
              loading={loading}
            />
            <SeasonalCOTChart
              title={`Other Reportables (Old Crop)`}
              data={otherOldData}
              yearRange={yearRange}
              loading={loading}
            />
            <SeasonalCOTChart
              title={`Non-Reportables (Old Crop)`}
              data={nonReptOldData}
              yearRange={yearRange}
              loading={loading}
            />
            <SeasonalCOTChart
              title={`Producer + Non-Rept (Old Crop)`}
              data={prodNonReptOldData}
              yearRange={yearRange}
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* NEW CROP DATA SECTION */}
      {/* ========================================= */}
      {isAgs && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-zinc-700 pb-2">
            New Crop Data - Net Positions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <SeasonalCOTChart
              title={`MM Net Position (New Crop)`}
              data={mmNewData}
              yearRange={yearRange}
              loading={loading}
            />
            <SeasonalCOTChart
              title={`Spec Net Position (New Crop)`}
              data={specNewData}
              yearRange={yearRange}
              loading={loading}
            />
            <SeasonalCOTChart
              title={`Producer Net Position (New Crop)`}
              data={producerNewData}
              yearRange={yearRange}
              loading={loading}
            />
            <SeasonalCOTChart
              title={`Swap Dealer Net Position (New Crop)`}
              data={swapNewData}
              yearRange={yearRange}
              loading={loading}
            />
            <SeasonalCOTChart
              title={`Other Reportables (New Crop)`}
              data={otherNewData}
              yearRange={yearRange}
              loading={loading}
            />
            <SeasonalCOTChart
              title={`Non-Reportables (New Crop)`}
              data={nonReptNewData}
              yearRange={yearRange}
              loading={loading}
            />
            <SeasonalCOTChart
              title={`Producer + Non-Rept (New Crop)`}
              data={prodNonReptNewData}
              yearRange={yearRange}
              loading={loading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
