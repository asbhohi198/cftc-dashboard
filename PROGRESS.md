# CFTC Dashboard - Work Progress

## Current Task

### 2026-07-21 - Add Gross Long/Short/Net Changes Chart
**Status:** In Progress
**Description:** Add grouped bar chart showing MM Long Change, MM Short Change, and Net Change per commodity

**Steps:**
- [ ] 1. Update API to include mmLongChange, mmShortChange
- [ ] 2. Add grouped bar chart to AgsSummaryTab below the 4 summary charts
- [ ] 3. Test and push

---

### 2026-07-21 - Add 4 Summary Charts to COT Changes Summary Tab
**Status:** Completed
**Description:** Add 4 sector-wide bar charts below existing content showing all 14 US Ag commodities:
1. Managed Money Net (F&O) - Current MM net position
2. Net MM Position as % Historical Max
3. Managed Money Net chg - WoW change (already have data)
4. MM net pos as % OI - Position as % of Open Interest

**Steps:**
- [x] 1. Update API to include additional data fields (mmNetCurrent, pctHistoricalMax, pctOI)
- [x] 2. Update AgsSummaryTab to display 4 summary charts in 2x2 grid below existing content
- [x] 3. Test and verify charts match Excel format
- [x] 4. Commit and push - 511230a

**Files to Modify:**
- src/app/api/cot-changes-ags-summary/route.ts
- src/components/AgsSummaryTab.tsx

---

### 2026-07-21 - COT Changes Summary Tab (Ags Only)
**Status:** Completed
**Description:** Create new "Summary" subtab at top of COT Changes showing all US Ag commodities with Net MM WoW Change and Z-score. Table on left, bar chart on right showing weekly change history when commodity is clicked.

**Commodities (14 US Ags from Excel):**
- Corn, Soybeans, Chicago Wheat, Kansas Wheat, Minneapolis Wheat
- Soybean Oil, Soybean Meal
- Live Cattle, Lean Hogs, Feeder Cattle
- NY Sugar, NY Coffee (Arabica), NY Cocoa, Cotton

**Steps:**
- [x] 1. Update types.ts - add "ags-summary" subtab type, reorder COT Changes subtabs
- [x] 2. Create new API route /api/cot-changes-ags-summary for consolidated Ags data
- [x] 3. Create new component AgsSummaryTab.tsx with table + chart layout
- [x] 4. Update Dashboard.tsx to render new tab
- [x] 5. Test build - PASSED
- [x] 6. Commit and push to git - ae3710a

**Notes:**
- Exclude EU markets (Matif Wheat, Canola, Rapeseed, LDN Sugar, LDN Robusta, LDN Cocoa)
- Chart format: red/green bars, same styling as rest of dashboard
- Click commodity name to show historical weekly MM net changes in bar chart

**Files to Modify:**
- src/lib/types.ts
- src/app/api/cot-changes-ags-summary/route.ts (new)
- src/components/AgsSummaryTab.tsx (new)
- src/components/Dashboard.tsx

## Task History

### Template
```
### [DATE] - [TASK NAME]
**Status:** In Progress / Completed / Blocked
**Description:** Brief description of the task

**Steps:**
- [ ] Step 1
- [ ] Step 2
- [ ] Step 3

**Notes:**
- Any relevant context or decisions made

**Files Modified:**
- file1.tsx
- file2.ts
```

---

## Completed Tasks

_None yet_

---

## Notes
- This file tracks work progress to enable resumption if a session is interrupted
- Update this file before starting any new task and after completing each step
