"use client";

export function GuideTab() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
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
        <h3 className="text-lg font-semibold text-orange-400 mb-4">Five Ways to Trade Positioning</h3>

        <div className="space-y-6">
          {/* Method 1 */}
          <div className="border-l-2 border-zinc-700 pl-4">
            <h4 className="text-white font-medium mb-2">1. Play for extreme positioning to burn itself out</h4>
            <ul className="space-y-1 text-sm text-zinc-400">
              <li>Wait for 2-3 standard deviation extremes and take the other side</li>
              <li>This is simplistic on its own - use as a starting point for investigation</li>
              <li>Look for other inputs to improve timing or raise odds of reversal</li>
            </ul>
          </div>

          {/* Method 2 */}
          <div className="border-l-2 border-zinc-700 pl-4">
            <h4 className="text-white font-medium mb-2">2. Extreme positioning + extreme narrative</h4>
            <ul className="space-y-1 text-sm text-zinc-400">
              <li>Magazine cover indicator (e.g., The Economist cover story)</li>
              <li>Every strategist has the same view</li>
              <li>Outrageous price targets coming out of the woodwork</li>
            </ul>
          </div>

          {/* Method 3 */}
          <div className="border-l-2 border-zinc-700 pl-4">
            <h4 className="text-white font-medium mb-2">3. Exogenous shock triggers degrossing</h4>
            <ul className="space-y-1 text-sm text-zinc-400">
              <li>VAR shocks lead to position reduction regardless of fundamentals</li>
              <li>When a major shock hits, go down the list of extreme positions and take the other side</li>
              <li>Safe haven status and historical behavior become meaningless during shocks</li>
            </ul>
          </div>

          {/* Method 4 */}
          <div className="border-l-2 border-zinc-700 pl-4">
            <h4 className="text-white font-medium mb-2">4. Strong sentiment but no position yet (event risk)</h4>
            <ul className="space-y-1 text-sm text-zinc-400">
              <li>Market has a strong view but waiting for an event to pass (NFP, ECB, etc.)</li>
              <li>After the event, traders pile in regardless of outcome - they just wanted the event out of the way</li>
              <li>Profit by putting on the position faster than others once event passes</li>
            </ul>
          </div>

          {/* Method 5 */}
          <div className="border-l-2 border-zinc-700 pl-4">
            <h4 className="text-white font-medium mb-2">5. Extreme sentiment + technical reversal</h4>
            <ul className="space-y-1 text-sm text-zinc-400">
              <li>Wait for reversal formations: shooting star, bear hammer, extreme volume spike</li>
              <li>High sentiment readings are normal in a trend - be patient</li>
              <li>Volume spike at price extreme + 2-3 std dev positioning = 5-star setup</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Positioning vs Sentiment */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h3 className="text-lg font-semibold text-orange-400 mb-4">Positioning vs Sentiment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-zinc-800/50 rounded-lg p-4">
            <h4 className="text-cyan-400 font-medium mb-2">Sentiment</h4>
            <p className="text-sm text-zinc-400">How people VIEW the market (polls, surveys like DSI)</p>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-4">
            <h4 className="text-purple-400 font-medium mb-2">Positioning</h4>
            <p className="text-sm text-zinc-400">ACTUAL positions (CFTC COT data)</p>
          </div>
        </div>
        <div className="space-y-2 text-sm text-zinc-400">
          <p><span className="text-zinc-300">Bearish but NOT positioned:</span> Primed to go down as people put on new shorts</p>
          <p><span className="text-zinc-300">Bearish AND heavily short:</span> At risk of short squeeze - nobody left to sell</p>
          <p className="text-zinc-500 italic mt-3">Sentiment leads positioning - it's faster to get bearish than to put on a sizeable trade</p>
        </div>
      </div>

      {/* Sentiment Framework Table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h3 className="text-lg font-semibold text-orange-400 mb-4">Sentiment vs Market Price Framework</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="text-left py-2 text-zinc-400 font-medium">Sentiment</th>
                <th className="text-center py-2 text-zinc-400 font-medium">Bull Market</th>
                <th className="text-center py-2 text-zinc-400 font-medium">Bear Market</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              <tr className="border-b border-zinc-800">
                <td className="py-2">Bullish and increasing</td>
                <td className="text-center text-green-400">Very Bullish</td>
                <td className="text-center">-</td>
              </tr>
              <tr className="border-b border-zinc-800">
                <td className="py-2">Bullish and stable</td>
                <td className="text-center text-green-400">Bullish</td>
                <td className="text-center">-</td>
              </tr>
              <tr className="border-b border-zinc-800">
                <td className="py-2">Bullish but falling</td>
                <td className="text-center text-red-400 font-bold">BEARISH</td>
                <td className="text-center">-</td>
              </tr>
              <tr className="border-b border-zinc-800">
                <td className="py-2">Bearish and stable</td>
                <td className="text-center">-</td>
                <td className="text-center text-red-400">Bearish</td>
              </tr>
              <tr className="border-b border-zinc-800">
                <td className="py-2">Bearish and getting more bearish</td>
                <td className="text-center">-</td>
                <td className="text-center text-red-400">Very Bearish</td>
              </tr>
              <tr>
                <td className="py-2">Bearish but getting less bearish</td>
                <td className="text-center">-</td>
                <td className="text-center text-green-400 font-bold">BULLISH</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-500 mt-3 italic">Rate of change matters more than absolute levels</p>
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
      </div>
    </div>
  );
}
