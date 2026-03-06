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

  // Transform data for charts
  const mmData = useMemo(
    () =>
      data.map((d) => ({
        date: d.date,
        "Net Long": d.mmNetAll,
        Long: d.mmLongAll,
        Short: -d.mmShortAll,
      })),
    [data]
  );

  const mmOldNewData = useMemo(
    () =>
      data.map((d) => ({
        date: d.date,
        "Old Crop": d.mmNetOld,
        "New Crop": d.mmNetOther,
      })),
    [data]
  );

  const specData = useMemo(
    () =>
      data.map((d) => ({
        date: d.date,
        "Spec Net": d.specNetAll,
        "MM Net": d.mmNetAll,
        "Other Net": d.otherNetAll,
      })),
    [data]
  );

  const producerData = useMemo(
    () =>
      data.map((d) => ({
        date: d.date,
        "Net Short": d.producerNetAll,
        Long: d.producerLongAll,
        Short: -d.producerShortAll,
      })),
    [data]
  );

  const producerOldNewData = useMemo(
    () =>
      data.map((d) => ({
        date: d.date,
        "Old Crop": d.producerNetOld,
        "New Crop": d.producerNetOther,
      })),
    [data]
  );

  const swapData = useMemo(
    () =>
      data.map((d) => ({
        date: d.date,
        "Net Position": d.swapNetAll,
        Spread: d.swapSpreadAll,
      })),
    [data]
  );

  const nonReptData = useMemo(
    () =>
      data.map((d) => ({
        date: d.date,
        "Net Position": d.nonReptNetAll,
      })),
    [data]
  );

  const openInterestData = useMemo(
    () =>
      data.map((d) => ({
        date: d.date,
        "Total OI": d.openInterestAll,
        "Old Crop": d.openInterestOld,
        "New Crop": d.openInterestOther,
      })),
    [data]
  );

  if (error) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      {!loading && data.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">{contractName}</h2>
              <p className="text-xs text-zinc-500">
                CFTC Commitments of Traders - Disaggregated Report
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500">Latest Report</p>
              <p className="text-sm text-white">
                {new Date(data[data.length - 1].date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Managed Money Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
          Managed Money (Specs)
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <COTChart
            title="Managed Money Net Position"
            data={mmData}
            lines={[
              { key: "Net Long", name: "Net Position", color: "#f97316" },
            ]}
            loading={loading}
          />
          <COTChart
            title="Managed Money: Old Crop vs New Crop"
            data={mmOldNewData}
            lines={[
              { key: "Old Crop", name: "Old Crop", color: "#22c55e" },
              { key: "New Crop", name: "New Crop", color: "#3b82f6" },
            ]}
            loading={loading}
          />
        </div>
      </div>

      {/* Speculators Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
          Speculators (MM + Other Reportables)
        </h3>
        <COTChart
          title="Speculator Net Positioning"
          data={specData}
          lines={[
            { key: "Spec Net", name: "Total Spec", color: "#f97316" },
            { key: "MM Net", name: "Managed Money", color: "#22c55e" },
            { key: "Other Net", name: "Other Reportables", color: "#8b5cf6" },
          ]}
          loading={loading}
        />
      </div>

      {/* Producer/Commercial Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
          Producer/Merchant (Commercials)
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <COTChart
            title="Producer Net Position"
            data={producerData}
            lines={[
              { key: "Net Short", name: "Net Position", color: "#ef4444" },
            ]}
            loading={loading}
          />
          <COTChart
            title="Producer: Old Crop vs New Crop"
            data={producerOldNewData}
            lines={[
              { key: "Old Crop", name: "Old Crop", color: "#22c55e" },
              { key: "New Crop", name: "New Crop", color: "#3b82f6" },
            ]}
            loading={loading}
          />
        </div>
      </div>

      {/* Swap Dealers Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
          Swap Dealers
        </h3>
        <COTChart
          title="Swap Dealer Positioning"
          data={swapData}
          lines={[
            { key: "Net Position", name: "Net Position", color: "#06b6d4" },
            { key: "Spread", name: "Spread", color: "#a855f7" },
          ]}
          loading={loading}
        />
      </div>

      {/* Non-Reportables Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
          Non-Reportables (Small Traders)
        </h3>
        <COTChart
          title="Non-Reportable Net Position"
          data={nonReptData}
          lines={[
            { key: "Net Position", name: "Net Position", color: "#fbbf24" },
          ]}
          loading={loading}
        />
      </div>

      {/* Open Interest Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
          Open Interest
        </h3>
        <COTChart
          title="Open Interest"
          data={openInterestData}
          lines={[
            { key: "Total OI", name: "Total", color: "#ffffff" },
            { key: "Old Crop", name: "Old Crop", color: "#22c55e" },
            { key: "New Crop", name: "New Crop", color: "#3b82f6" },
          ]}
          loading={loading}
          showZeroLine={false}
        />
      </div>
    </div>
  );
}
