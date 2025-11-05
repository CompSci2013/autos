# Technical Debt: VIN Browser Interaction Design

**Created:** 2025-11-05
**Status:** DEFERRED - Design decision needed
**Priority:** Medium
**Category:** UX Architecture

---

## Problem Statement

VIN Browser mixes **instance-level** selection (individual VINs) with **specification-level** filtering (manufacturers/models via Query Control). This creates ambiguity about how these two systems should interact.

### Current Behavior (As-Built)

1. Model Picker selections → Query Control chips ✅
2. Query Control filters → Model Picker auto-selection ✅
3. VIN Browser selections → **NO Query Control chips**
4. Query Control filters → **NO VIN Browser interaction** (server-side pagination prevents auto-selection)

### The Confusion

When a user:
1. Selects specific VINs in VIN Browser: `selectedVinsBrowser=VIN123,VIN456,VIN789`
2. What should happen to:
   - Query Control chips?
   - Results Table (vehicle specifications)?
   - Model Picker?

**Current answer:** Nothing. VIN selections are isolated.

---

## Design Options

### Option 1: VIN Browser is Isolated (Current)

**Behavior:**
- VIN selections don't affect Query Control
- VIN selections don't affect Results Table
- VIN selections don't affect Model Picker
- VIN Browser operates independently as a "view-only browser"

**Pros:**
- Simple, no cross-coupling
- Clear separation: specs vs instances
- No ambiguity about precedence

**Cons:**
- User can't easily see "what vehicles do my selected VINs belong to?"
- Disconnected experience
- Limited utility of VIN Browser (why select VINs if it doesn't affect anything?)

**Use Case:** VIN Browser is primarily for **exploration**, not filtering/selection.

---

### Option 2: VIN Selections Filter Results Table

**Behavior:**
- User selects VIN123 (Ford F-150), VIN456 (Ford Mustang), VIN789 (Chevy Corvette)
- Results Table filters to **ONLY show** vehicles that contain at least one selected VIN
  - Ford F-150 row (expandable to show VIN123 among others)
  - Ford Mustang row (expandable to show VIN456)
  - Chevy Corvette row (expandable to show VIN789)
- Other vehicles hidden (e.g., Toyota Camry, Honda Civic)

**Pros:**
- Direct connection: "Show me the vehicles for these VINs"
- Results Table becomes focused view
- Clear drill-down: VIN → Vehicle Spec
- Expanded rows highlight selected VINs

**Cons:**
- Inverts typical flow (usually filter vehicles first, THEN see VINs)
- Query Control confusion: Do VIN-derived filters appear as chips?
- Complex implementation: VIN selections must extract vehicle IDs, pass to Results Table filter

**Use Case:** User has specific VINs (from external source) and wants to explore their specifications.

---

### Option 3: VIN Selections Create Query Control Chips

**Behavior:**
- User selects VIN123 (Ford F-150), VIN456 (Ford Mustang), VIN789 (Chevy Corvette)
- Extract unique manufacturers: Ford, Chevy
- Extract unique models: F-150, Mustang, Corvette
- Create Query Control chips:
  - 🔵 **Manufacturer: Ford, Chevy**
  - 🔵 **Model: F-150, Mustang, Corvette**
- Model Picker auto-selects matching rows (Ford:F-150, Ford:Mustang, Chevy:Corvette)
- Results Table filters to these specs

**Pros:**
- Unifies spec-level and instance-level selection
- Query Control becomes "truth display" for all filters
- Model Picker stays synchronized
- Familiar pattern (same as Model Picker → Query Control chips)

**Cons:**
- Conceptually confusing: VIN selections become spec filters
- Loss of granularity: Selected 3 specific VINs, but now seeing ALL VINs for those models
- What if user selects 100 VINs across 50 models? Chip becomes huge
- Ambiguity: Are chips from VIN Browser or Query Control?

**Use Case:** User wants to "promote" VIN-level selections to specification-level filters.

---

### Option 4: Dual-Mode VIN Browser

**Behavior:**
- VIN Browser has toggle: **"Browse Mode"** vs **"Filter Mode"**

**Browse Mode (default):**
- VIN selections are isolated
- No Query Control chips
- No Results Table filtering
- Pure exploration

**Filter Mode:**
- VIN selections trigger Option 2 (filter Results Table to selected VINs' vehicles)
- Optional: Create Query Control chips (Option 3)
- Toggle back to Browse Mode clears filter

**Pros:**
- User control over behavior
- Supports both use cases (exploration vs filtering)
- No accidental coupling

**Cons:**
- More complex UI
- Learning curve: "What does Filter Mode do?"
- Mode switching can be confusing

---

## Recommended Approach (Deferred)

**Short-term:** Keep Option 1 (Isolated). VIN Browser is for exploration only.

**Medium-term:** Consider Option 2 IF user feedback indicates need for "VIN → Vehicle" drill-down.

**Rationale:**
1. Current architecture is clean and understandable
2. Adding coupling requires careful UX design (avoid confusion)
3. Need user research: "Why are you selecting VINs? What do you want to happen?"

---

## Related Technical Considerations

### If Implementing Option 2 (VIN → Results Filter):

**Backend Changes:**
- New API endpoint: `POST /api/vehicles/by-vins` (pass array of VIN IDs, return vehicle specs)
- OR: Extend `GET /api/vehicles/details` with `vinIds` parameter

**Frontend Changes:**
1. VIN Browser `onApply()` extracts vehicle IDs from selected VINs
2. Pass `vinIds` to StateManagementService as new filter type
3. Results Table receives `vinIds` filter, calls modified API
4. Results Table auto-expands rows containing selected VINs (highlight them)

**URL Structure:**
```
?selectedVinsBrowser=VIN123,VIN456,VIN789
&vehicleIds=ford-f150-2020,ford-mustang-2021,chevy-corvette-2019
```

**Complexity:** Medium-High (new filter type, API changes, highlighting logic)

### If Implementing Option 3 (VIN → Query Control Chips):

**Frontend Changes:**
1. VIN Browser `onApply()` extracts manufacturers and models from selected VINs
2. Call `StateManagementService.updateFilters({ manufacturer: '...', model: '...' })`
3. Query Control chips appear automatically (already implemented)
4. Model Picker auto-selects (already implemented via external filters)

**URL Structure:**
```
?selectedVinsBrowser=VIN123,VIN456,VIN789
&manufacturer=Ford,Chevy
&model=F-150,Mustang,Corvette
```

**Complexity:** Low (mostly already implemented, just need extraction logic)

**Risk:** Conceptual mismatch (instance → spec promotion)

---

## Decision Criteria

When revisiting this decision, consider:

1. **User Intent:** What are users trying to accomplish with VIN Browser?
   - Explore all available VINs? → Option 1 (Isolated)
   - Find vehicles for specific VINs? → Option 2 (Filter Results)
   - Discover models from VIN set? → Option 3 (Extract to Chips)

2. **Frequency:** How often will users select VINs vs browse?
   - Rare selection → Keep isolated
   - Frequent selection → Add integration

3. **Cognitive Load:** Will coupling VIN Browser to Query Control confuse users?
   - Yes → Keep isolated
   - No → Consider Option 2 or 3

4. **Feature Completeness:** Is VIN Browser "done" as exploration tool?
   - Yes → Option 1
   - No → Consider drill-down (Option 2)

---

## Open Questions

1. Should VIN Browser allow multi-select at all? (Alternative: Single-select for detail view)
2. If user selects VINs, should we show "Selected VINs" summary panel? (Not integrated, just visibility)
3. Should Results Table have reverse filter: "Show only vehicles with 0 selected VINs"? (Exclusion)
4. Should Model Picker and VIN Browser be mutually exclusive? (Select one OR the other, not both)

---

## Related Documents

- `/docs/design/picker-state-management-coupling.md` (this session's architecture decisions)
- `/docs/design/vin-browser.config.ts` (VIN Browser configuration)
- `/docs/state-management-guide.md` (URL First architecture)

---

**Status:** OPEN - Awaiting user research and design decision
