// CFTC Contract Codes
export const CFTC_CONTRACTS = {
  // Grains & Oilseeds
  corn: { code: "002602", name: "Corn", exchange: "CBOT", marketName: "CORN - CHICAGO BOARD OF TRADE" },
  "chicago-wheat": { code: "001602", name: "Chicago Wheat", exchange: "CBOT", marketName: "WHEAT-SRW - CHICAGO BOARD OF TRADE" },
  "kansas-wheat": { code: "001612", name: "Kansas Wheat", exchange: "KCBT", marketName: "WHEAT-HRW - KANSAS CITY BOARD OF TRADE" },
  "minneapolis-wheat": { code: "001626", name: "Minneapolis Wheat", exchange: "MGEX", marketName: "WHEAT-HRS - MINNEAPOLIS GRAIN EXCHANGE" },
  soybeans: { code: "005602", name: "Soybeans", exchange: "CBOT", marketName: "SOYBEANS - CHICAGO BOARD OF TRADE" },
  soymeal: { code: "026603", name: "Soybean Meal", exchange: "CBOT", marketName: "SOYBEAN MEAL - CHICAGO BOARD OF TRADE" },
  soyoil: { code: "007601", name: "Soybean Oil", exchange: "CBOT", marketName: "SOYBEAN OIL - CHICAGO BOARD OF TRADE" },
  oats: { code: "004603", name: "Oats", exchange: "CBOT", marketName: "OATS - CHICAGO BOARD OF TRADE" },
  "rough-rice": { code: "039601", name: "Rough Rice", exchange: "CBOT", marketName: "ROUGH RICE - CHICAGO BOARD OF TRADE" },
  // Softs
  sugar: { code: "080732", name: "Sugar #11", exchange: "ICE", marketName: "SUGAR NO. 11 - ICE FUTURES U.S." },
  cotton: { code: "033661", name: "Cotton", exchange: "ICE", marketName: "COTTON NO. 2 - ICE FUTURES U.S." },
  "arabica-coffee": { code: "083731", name: "Coffee C", exchange: "ICE", marketName: "COFFEE C - ICE FUTURES U.S." },
  "ny-cocoa": { code: "073732", name: "Cocoa", exchange: "ICE", marketName: "COCOA - ICE FUTURES U.S." },
  // Livestock
  "live-cattle": { code: "057642", name: "Live Cattle", exchange: "CME", marketName: "LIVE CATTLE - CHICAGO MERCANTILE EXCHANGE" },
  "feeder-cattle": { code: "061641", name: "Feeder Cattle", exchange: "CME", marketName: "FEEDER CATTLE - CHICAGO MERCANTILE EXCHANGE" },
  "lean-hogs": { code: "054642", name: "Lean Hogs", exchange: "CME", marketName: "LEAN HOGS - CHICAGO MERCANTILE EXCHANGE" },
} as const;

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
