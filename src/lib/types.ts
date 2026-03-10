// Main category tabs
export type MainCategory =
  | "home"
  | "summary"
  | "cot-changes"
  | "ags-grains"
  | "ags-softs"
  | "ags-livestock"
  | "ags-other"
  | "energy"
  | "metals"
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
  | "rough-rice"
  | "orange-juice"
  | "lumber"
  | "milk";

export type AgsSoftsSubTab =
  | "sugar"
  | "cotton"
  | "arabica-coffee"
  | "ny-cocoa"
  | "all-us-softs";

export type AgsLivestockSubTab =
  | "live-cattle"
  | "feeder-cattle"
  | "lean-hogs"
  | "all-livestock";

export type EnergySubTab =
  | "wti-crude"
  | "brent-crude"
  | "natural-gas"
  | "rbob-gasoline"
  | "heating-oil";

export type MetalsSubTab =
  | "gold"
  | "silver"
  | "copper"
  | "platinum"
  | "palladium";

export type EquitiesSubTab =
  | "sp500"
  | "nasdaq100"
  | "dow"
  | "russell2000"
  | "vix";

export type RatesSubTab =
  | "10y-note"
  | "2y-note"
  | "5y-note"
  | "30y-bond"
  | "fed-funds"
  | "sofr";

export type FXSubTab =
  | "eurusd"
  | "usdjpy"
  | "gbpusd"
  | "usdcad"
  | "audusd"
  | "usdchf"
  | "usdmxn"
  | "nzdusd"
  | "usdzar"
  | "usdbrl"
  | "dxy";

export type CryptoSubTab =
  | "bitcoin"
  | "ethereum";

export type COTChangesSubTab =
  | "changes-ags-grains"
  | "changes-ags-softs"
  | "changes-ags-livestock"
  | "changes-ags-other"
  | "changes-energy"
  | "changes-metals"
  | "changes-equities"
  | "changes-rates"
  | "changes-fx"
  | "changes-crypto";

export type SubTab = AgsGrainsSubTab | AgsOtherSubTab | AgsSoftsSubTab | AgsLivestockSubTab | EnergySubTab | MetalsSubTab | EquitiesSubTab | RatesSubTab | FXSubTab | CryptoSubTab | COTChangesSubTab | null;

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
    id: "summary",
    label: "Summary",
  },
  {
    id: "cot-changes",
    label: "COT Changes",
    subTabs: [
      { id: "changes-ags-grains", label: "Ags - G&O" },
      { id: "changes-ags-softs", label: "Ags - Softs" },
      { id: "changes-ags-livestock", label: "Ags - Livestock" },
      { id: "changes-ags-other", label: "Ags - Other" },
      { id: "changes-energy", label: "Energy" },
      { id: "changes-metals", label: "Metals" },
      { id: "changes-equities", label: "Equities" },
      { id: "changes-rates", label: "Rates" },
      { id: "changes-fx", label: "FX" },
      { id: "changes-crypto", label: "Crypto" },
    ],
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
      { id: "all-us-softs", label: "All US Softs" },
    ],
  },
  {
    id: "ags-livestock",
    label: "Ags - Livestock",
    subTabs: [
      { id: "live-cattle", label: "Live Cattle" },
      { id: "feeder-cattle", label: "Feeder Cattle" },
      { id: "lean-hogs", label: "Lean Hogs" },
      { id: "all-livestock", label: "All Livestock" },
    ],
  },
  {
    id: "ags-other",
    label: "Ags - Other",
    subTabs: [
      { id: "oats", label: "Oats" },
      { id: "rough-rice", label: "Rough Rice" },
      { id: "orange-juice", label: "Orange Juice" },
      { id: "lumber", label: "Lumber" },
      { id: "milk", label: "Class III Milk" },
    ],
  },
  {
    id: "energy",
    label: "Energy",
    subTabs: [
      { id: "wti-crude", label: "WTI Crude" },
      { id: "brent-crude", label: "Brent Crude" },
      { id: "natural-gas", label: "Natural Gas" },
      { id: "rbob-gasoline", label: "RBOB Gasoline" },
      { id: "heating-oil", label: "Heating Oil" },
    ],
  },
  {
    id: "metals",
    label: "Metals",
    subTabs: [
      { id: "gold", label: "Gold" },
      { id: "silver", label: "Silver" },
      { id: "copper", label: "Copper" },
      { id: "platinum", label: "Platinum" },
      { id: "palladium", label: "Palladium" },
    ],
  },
  {
    id: "equities",
    label: "Equities",
    subTabs: [
      { id: "sp500", label: "S&P 500" },
      { id: "nasdaq100", label: "Nasdaq 100" },
      { id: "dow", label: "Dow Jones" },
      { id: "russell2000", label: "Russell 2000" },
      { id: "vix", label: "VIX" },
    ],
  },
  {
    id: "rates",
    label: "Rates",
    subTabs: [
      { id: "2y-note", label: "2-Year Note" },
      { id: "5y-note", label: "5-Year Note" },
      { id: "10y-note", label: "10-Year Note" },
      { id: "30y-bond", label: "30-Year Bond" },
      { id: "fed-funds", label: "Fed Funds" },
      { id: "sofr", label: "SOFR" },
    ],
  },
  {
    id: "fx",
    label: "FX",
    subTabs: [
      { id: "eurusd", label: "EUR/USD" },
      { id: "usdjpy", label: "USD/JPY" },
      { id: "gbpusd", label: "GBP/USD" },
      { id: "usdcad", label: "USD/CAD" },
      { id: "audusd", label: "AUD/USD" },
      { id: "usdchf", label: "USD/CHF" },
      { id: "usdmxn", label: "USD/MXN" },
      { id: "nzdusd", label: "NZD/USD" },
      { id: "usdzar", label: "USD/ZAR" },
      { id: "usdbrl", label: "USD/BRL" },
      { id: "dxy", label: "DXY Index" },
    ],
  },
  {
    id: "crypto",
    label: "Crypto",
    subTabs: [
      { id: "bitcoin", label: "Bitcoin" },
      { id: "ethereum", label: "Ethereum" },
    ],
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
