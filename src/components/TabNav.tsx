"use client";

import { useState, useRef, useEffect } from "react";
import { MainCategory, TAB_CONFIG, SubSubTab } from "@/lib/types";
import { ChevronDown } from "lucide-react";

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
  "cot-rvs",
  "cit-index",
  "cot-px-weighted",
  "cot-vol-weighted",
];

interface TabNavProps {
  activeTab: MainCategory;
  activeSubTab: string | null;
  activeSubSubTab: SubSubTab;
  onTabChange: (tab: MainCategory, subTab?: string | null, subSubTab?: SubSubTab) => void;
}

export function TabNav({ activeTab, activeSubTab, activeSubSubTab, onTabChange }: TabNavProps) {
  const [openDropdown, setOpenDropdown] = useState<MainCategory | null>(null);
  const [hoveredSubTab, setHoveredSubTab] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTabClick = (tab: MainCategory, hasSubTabs: boolean) => {
    if (hasSubTabs) {
      // Toggle dropdown
      setOpenDropdown(openDropdown === tab ? null : tab);
    } else {
      // No sub-tabs, just select the tab
      onTabChange(tab, null);
      setOpenDropdown(null);
    }
  };

  const handleSubTabClick = (tab: MainCategory, subTabId: string, subSubTab?: SubSubTab) => {
    onTabChange(tab, subTabId, subSubTab || "outright");
    setOpenDropdown(null);
    setHoveredSubTab(null);
  };

  const handleSubSubTabClick = (tab: MainCategory, subTabId: string, subSubTab: SubSubTab) => {
    onTabChange(tab, subTabId, subSubTab);
    setOpenDropdown(null);
    setHoveredSubTab(null);
  };

  const hasSeasonalSupport = (tabId: MainCategory) => SEASONAL_TABS.includes(tabId);

  return (
    <nav className="flex flex-wrap gap-1" ref={dropdownRef}>
      {TAB_CONFIG.map((tab) => {
        const isActive = activeTab === tab.id;
        const hasSubTabs = tab.subTabs && tab.subTabs.length > 0;
        const isDropdownOpen = openDropdown === tab.id;

        return (
          <div key={tab.id} className="relative">
            <button
              onClick={() => handleTabClick(tab.id, !!hasSubTabs)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                isActive
                  ? "bg-orange-500 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              {tab.label}
              {hasSubTabs && (
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              )}
            </button>

            {/* Dropdown menu */}
            {hasSubTabs && isDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg z-50 min-w-[160px]">
                {tab.subTabs!.map((subTab) => {
                  const showSeasonalFlyout = hasSeasonalSupport(tab.id);
                  const isSubTabHovered = hoveredSubTab === subTab.id;
                  const isActiveSubTab = activeTab === tab.id && activeSubTab === subTab.id;

                  return (
                    <div
                      key={subTab.id}
                      className="relative"
                      onMouseEnter={() => showSeasonalFlyout && setHoveredSubTab(subTab.id)}
                      onMouseLeave={() => setHoveredSubTab(null)}
                    >
                      <button
                        onClick={() => handleSubTabClick(tab.id, subTab.id)}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                          isActiveSubTab
                            ? "bg-orange-500/20 text-orange-400"
                            : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                        }`}
                      >
                        <span>{subTab.label}</span>
                        {showSeasonalFlyout && (
                          <ChevronDown className="w-3 h-3 -rotate-90" />
                        )}
                      </button>

                      {/* Sub-subtab flyout (Outright / Seasonal) */}
                      {showSeasonalFlyout && isSubTabHovered && (
                        <div className="absolute left-full top-0 ml-1 bg-zinc-900 border border-zinc-700 rounded-md shadow-lg z-50 min-w-[100px]">
                          <button
                            onClick={() => handleSubSubTabClick(tab.id, subTab.id, "outright")}
                            className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                              isActiveSubTab && activeSubSubTab === "outright"
                                ? "bg-orange-500/20 text-orange-400"
                                : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                            }`}
                          >
                            Outright
                          </button>
                          <button
                            onClick={() => handleSubSubTabClick(tab.id, subTab.id, "seasonal")}
                            className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                              isActiveSubTab && activeSubSubTab === "seasonal"
                                ? "bg-orange-500/20 text-orange-400"
                                : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                            }`}
                          >
                            Seasonal
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
