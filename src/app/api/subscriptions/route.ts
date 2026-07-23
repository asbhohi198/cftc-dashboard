import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const SUBSCRIPTIONS_KEY = "cftc_email_subscriptions";

// Signal configuration with individual thresholds
interface SignalConfig {
  enabled: boolean;
  threshold: number;
}

export interface EmailSubscription {
  id: string;
  name: string;
  frequency: "daily" | "weekly";
  sectors: string[]; // "ALL", "ags", "energy", "metals", "equities", "rates", "fx", "crypto"
  // Individual signal configs with thresholds
  signals: {
    mmPctHistMax: SignalConfig;      // Net MM as % historical max (% threshold)
    mmPctOI: SignalConfig;           // Net MM as % of OI (z-score threshold)
    weeklyMmChange: SignalConfig;    // Weekly net MM change (z-score threshold)
    tradersPctLongShort: SignalConfig; // COT traders % long/short (% threshold)
    cotRvs: SignalConfig;            // COT - RVs (z-score threshold)
    cotVsSpreads: SignalConfig;      // COT vs Spreads (z-score threshold)
    citRollPosition: SignalConfig;   // CIT Roll Position alerts (z-score threshold)
    seasonalOutliers: SignalConfig;  // Seasonal record alerts (toggle only)
  };
  recipients: string[];
  enabled: boolean;
  createdAt: string;
  lastSentAt: string | null;
}

// GET - Fetch all subscriptions
export async function GET() {
  try {
    console.log("Fetching subscriptions from Redis...");
    console.log("Redis URL configured:", !!process.env.KV_REST_API_URL);
    console.log("Redis Token configured:", !!process.env.KV_REST_API_TOKEN);

    const subscriptions = await redis.get<EmailSubscription[]>(SUBSCRIPTIONS_KEY);
    console.log("Fetched subscriptions:", subscriptions?.length || 0);
    return NextResponse.json({ subscriptions: subscriptions || [] });
  } catch (error) {
    console.error("Failed to fetch subscriptions:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ subscriptions: [], error: errorMessage });
  }
}

// POST - Create new subscription
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Creating subscription with body:", JSON.stringify(body));

    const newSub: EmailSubscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: body.name,
      frequency: body.frequency,
      sectors: body.sectors,
      signals: body.signals,
      recipients: body.recipients,
      enabled: body.enabled ?? true,
      createdAt: new Date().toISOString(),
      lastSentAt: null,
    };

    console.log("New subscription object:", JSON.stringify(newSub));

    const subscriptions = await redis.get<EmailSubscription[]>(SUBSCRIPTIONS_KEY) || [];
    console.log("Existing subscriptions count:", subscriptions.length);

    subscriptions.push(newSub);
    await redis.set(SUBSCRIPTIONS_KEY, subscriptions);
    console.log("Subscription saved successfully");

    return NextResponse.json({ subscription: newSub });
  } catch (error) {
    console.error("Failed to create subscription:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create subscription: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// PUT - Update subscription
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Subscription ID required" },
        { status: 400 }
      );
    }

    const subscriptions = await redis.get<EmailSubscription[]>(SUBSCRIPTIONS_KEY) || [];
    const index = subscriptions.findIndex(s => s.id === body.id);

    if (index === -1) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    // Update fields
    subscriptions[index] = {
      ...subscriptions[index],
      name: body.name ?? subscriptions[index].name,
      frequency: body.frequency ?? subscriptions[index].frequency,
      sectors: body.sectors ?? subscriptions[index].sectors,
      signals: body.signals ?? subscriptions[index].signals,
      recipients: body.recipients ?? subscriptions[index].recipients,
      enabled: body.enabled ?? subscriptions[index].enabled,
    };

    await redis.set(SUBSCRIPTIONS_KEY, subscriptions);

    return NextResponse.json({ subscription: subscriptions[index] });
  } catch (error) {
    console.error("Failed to update subscription:", error);
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}

// DELETE - Delete subscription
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Subscription ID required" },
        { status: 400 }
      );
    }

    const subscriptions = await redis.get<EmailSubscription[]>(SUBSCRIPTIONS_KEY) || [];
    const filtered = subscriptions.filter(s => s.id !== id);

    if (filtered.length === subscriptions.length) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    await redis.set(SUBSCRIPTIONS_KEY, filtered);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete subscription:", error);
    return NextResponse.json(
      { error: "Failed to delete subscription" },
      { status: 500 }
    );
  }
}
