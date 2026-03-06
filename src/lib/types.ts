// Main category tabs
export type MainCategory =
  | "home"
  | "ags-grains"
  | "ags-softs"
  | "ags-livestock"
  | "ags-other"
  | "energy"
  | "equities"
  | "rates"
  | "fx"
  | "crypto";

// Sub-tabs for each category
export type AgsGrainsSubTab =
  | "corn"
  | "chicago-wheat"
  | "kansas-wheat"
  | "minneapolis-wheat"
  | "soybeans"
  | "soymeal"
  | "soyoil"
  | "all-us-wheat"
  | "all-us-oilseeds"
  | "all-us-grains"
  | "all-us-go"
  | "oc-nc-mm-splits";

export type AgsOtherSubTab =
  | "oats"
  | "rough-rice";

export type AgsSoftsSubTab =
  | "sugar"
  | "cotton"
  | "arabica-coffee"
  | "ny-cocoa";

export type AgsLivestockSubTab =
  | "live-cattle"
  | "feeder-cattle"
  | "lean-hogs";

export type SubTab = AgsGrainsSubTab | AgsOtherSubTab | AgsSoftsSubTab | AgsLivestockSubTab | null;

// Tab configuration
export interface TabConfig {
  id: MainCategory;
  label: string;
  subTabs?: { id: string; label: string }[];
}

export const TAB_CONFIG: TabConfig[] = [
  {
    id: "home",
    label: "Home",
  },
  {
    id: "ags-grains",
    label: "Ags - G&O",
    subTabs: [
      { id: "corn", label: "Corn" },
      { id: "chicago-wheat", label: "Chicago Wheat" },
      { id: "kansas-wheat", label: "Kansas Wheat" },
      { id: "minneapolis-wheat", label: "Minneapolis Wheat" },
      { id: "soybeans", label: "Soybeans" },
      { id: "soymeal", label: "Soymeal" },
      { id: "soyoil", label: "Soyoil" },
      { id: "all-us-wheat", label: "All US Wheat" },
      { id: "all-us-oilseeds", label: "All US Oilseeds" },
      { id: "all-us-grains", label: "All US Grains" },
      { id: "all-us-go", label: "All US G&O" },
      { id: "oc-nc-mm-splits", label: "OC/NC MM Splits" },
    ],
  },
  {
    id: "ags-softs",
    label: "Ags - Softs",
    subTabs: [
      { id: "sugar", label: "Sugar" },
      { id: "cotton", label: "Cotton" },
      { id: "arabica-coffee", label: "Arabica Coffee" },
      { id: "ny-cocoa", label: "NY Cocoa" },
    ],
  },
  {
    id: "ags-livestock",
    label: "Ags - Livestock",
    subTabs: [
      { id: "live-cattle", label: "Live Cattle" },
      { id: "feeder-cattle", label: "Feeder Cattle" },
      { id: "lean-hogs", label: "Lean Hogs" },
    ],
  },
  {
    id: "ags-other",
    label: "Ags - Other",
    subTabs: [
      { id: "oats", label: "Oats" },
      { id: "rough-rice", label: "Rough Rice" },
    ],
  },
  {
    id: "energy",
    label: "Energy",
  },
  {
    id: "equities",
    label: "Equities",
  },
  {
    id: "rates",
    label: "Rates",
  },
  {
    id: "fx",
    label: "FX",
  },
  {
    id: "crypto",
    label: "Crypto",
  },
];

// CFTC data types
export interface COTDataPoint {
  date: string;
  commercialLong: number;
  commercialShort: number;
  commercialNet: number;
  nonCommercialLong: number;
  nonCommercialShort: number;
  nonCommercialNet: number;
  nonReportableLong: number;
  nonReportableShort: number;
  nonReportableNet: number;
  openInterest: number;
}

export interface ContractData {
  symbol: string;
  name: string;
  exchange: string;
  data: COTDataPoint[];
}
