"use client";

import { Category } from "@/lib/types";

interface TabNavProps {
  activeTab: Category;
  onTabChange: (tab: Category) => void;
}

const tabs: { id: Category; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "futures", label: "Futures" },
  { id: "options", label: "Options" },
  { id: "spreads", label: "Spreads" },
  { id: "analysis", label: "Analysis" },
];

export function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <nav className="flex flex-wrap gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
            activeTab === tab.id
              ? "bg-orange-500 text-white"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
