"use client";

import { useState } from "react";
import { MainCategory, TAB_CONFIG, SubSubTab } from "@/lib/types";
import { TabNav } from "./TabNav";
import { CornTab } from "./CornTab";
import { SeasonalTab } from "./SeasonalTab";
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
import { COTChangesSummaryTab } from "./COTChangesSummaryTab";
import { AgsSummaryTab } from "./AgsSummaryTab";
import { COTYTDTab } from "./COTYTDTab";
import { COTTradersTab } from "./COTTradersTab";
import { COTSpreadsTab } from "./COTSpreadsTab";
import { COTRVsTab } from "./COTRVsTab";
import { CITIndexTab } from "./CITIndexTab";
import { CITRollTab } from "./CITRollTab";
import { COTPxWeightedTab } from "./COTPxWeightedTab";
import { COTVolWeightedTab } from "./COTVolWeightedTab";
import { EmailSubsTab } from "./EmailSubsTab";
import { COTvsPriceTab } from "./COTvsPriceTab";
import { BarChart3 } from "lucide-react";

// Map sub-tab IDs to contract IDs for the API
const SUB_TAB_TO_CONTRACT: Record<string, string> = {
  // Grains & Oilseeds (combined tabs handled separately)
  corn: "corn",
  "matif-corn": "matif-corn",
  "chicago-wheat": "chicago-wheat",
  "kansas-wheat": "kansas-wheat",
  "minneapolis-wheat": "minneapolis-wheat",
  "matif-wheat": "matif-wheat",
  soybeans: "soybeans",
  soymeal: "soymeal",
  soyoil: "soyoil",
  canola: "canola",
  "matif-rapeseed": "matif-rapeseed",
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

// Tabs that support Outright/Seasonal sub-subtabs
const SEASONAL_TABS: MainCategory[] = [
  "ags-grains",
  "ags-softs",
  "ags-livestock",
  "ags-other",
  "energy",
  "metals",
  "equities",
  "rates",
  "fx",
  "crypto",
];

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<MainCategory>("home");
  const [activeSubTab, setActiveSubTab] = useState<string | null>(null);
  const [activeSubSubTab, setActiveSubSubTab] = useState<SubSubTab>("outright");

  const handleTabChange = (tab: MainCategory, subTab?: string | null, subSubTab?: SubSubTab) => {
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
    // Set sub-subtab (default to outright for new tab selections)
    if (subSubTab !== undefined) {
      setActiveSubSubTab(subSubTab);
    } else if (SEASONAL_TABS.includes(tab)) {
      // Keep current sub-subtab when switching within seasonal tabs
      // Reset to outright when switching from non-seasonal tab
      if (!SEASONAL_TABS.includes(activeTab)) {
        setActiveSubSubTab("outright");
      }
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
            activeSubSubTab={activeSubSubTab}
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
          {SEASONAL_TABS.includes(activeTab) && activeSubTab && (
            <>
              <span className="mx-2">/</span>
              <span className={activeSubSubTab === "seasonal" ? "text-blue-400" : "text-zinc-400"}>
                {activeSubSubTab === "seasonal" ? "Seasonal" : "Outright"}
              </span>
            </>
          )}
        </div>

        {/* Home */}
        {activeTab === "home" && <HomeTab />}

        {/* Guide */}
        {activeTab === "guide" && <GuideTab />}

        {/* Summary */}
        {activeTab === "summary" && <SummaryTab />}

        {/* COT vs Price */}
        {activeTab === "cot-vs-price" && <COTvsPriceTab />}

        {/* COT Changes */}
        {activeTab === "cot-changes" && activeSubTab === "ags-summary" && (
          <AgsSummaryTab />
        )}
        {activeTab === "cot-changes" && activeSubTab === "changes-summary" && (
          <COTChangesSummaryTab />
        )}
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

        {/* COT YTD */}
        {activeTab === "cot-ytd" && activeSubTab === "ytd-ags" && (
          <COTYTDTab sector="ags" />
        )}
        {activeTab === "cot-ytd" && activeSubTab === "ytd-energy" && (
          <COTYTDTab sector="energy" />
        )}
        {activeTab === "cot-ytd" && activeSubTab === "ytd-metals" && (
          <COTYTDTab sector="metals" />
        )}
        {activeTab === "cot-ytd" && activeSubTab === "ytd-equities" && (
          <COTYTDTab sector="equities" />
        )}
        {activeTab === "cot-ytd" && activeSubTab === "ytd-rates" && (
          <COTYTDTab sector="rates" />
        )}
        {activeTab === "cot-ytd" && activeSubTab === "ytd-fx" && (
          <COTYTDTab sector="fx" />
        )}
        {activeTab === "cot-ytd" && activeSubTab === "ytd-crypto" && (
          <COTYTDTab sector="crypto" />
        )}

        {/* COT Traders */}
        {activeTab === "cot-traders" && activeSubTab === "traders-ags" && (
          <COTTradersTab sector="ags" />
        )}
        {activeTab === "cot-traders" && activeSubTab === "traders-energy" && (
          <COTTradersTab sector="energy" />
        )}
        {activeTab === "cot-traders" && activeSubTab === "traders-metals" && (
          <COTTradersTab sector="metals" />
        )}
        {activeTab === "cot-traders" && activeSubTab === "traders-equities" && (
          <COTTradersTab sector="equities" />
        )}
        {activeTab === "cot-traders" && activeSubTab === "traders-rates" && (
          <COTTradersTab sector="rates" />
        )}
        {activeTab === "cot-traders" && activeSubTab === "traders-fx" && (
          <COTTradersTab sector="fx" />
        )}
        {activeTab === "cot-traders" && activeSubTab === "traders-crypto" && (
          <COTTradersTab sector="crypto" />
        )}

        {/* COT vs Spreads */}
        {activeTab === "cot-spreads" && <COTSpreadsTab />}

        {/* COT RVs */}
        {activeTab === "cot-rvs" && activeSubTab === "rvs-ags" && (
          <COTRVsTab sector="ags" />
        )}
        {activeTab === "cot-rvs" && activeSubTab === "rvs-energy" && (
          <COTRVsTab sector="energy" />
        )}
        {activeTab === "cot-rvs" && activeSubTab === "rvs-metals" && (
          <COTRVsTab sector="metals" />
        )}
        {activeTab === "cot-rvs" && activeSubTab === "rvs-equities" && (
          <COTRVsTab sector="equities" />
        )}
        {activeTab === "cot-rvs" && activeSubTab === "rvs-rates" && (
          <COTRVsTab sector="rates" />
        )}
        {activeTab === "cot-rvs" && activeSubTab === "rvs-fx" && (
          <COTRVsTab sector="fx" />
        )}

        {/* CIT - Index */}
        {activeTab === "cit-index" && activeSubTab === "cit-ags" && (
          <CITIndexTab sector="ags" />
        )}
        {activeTab === "cit-index" && activeSubTab === "cit-roll" && (
          <CITRollTab />
        )}

        {/* COT - Px Weighted */}
        {activeTab === "cot-px-weighted" && activeSubTab === "px-ags" && (
          <COTPxWeightedTab sector="ags" />
        )}
        {activeTab === "cot-px-weighted" && activeSubTab === "px-softs" && (
          <COTPxWeightedTab sector="softs" />
        )}
        {activeTab === "cot-px-weighted" && activeSubTab === "px-livestock" && (
          <COTPxWeightedTab sector="livestock" />
        )}
        {activeTab === "cot-px-weighted" && activeSubTab === "px-energy" && (
          <COTPxWeightedTab sector="energy" />
        )}
        {activeTab === "cot-px-weighted" && activeSubTab === "px-metals" && (
          <COTPxWeightedTab sector="metals" />
        )}
        {activeTab === "cot-px-weighted" && activeSubTab === "px-equities" && (
          <COTPxWeightedTab sector="equities" />
        )}
        {activeTab === "cot-px-weighted" && activeSubTab === "px-rates" && (
          <COTPxWeightedTab sector="rates" />
        )}
        {activeTab === "cot-px-weighted" && activeSubTab === "px-fx" && (
          <COTPxWeightedTab sector="fx" />
        )}
        {activeTab === "cot-px-weighted" && activeSubTab === "px-crypto" && (
          <COTPxWeightedTab sector="crypto" />
        )}

        {/* COT - Vol Weighted */}
        {activeTab === "cot-vol-weighted" && activeSubTab === "vol-ags" && (
          <COTVolWeightedTab sector="ags" />
        )}
        {activeTab === "cot-vol-weighted" && activeSubTab === "vol-softs" && (
          <COTVolWeightedTab sector="softs" />
        )}
        {activeTab === "cot-vol-weighted" && activeSubTab === "vol-livestock" && (
          <COTVolWeightedTab sector="livestock" />
        )}
        {activeTab === "cot-vol-weighted" && activeSubTab === "vol-energy" && (
          <COTVolWeightedTab sector="energy" />
        )}
        {activeTab === "cot-vol-weighted" && activeSubTab === "vol-metals" && (
          <COTVolWeightedTab sector="metals" />
        )}
        {activeTab === "cot-vol-weighted" && activeSubTab === "vol-equities" && (
          <COTVolWeightedTab sector="equities" />
        )}
        {activeTab === "cot-vol-weighted" && activeSubTab === "vol-rates" && (
          <COTVolWeightedTab sector="rates" />
        )}
        {activeTab === "cot-vol-weighted" && activeSubTab === "vol-fx" && (
          <COTVolWeightedTab sector="fx" />
        )}
        {activeTab === "cot-vol-weighted" && activeSubTab === "vol-crypto" && (
          <COTVolWeightedTab sector="crypto" />
        )}

        {/* Ags - Grains & Oilseeds */}
        {activeTab === "ags-grains" && activeSubTab === "all-us-wheat" && activeSubSubTab === "outright" && (
          <AllWheatTab />
        )}
        {activeTab === "ags-grains" && activeSubTab === "all-us-wheat" && activeSubSubTab === "seasonal" && (
          <SeasonalTab contractId="all-us-wheat" />
        )}
        {activeTab === "ags-grains" && activeSubTab === "all-us-oilseeds" && activeSubSubTab === "outright" && (
          <AllOilseedsTab />
        )}
        {activeTab === "ags-grains" && activeSubTab === "all-us-oilseeds" && activeSubSubTab === "seasonal" && (
          <SeasonalTab contractId="all-us-oilseeds" />
        )}
        {activeTab === "ags-grains" && activeSubTab === "all-us-grains" && activeSubSubTab === "outright" && (
          <AllGrainsTab />
        )}
        {activeTab === "ags-grains" && activeSubTab === "all-us-grains" && activeSubSubTab === "seasonal" && (
          <SeasonalTab contractId="all-us-grains" />
        )}
        {activeTab === "ags-grains" && activeSubTab === "all-us-go" && activeSubSubTab === "outright" && (
          <AllGOTab />
        )}
        {activeTab === "ags-grains" && activeSubTab === "all-us-go" && activeSubSubTab === "seasonal" && (
          <SeasonalTab contractId="all-us-go" />
        )}
        {activeTab === "ags-grains" && activeSubTab === "oc-nc-mm-splits" && activeSubSubTab === "outright" && (
          <OCNCMMSplitsTab />
        )}
        {activeTab === "ags-grains" && activeSubTab === "oc-nc-mm-splits" && activeSubSubTab === "seasonal" && (
          <SeasonalTab contractId="oc-nc-mm-splits" />
        )}
        {activeTab === "ags-grains" && activeSubTab !== "all-us-wheat" && activeSubTab !== "all-us-oilseeds" && activeSubTab !== "all-us-grains" && activeSubTab !== "all-us-go" && activeSubTab !== "oc-nc-mm-splits" && contractId && activeSubSubTab === "outright" && (
          <CornTab contractId={contractId} />
        )}
        {activeTab === "ags-grains" && activeSubTab !== "all-us-wheat" && activeSubTab !== "all-us-oilseeds" && activeSubTab !== "all-us-grains" && activeSubTab !== "all-us-go" && activeSubTab !== "oc-nc-mm-splits" && contractId && activeSubSubTab === "seasonal" && (
          <SeasonalTab contractId={contractId} />
        )}

        {/* Ags - Softs */}
        {activeTab === "ags-softs" && activeSubTab === "all-us-softs" && activeSubSubTab === "outright" && (
          <AllSoftsTab />
        )}
        {activeTab === "ags-softs" && activeSubTab === "all-us-softs" && activeSubSubTab === "seasonal" && (
          <SeasonalTab contractId="all-us-softs" />
        )}
        {activeTab === "ags-softs" && activeSubTab !== "all-us-softs" && contractId && activeSubSubTab === "outright" && (
          <CornTab contractId={contractId} />
        )}
        {activeTab === "ags-softs" && activeSubTab !== "all-us-softs" && contractId && activeSubSubTab === "seasonal" && (
          <SeasonalTab contractId={contractId} />
        )}

        {/* Ags - Livestock */}
        {activeTab === "ags-livestock" && activeSubTab === "all-livestock" && activeSubSubTab === "outright" && (
          <AllLivestockTab />
        )}
        {activeTab === "ags-livestock" && activeSubTab === "all-livestock" && activeSubSubTab === "seasonal" && (
          <SeasonalTab contractId="all-livestock" />
        )}
        {activeTab === "ags-livestock" && activeSubTab !== "all-livestock" && contractId && activeSubSubTab === "outright" && (
          <CornTab contractId={contractId} />
        )}
        {activeTab === "ags-livestock" && activeSubTab !== "all-livestock" && contractId && activeSubSubTab === "seasonal" && (
          <SeasonalTab contractId={contractId} />
        )}

        {/* Ags - Other */}
        {activeTab === "ags-other" && contractId && activeSubSubTab === "outright" && (
          <CornTab contractId={contractId} />
        )}
        {activeTab === "ags-other" && contractId && activeSubSubTab === "seasonal" && (
          <SeasonalTab contractId={contractId} />
        )}

        {/* Energy */}
        {activeTab === "energy" && contractId && activeSubSubTab === "outright" && (
          <CornTab contractId={contractId} />
        )}
        {activeTab === "energy" && contractId && activeSubSubTab === "seasonal" && (
          <SeasonalTab contractId={contractId} />
        )}

        {/* Metals */}
        {activeTab === "metals" && contractId && activeSubSubTab === "outright" && (
          <CornTab contractId={contractId} />
        )}
        {activeTab === "metals" && contractId && activeSubSubTab === "seasonal" && (
          <SeasonalTab contractId={contractId} />
        )}

        {/* Equities */}
        {activeTab === "equities" && contractId && activeSubSubTab === "outright" && (
          <CornTab contractId={contractId} />
        )}
        {activeTab === "equities" && contractId && activeSubSubTab === "seasonal" && (
          <SeasonalTab contractId={contractId} />
        )}

        {/* Rates */}
        {activeTab === "rates" && contractId && activeSubSubTab === "outright" && (
          <CornTab contractId={contractId} />
        )}
        {activeTab === "rates" && contractId && activeSubSubTab === "seasonal" && (
          <SeasonalTab contractId={contractId} />
        )}

        {/* FX */}
        {activeTab === "fx" && contractId && activeSubSubTab === "outright" && (
          <CornTab contractId={contractId} />
        )}
        {activeTab === "fx" && contractId && activeSubSubTab === "seasonal" && (
          <SeasonalTab contractId={contractId} />
        )}

        {/* Crypto */}
        {activeTab === "crypto" && contractId && activeSubSubTab === "outright" && (
          <CornTab contractId={contractId} />
        )}
        {activeTab === "crypto" && contractId && activeSubSubTab === "seasonal" && (
          <SeasonalTab contractId={contractId} />
        )}

        {/* Email Subscriptions */}
        {activeTab === "email-subs" && <EmailSubsTab />}
      </main>
    </div>
  );
}
