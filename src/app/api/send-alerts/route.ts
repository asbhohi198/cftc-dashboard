import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { generateCOTAlertEmail, COTSignalForEmail } from "@/lib/email-templates";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const SUBSCRIPTIONS_KEY = "cftc_email_subscriptions";

interface SignalConfig {
  enabled: boolean;
  threshold: number;
}

interface EmailSubscription {
  id: string;
  name: string;
  frequency: "daily" | "weekly";
  sectors: string[];
  signals: {
    mmPctHistMax: SignalConfig;
    mmPctOI: SignalConfig;
    weeklyMmChange: SignalConfig;
    tradersPctLongShort: SignalConfig;
    cotRvs: SignalConfig;
    cotVsSpreads: SignalConfig;
    citRollPosition: SignalConfig;
    seasonalOutliers?: SignalConfig;
  };
  recipients: string[];
  enabled: boolean;
  createdAt: string;
  lastSentAt: string | null;
}

// Spread pairs for COT RVs
const SPREAD_PAIRS_BY_SECTOR: Record<string, { id: string; name: string; leg1: string; leg2: string }[]> = {
  ags: [
    { id: "soybeans-corn", name: "Soybeans vs Corn", leg1: "soybeans", leg2: "corn" },
    { id: "soymeal-soyoil", name: "Soymeal vs Soyoil", leg1: "soymeal", leg2: "soyoil" },
    { id: "kw-w", name: "Kansas Wheat vs Chicago Wheat", leg1: "kansas-wheat", leg2: "chicago-wheat" },
    { id: "mw-kw", name: "Minneapolis Wheat vs Kansas Wheat", leg1: "minneapolis-wheat", leg2: "kansas-wheat" },
    { id: "mw-w", name: "Minneapolis Wheat vs Chicago Wheat", leg1: "minneapolis-wheat", leg2: "chicago-wheat" },
    { id: "lc-fc", name: "Live Cattle vs Feeder Cattle", leg1: "live-cattle", leg2: "feeder-cattle" },
    { id: "lc-lh", name: "Live Cattle vs Lean Hogs", leg1: "live-cattle", leg2: "lean-hogs" },
  ],
  energy: [
    { id: "wti-brent", name: "WTI vs Brent", leg1: "wti-crude", leg2: "brent-crude" },
    { id: "rbob-ho", name: "RBOB vs Heating Oil", leg1: "rbob-gasoline", leg2: "heating-oil" },
  ],
  metals: [
    { id: "gold-silver", name: "Gold vs Silver", leg1: "gold", leg2: "silver" },
    { id: "platinum-palladium", name: "Platinum vs Palladium", leg1: "platinum", leg2: "palladium" },
    { id: "gold-copper", name: "Gold vs Copper", leg1: "gold", leg2: "copper" },
  ],
  equities: [
    { id: "sp500-nasdaq", name: "S&P 500 vs Nasdaq 100", leg1: "sp500", leg2: "nasdaq100" },
    { id: "sp500-russell", name: "S&P 500 vs Russell 2000", leg1: "sp500", leg2: "russell2000" },
  ],
  rates: [
    { id: "10y-2y", name: "10-Year vs 2-Year", leg1: "10y-note", leg2: "2y-note" },
    { id: "30y-10y", name: "30-Year vs 10-Year", leg1: "30y-bond", leg2: "10y-note" },
  ],
  fx: [
    { id: "eurusd-gbpusd", name: "EUR/USD vs GBP/USD", leg1: "eurusd", leg2: "gbpusd" },
    { id: "audusd-nzdusd", name: "AUD/USD vs NZD/USD", leg1: "audusd", leg2: "nzdusd" },
  ],
};

// Spread leg symbols for trade instructions
const SPREAD_LEG_SYMBOLS: Record<string, { leg1: string; leg2: string }> = {
  "soybeans-corn": { leg1: "S", leg2: "C" },
  "soymeal-soyoil": { leg1: "SM", leg2: "BO" },
  "kw-w": { leg1: "KW", leg2: "W" },
  "mw-kw": { leg1: "MW", leg2: "KW" },
  "mw-w": { leg1: "MW", leg2: "W" },
  "lc-fc": { leg1: "LC", leg2: "FC" },
  "lc-lh": { leg1: "LC", leg2: "LH" },
  "wti-brent": { leg1: "CL", leg2: "CO" },
  "rbob-ho": { leg1: "RB", leg2: "HO" },
  "gold-silver": { leg1: "GC", leg2: "SI" },
  "platinum-palladium": { leg1: "PL", leg2: "PA" },
  "gold-copper": { leg1: "GC", leg2: "HG" },
  "sp500-nasdaq": { leg1: "ES", leg2: "NQ" },
  "sp500-russell": { leg1: "ES", leg2: "RTY" },
  "10y-2y": { leg1: "ZN", leg2: "ZT" },
  "30y-10y": { leg1: "ZB", leg2: "ZN" },
  "eurusd-gbpusd": { leg1: "EUR", leg2: "GBP" },
  "audusd-nzdusd": { leg1: "AUD", leg2: "NZD" },
};

function getTradeInstruction(spreadId: string, zScore: number): string {
  const symbols = SPREAD_LEG_SYMBOLS[spreadId];
  if (!symbols) return zScore > 0 ? "FADE LONG" : "FADE SHORT";
  if (zScore > 0) {
    return `sell ${symbols.leg1}/buy ${symbols.leg2}`;
  } else {
    return `buy ${symbols.leg1}/sell ${symbols.leg2}`;
  }
}

// Calculate z-score
function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

// Calculate mean and std dev
function calculateStats(values: number[]): { mean: number; stdDev: number } {
  if (values.length === 0) return { mean: 0, stdDev: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(avgSquaredDiff);
  return { mean, stdDev };
}

interface COTRecord {
  date: string;
  mmNetAll: number;
  mmLongAll: number;
  mmShortAll: number;
  specNetAll: number;
  openInterestAll: number;
  [key: string]: string | number | null;
}

// Contracts by sector for scanning
const CONTRACTS_BY_SECTOR: Record<string, { id: string; name: string }[]> = {
  ags: [
    { id: "corn", name: "Corn" },
    { id: "soybeans", name: "Soybeans" },
    { id: "chicago-wheat", name: "Chicago Wheat" },
    { id: "kansas-wheat", name: "Kansas Wheat" },
    { id: "soymeal", name: "Soymeal" },
    { id: "soyoil", name: "Soyoil" },
    { id: "live-cattle", name: "Live Cattle" },
    { id: "feeder-cattle", name: "Feeder Cattle" },
    { id: "lean-hogs", name: "Lean Hogs" },
    { id: "sugar", name: "Sugar" },
    { id: "cotton", name: "Cotton" },
    { id: "arabica-coffee", name: "Coffee" },
    { id: "ny-cocoa", name: "Cocoa" },
  ],
  energy: [
    { id: "wti-crude", name: "WTI Crude" },
    { id: "brent-crude", name: "Brent Crude" },
    { id: "natural-gas", name: "Natural Gas" },
    { id: "rbob-gasoline", name: "RBOB Gasoline" },
    { id: "heating-oil", name: "Heating Oil" },
  ],
  metals: [
    { id: "gold", name: "Gold" },
    { id: "silver", name: "Silver" },
    { id: "copper", name: "Copper" },
    { id: "platinum", name: "Platinum" },
    { id: "palladium", name: "Palladium" },
  ],
  equities: [
    { id: "sp500", name: "S&P 500" },
    { id: "nasdaq100", name: "Nasdaq 100" },
    { id: "dow", name: "Dow Jones" },
    { id: "russell2000", name: "Russell 2000" },
    { id: "vix", name: "VIX" },
  ],
  rates: [
    { id: "10y-note", name: "10-Year Note" },
    { id: "2y-note", name: "2-Year Note" },
    { id: "5y-note", name: "5-Year Note" },
    { id: "30y-bond", name: "30-Year Bond" },
  ],
  fx: [
    { id: "eurusd", name: "EUR/USD" },
    { id: "usdjpy", name: "USD/JPY" },
    { id: "gbpusd", name: "GBP/USD" },
    { id: "usdcad", name: "USD/CAD" },
    { id: "audusd", name: "AUD/USD" },
    { id: "dxy", name: "DXY Index" },
  ],
  crypto: [
    { id: "bitcoin", name: "Bitcoin" },
    { id: "ethereum", name: "Ethereum" },
  ],
};

// Fetch COT data for a contract
async function fetchCOTData(baseUrl: string, contractId: string): Promise<COTRecord[]> {
  try {
    const res = await fetch(`${baseUrl}/api/cot?contract=${contractId}`, { cache: "no-store" });
    const json = await res.json();
    if (!json.success) return [];
    return json.data;
  } catch {
    return [];
  }
}

// Get contracts for sectors
function getContractsForSectors(sectors: string[]): { id: string; name: string; sector: string }[] {
  const includeSectors = sectors.includes("ALL") ? Object.keys(CONTRACTS_BY_SECTOR) : sectors;
  const contracts: { id: string; name: string; sector: string }[] = [];

  for (const sector of includeSectors) {
    const sectorContracts = CONTRACTS_BY_SECTOR[sector] || [];
    for (const contract of sectorContracts) {
      contracts.push({ ...contract, sector });
    }
  }

  return contracts;
}

// Signal: MM Net as % of Historical Max
async function getMmPctHistMaxSignals(
  baseUrl: string,
  sectors: string[],
  threshold: number
): Promise<COTSignalForEmail[]> {
  const signals: COTSignalForEmail[] = [];
  const contracts = getContractsForSectors(sectors);

  for (const contract of contracts) {
    const data = await fetchCOTData(baseUrl, contract.id);
    if (data.length < 10) continue;

    const mmNetValues = data.map((d) => d.mmNetAll);
    const maxLong = Math.max(...mmNetValues);
    const maxShort = Math.min(...mmNetValues);
    const latest = mmNetValues[mmNetValues.length - 1];

    let pctOfMax = 0;
    let direction: "long" | "short" | "neutral" = "neutral";

    if (latest > 0 && maxLong > 0) {
      pctOfMax = (latest / maxLong) * 100;
      direction = "long";
    } else if (latest < 0 && maxShort < 0) {
      pctOfMax = (latest / maxShort) * 100;
      direction = "short";
    }

    if (pctOfMax >= threshold) {
      signals.push({
        signalType: "mmPctHistMax",
        signalLabel: "MM Net % Historical Max",
        commodity: contract.name,
        sector: contract.sector,
        value: pctOfMax,
        threshold,
        direction,
        tradeInstruction: direction === "long"
          ? `SELL ${contract.name.toUpperCase()} - MM at historical long extreme`
          : `BUY ${contract.name.toUpperCase()} - MM at historical short extreme`,
      });
    }
  }

  return signals;
}

// Signal: MM Net as % of Open Interest (z-score)
async function getMmPctOISignals(
  baseUrl: string,
  sectors: string[],
  threshold: number
): Promise<COTSignalForEmail[]> {
  const signals: COTSignalForEmail[] = [];
  const contracts = getContractsForSectors(sectors);

  for (const contract of contracts) {
    const data = await fetchCOTData(baseUrl, contract.id);
    if (data.length < 10) continue;

    const pctOIValues = data.map((d) => {
      if (d.openInterestAll === 0) return 0;
      return (d.mmNetAll / d.openInterestAll) * 100;
    });

    const { mean, stdDev } = calculateStats(pctOIValues);
    const latest = pctOIValues[pctOIValues.length - 1];
    const zScore = calculateZScore(latest, mean, stdDev);

    if (Math.abs(zScore) >= threshold) {
      signals.push({
        signalType: "mmPctOI",
        signalLabel: "MM Net % OI (Z-Score)",
        commodity: contract.name,
        sector: contract.sector,
        value: zScore,
        threshold,
        direction: zScore > 0 ? "long" : "short",
        tradeInstruction: zScore > 0
          ? `SELL ${contract.name.toUpperCase()} - MM positioning extended long`
          : `BUY ${contract.name.toUpperCase()} - MM positioning extended short`,
      });
    }
  }

  return signals;
}

// Signal: Weekly MM Net Change (z-score)
async function getWeeklyMmChangeSignals(
  baseUrl: string,
  sectors: string[],
  threshold: number
): Promise<COTSignalForEmail[]> {
  const signals: COTSignalForEmail[] = [];
  const contracts = getContractsForSectors(sectors);

  for (const contract of contracts) {
    const data = await fetchCOTData(baseUrl, contract.id);
    if (data.length < 10) continue;

    // Calculate weekly changes
    const weeklyChanges: number[] = [];
    for (let i = 1; i < data.length; i++) {
      weeklyChanges.push(data[i].mmNetAll - data[i - 1].mmNetAll);
    }

    if (weeklyChanges.length < 5) continue;

    const { mean, stdDev } = calculateStats(weeklyChanges);
    const latestChange = weeklyChanges[weeklyChanges.length - 1];
    const zScore = calculateZScore(latestChange, mean, stdDev);

    if (Math.abs(zScore) >= threshold) {
      signals.push({
        signalType: "weeklyMmChange",
        signalLabel: "Weekly MM Change (Z-Score)",
        commodity: contract.name,
        sector: contract.sector,
        value: zScore,
        threshold,
        direction: zScore > 0 ? "long" : "short",
        tradeInstruction: zScore > 0 ? "MM buying aggressively" : "MM selling aggressively",
      });
    }
  }

  return signals;
}

// Signal: Traders % Long or Short exceeds threshold
async function getTradersPctSignals(
  baseUrl: string,
  sectors: string[],
  threshold: number
): Promise<COTSignalForEmail[]> {
  const signals: COTSignalForEmail[] = [];
  const contracts = getContractsForSectors(sectors);

  for (const contract of contracts) {
    const data = await fetchCOTData(baseUrl, contract.id);
    if (data.length < 1) continue;

    const latest = data[data.length - 1];
    const totalMM = latest.mmLongAll + latest.mmShortAll;

    if (totalMM === 0) continue;

    const pctLong = (latest.mmLongAll / totalMM) * 100;
    const pctShort = (latest.mmShortAll / totalMM) * 100;

    if (pctLong >= threshold) {
      signals.push({
        signalType: "tradersPctLongShort",
        signalLabel: "MM % Long",
        commodity: contract.name,
        sector: contract.sector,
        value: pctLong,
        threshold,
        direction: "long",
        tradeInstruction: `SELL ${contract.name.toUpperCase()} - crowded long positioning`,
      });
    }

    if (pctShort >= threshold) {
      signals.push({
        signalType: "tradersPctLongShort",
        signalLabel: "MM % Short",
        commodity: contract.name,
        sector: contract.sector,
        value: pctShort,
        threshold,
        direction: "short",
        tradeInstruction: `BUY ${contract.name.toUpperCase()} - crowded short positioning`,
      });
    }
  }

  return signals;
}

// CIT contract info for roll trades
interface CITContractInfo {
  symbol: string;
  months: string[]; // Contract month codes in order (F=Jan, G=Feb, H=Mar, etc.)
}

const CIT_CONTRACT_INFO: Record<string, CITContractInfo> = {
  corn: { symbol: "C", months: ["H", "K", "N", "U", "Z"] }, // Mar, May, Jul, Sep, Dec
  soybeans: { symbol: "S", months: ["F", "H", "K", "N", "Q", "U", "X"] }, // Jan, Mar, May, Jul, Aug, Sep, Nov
  "chicago-wheat": { symbol: "W", months: ["H", "K", "N", "U", "Z"] }, // Mar, May, Jul, Sep, Dec
  "kansas-wheat": { symbol: "KW", months: ["H", "K", "N", "U", "Z"] }, // Mar, May, Jul, Sep, Dec
  soyoil: { symbol: "BO", months: ["F", "H", "K", "N", "Q", "U", "V", "Z"] }, // Jan, Mar, May, Jul, Aug, Sep, Oct, Dec
  soymeal: { symbol: "SM", months: ["F", "H", "K", "N", "Q", "U", "V", "Z"] }, // Jan, Mar, May, Jul, Aug, Sep, Oct, Dec
  "live-cattle": { symbol: "LC", months: ["G", "J", "M", "Q", "V", "Z"] }, // Feb, Apr, Jun, Aug, Oct, Dec
  "lean-hogs": { symbol: "LH", months: ["G", "J", "M", "N", "Q", "V", "Z"] }, // Feb, Apr, Jun, Jul, Aug, Oct, Dec
  "feeder-cattle": { symbol: "FC", months: ["F", "H", "J", "K", "Q", "U", "V", "X"] }, // Jan, Mar, Apr, May, Aug, Sep, Oct, Nov
  sugar: { symbol: "SB", months: ["H", "K", "N", "V"] }, // Mar, May, Jul, Oct
  "arabica-coffee": { symbol: "KC", months: ["H", "K", "N", "U", "Z"] }, // Mar, May, Jul, Sep, Dec
  "ny-cocoa": { symbol: "CC", months: ["H", "K", "N", "U", "Z"] }, // Mar, May, Jul, Sep, Dec
  cotton: { symbol: "CT", months: ["H", "K", "N", "V", "Z"] }, // Mar, May, Jul, Oct, Dec
};

// Month code to month number mapping
const MONTH_CODE_TO_NUM: Record<string, number> = {
  F: 1, G: 2, H: 3, J: 4, K: 5, M: 6, N: 7, Q: 8, U: 9, V: 10, X: 11, Z: 12
};

const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Calculate trading days between two dates (excludes weekends)
function getTradingDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current < end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) { // Not weekend
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

// Get the 5th business day of a given month/year
function getFifthBusinessDay(month: number, year: number): Date {
  const date = new Date(year, month - 1, 1); // month is 0-indexed in Date
  let businessDays = 0;
  while (businessDays < 5) {
    const day = date.getDay();
    if (day !== 0 && day !== 6) {
      businessDays++;
      if (businessDays === 5) break;
    }
    date.setDate(date.getDate() + 1);
  }
  return date;
}

interface SpreadInfo {
  front: string;
  back: string;
  rollMonth: string; // e.g., "Aug"
  rollStartDate: string; // e.g., "Aug 7"
  tradingDaysUntilRoll: number;
  rollStatus: string; // e.g., "Roll in 12 sessions" or "Roll active" or "Roll complete"
}

// Get the NEXT available roll spread (if current roll is complete, skip to next contract)
function getCurrentSpreadWithRoll(contractId: string): SpreadInfo {
  const info = CIT_CONTRACT_INFO[contractId];
  if (!info) return { front: "?", back: "?", rollMonth: "?", rollStartDate: "?", tradingDaysUntilRoll: 0, rollStatus: "?" };

  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentDay = now.getDate();
  const currentYear = now.getFullYear();

  // Find the front month (first contract month that hasn't expired yet)
  // Contracts typically expire around the 5th of the delivery month
  let frontIdx = -1;
  let frontYear = currentYear;

  for (let i = 0; i < info.months.length; i++) {
    const monthNum = MONTH_CODE_TO_NUM[info.months[i]];
    if (monthNum > currentMonth || (monthNum === currentMonth && currentDay < 5)) {
      frontIdx = i;
      break;
    }
  }

  // If no contract found this year, use first contract of next year
  if (frontIdx === -1) {
    frontIdx = 0;
    frontYear = currentYear + 1;
  }

  // Helper to get next contract index and year
  const getNextContract = (idx: number, year: number): { idx: number; year: number } => {
    let nextIdx = idx + 1;
    let nextYear = year;
    if (nextIdx >= info.months.length) {
      nextIdx = 0;
      nextYear = year + 1;
    }
    return { idx: nextIdx, year: nextYear };
  };

  // Calculate roll info for a given front/back pair
  const getRollInfo = (fIdx: number, fYear: number, bIdx: number, bYear: number): SpreadInfo => {
    const frontMonth = info.months[fIdx];
    const backMonth = info.months[bIdx];
    const frontMonthNum = MONTH_CODE_TO_NUM[frontMonth];

    // Roll period: Goldman Roll is typically business days 5-9 of the month PRIOR to the front month
    let rollMonthNum = frontMonthNum - 1;
    let rollYear = fYear;
    if (rollMonthNum < 1) {
      rollMonthNum = 12;
      rollYear = fYear - 1;
    }

    const rollStartDate = getFifthBusinessDay(rollMonthNum, rollYear);
    const rollEndDate = new Date(rollStartDate);
    rollEndDate.setDate(rollEndDate.getDate() + 6); // ~5 trading days

    const tradingDaysUntilRoll = getTradingDaysBetween(now, rollStartDate);

    let rollStatus: string;
    if (now < rollStartDate) {
      rollStatus = `Roll starts in ${tradingDaysUntilRoll} sessions`;
    } else if (now <= rollEndDate) {
      rollStatus = "ROLL ACTIVE NOW";
    } else {
      rollStatus = "complete"; // Marker to skip to next
    }

    return {
      front: `${frontMonth}${fYear % 100}`,
      back: `${backMonth}${bYear % 100}`,
      rollMonth: MONTH_NAMES[rollMonthNum],
      rollStartDate: `${MONTH_NAMES[rollMonthNum]} ${rollStartDate.getDate()}`,
      tradingDaysUntilRoll,
      rollStatus,
    };
  };

  // Get initial front/back pair
  let back = getNextContract(frontIdx, frontYear);
  let rollInfo = getRollInfo(frontIdx, frontYear, back.idx, back.year);

  // If roll is complete, move to next contract pair
  if (rollInfo.rollStatus === "complete") {
    const newFront = back;
    const newBack = getNextContract(newFront.idx, newFront.year);
    rollInfo = getRollInfo(newFront.idx, newFront.year, newBack.idx, newBack.year);
  }

  return rollInfo;
}

// Signal: CIT Roll Position (z-score of MM - Index)
async function getCITRollSignals(
  baseUrl: string,
  threshold: number
): Promise<COTSignalForEmail[]> {
  const signals: COTSignalForEmail[] = [];

  try {
    const res = await fetch(`${baseUrl}/api/cit-index?sector=ags`, { cache: "no-store" });
    const json = await res.json();

    if (!json.success || !json.contracts) return signals;

    for (const contract of json.contracts) {
      const zScore = contract.rollZScore;

      if (Math.abs(zScore) >= threshold) {
        const info = CIT_CONTRACT_INFO[contract.id];
        const symbol = info?.symbol || contract.name.toUpperCase().substring(0, 2);
        const spread = getCurrentSpreadWithRoll(contract.id);

        // Positive z-score = MM more long than Index = roll pressure = sell calendar spread
        // Negative z-score = MM more short than Index = short covering = buy calendar spread
        const action = zScore > 0 ? "SELL" : "BUY";
        const spreadAction = `${action} ${symbol} ${spread.front}/${spread.back} | ${spread.rollStatus}`;

        signals.push({
          signalType: "citRollPosition",
          signalLabel: "CIT Roll Position",
          commodity: contract.name,
          sector: "ags",
          value: zScore,
          threshold,
          direction: zScore > 0 ? "long" : "short",
          tradeInstruction: spreadAction,
        });
      }
    }
  } catch (error) {
    console.error("Error fetching CIT data:", error);
  }

  return signals;
}

// Get COT RV signals
async function getCOTRVSignals(
  baseUrl: string,
  sectors: string[],
  threshold: number
): Promise<COTSignalForEmail[]> {
  const signals: COTSignalForEmail[] = [];
  const includeSectors = sectors.includes("ALL") ? Object.keys(SPREAD_PAIRS_BY_SECTOR) : sectors;

  for (const sector of includeSectors) {
    const pairs = SPREAD_PAIRS_BY_SECTOR[sector] || [];

    for (const pair of pairs) {
      const [leg1Data, leg2Data] = await Promise.all([
        fetchCOTData(baseUrl, pair.leg1),
        fetchCOTData(baseUrl, pair.leg2),
      ]);

      if (leg1Data.length === 0 || leg2Data.length === 0) continue;

      // Create date map for leg2
      const leg2Map = new Map<string, COTRecord>();
      for (const rec of leg2Data) {
        leg2Map.set(rec.date, rec);
      }

      // Calculate spread values
      const spreadValues: number[] = [];
      for (const leg1Rec of leg1Data) {
        const leg2Rec = leg2Map.get(leg1Rec.date);
        if (leg2Rec) {
          spreadValues.push(leg1Rec.mmNetAll - leg2Rec.mmNetAll);
        }
      }

      if (spreadValues.length < 10) continue;

      // Calculate z-score
      const { mean, stdDev } = calculateStats(spreadValues);
      const latestSpread = spreadValues[spreadValues.length - 1];
      const zScore = calculateZScore(latestSpread, mean, stdDev);

      // Check if exceeds threshold
      if (Math.abs(zScore) >= threshold) {
        signals.push({
          signalType: "cotRvs",
          signalLabel: "COT - RVs",
          commodity: pair.name,
          sector,
          value: zScore,
          threshold,
          direction: zScore > 0 ? "long" : "short",
          tradeInstruction: getTradeInstruction(pair.id, zScore),
        });
      }
    }
  }

  return signals;
}

// Signal: COT vs Spreads - positioning misaligned with curve structure
async function getCotVsSpreadsSignals(
  baseUrl: string,
  threshold: number
): Promise<COTSignalForEmail[]> {
  const signals: COTSignalForEmail[] = [];

  try {
    const res = await fetch(`${baseUrl}/api/cot-spreads`, { cache: "no-store" });
    const json = await res.json();

    if (!json.success || !json.mainScatter?.points) return signals;

    const { points, regressionPctOI } = json.mainScatter;
    const { slope, intercept } = regressionPctOI;

    // Calculate residuals (actual mmNetPctOI - predicted based on spread)
    const residuals: { name: string; residual: number; mmNetPctOI: number; spread_pct: number }[] = [];
    for (const point of points) {
      const predicted = slope * point.y + intercept; // y is spread_pct
      const residual = point.xPctOI - predicted; // xPctOI is actual mmNetPctOI
      residuals.push({
        name: point.name,
        residual,
        mmNetPctOI: point.xPctOI,
        spread_pct: point.y,
      });
    }

    // Calculate z-scores of residuals
    const residualValues = residuals.map((r) => r.residual);
    const { mean, stdDev } = calculateStats(residualValues);

    for (const item of residuals) {
      const zScore = calculateZScore(item.residual, mean, stdDev);

      if (Math.abs(zScore) >= threshold) {
        // Positive z-score = positioning MORE bullish than spread suggests
        // Negative z-score = positioning MORE bearish than spread suggests
        signals.push({
          signalType: "cotVsSpreads",
          signalLabel: "COT vs Spreads",
          commodity: item.name,
          sector: "ags", // cot-spreads is primarily ags
          value: zScore,
          threshold,
          direction: zScore > 0 ? "long" : "short",
          tradeInstruction: zScore > 0
            ? "MM overly long vs curve structure"
            : "MM overly short vs curve structure",
        });
      }
    }
  } catch (error) {
    console.error("Error fetching COT vs Spreads data:", error);
  }

  return signals;
}

// Helper: Get current day of year
function getCurrentDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// Helper: Get day of year from date string
function getDayOfYearFromDate(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const start = new Date(year, 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// Check if a value is a seasonal record (high or low)
function checkSeasonalRecord(
  data: COTRecord[],
  field: keyof COTRecord,
  tolerance: number = 7
): { isMax: boolean; isMin: boolean; currentValue: number | null } {
  const currentYear = new Date().getFullYear();
  const currentDayOfYear = getCurrentDayOfYear();

  let currentValue: number | null = null;
  let currentDayFound = 0;
  const historicalValues: number[] = [];

  for (const d of data) {
    const [year] = d.date.split("-").map(Number);
    const dayOfYear = getDayOfYearFromDate(d.date);
    const value = d[field];

    if (typeof value !== "number") continue;

    if (Math.abs(dayOfYear - currentDayOfYear) <= tolerance) {
      if (year === currentYear) {
        if (currentValue === null || Math.abs(dayOfYear - currentDayOfYear) < Math.abs(currentDayFound - currentDayOfYear)) {
          currentValue = value;
          currentDayFound = dayOfYear;
        }
      } else {
        historicalValues.push(value);
      }
    }
  }

  if (currentValue === null || historicalValues.length === 0) {
    return { isMax: false, isMin: false, currentValue: null };
  }

  const historicalMax = Math.max(...historicalValues);
  const historicalMin = Math.min(...historicalValues);

  return {
    isMax: currentValue > historicalMax,
    isMin: currentValue < historicalMin,
    currentValue,
  };
}

// Helper: Check seasonal record for generic data array
function checkSeasonalRecordGeneric(
  data: { date: string; value: number }[],
  tolerance: number = 7
): { isMax: boolean; isMin: boolean; currentValue: number | null } {
  const currentYear = new Date().getFullYear();
  const currentDayOfYear = getCurrentDayOfYear();

  let currentValue: number | null = null;
  let currentDayFound = 0;
  const historicalValues: number[] = [];

  for (const d of data) {
    const [year] = d.date.split("-").map(Number);
    const dayOfYear = getDayOfYearFromDate(d.date);

    if (Math.abs(dayOfYear - currentDayOfYear) <= tolerance) {
      if (year === currentYear) {
        if (currentValue === null || Math.abs(dayOfYear - currentDayOfYear) < Math.abs(currentDayFound - currentDayOfYear)) {
          currentValue = d.value;
          currentDayFound = dayOfYear;
        }
      } else {
        historicalValues.push(d.value);
      }
    }
  }

  if (currentValue === null || historicalValues.length === 0) {
    return { isMax: false, isMin: false, currentValue: null };
  }

  const historicalMax = Math.max(...historicalValues);
  const historicalMin = Math.min(...historicalValues);

  return {
    isMax: currentValue > historicalMax,
    isMin: currentValue < historicalMin,
    currentValue,
  };
}

// Signal: Seasonal Outliers - record highs/lows for this time of year
async function getSeasonalOutliersSignals(
  baseUrl: string,
  sectors: string[]
): Promise<COTSignalForEmail[]> {
  const signals: COTSignalForEmail[] = [];
  const contracts = getContractsForSectors(sectors);

  // 1. Scan basic COT data
  const fieldsToCheck: { field: keyof COTRecord; label: string }[] = [
    { field: "mmNetAll", label: "MM Net" },
    { field: "specNetAll", label: "Spec Net" },
    { field: "producerNetAll" as keyof COTRecord, label: "Producer Net" },
    { field: "swapNetAll" as keyof COTRecord, label: "Swap Net" },
  ];

  for (const contract of contracts) {
    const data = await fetchCOTData(baseUrl, contract.id);
    if (data.length < 52) continue; // Need at least 1 year of data

    for (const { field, label } of fieldsToCheck) {
      const result = checkSeasonalRecord(data, field);

      if (result.isMax || result.isMin) {
        signals.push({
          signalType: "seasonalOutliers",
          signalLabel: "Seasonal Outliers",
          commodity: contract.name,
          sector: contract.sector,
          value: result.currentValue || 0,
          threshold: 0,
          direction: result.isMax ? "long" : "short",
          tradeInstruction: `${label}: Record ${result.isMax ? "HIGH" : "LOW"} for this week`,
        });
      }
    }
  }

  // 2. Scan COT RVs data
  const includeSectors = sectors.includes("ALL") ? Object.keys(SPREAD_PAIRS_BY_SECTOR) : sectors;
  for (const sector of includeSectors) {
    try {
      const res = await fetch(`${baseUrl}/api/cot-rvs?sector=${sector}`, { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.spreads) {
        for (const spread of json.spreads) {
          const data = spread.data.map((d: { date: string; mmNetSpread: number }) => ({
            date: d.date,
            value: d.mmNetSpread,
          }));
          if (data.length < 52) continue;
          const result = checkSeasonalRecordGeneric(data);
          if (result.isMax || result.isMin) {
            signals.push({
              signalType: "seasonalOutliers",
              signalLabel: "Seasonal RV",
              commodity: spread.name,
              sector,
              value: result.currentValue || 0,
              threshold: 0,
              direction: result.isMax ? "long" : "short",
              tradeInstruction: `RV Spread: Record ${result.isMax ? "HIGH" : "LOW"} for this week`,
            });
          }
        }
      }
    } catch {
      // ignore errors for individual sectors
    }
  }

  // 3. Scan CIT Index data
  if (sectors.includes("ALL") || sectors.includes("ags")) {
    try {
      const res = await fetch(`${baseUrl}/api/cit-index?sector=ags`, { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.contracts) {
        for (const contract of json.contracts) {
          const data = contract.historicalData.map((d: { date: string; indexNet: number }) => ({
            date: d.date,
            value: d.indexNet,
          }));
          if (data.length < 52) continue;
          const result = checkSeasonalRecordGeneric(data);
          if (result.isMax || result.isMin) {
            signals.push({
              signalType: "seasonalOutliers",
              signalLabel: "Seasonal CIT",
              commodity: contract.name,
              sector: "ags",
              value: result.currentValue || 0,
              threshold: 0,
              direction: result.isMax ? "long" : "short",
              tradeInstruction: `Index Net: Record ${result.isMax ? "HIGH" : "LOW"} for this week`,
            });
          }
        }
      }
    } catch {
      // ignore errors
    }
  }

  // 4. Scan Px Weighted data
  for (const sector of includeSectors) {
    try {
      const res = await fetch(`${baseUrl}/api/cot-px-weighted?sector=${sector}`, { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.contracts) {
        for (const contract of json.contracts) {
          const data = contract.historicalData.map((d: { date: string; notionalValue: number }) => ({
            date: d.date,
            value: d.notionalValue,
          }));
          if (data.length < 52) continue;
          const result = checkSeasonalRecordGeneric(data);
          if (result.isMax || result.isMin) {
            signals.push({
              signalType: "seasonalOutliers",
              signalLabel: "Seasonal Px",
              commodity: contract.name,
              sector,
              value: result.currentValue || 0,
              threshold: 0,
              direction: result.isMax ? "long" : "short",
              tradeInstruction: `Notional: Record ${result.isMax ? "HIGH" : "LOW"} for this week`,
            });
          }
        }
      }
    } catch {
      // ignore errors
    }
  }

  // 5. Scan Vol Weighted data
  for (const sector of includeSectors) {
    try {
      const res = await fetch(`${baseUrl}/api/cot-vol-weighted?sector=${sector}`, { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.contracts) {
        for (const contract of json.contracts) {
          const data = contract.historicalData.map((d: { date: string; volAdjustedPosition: number }) => ({
            date: d.date,
            value: d.volAdjustedPosition,
          }));
          if (data.length < 52) continue;
          const result = checkSeasonalRecordGeneric(data);
          if (result.isMax || result.isMin) {
            signals.push({
              signalType: "seasonalOutliers",
              signalLabel: "Seasonal Vol",
              commodity: contract.name,
              sector,
              value: result.currentValue || 0,
              threshold: 0,
              direction: result.isMax ? "long" : "short",
              tradeInstruction: `Vol-Adj: Record ${result.isMax ? "HIGH" : "LOW"} for this week`,
            });
          }
        }
      }
    } catch {
      // ignore errors
    }
  }

  return signals;
}

// Get latest COT report date
async function getLatestReportDate(baseUrl: string): Promise<string> {
  try {
    const data = await fetchCOTData(baseUrl, "corn");
    if (data.length > 0) {
      return data[data.length - 1].date;
    }
  } catch {
    // ignore
  }
  return new Date().toISOString().split("T")[0];
}

// Main handler
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const testMode = searchParams.get("test") === "true";
  const subId = searchParams.get("subscription");

  // Always use production URL for fetching data (VERCEL_URL is preview deployment URL which may not work)
  const baseUrl = "https://cftc-dashboard.vercel.app";

  try {
    // Fetch subscriptions
    const subscriptions = (await redis.get<EmailSubscription[]>(SUBSCRIPTIONS_KEY)) || [];
    console.log(`Found ${subscriptions.length} subscriptions`);

    // Filter to specific subscription if provided
    let subsToProcess = subscriptions.filter((s) => s.enabled);
    if (subId) {
      subsToProcess = subsToProcess.filter((s) => s.id === subId);
    }

    // For non-test mode, filter by frequency/day
    if (!testMode && !subId) {
      const today = new Date();
      const isFriday = today.getDay() === 5;
      const hour = today.getHours();

      subsToProcess = subsToProcess.filter((sub) => {
        if (sub.frequency === "daily") return true;
        if (sub.frequency === "weekly" && isFriday && hour >= 16) return true;
        return false;
      });
    }

    if (subsToProcess.length === 0) {
      return NextResponse.json({
        message: "No subscriptions to process",
        processed: 0,
      });
    }

    // Initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Get latest report date
    const reportDate = await getLatestReportDate(baseUrl);
    console.log(`Latest report date: ${reportDate}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: Array<{ id: string; name: string; success: boolean; error?: string; signalCount?: number; debug?: Record<string, any> }> = [];

    for (const sub of subsToProcess) {
      try {
        console.log(`Processing subscription: ${sub.name}`);
        const allSignals: COTSignalForEmail[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const debug: Record<string, any> = {};

        // MM Net as % of Historical Max
        if (sub.signals.mmPctHistMax?.enabled) {
          const signals = await getMmPctHistMaxSignals(baseUrl, sub.sectors, sub.signals.mmPctHistMax.threshold);
          allSignals.push(...signals);
          debug.mmPctHistMax = signals.length;
          console.log(`Found ${signals.length} MM % Hist Max signals`);
        }

        // MM Net as % of Open Interest (z-score)
        if (sub.signals.mmPctOI?.enabled) {
          const signals = await getMmPctOISignals(baseUrl, sub.sectors, sub.signals.mmPctOI.threshold);
          allSignals.push(...signals);
          debug.mmPctOI = signals.length;
          console.log(`Found ${signals.length} MM % OI signals`);
        }

        // Weekly MM Net Change (z-score)
        if (sub.signals.weeklyMmChange?.enabled) {
          const signals = await getWeeklyMmChangeSignals(baseUrl, sub.sectors, sub.signals.weeklyMmChange.threshold);
          allSignals.push(...signals);
          debug.weeklyMmChange = signals.length;
          console.log(`Found ${signals.length} Weekly MM Change signals`);
        }

        // Traders % Long or Short
        if (sub.signals.tradersPctLongShort?.enabled) {
          const signals = await getTradersPctSignals(baseUrl, sub.sectors, sub.signals.tradersPctLongShort.threshold);
          allSignals.push(...signals);
          debug.tradersPctLongShort = signals.length;
          console.log(`Found ${signals.length} Traders % Long/Short signals`);
        }

        // COT RVs signals
        if (sub.signals.cotRvs?.enabled) {
          const rvSignals = await getCOTRVSignals(baseUrl, sub.sectors, sub.signals.cotRvs.threshold);
          allSignals.push(...rvSignals);
          debug.cotRvs = rvSignals.length;
          console.log(`Found ${rvSignals.length} COT RV signals`);
        }

        // CIT Roll Position signals (only for ags sector)
        if (sub.signals.citRollPosition?.enabled && (sub.sectors.includes("ALL") || sub.sectors.includes("ags"))) {
          const citSignals = await getCITRollSignals(baseUrl, sub.signals.citRollPosition.threshold);
          allSignals.push(...citSignals);
          debug.citRollPosition = citSignals.length;
          console.log(`Found ${citSignals.length} CIT Roll Position signals`);
        }

        // COT vs Spreads signals (ags sector - positioning vs curve structure)
        if (sub.signals.cotVsSpreads?.enabled && (sub.sectors.includes("ALL") || sub.sectors.includes("ags"))) {
          const spreadSignals = await getCotVsSpreadsSignals(baseUrl, sub.signals.cotVsSpreads.threshold);
          allSignals.push(...spreadSignals);
          debug.cotVsSpreads = spreadSignals.length;
          console.log(`Found ${spreadSignals.length} COT vs Spreads signals`);
        }

        // Seasonal Outliers signals (record highs/lows for this time of year)
        if (sub.signals.seasonalOutliers?.enabled) {
          const seasonalSignals = await getSeasonalOutliersSignals(baseUrl, sub.sectors);
          allSignals.push(...seasonalSignals);
          debug.seasonalOutliers = seasonalSignals.length;
          console.log(`Found ${seasonalSignals.length} Seasonal Outliers signals`);
        }

        // Generate email
        const html = generateCOTAlertEmail(sub.name, allSignals, reportDate);

        // Send email
        const { error } = await resend.emails.send({
          from: "CFTC Dashboard <alerts@resend.dev>",
          to: sub.recipients,
          subject: `[CFTC] ${sub.name} - ${allSignals.length} signals`,
          html,
        });

        if (error) {
          throw new Error(error.message);
        }

        // Update lastSentAt
        const subIndex = subscriptions.findIndex((s) => s.id === sub.id);
        if (subIndex !== -1) {
          subscriptions[subIndex].lastSentAt = new Date().toISOString();
        }

        results.push({
          id: sub.id,
          name: sub.name,
          success: true,
          signalCount: allSignals.length,
          debug,
        });

        console.log(`Email sent to ${sub.recipients.join(", ")} with ${allSignals.length} signals`);
      } catch (error) {
        console.error(`Failed to process subscription ${sub.id}:`, error);
        results.push({
          id: sub.id,
          name: sub.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Save updated lastSentAt times
    await redis.set(SUBSCRIPTIONS_KEY, subscriptions);

    return NextResponse.json({
      message: testMode ? "Test email sent" : "Alerts processed",
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("Send alerts failed:", error);
    return NextResponse.json(
      { error: "Failed to send alerts", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
