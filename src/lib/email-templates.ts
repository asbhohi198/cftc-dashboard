// Email template for CFTC positioning alerts

export interface COTSignalForEmail {
  signalType: string;
  signalLabel: string;
  commodity: string;
  sector: string;
  value: number;
  threshold: number;
  direction: "long" | "short" | "neutral";
  tradeInstruction?: string;
}

function getDirectionColor(direction: string): string {
  if (direction === "long") return "#22c55e";
  if (direction === "short") return "#ef4444";
  return "#a1a1aa";
}

function getDirectionBgColor(direction: string): string {
  if (direction === "long") return "#22c55e20";
  if (direction === "short") return "#ef444420";
  return "#3f3f46";
}

// Get color based on trade action (BUY = green, SELL = red)
function getTradeColor(tradeInstruction: string): string {
  if (tradeInstruction.startsWith("BUY")) return "#22c55e";
  if (tradeInstruction.startsWith("SELL")) return "#ef4444";
  return "#a1a1aa";
}

function getTradeBgColor(tradeInstruction: string): string {
  if (tradeInstruction.startsWith("BUY")) return "#22c55e20";
  if (tradeInstruction.startsWith("SELL")) return "#ef444420";
  return "#3f3f46";
}

function generateSignalRows(signals: COTSignalForEmail[]): string {
  return signals
    .map(
      (signal) => {
        const tradeColor = signal.tradeInstruction ? getTradeColor(signal.tradeInstruction) : getDirectionColor(signal.direction);
        const tradeBgColor = signal.tradeInstruction ? getTradeBgColor(signal.tradeInstruction) : getDirectionBgColor(signal.direction);
        return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #333; color: #e4e4e7; font-weight: 500;">${signal.commodity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #333; color: #a1a1aa; font-size: 12px;">${signal.signalLabel}</td>
        <td style="padding: 12px; border-bottom: 1px solid #333; color: ${getDirectionColor(signal.direction)}; font-weight: 600;">
          ${signal.value >= 0 ? "+" : ""}${signal.value.toFixed(2)}${signal.signalType.includes("Pct") ? "%" : "σ"}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #333;">
          ${signal.tradeInstruction ? `
            <span style="background-color: ${tradeBgColor}; color: ${tradeColor}; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
              ${signal.tradeInstruction}
            </span>
          ` : ""}
        </td>
      </tr>
    `;
      }
    )
    .join("");
}

function formatSignalValue(signal: COTSignalForEmail): string {
  // Seasonal signals don't need value display - the instruction says it all
  if (signal.signalType === "seasonalOutliers" || signal.signalLabel.startsWith("Seasonal")) {
    return "";
  }
  const prefix = signal.value >= 0 ? "+" : "";
  const suffix = signal.signalType.includes("Pct") ? "%" : "σ";
  return `${prefix}${signal.value.toFixed(2)}${suffix}`;
}

function formatSeasonalInstruction(instruction: string): string {
  // Make seasonal outlier instructions more readable
  // e.g. "MM Net: Record HIGH for this week" -> "MM Net at seasonal HIGH"
  if (instruction.includes("Record HIGH")) {
    const field = instruction.split(":")[0];
    return `${field} at SEASONAL HIGH`;
  }
  if (instruction.includes("Record LOW")) {
    const field = instruction.split(":")[0];
    return `${field} at SEASONAL LOW`;
  }
  return instruction;
}

function generateSignalCards(signals: COTSignalForEmail[]): string {
  return signals
    .map(
      (signal) => {
        const tradeColor = signal.tradeInstruction ? getTradeColor(signal.tradeInstruction) : getDirectionColor(signal.direction);
        const tradeBgColor = signal.tradeInstruction ? getTradeBgColor(signal.tradeInstruction) : getDirectionBgColor(signal.direction);
        const valueDisplay = formatSignalValue(signal);
        const isSeasonal = signal.signalType === "seasonalOutliers" || signal.signalLabel.startsWith("Seasonal");
        const instructionText = signal.tradeInstruction
          ? (isSeasonal ? formatSeasonalInstruction(signal.tradeInstruction) : signal.tradeInstruction)
          : "";
        // For seasonal signals: white text on solid colored background for better readability
        const instructionColor = isSeasonal ? "#ffffff" : tradeColor;
        const instructionBg = isSeasonal ? (signal.direction === "long" ? "#22c55e" : "#ef4444") : tradeBgColor;
        return `
      <div style="background-color: #1f1f23; border-radius: 8px; padding: 16px; margin-bottom: 12px; border-left: 3px solid ${tradeColor};">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="color: #e4e4e7; font-weight: 600; font-size: 14px;">${signal.commodity}</span>
            <span style="background-color: #3f3f46; color: #a1a1aa; font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">
              ${signal.sector.toUpperCase()}
            </span>
          </div>
          ${valueDisplay ? `
            <span style="color: ${getDirectionColor(signal.direction)}; font-weight: 700; font-size: 16px;">
              ${valueDisplay}
            </span>
          ` : ""}
        </div>
        <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #71717a; font-size: 12px;">${signal.signalLabel}</span>
          ${instructionText ? `
            <span style="background-color: ${instructionBg}; color: ${instructionColor}; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;">
              ${instructionText}
            </span>
          ` : ""}
        </div>
      </div>
    `;
      }
    )
    .join("");
}

export function generateCOTAlertEmail(
  subscriptionName: string,
  signals: COTSignalForEmail[],
  reportDate: string
): string {
  const totalSignals = signals.length;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Group signals by type
  const signalsByType: Record<string, COTSignalForEmail[]> = {};
  for (const signal of signals) {
    if (!signalsByType[signal.signalLabel]) {
      signalsByType[signal.signalLabel] = [];
    }
    signalsByType[signal.signalLabel].push(signal);
  }

  // Generate sections for each signal type
  const signalSections = Object.entries(signalsByType)
    .map(
      ([signalType, typeSignals]) => `
      <tr>
        <td style="padding: 0 24px 8px 24px;">
          <h2 style="margin: 0; color: #f97316; font-size: 16px; font-weight: 600;">
            ${signalType} (${typeSignals.length})
          </h2>
        </td>
      </tr>
      <tr>
        <td style="padding: 0 24px 24px 24px;">
          ${generateSignalCards(typeSignals)}
        </td>
      </tr>
    `
    )
    .join("");

  const noSignalsSection =
    totalSignals === 0
      ? `
    <tr>
      <td style="padding: 0 24px 24px 24px;">
        <div style="background-color: #27272a; border-radius: 8px; padding: 24px; text-align: center;">
          <p style="margin: 0; color: #71717a;">No signals matching your criteria this week</p>
        </div>
      </td>
    </tr>
  `
      : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CFTC Positioning Alert</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #09090b; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #18181b; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #f97316; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">
                CFTC Positioning Alert
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                ${subscriptionName}
              </p>
            </td>
          </tr>

          <!-- Summary -->
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 8px 0; color: #a1a1aa; font-size: 14px;">
                ${today}
              </p>
              <p style="margin: 0 0 8px 0; color: #71717a; font-size: 12px;">
                COT Report Date: ${reportDate}
              </p>
              <p style="margin: 0 0 8px 0; color: #e4e4e7; font-size: 16px;">
                <strong style="color: #f97316;">${totalSignals}</strong> positioning signals detected
              </p>
            </td>
          </tr>

          ${signalSections}
          ${noSignalsSection}

          <!-- CTA -->
          <tr>
            <td style="padding: 0 24px 24px 24px; text-align: center;">
              <a href="https://cftc-dashboard.vercel.app"
                 style="display: inline-block; background-color: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                View Dashboard
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px; border-top: 1px solid #27272a; text-align: center;">
              <p style="margin: 0; color: #71717a; font-size: 12px;">
                This is an automated alert from the CFTC Dashboard.
                <br>
                To manage your subscriptions, visit the Email Subs tab in the dashboard.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
