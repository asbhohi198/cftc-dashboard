"use client";

export function GuideTab() {
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">How to Trade Positioning Data</h2>
        <p className="text-sm text-zinc-500 mt-2">
          Summarized from Brent Donnelly's Spectra Markets research
        </p>
      </div>

      {/* Key Concept */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h3 className="text-lg font-semibold text-orange-400 mb-4">Key Concept: The Fire Triangle</h3>
        <p className="text-zinc-300 text-sm mb-4">
          Positioning is packed with potential energy, like fuel for a future fire. Position unwinds need three things:
        </p>
        <ul className="space-y-2 text-sm text-zinc-400">
          <li className="flex items-start gap-2">
            <span className="text-red-400 font-bold">Heat:</span>
            <span>A spark or catalyst</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-400 font-bold">Fuel:</span>
            <span>Large positions</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-400 font-bold">Oxygen:</span>
            <span>More bad news or mark-to-market losses triggering feedback loops</span>
          </li>
        </ul>
      </div>

      {/* Five Ways to Trade Positioning */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h3 className="text-lg font-semibold text-orange-400 mb-6">Five Ways to Trade Positioning</h3>

        <div className="space-y-6">
          {/* Method 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 border-l-2 border-zinc-700 pl-4">
              <h4 className="text-white font-medium mb-2">1. Play for extreme positioning to burn itself out</h4>
              <ul className="space-y-1 text-sm text-zinc-400">
                <li>Wait for 2-3 standard deviation extremes and take the other side</li>
                <li>This is simplistic on its own - use as a starting point for investigation</li>
                <li>Look for other inputs to improve timing or raise odds of reversal</li>
              </ul>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Trade Idea</div>
              <div className="text-cyan-400 font-semibold">Short Gold</div>
              <p className="text-xs text-zinc-500 mt-1">Managed money net long at 98th percentile after safe-haven bid; stretched positioning vulnerable to mean reversion</p>
            </div>
          </div>

          {/* Method 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 border-l-2 border-zinc-700 pl-4">
              <h4 className="text-white font-medium mb-2">2. Extreme positioning + extreme narrative</h4>
              <ul className="space-y-1 text-sm text-zinc-400">
                <li>Magazine cover indicator (e.g., The Economist cover story)</li>
                <li>Every strategist has the same view</li>
                <li>Outrageous price targets coming out of the woodwork</li>
              </ul>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Trade Idea</div>
              <div className="text-cyan-400 font-semibold">Short USD (via Long EUR/USD)</div>
              <p className="text-xs text-zinc-500 mt-1">Specs max long USD + "King Dollar" narrative everywhere; every strategist bullish USD after war bid</p>
            </div>
          </div>

          {/* Method 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 border-l-2 border-zinc-700 pl-4">
              <h4 className="text-white font-medium mb-2">3. Exogenous shock triggers degrossing</h4>
              <ul className="space-y-1 text-sm text-zinc-400">
                <li>VAR shocks lead to position reduction regardless of fundamentals</li>
                <li>When a major shock hits, go down the list of extreme positions and take the other side</li>
                <li>Safe haven status and historical behavior become meaningless during shocks</li>
              </ul>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Trade Idea</div>
              <div className="text-cyan-400 font-semibold">Long Copper (on next risk-off flush)</div>
              <p className="text-xs text-zinc-500 mt-1">Specs already short; any shock-driven selloff creates opportunity to buy into already-bearish positioning</p>
            </div>
          </div>

          {/* Method 4 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 border-l-2 border-zinc-700 pl-4">
              <h4 className="text-white font-medium mb-2">4. Strong sentiment but no position yet (event risk)</h4>
              <ul className="space-y-1 text-sm text-zinc-400">
                <li>Market has a strong view but waiting for an event to pass (NFP, ECB, etc.)</li>
                <li>After the event, traders pile in regardless of outcome - they just wanted the event out of the way</li>
                <li>Profit by putting on the position faster than others once event passes</li>
              </ul>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Trade Idea</div>
              <div className="text-cyan-400 font-semibold">Short 10Y Treasuries (post-FOMC)</div>
              <p className="text-xs text-zinc-500 mt-1">Bearish bond sentiment but specs waiting for FOMC; once event passes, expect renewed selling pressure</p>
            </div>
          </div>

          {/* Method 5 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 border-l-2 border-zinc-700 pl-4">
              <h4 className="text-white font-medium mb-2">5. Extreme sentiment + technical reversal</h4>
              <ul className="space-y-1 text-sm text-zinc-400">
                <li>Wait for reversal formations: shooting star, bear hammer, extreme volume spike</li>
                <li>High sentiment readings are normal in a trend - be patient</li>
                <li>Volume spike at price extreme + 2-3 std dev positioning = 5-star setup</li>
              </ul>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Trade Idea</div>
              <div className="text-cyan-400 font-semibold">Long Soybeans (on weekly hammer)</div>
              <p className="text-xs text-zinc-500 mt-1">Managed money near 5yr lows in net position; wait for bullish reversal candle to confirm bottom</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Notes */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h3 className="text-lg font-semibold text-orange-400 mb-4">Key Takeaways</h3>
        <ul className="space-y-3 text-sm text-zinc-400">
          <li className="flex items-start gap-2">
            <span className="text-orange-400">1.</span>
            <span><span className="text-zinc-300">Positioning often leads price at turning points.</span> Watch for price/positioning divergence as an early warning.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-400">2.</span>
            <span><span className="text-zinc-300">Positioning can trend for a long time.</span> Don't blindly fade extremes - trends can last months or years.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-400">3.</span>
            <span><span className="text-zinc-300">Research shows it's generally more profitable to go WITH COT positioning, not against it.</span></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-400">4.</span>
            <span><span className="text-zinc-300">Extreme positioning alone is not enough.</span> You need another reason: extreme narrative, technical reversal, exogenous event, or new catalyst.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-400">5.</span>
            <span><span className="text-zinc-300">Social media tells:</span> If people are calling a move "stupid" or "ridiculous", they're probably on the wrong side.</span>
          </li>
        </ul>
      </div>

      {/* Source */}
      <div className="text-center text-xs text-zinc-600">
        <p>Source: Brent Donnelly, Spectra Markets - "How to trade the positioning report"</p>
        <p className="mt-1 text-zinc-700">Trade ideas are illustrative examples based on COT data patterns, not recommendations</p>
      </div>
    </div>
  );
}
