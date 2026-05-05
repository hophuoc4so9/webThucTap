# Frontend Fix: filterGenericKeywords Error

## Problem
```
ReferenceError: filterGenericKeywords is not defined
at MarketTrendDashboard (http://localhost:5173/src/components/MarketTrend/MarketTrendDashboard.tsx?t=1777908984928:212:34)
```

## Root Cause
When I cleaned up the duplicate code in `MarketTrendDashboard.tsx`, I removed:
- `GENERIC_VIETNAMESE_KEYWORDS` constant
- `filterGenericKeywords()` function

But there was still code trying to call `filterGenericKeywords(cluster.topSkills)` at line 136.

## Solution
Since we moved skill filtering to the **backend** (in `SkillExtractionService`), the frontend no longer needs to filter. The backend already returns clean skills.

**Changed:**
```typescript
// BEFORE (line 135-136)
{data.clusters.map((cluster, idx) => {
  const filteredSkills = filterGenericKeywords(cluster.topSkills);
  return (
    // ... using filteredSkills

// AFTER
{data.clusters.map((cluster, idx) => (
  // ... directly use cluster.topSkills
```

**Also updated:**
- Line 160-185: Use `cluster.topSkills` directly instead of `filteredSkills`
- Removed the wrapper `return` statement (cleaner arrow function)

## Files Modified
- `fe/src/components/MarketTrend/MarketTrendDashboard.tsx`

## Testing
✅ No more `ReferenceError: filterGenericKeywords is not defined`
✅ Skills display with Vietnamese diacritics preserved
✅ Component renders without errors

## Deployment
1. Frontend already updated
2. No rebuild needed (Vite hot reload)
3. Refresh browser at http://localhost:5173/student/market-trends

## Architecture Notes
```
┌─────────────────────────────────────┐
│   Backend (JobService)              │
│  ┌─────────────────────────────────┐│
│  │ SkillExtractionService          ││
│  │ - Parse DB fields               ││
│  │ - Filter generics               ││
│  │ - Return clean skills           ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
              ↓ (API Response)
┌─────────────────────────────────────┐
│   Frontend (React)                  │
│  ┌─────────────────────────────────┐│
│  │ MarketTrendDashboard            ││
│  │ - Receive cleaned skills        ││
│  │ - Display directly              ││
│  │ - No filtering needed           ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

All filtering happens server-side → cleaner frontend code
