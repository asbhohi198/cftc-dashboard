// CFTC Contract Codes
export const CFTC_CONTRACTS = {
  // Grains & Oilseeds
  corn: { code: "002602", name: "Corn", exchange: "CBOT", marketName: "CORN - CHICAGO BOARD OF TRADE", category: "ags" },
  "chicago-wheat": { code: "001602", name: "Chicago Wheat", exchange: "CBOT", marketName: "WHEAT-SRW - CHICAGO BOARD OF TRADE", category: "ags" },
  "kansas-wheat": { code: "001612", name: "Kansas Wheat", exchange: "KCBT", marketName: "WHEAT-HRW - KANSAS CITY BOARD OF TRADE", category: "ags" },
  "minneapolis-wheat": { code: "001626", name: "Minneapolis Wheat", exchange: "MGEX", marketName: "WHEAT-HRS - MINNEAPOLIS GRAIN EXCHANGE", category: "ags" },
  soybeans: { code: "005602", name: "Soybeans", exchange: "CBOT", marketName: "SOYBEANS - CHICAGO BOARD OF TRADE", category: "ags" },
  soymeal: { code: "026603", name: "Soybean Meal", exchange: "CBOT", marketName: "SOYBEAN MEAL - CHICAGO BOARD OF TRADE", category: "ags" },
  soyoil: { code: "007601", name: "Soybean Oil", exchange: "CBOT", marketName: "SOYBEAN OIL - CHICAGO BOARD OF TRADE", category: "ags" },
  oats: { code: "004603", name: "Oats", exchange: "CBOT", marketName: "OATS - CHICAGO BOARD OF TRADE", category: "ags" },
  "rough-rice": { code: "039601", name: "Rough Rice", exchange: "CBOT", marketName: "ROUGH RICE - CHICAGO BOARD OF TRADE", category: "ags" },
  // Softs
  sugar: { code: "080732", name: "Sugar #11", exchange: "ICE", marketName: "SUGAR NO. 11 - ICE FUTURES U.S.", category: "ags" },
  cotton: { code: "033661", name: "Cotton", exchange: "ICE", marketName: "COTTON NO. 2 - ICE FUTURES U.S.", category: "ags" },
  "arabica-coffee": { code: "083731", name: "Coffee C", exchange: "ICE", marketName: "COFFEE C - ICE FUTURES U.S.", category: "ags" },
  "ny-cocoa": { code: "073732", name: "Cocoa", exchange: "ICE", marketName: "COCOA - ICE FUTURES U.S.", category: "ags" },
  // Livestock
  "live-cattle": { code: "057642", name: "Live Cattle", exchange: "CME", marketName: "LIVE CATTLE - CHICAGO MERCANTILE EXCHANGE", category: "ags" },
  "feeder-cattle": { code: "061641", name: "Feeder Cattle", exchange: "CME", marketName: "FEEDER CATTLE - CHICAGO MERCANTILE EXCHANGE", category: "ags" },
  "lean-hogs": { code: "054642", name: "Lean Hogs", exchange: "CME", marketName: "LEAN HOGS - CHICAGO MERCANTILE EXCHANGE", category: "ags" },
  // Energy
  "wti-crude": { code: "067651", name: "WTI Crude Oil", exchange: "NYMEX", marketName: "CRUDE OIL, LIGHT SWEET - NEW YORK MERCANTILE EXCHANGE", category: "energy" },
  "natural-gas": { code: "023651", name: "Natural Gas", exchange: "NYMEX", marketName: "NATURAL GAS - NEW YORK MERCANTILE EXCHANGE", category: "energy" },
  "rbob-gasoline": { code: "111659", name: "RBOB Gasoline", exchange: "NYMEX", marketName: "RBOB GASOLINE - NEW YORK MERCANTILE EXCHANGE", category: "energy" },
  "heating-oil": { code: "022651", name: "Heating Oil", exchange: "NYMEX", marketName: "NO. 2 HEATING OIL - NEW YORK MERCANTILE EXCHANGE", category: "energy" },
  // Equities
  "sp500": { code: "13874A", name: "S&P 500 E-mini", exchange: "CME", marketName: "E-MINI S&P 500 - CHICAGO MERCANTILE EXCHANGE", category: "equities" },
  "nasdaq100": { code: "209742", name: "Nasdaq 100 E-mini", exchange: "CME", marketName: "E-MINI NASDAQ-100 - CHICAGO MERCANTILE EXCHANGE", category: "equities" },
  "dow": { code: "124603", name: "Dow Jones E-mini", exchange: "CBOT", marketName: "DJIA x $5 - CHICAGO BOARD OF TRADE", category: "equities" },
  "russell2000": { code: "239742", name: "Russell 2000 E-mini", exchange: "CME", marketName: "E-MINI RUSSELL 2000 - CHICAGO MERCANTILE EXCHANGE", category: "equities" },
  "vix": { code: "1170E1", name: "VIX Futures", exchange: "CFE", marketName: "VIX FUTURES - CBOE FUTURES EXCHANGE", category: "equities" },
  // Rates
  "10y-note": { code: "043602", name: "10-Year T-Note", exchange: "CBOT", marketName: "10-YEAR U.S. TREASURY NOTES - CHICAGO BOARD OF TRADE", category: "rates" },
  "2y-note": { code: "042601", name: "2-Year T-Note", exchange: "CBOT", marketName: "2-YEAR U.S. TREASURY NOTES - CHICAGO BOARD OF TRADE", category: "rates" },
  "5y-note": { code: "044601", name: "5-Year T-Note", exchange: "CBOT", marketName: "5-YEAR U.S. TREASURY NOTES - CHICAGO BOARD OF TRADE", category: "rates" },
  "30y-bond": { code: "020601", name: "30-Year T-Bond", exchange: "CBOT", marketName: "U.S. TREASURY BONDS - CHICAGO BOARD OF TRADE", category: "rates" },
  "fed-funds": { code: "045601", name: "Fed Funds", exchange: "CBOT", marketName: "30-DAY FEDERAL FUNDS - CHICAGO BOARD OF TRADE", category: "rates" },
  "sofr": { code: "146021", name: "SOFR", exchange: "CME", marketName: "3-MONTH SOFR - CHICAGO MERCANTILE EXCHANGE", category: "rates" },
  // FX
  "eurusd": { code: "099741", name: "Euro FX", exchange: "CME", marketName: "EURO FX - CHICAGO MERCANTILE EXCHANGE", category: "fx" },
  "usdjpy": { code: "097741", name: "Japanese Yen", exchange: "CME", marketName: "JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE", category: "fx" },
  "gbpusd": { code: "096742", name: "British Pound", exchange: "CME", marketName: "BRITISH POUND - CHICAGO MERCANTILE EXCHANGE", category: "fx" },
  "usdcad": { code: "090741", name: "Canadian Dollar", exchange: "CME", marketName: "CANADIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE", category: "fx" },
  "audusd": { code: "232741", name: "Australian Dollar", exchange: "CME", marketName: "AUSTRALIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE", category: "fx" },
  "usdchf": { code: "092741", name: "Swiss Franc", exchange: "CME", marketName: "SWISS FRANC - CHICAGO MERCANTILE EXCHANGE", category: "fx" },
  "usdmxn": { code: "095741", name: "Mexican Peso", exchange: "CME", marketName: "MEXICAN PESO - CHICAGO MERCANTILE EXCHANGE", category: "fx" },
  "nzdusd": { code: "112741", name: "NZ Dollar", exchange: "CME", marketName: "NZ DOLLAR - CHICAGO MERCANTILE EXCHANGE", category: "fx" },
  "dxy": { code: "098662", name: "US Dollar Index", exchange: "ICE", marketName: "U.S. DOLLAR INDEX - ICE FUTURES U.S.", category: "fx" },
  // Crypto
  "bitcoin": { code: "133741", name: "Bitcoin", exchange: "CME", marketName: "BITCOIN - CHICAGO MERCANTILE EXCHANGE", category: "crypto" },
  "ethereum": { code: "146021", name: "Ethereum", exchange: "CME", marketName: "ETHER CASH SETTLED - CHICAGO MERCANTILE EXCHANGE", category: "crypto" },
} as const;

export type AssetCategory = "ags" | "energy" | "equities" | "rates" | "fx" | "crypto";

export type ContractId = keyof typeof CFTC_CONTRACTS;

// Data types for COT report
export interface COTRecord {
  date: string; // YYYY-MM-DD
  // Open Interest
  openInterestAll: number;
  openInterestOld: number;
  openInterestOther: number;
  // Producer/Merchant (Commercials)
  producerLongAll: number;
  producerShortAll: number;
  producerNetAll: number;
  producerLongOld: number;
  producerShortOld: number;
  producerNetOld: number;
  producerLongOther: number;
  producerShortOther: number;
  producerNetOther: number;
  // Swap Dealers
  swapLongAll: number;
  swapShortAll: number;
  swapSpreadAll: number;
  swapNetAll: number;
  swapLongOld: number;
  swapShortOld: number;
  swapSpreadOld: number;
  swapNetOld: number;
  swapLongOther: number;
  swapShortOther: number;
  swapSpreadOther: number;
  swapNetOther: number;
  // Managed Money (Specs)
  mmLongAll: number;
  mmShortAll: number;
  mmSpreadAll: number;
  mmNetAll: number;
  mmLongOld: number;
  mmShortOld: number;
  mmSpreadOld: number;
  mmNetOld: number;
  mmLongOther: number;
  mmShortOther: number;
  mmSpreadOther: number;
  mmNetOther: number;
  // Other Reportables
  otherLongAll: number;
  otherShortAll: number;
  otherSpreadAll: number;
  otherNetAll: number;
  otherLongOld: number;
  otherShortOld: number;
  otherSpreadOld: number;
  otherNetOld: number;
  otherLongOther: number;
  otherShortOther: number;
  otherSpreadOther: number;
  otherNetOther: number;
  // Non-Reportables
  nonReptLongAll: number;
  nonReptShortAll: number;
  nonReptNetAll: number;
  nonReptLongOld: number;
  nonReptShortOld: number;
  nonReptNetOld: number;
  nonReptLongOther: number;
  nonReptShortOther: number;
  nonReptNetOther: number;
  // Calculated: Spec = MM + Other
  specNetAll: number;
  specNetOld: number;
  specNetOther: number;
}

// Parse a single row of CFTC data
export function parseRow(row: string): COTRecord | null {
  // Split by comma, handling quoted fields
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of row) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());

  if (fields.length < 55) return null;

  const parseNum = (s: string): number => {
    const cleaned = s.replace(/[^0-9.-]/g, "");
    return cleaned ? parseFloat(cleaned) : 0;
  };

  const date = fields[2]; // Report_Date_as_YYYY-MM-DD

  // ALL positions
  const openInterestAll = parseNum(fields[7]);
  const producerLongAll = parseNum(fields[8]);
  const producerShortAll = parseNum(fields[9]);
  const swapLongAll = parseNum(fields[10]);
  const swapShortAll = parseNum(fields[11]);
  const swapSpreadAll = parseNum(fields[12]);
  const mmLongAll = parseNum(fields[13]);
  const mmShortAll = parseNum(fields[14]);
  const mmSpreadAll = parseNum(fields[15]);
  const otherLongAll = parseNum(fields[16]);
  const otherShortAll = parseNum(fields[17]);
  const otherSpreadAll = parseNum(fields[18]);
  const nonReptLongAll = parseNum(fields[21]);
  const nonReptShortAll = parseNum(fields[22]);

  // OLD positions
  const openInterestOld = parseNum(fields[23]);
  const producerLongOld = parseNum(fields[24]);
  const producerShortOld = parseNum(fields[25]);
  const swapLongOld = parseNum(fields[26]);
  const swapShortOld = parseNum(fields[27]);
  const swapSpreadOld = parseNum(fields[28]);
  const mmLongOld = parseNum(fields[29]);
  const mmShortOld = parseNum(fields[30]);
  const mmSpreadOld = parseNum(fields[31]);
  const otherLongOld = parseNum(fields[32]);
  const otherShortOld = parseNum(fields[33]);
  const otherSpreadOld = parseNum(fields[34]);
  const nonReptLongOld = parseNum(fields[37]);
  const nonReptShortOld = parseNum(fields[38]);

  // OTHER positions (new crop)
  const openInterestOther = parseNum(fields[39]);
  const producerLongOther = parseNum(fields[40]);
  const producerShortOther = parseNum(fields[41]);
  const swapLongOther = parseNum(fields[42]);
  const swapShortOther = parseNum(fields[43]);
  const swapSpreadOther = parseNum(fields[44]);
  const mmLongOther = parseNum(fields[45]);
  const mmShortOther = parseNum(fields[46]);
  const mmSpreadOther = parseNum(fields[47]);
  const otherLongOther = parseNum(fields[48]);
  const otherShortOther = parseNum(fields[49]);
  const otherSpreadOther = parseNum(fields[50]);
  const nonReptLongOther = parseNum(fields[53]);
  const nonReptShortOther = parseNum(fields[54]);

  // Calculate nets
  const producerNetAll = producerLongAll - producerShortAll;
  const producerNetOld = producerLongOld - producerShortOld;
  const producerNetOther = producerLongOther - producerShortOther;

  const swapNetAll = swapLongAll - swapShortAll;
  const swapNetOld = swapLongOld - swapShortOld;
  const swapNetOther = swapLongOther - swapShortOther;

  const mmNetAll = mmLongAll - mmShortAll;
  const mmNetOld = mmLongOld - mmShortOld;
  const mmNetOther = mmLongOther - mmShortOther;

  const otherNetAll = otherLongAll - otherShortAll;
  const otherNetOld = otherLongOld - otherShortOld;
  const otherNetOther = otherLongOther - otherShortOther;

  const nonReptNetAll = nonReptLongAll - nonReptShortAll;
  const nonReptNetOld = nonReptLongOld - nonReptShortOld;
  const nonReptNetOther = nonReptLongOther - nonReptShortOther;

  // Spec = MM + Other
  const specNetAll = mmNetAll + otherNetAll;
  const specNetOld = mmNetOld + otherNetOld;
  const specNetOther = mmNetOther + otherNetOther;

  return {
    date,
    openInterestAll, openInterestOld, openInterestOther,
    producerLongAll, producerShortAll, producerNetAll,
    producerLongOld, producerShortOld, producerNetOld,
    producerLongOther, producerShortOther, producerNetOther,
    swapLongAll, swapShortAll, swapSpreadAll, swapNetAll,
    swapLongOld, swapShortOld, swapSpreadOld, swapNetOld,
    swapLongOther, swapShortOther, swapSpreadOther, swapNetOther,
    mmLongAll, mmShortAll, mmSpreadAll, mmNetAll,
    mmLongOld, mmShortOld, mmSpreadOld, mmNetOld,
    mmLongOther, mmShortOther, mmSpreadOther, mmNetOther,
    otherLongAll, otherShortAll, otherSpreadAll, otherNetAll,
    otherLongOld, otherShortOld, otherSpreadOld, otherNetOld,
    otherLongOther, otherShortOther, otherSpreadOther, otherNetOther,
    nonReptLongAll, nonReptShortAll, nonReptNetAll,
    nonReptLongOld, nonReptShortOld, nonReptNetOld,
    nonReptLongOther, nonReptShortOther, nonReptNetOther,
    specNetAll, specNetOld, specNetOther,
  };
}

// Get years to fetch (2010 to current year)
export function getYearsToFetch(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = 2010; y <= currentYear; y++) {
    years.push(y);
  }
  return years;
}

// CFTC data URL for a given year
export function getCFTCUrl(year: number): string {
  return `https://www.cftc.gov/files/dea/history/com_disagg_txt_${year}.zip`;
}
