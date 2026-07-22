import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const SUBSCRIPTIONS_KEY = "cftc_email_subscriptions";

export interface EmailSubscription {
  id: string;
  name: string;
  frequency: "daily" | "weekly";
  signalTypes: string[]; // "ALL", "rvs", "changes", "extremes"
  sectors: string[]; // "ALL", "ags", "energy", "metals", "equities", "rates", "fx", "crypto"
  minZScore: number;
  recipients: string[];
  enabled: boolean;
  createdAt: string;
  lastSentAt: string | null;
}

// GET - Fetch all subscriptions
export async function GET() {
  try {
    const subscriptions = await redis.get<EmailSubscription[]>(SUBSCRIPTIONS_KEY);
    return NextResponse.json({ subscriptions: subscriptions || [] });
  } catch (error) {
    console.error("Failed to fetch subscriptions:", error);
    return NextResponse.json({ subscriptions: [] });
  }
}

// POST - Create new subscription
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const newSub: EmailSubscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: body.name,
      frequency: body.frequency,
      signalTypes: body.signalTypes,
      sectors: body.sectors,
      minZScore: body.minZScore,
      recipients: body.recipients,
      enabled: body.enabled ?? true,
      createdAt: new Date().toISOString(),
      lastSentAt: null,
    };

    const subscriptions = await redis.get<EmailSubscription[]>(SUBSCRIPTIONS_KEY) || [];
    subscriptions.push(newSub);
    await redis.set(SUBSCRIPTIONS_KEY, subscriptions);

    return NextResponse.json({ subscription: newSub });
  } catch (error) {
    console.error("Failed to create subscription:", error);
    return NextResponse.json(
      { error: "Failed to create subscription" },
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
      signalTypes: body.signalTypes ?? subscriptions[index].signalTypes,
      sectors: body.sectors ?? subscriptions[index].sectors,
      minZScore: body.minZScore ?? subscriptions[index].minZScore,
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
