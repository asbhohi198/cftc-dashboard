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
  openInterest: number;
  [key: string]: string | number;
}

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

  // Use production URL for fetching data
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://cftc-dashboard.vercel.app";

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

    const results: Array<{ id: string; name: string; success: boolean; error?: string; signalCount?: number }> = [];

    for (const sub of subsToProcess) {
      try {
        console.log(`Processing subscription: ${sub.name}`);
        const allSignals: COTSignalForEmail[] = [];

        // COT RVs signals
        if (sub.signals.cotRvs?.enabled) {
          const rvSignals = await getCOTRVSignals(baseUrl, sub.sectors, sub.signals.cotRvs.threshold);
          allSignals.push(...rvSignals);
          console.log(`Found ${rvSignals.length} COT RV signals`);
        }

        // TODO: Add other signal types as needed
        // mmPctHistMax, mmPctOI, weeklyMmChange, tradersPctLongShort, cotVsSpreads, citRollPosition

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
