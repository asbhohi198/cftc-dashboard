// Report types
export type ReportType = "disagg" | "tff";

// CFTC Contract Codes
export const CFTC_CONTRACTS = {
  // Grains & Oilseeds (Disaggregated Report)
  corn: { code: "002602", name: "Corn", exchange: "CBOT", marketName: "CORN - CHICAGO BOARD OF TRADE", category: "ags", reportType: "disagg" as ReportType },
  "chicago-wheat": { code: "001602", name: "Chicago Wheat", exchange: "CBOT", marketName: "WHEAT-SRW - CHICAGO BOARD OF TRADE", category: "ags", reportType: "disagg" as ReportType },
  "kansas-wheat": { code: "001612", name: "Kansas Wheat", exchange: "KCBT", marketName: "WHEAT-HRW - KANSAS CITY BOARD OF TRADE", category: "ags", reportType: "disagg" as ReportType },
  "minneapolis-wheat": { code: "001626", name: "Minneapolis Wheat", exchange: "MGEX", marketName: "WHEAT-HRS - MINNEAPOLIS GRAIN EXCHANGE", category: "ags", reportType: "disagg" as ReportType },
  soybeans: { code: "005602", name: "Soybeans", exchange: "CBOT", marketName: "SOYBEANS - CHICAGO BOARD OF TRADE", category: "ags", reportType: "disagg" as ReportType },
  soymeal: { code: "026603", name: "Soybean Meal", exchange: "CBOT", marketName: "SOYBEAN MEAL - CHICAGO BOARD OF TRADE", category: "ags", reportType: "disagg" as ReportType },
  soyoil: { code: "007601", name: "Soybean Oil", exchange: "CBOT", marketName: "SOYBEAN OIL - CHICAGO BOARD OF TRADE", category: "ags", reportType: "disagg" as ReportType },
  oats: { code: "004603", name: "Oats", exchange: "CBOT", marketName: "OATS - CHICAGO BOARD OF TRADE", category: "ags", reportType: "disagg" as ReportType },
  "rough-rice": { code: "039601", name: "Rough Rice", exchange: "CBOT", marketName: "ROUGH RICE - CHICAGO BOARD OF TRADE", category: "ags", reportType: "disagg" as ReportType },
  "orange-juice": { code: "040701", name: "Orange Juice", exchange: "ICE", marketName: "FRZN CONCENTRATED ORANGE JUICE - ICE FUTURES U.S.", category: "ags", reportType: "disagg" as ReportType },
  "lumber": { code: "058643", name: "Lumber", exchange: "CME", marketName: "RANDOM LENGTH LUMBER - CHICAGO MERCANTILE EXCHANGE", category: "ags", reportType: "disagg" as ReportType },
  "milk": { code: "052641", name: "Class III Milk", exchange: "CME", marketName: "MILK, Class III - CHICAGO MERCANTILE EXCHANGE", category: "ags", reportType: "disagg" as ReportType },
  // Softs (Disaggregated Report)
  sugar: { code: "080732", name: "Sugar #11", exchange: "ICE", marketName: "SUGAR NO. 11 - ICE FUTURES U.S.", category: "ags", reportType: "disagg" as ReportType },
  cotton: { code: "033661", name: "Cotton", exchange: "ICE", marketName: "COTTON NO. 2 - ICE FUTURES U.S.", category: "ags", reportType: "disagg" as ReportType },
  "arabica-coffee": { code: "083731", name: "Coffee C", exchange: "ICE", marketName: "COFFEE C - ICE FUTURES U.S.", category: "ags", reportType: "disagg" as ReportType },
  "ny-cocoa": { code: "073732", name: "Cocoa", exchange: "ICE", marketName: "COCOA - ICE FUTURES U.S.", category: "ags", reportType: "disagg" as ReportType },
  // Livestock (Disaggregated Report)
  "live-cattle": { code: "057642", name: "Live Cattle", exchange: "CME", marketName: "LIVE CATTLE - CHICAGO MERCANTILE EXCHANGE", category: "ags", reportType: "disagg" as ReportType },
  "feeder-cattle": { code: "061641", name: "Feeder Cattle", exchange: "CME", marketName: "FEEDER CATTLE - CHICAGO MERCANTILE EXCHANGE", category: "ags", reportType: "disagg" as ReportType },
  "lean-hogs": { code: "054642", name: "Lean Hogs", exchange: "CME", marketName: "LEAN HOGS - CHICAGO MERCANTILE EXCHANGE", category: "ags", reportType: "disagg" as ReportType },
  // Energy (Disaggregated Report)
  "wti-crude": { code: "067651", name: "WTI Crude Oil", exchange: "NYMEX", marketName: "CRUDE OIL, LIGHT SWEET - NEW YORK MERCANTILE EXCHANGE", category: "energy", reportType: "disagg" as ReportType },
  "brent-crude": { code: "06765T", name: "Brent Crude Oil", exchange: "ICE", marketName: "BRENT LAST DAY - ICE FUTURES EUROPE", category: "energy", reportType: "disagg" as ReportType },
  "natural-gas": { code: "023651", name: "Natural Gas", exchange: "NYMEX", marketName: "NATURAL GAS - NEW YORK MERCANTILE EXCHANGE", category: "energy", reportType: "disagg" as ReportType },
  "rbob-gasoline": { code: "111659", name: "RBOB Gasoline", exchange: "NYMEX", marketName: "RBOB GASOLINE - NEW YORK MERCANTILE EXCHANGE", category: "energy", reportType: "disagg" as ReportType },
  "heating-oil": { code: "022651", name: "Heating Oil", exchange: "NYMEX", marketName: "NO. 2 HEATING OIL - NEW YORK MERCANTILE EXCHANGE", category: "energy", reportType: "disagg" as ReportType },
  // Metals (Disaggregated Report)
  "gold": { code: "088691", name: "Gold", exchange: "COMEX", marketName: "GOLD - COMMODITY EXCHANGE INC.", category: "metals", reportType: "disagg" as ReportType },
  "silver": { code: "084691", name: "Silver", exchange: "COMEX", marketName: "SILVER - COMMODITY EXCHANGE INC.", category: "metals", reportType: "disagg" as ReportType },
  "copper": { code: "085692", name: "Copper", exchange: "COMEX", marketName: "COPPER- #1 - COMMODITY EXCHANGE INC.", category: "metals", reportType: "disagg" as ReportType },
  "platinum": { code: "076651", name: "Platinum", exchange: "NYMEX", marketName: "PLATINUM - NEW YORK MERCANTILE EXCHANGE", category: "metals", reportType: "disagg" as ReportType },
  "palladium": { code: "075651", name: "Palladium", exchange: "NYMEX", marketName: "PALLADIUM - NEW YORK MERCANTILE EXCHANGE", category: "metals", reportType: "disagg" as ReportType },
  // Equities (TFF Report - Traders in Financial Futures)
  "sp500": { code: "13874A", name: "S&P 500 E-mini", exchange: "CME", marketName: "E-MINI S&P 500 STOCK INDEX", category: "equities", reportType: "tff" as ReportType },
  "nasdaq100": { code: "209742", name: "Nasdaq 100 E-mini", exchange: "CME", marketName: "NASDAQ-100 STOCK INDEX (MINI)", category: "equities", reportType: "tff" as ReportType },
  "dow": { code: "124603", name: "Dow Jones E-mini", exchange: "CBOT", marketName: "DJIA Consolidated", category: "equities", reportType: "tff" as ReportType },
  "russell2000": { code: "239742", name: "Russell 2000 E-mini", exchange: "CME", marketName: "E-MINI RUSSELL 2000 INDEX", category: "equities", reportType: "tff" as ReportType },
  "vix": { code: "1170E1", name: "VIX Futures", exchange: "CFE", marketName: "VIX FUTURES", category: "equities", reportType: "tff" as ReportType },
  // Rates (TFF Report)
  "10y-note": { code: "043602", name: "10-Year T-Note", exchange: "CBOT", marketName: "10-YEAR U.S. TREASURY NOTES", category: "rates", reportType: "tff" as ReportType },
  "2y-note": { code: "042601", name: "2-Year T-Note", exchange: "CBOT", marketName: "2-YEAR U.S. TREASURY NOTES", category: "rates", reportType: "tff" as ReportType },
  "5y-note": { code: "044601", name: "5-Year T-Note", exchange: "CBOT", marketName: "5-YEAR U.S. TREASURY NOTES", category: "rates", reportType: "tff" as ReportType },
  "30y-bond": { code: "020601", name: "30-Year T-Bond", exchange: "CBOT", marketName: "U.S. TREASURY BONDS", category: "rates", reportType: "tff" as ReportType },
  "fed-funds": { code: "045601", name: "Fed Funds", exchange: "CBOT", marketName: "30-DAY FEDERAL FUNDS", category: "rates", reportType: "tff" as ReportType },
  "sofr": { code: "134741", name: "SOFR 3-Month", exchange: "CME", marketName: "3-MONTH SOFR", category: "rates", reportType: "tff" as ReportType },
  // FX (TFF Report)
  "eurusd": { code: "099741", name: "Euro FX", exchange: "CME", marketName: "EURO FX", category: "fx", reportType: "tff" as ReportType },
  "usdjpy": { code: "097741", name: "Japanese Yen", exchange: "CME", marketName: "JAPANESE YEN", category: "fx", reportType: "tff" as ReportType },
  "gbpusd": { code: "096742", name: "British Pound", exchange: "CME", marketName: "BRITISH POUND STERLING", category: "fx", reportType: "tff" as ReportType },
  "usdcad": { code: "090741", name: "Canadian Dollar", exchange: "CME", marketName: "CANADIAN DOLLAR", category: "fx", reportType: "tff" as ReportType },
  "audusd": { code: "232741", name: "Australian Dollar", exchange: "CME", marketName: "AUSTRALIAN DOLLAR", category: "fx", reportType: "tff" as ReportType },
  "usdchf": { code: "092741", name: "Swiss Franc", exchange: "CME", marketName: "SWISS FRANC", category: "fx", reportType: "tff" as ReportType },
  "usdmxn": { code: "095741", name: "Mexican Peso", exchange: "CME", marketName: "MEXICAN PESO", category: "fx", reportType: "tff" as ReportType },
  "nzdusd": { code: "112741", name: "NZ Dollar", exchange: "CME", marketName: "NEW ZEALAND DOLLAR", category: "fx", reportType: "tff" as ReportType },
  "usdzar": { code: "122741", name: "South African Rand", exchange: "CME", marketName: "SOUTH AFRICAN RAND", category: "fx", reportType: "tff" as ReportType },
  "usdbrl": { code: "102741", name: "Brazilian Real", exchange: "CME", marketName: "BRAZILIAN REAL", category: "fx", reportType: "tff" as ReportType },
  "dxy": { code: "098662", name: "US Dollar Index", exchange: "ICE", marketName: "U.S. DOLLAR INDEX", category: "fx", reportType: "tff" as ReportType },
  // Crypto (TFF Report)
  "bitcoin": { code: "133741", name: "Bitcoin", exchange: "CME", marketName: "BITCOIN", category: "crypto", reportType: "tff" as ReportType },
  "ethereum": { code: "146021", name: "Ethereum", exchange: "CME", marketName: "ETHER", category: "crypto", reportType: "tff" as ReportType },
} as const;

export type AssetCategory = "ags" | "energy" | "metals" | "equities" | "rates" | "fx" | "crypto";

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

// CFTC data URL for a given year and report type
export function getCFTCUrl(year: number, reportType: ReportType = "disagg"): string {
  if (reportType === "tff") {
    return `https://www.cftc.gov/files/dea/history/fut_fin_txt_${year}.zip`;
  }
  return `https://www.cftc.gov/files/dea/history/com_disagg_txt_${year}.zip`;
}

// Parse a TFF (Traders in Financial Futures) row
// TFF has different columns: Dealer, Asset Manager, Leveraged Funds, Other Reportables
export function parseTFFRow(row: string): COTRecord | null {
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

  if (fields.length < 40) return null;

  const parseNum = (s: string): number => {
    const cleaned = s.replace(/[^0-9.-]/g, "");
    return cleaned ? parseFloat(cleaned) : 0;
  };

  const date = fields[2]; // Report_Date_as_YYYY-MM-DD

  // TFF columns (futures only report):
  // Open Interest, Dealer Long, Dealer Short, Dealer Spread,
  // Asset Manager Long, Asset Manager Short, Asset Manager Spread,
  // Leveraged Funds Long, Leveraged Funds Short, Leveraged Funds Spread,
  // Other Reportables Long, Other Reportables Short, Other Reportables Spread

  const openInterestAll = parseNum(fields[7]);

  // Dealer/Intermediary (maps to Producer/Swap combination)
  const dealerLong = parseNum(fields[8]);
  const dealerShort = parseNum(fields[9]);
  const dealerSpread = parseNum(fields[10]);

  // Asset Manager/Institutional (maps to Swap Dealer in our model)
  const assetMgrLong = parseNum(fields[11]);
  const assetMgrShort = parseNum(fields[12]);
  const assetMgrSpread = parseNum(fields[13]);

  // Leveraged Funds (this IS Managed Money)
  const leveragedLong = parseNum(fields[14]);
  const leveragedShort = parseNum(fields[15]);
  const leveragedSpread = parseNum(fields[16]);

  // Other Reportables
  const otherLong = parseNum(fields[17]);
  const otherShort = parseNum(fields[18]);
  const otherSpread = parseNum(fields[19]);

  // Non-reportables (calculated or from fields 22-23)
  const nonReptLong = parseNum(fields[22]) || 0;
  const nonReptShort = parseNum(fields[23]) || 0;

  // Map TFF categories to our COTRecord structure:
  // - Dealer → Producer (commercial equivalent)
  // - Asset Manager → Swap Dealer
  // - Leveraged Funds → Managed Money
  // - Other Reportables → Other Reportables

  const producerNetAll = dealerLong - dealerShort;
  const swapNetAll = assetMgrLong - assetMgrShort;
  const mmNetAll = leveragedLong - leveragedShort;
  const otherNetAll = otherLong - otherShort;
  const nonReptNetAll = nonReptLong - nonReptShort;
  const specNetAll = mmNetAll + otherNetAll;

  // Financial futures don't have old/new crop splits - use same values for all
  return {
    date,
    openInterestAll, openInterestOld: openInterestAll, openInterestOther: 0,
    producerLongAll: dealerLong, producerShortAll: dealerShort, producerNetAll,
    producerLongOld: dealerLong, producerShortOld: dealerShort, producerNetOld: producerNetAll,
    producerLongOther: 0, producerShortOther: 0, producerNetOther: 0,
    swapLongAll: assetMgrLong, swapShortAll: assetMgrShort, swapSpreadAll: assetMgrSpread, swapNetAll,
    swapLongOld: assetMgrLong, swapShortOld: assetMgrShort, swapSpreadOld: assetMgrSpread, swapNetOld: swapNetAll,
    swapLongOther: 0, swapShortOther: 0, swapSpreadOther: 0, swapNetOther: 0,
    mmLongAll: leveragedLong, mmShortAll: leveragedShort, mmSpreadAll: leveragedSpread, mmNetAll,
    mmLongOld: leveragedLong, mmShortOld: leveragedShort, mmSpreadOld: leveragedSpread, mmNetOld: mmNetAll,
    mmLongOther: 0, mmShortOther: 0, mmSpreadOther: 0, mmNetOther: 0,
    otherLongAll: otherLong, otherShortAll: otherShort, otherSpreadAll: otherSpread, otherNetAll,
    otherLongOld: otherLong, otherShortOld: otherShort, otherSpreadOld: otherSpread, otherNetOld: otherNetAll,
    otherLongOther: 0, otherShortOther: 0, otherSpreadOther: 0, otherNetOther: 0,
    nonReptLongAll: nonReptLong, nonReptShortAll: nonReptShort, nonReptNetAll,
    nonReptLongOld: nonReptLong, nonReptShortOld: nonReptShort, nonReptNetOld: nonReptNetAll,
    nonReptLongOther: 0, nonReptShortOther: 0, nonReptNetOther: 0,
    specNetAll, specNetOld: specNetAll, specNetOther: 0,
  };
}
