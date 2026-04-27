import { NextResponse } from "next/server";

interface SummaryChange {
  indicator: string;
  change: string;
  signal: string;
  description: string;
}

interface FlaggedSeries {
  seriesKey: string;
  seriesLabel: string;
  latestValue: number;
  percentile: number;
  isHigh: boolean;
  isPercentage: boolean;
}

interface CommodityScreening {
  id: string;
  label: string;
  category: string;
  flaggedSeries: FlaggedSeries[];
}

interface ScreeningResponse {
  success: boolean;
  positionDate: string;
  data: CommodityScreening[];
}

export async function GET(request: Request) {
  const baseUrl = new URL(request.url).origin;

  try {
    // Fetch the screening data
    const screeningRes = await fetch(`${baseUrl}/api/screening`, { cache: "no-store" });
    const screening: ScreeningResponse = await screeningRes.json();

    if (!screening.success || !screening.data) {
      return NextResponse.json({ changes: [], generatedAt: new Date().toISOString() });
    }

    // Collect all flagged series across all commodities
    const allFlagged: { commodity: string; series: FlaggedSeries }[] = [];

    for (const commodity of screening.data) {
      for (const series of commodity.flaggedSeries) {
        allFlagged.push({ commodity: commodity.label, series });
      }
    }

    // Sort by how extreme the percentile is (closest to 0 or 100)
    allFlagged.sort((a, b) => {
      const aExtreme = Math.min(a.series.percentile, 100 - a.series.percentile);
      const bExtreme = Math.min(b.series.percentile, 100 - b.series.percentile);
      return aExtreme - bExtreme;
    });

    // Take top 5 most extreme
    const top5 = allFlagged.slice(0, 5);

    const changes: SummaryChange[] = top5.map(({ commodity, series }) => {
      const percentileStr = series.isHigh
        ? `${series.percentile.toFixed(0)}th percentile`
        : `${series.percentile.toFixed(0)}th percentile`;

      const signal = series.isHigh ? "EXTREME HIGH" : "EXTREME LOW";

      const valueStr = series.isPercentage
        ? `${series.latestValue.toFixed(1)}% of OI`
        : series.latestValue.toLocaleString();

      return {
        indicator: `${commodity} - ${series.seriesLabel}`,
        change: percentileStr,
        signal,
        description: `${series.seriesLabel} at ${valueStr} (${percentileStr})`,
      };
    });

    return NextResponse.json({
      changes,
      generatedAt: new Date().toISOString(),
      positionDate: screening.positionDate,
    });
  } catch (error) {
    console.error("Error in daily-summary:", error);
    return NextResponse.json({ changes: [], generatedAt: new Date().toISOString() });
  }
}
