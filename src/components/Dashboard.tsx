"use client";

import { useState } from "react";
import { Category } from "@/lib/types";
import { TabNav } from "./TabNav";
import { BarChart3 } from "lucide-react";

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<Category>("home");

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 px-4 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-orange-500" /> CFTC Dashboard
            </h1>
          </div>
          <TabNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4">
        {activeTab === "home" && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                CFTC Commitments of Traders Report
              </h2>
              <p className="text-zinc-400 mb-4">
                This dashboard displays data from the weekly CFTC Commitments of Traders (COT) report,
                which shows the aggregate positions of different types of traders in U.S. futures markets.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-zinc-400 mb-1">Commercial Traders</h3>
                  <p className="text-xs text-zinc-500">
                    Producers, merchants, processors - typically hedging
                  </p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-zinc-400 mb-1">Non-Commercial Traders</h3>
                  <p className="text-xs text-zinc-500">
                    Large speculators - hedge funds, CTAs, money managers
                  </p>
                </div>
                <div className="bg-zinc-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-zinc-400 mb-1">Non-Reportable</h3>
                  <p className="text-xs text-zinc-500">
                    Small traders below reporting thresholds
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Coming Soon</h3>
              <ul className="text-zinc-400 space-y-2 text-sm">
                <li>- Net positioning charts for major futures contracts</li>
                <li>- Commercial vs Non-Commercial positioning analysis</li>
                <li>- Extreme positioning signals (percentile rankings)</li>
                <li>- Open interest trends</li>
                <li>- Historical positioning comparisons</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "futures" && (
          <div className="text-center py-12">
            <p className="text-zinc-500">Futures positioning data - coming soon</p>
          </div>
        )}

        {activeTab === "options" && (
          <div className="text-center py-12">
            <p className="text-zinc-500">Options positioning data - coming soon</p>
          </div>
        )}

        {activeTab === "spreads" && (
          <div className="text-center py-12">
            <p className="text-zinc-500">Spread analysis - coming soon</p>
          </div>
        )}

        {activeTab === "analysis" && (
          <div className="text-center py-12">
            <p className="text-zinc-500">Position analysis tools - coming soon</p>
          </div>
        )}
      </main>
    </div>
  );
}
