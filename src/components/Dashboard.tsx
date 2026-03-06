"use client";

import { useState } from "react";
import { MainCategory, TAB_CONFIG } from "@/lib/types";
import { TabNav } from "./TabNav";
import { BarChart3 } from "lucide-react";

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<MainCategory>("ags-grains");
  const [activeSubTab, setActiveSubTab] = useState<string | null>("corn");

  const handleTabChange = (tab: MainCategory, subTab?: string | null) => {
    setActiveTab(tab);
    // If tab has sub-tabs, set the first one as default, otherwise null
    const tabConfig = TAB_CONFIG.find((t) => t.id === tab);
    if (subTab !== undefined) {
      setActiveSubTab(subTab);
    } else if (tabConfig?.subTabs && tabConfig.subTabs.length > 0) {
      setActiveSubTab(tabConfig.subTabs[0].id);
    } else {
      setActiveSubTab(null);
    }
  };

  // Get current tab and sub-tab labels for display
  const currentTabConfig = TAB_CONFIG.find((t) => t.id === activeTab);
  const currentSubTabLabel = currentTabConfig?.subTabs?.find(
    (st) => st.id === activeSubTab
  )?.label;

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
          <TabNav
            activeTab={activeTab}
            activeSubTab={activeSubTab}
            onTabChange={handleTabChange}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4">
        {/* Breadcrumb showing current selection */}
        <div className="mb-4 text-sm text-zinc-500">
          <span className="text-zinc-400">{currentTabConfig?.label}</span>
          {currentSubTabLabel && (
            <>
              <span className="mx-2">/</span>
              <span className="text-orange-400">{currentSubTabLabel}</span>
            </>
          )}
        </div>

        {/* Ags - Grains & Oilseeds */}
        {activeTab === "ags-grains" && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-2">
                {currentSubTabLabel || "Grains & Oilseeds"}
              </h2>
              <p className="text-zinc-500 text-sm">
                COT positioning data coming soon
              </p>
            </div>
          </div>
        )}

        {/* Ags - Softs */}
        {activeTab === "ags-softs" && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-2">
                {currentSubTabLabel || "Softs"}
              </h2>
              <p className="text-zinc-500 text-sm">
                COT positioning data coming soon
              </p>
            </div>
          </div>
        )}

        {/* Ags - Livestock */}
        {activeTab === "ags-livestock" && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-2">
                {currentSubTabLabel || "Livestock"}
              </h2>
              <p className="text-zinc-500 text-sm">
                COT positioning data coming soon
              </p>
            </div>
          </div>
        )}

        {/* Ags - Other */}
        {activeTab === "ags-other" && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-2">
                Ags - Other
              </h2>
              <p className="text-zinc-500 text-sm">
                COT positioning data coming soon
              </p>
            </div>
          </div>
        )}

        {/* Energy */}
        {activeTab === "energy" && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-2">Energy</h2>
              <p className="text-zinc-500 text-sm">
                COT positioning data coming soon
              </p>
            </div>
          </div>
        )}

        {/* Equities */}
        {activeTab === "equities" && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-2">Equities</h2>
              <p className="text-zinc-500 text-sm">
                COT positioning data coming soon
              </p>
            </div>
          </div>
        )}

        {/* Rates */}
        {activeTab === "rates" && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-2">Rates</h2>
              <p className="text-zinc-500 text-sm">
                COT positioning data coming soon
              </p>
            </div>
          </div>
        )}

        {/* FX */}
        {activeTab === "fx" && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-2">FX</h2>
              <p className="text-zinc-500 text-sm">
                COT positioning data coming soon
              </p>
            </div>
          </div>
        )}

        {/* Crypto */}
        {activeTab === "crypto" && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-2">Crypto</h2>
              <p className="text-zinc-500 text-sm">
                COT positioning data coming soon
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
