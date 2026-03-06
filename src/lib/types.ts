export type Category = "home" | "futures" | "options" | "spreads" | "analysis";

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
