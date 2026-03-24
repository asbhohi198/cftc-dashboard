"use client";

import { useState } from "react";
import { MainCategory, TAB_CONFIG } from "@/lib/types";
import { TabNav } from "./TabNav";
import { CornTab } from "./CornTab";
import { AllWheatTab } from "./AllWheatTab";
import { AllOilseedsTab } from "./AllOilseedsTab";
import { AllGrainsTab } from "./AllGrainsTab";
import { AllGOTab } from "./AllGOTab";
import { OCNCMMSplitsTab } from "./OCNCMMSplitsTab";
import { AllSoftsTab } from "./AllSoftsTab";
import { AllLivestockTab } from "./AllLivestockTab";
import { HomeTab } from "./HomeTab";
import { GuideTab } from "./GuideTab";
import { SummaryTab } from "./SummaryTab";
import { COTChangesTab } from "./COTChangesTab";
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
  "orange-juice": "orange-juice",
  "lumber": "lumber",
  "milk": "milk",
  // Softs
  sugar: "sugar",
  cotton: "cotton",
  "arabica-coffee": "arabica-coffee",
  "ny-cocoa": "ny-cocoa",
  // Livestock
  "live-cattle": "live-cattle",
  "feeder-cattle": "feeder-cattle",
  "lean-hogs": "lean-hogs",
  // Energy
  "wti-crude": "wti-crude",
  "brent-crude": "brent-crude",
  "natural-gas": "natural-gas",
  "rbob-gasoline": "rbob-gasoline",
  "heating-oil": "heating-oil",
  // Metals
  "gold": "gold",
  "silver": "silver",
  "copper": "copper",
  "platinum": "platinum",
  "palladium": "palladium",
  // Equities
  "sp500": "sp500",
  "nasdaq100": "nasdaq100",
  "dow": "dow",
  "russell2000": "russell2000",
  "vix": "vix",
  // Rates
  "10y-note": "10y-note",
  "2y-note": "2y-note",
  "5y-note": "5y-note",
  "30y-bond": "30y-bond",
  "fed-funds": "fed-funds",
  "sofr": "sofr",
  // FX
  "eurusd": "eurusd",
  "usdjpy": "usdjpy",
  "gbpusd": "gbpusd",
  "usdcad": "usdcad",
  "audusd": "audusd",
  "usdchf": "usdchf",
  "usdmxn": "usdmxn",
  "nzdusd": "nzdusd",
  "usdzar": "usdzar",
  "usdbrl": "usdbrl",
  "dxy": "dxy",
  // Crypto
  "bitcoin": "bitcoin",
  "ethereum": "ethereum",
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
      <header className="sticky top-0 z-50 bg-zinc-950 border-b border-zinc-800 px-4 py-4">
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
      <main className={`mx-auto p-4 ${activeTab === "summary" ? "max-w-[1800px]" : "max-w-7xl"}`}>
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
        {activeTab === "home" && <HomeTab />}

        {/* Guide */}
        {activeTab === "guide" && <GuideTab />}

        {/* Summary */}
        {activeTab === "summary" && <SummaryTab />}

        {/* COT Changes */}
        {activeTab === "cot-changes" && activeSubTab === "changes-ags-grains" && (
          <COTChangesTab sector="ags-grains" />
        )}
        {activeTab === "cot-changes" && activeSubTab === "changes-ags-softs" && (
          <COTChangesTab sector="ags-softs" />
        )}
        {activeTab === "cot-changes" && activeSubTab === "changes-ags-livestock" && (
          <COTChangesTab sector="ags-livestock" />
        )}
        {activeTab === "cot-changes" && activeSubTab === "changes-ags-other" && (
          <COTChangesTab sector="ags-other" />
        )}
        {activeTab === "cot-changes" && activeSubTab === "changes-energy" && (
          <COTChangesTab sector="energy" />
        )}
        {activeTab === "cot-changes" && activeSubTab === "changes-metals" && (
          <COTChangesTab sector="metals" />
        )}
        {activeTab === "cot-changes" && activeSubTab === "changes-equities" && (
          <COTChangesTab sector="equities" />
        )}
        {activeTab === "cot-changes" && activeSubTab === "changes-rates" && (
          <COTChangesTab sector="rates" />
        )}
        {activeTab === "cot-changes" && activeSubTab === "changes-fx" && (
          <COTChangesTab sector="fx" />
        )}
        {activeTab === "cot-changes" && activeSubTab === "changes-crypto" && (
          <COTChangesTab sector="crypto" />
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
        {activeTab === "ags-grains" && activeSubTab === "oc-nc-mm-splits" && (
          <OCNCMMSplitsTab />
        )}
        {activeTab === "ags-grains" && activeSubTab !== "all-us-wheat" && activeSubTab !== "all-us-oilseeds" && activeSubTab !== "all-us-grains" && activeSubTab !== "all-us-go" && activeSubTab !== "oc-nc-mm-splits" && contractId && (
          <CornTab contractId={contractId} />
        )}

        {/* Ags - Softs */}
        {activeTab === "ags-softs" && activeSubTab === "all-us-softs" && (
          <AllSoftsTab />
        )}
        {activeTab === "ags-softs" && activeSubTab !== "all-us-softs" && contractId && (
          <CornTab contractId={contractId} />
        )}

        {/* Ags - Livestock */}
        {activeTab === "ags-livestock" && activeSubTab === "all-livestock" && (
          <AllLivestockTab />
        )}
        {activeTab === "ags-livestock" && activeSubTab !== "all-livestock" && contractId && (
          <CornTab contractId={contractId} />
        )}

        {/* Ags - Other */}
        {activeTab === "ags-other" && contractId && (
          <CornTab contractId={contractId} />
        )}

        {/* Energy */}
        {activeTab === "energy" && contractId && (
          <CornTab contractId={contractId} />
        )}

        {/* Metals */}
        {activeTab === "metals" && contractId && (
          <CornTab contractId={contractId} />
        )}

        {/* Equities */}
        {activeTab === "equities" && contractId && (
          <CornTab contractId={contractId} />
        )}

        {/* Rates */}
        {activeTab === "rates" && contractId && (
          <CornTab contractId={contractId} />
        )}

        {/* FX */}
        {activeTab === "fx" && contractId && (
          <CornTab contractId={contractId} />
        )}

        {/* Crypto */}
        {activeTab === "crypto" && contractId && (
          <CornTab contractId={contractId} />
        )}
      </main>
    </div>
  );
}
