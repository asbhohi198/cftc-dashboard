"use client";

import { useState } from "react";
import { MainCategory, TAB_CONFIG } from "@/lib/types";
import { TabNav } from "./TabNav";
import { CornTab } from "./CornTab";
import { AllWheatTab } from "./AllWheatTab";
import { AllOilseedsTab } from "./AllOilseedsTab";
import { AllGrainsTab } from "./AllGrainsTab";
import { AllGOTab } from "./AllGOTab";
import { BarChart3 } from "lucide-react";

// Map sub-tab IDs to contract IDs for the API
const SUB_TAB_TO_CONTRACT: Record<string, string> = {
  // Grains & Oilseeds (combined tabs handled separately)
  corn: "corn",
  "chicago-wheat": "chicago-wheat",
  "kansas-wheat": "kansas-wheat",
  "minneapolis-wheat": "minneapolis-wheat",
  soybeans: "soybeans",
  soymeal: "soymeal",
  soyoil: "soyoil",
  // Ags - Other
  oats: "oats",
  "rough-rice": "rough-rice",
  // Softs
  sugar: "sugar",
  cotton: "cotton",
  "arabica-coffee": "arabica-coffee",
  "ny-cocoa": "ny-cocoa",
  // Livestock
  "live-cattle": "live-cattle",
  "feeder-cattle": "feeder-cattle",
  "lean-hogs": "lean-hogs",
};

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<MainCategory>("home");
  const [activeSubTab, setActiveSubTab] = useState<string | null>(null);

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

  // Get contract ID for current sub-tab
  const contractId = activeSubTab ? SUB_TAB_TO_CONTRACT[activeSubTab] : null;

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

        {/* Home */}
        {activeTab === "home" && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-2">Home</h2>
              <p className="text-zinc-500 text-sm">
                CFTC Commitments of Traders overview coming soon
              </p>
            </div>
          </div>
        )}

        {/* Ags - Grains & Oilseeds */}
        {activeTab === "ags-grains" && activeSubTab === "all-us-wheat" && (
          <AllWheatTab />
        )}
        {activeTab === "ags-grains" && activeSubTab === "all-us-oilseeds" && (
          <AllOilseedsTab />
        )}
        {activeTab === "ags-grains" && activeSubTab === "all-us-grains" && (
          <AllGrainsTab />
        )}
        {activeTab === "ags-grains" && activeSubTab === "all-us-go" && (
          <AllGOTab />
        )}
        {activeTab === "ags-grains" && activeSubTab !== "all-us-wheat" && activeSubTab !== "all-us-oilseeds" && activeSubTab !== "all-us-grains" && activeSubTab !== "all-us-go" && contractId && (
          <CornTab contractId={contractId} />
        )}

        {/* Ags - Softs */}
        {activeTab === "ags-softs" && contractId && (
          <CornTab contractId={contractId} />
        )}

        {/* Ags - Livestock */}
        {activeTab === "ags-livestock" && contractId && (
          <CornTab contractId={contractId} />
        )}

        {/* Ags - Other */}
        {activeTab === "ags-other" && contractId && (
          <CornTab contractId={contractId} />
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
