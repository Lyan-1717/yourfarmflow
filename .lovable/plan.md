# YourFarmFlow Advanced Upgrades Plan

This is a large, multi-domain upgrade. To keep it shippable and avoid breaking existing functionality, I'll split it into **4 phases**. Each phase is independently usable. You can approve all phases at once, or have me ship them one at a time.

All existing features (auth, projects, dashboards, RWF, current crop/livestock/building flows) stay intact. New tables and columns are additive only.

---

## Phase 1 — Schema foundation (one migration)

New tables (all RLS-scoped to `auth.uid()`, with GRANTs):

- `animals` — individual animals in a livestock group: tag_number, name, gender, breed, dob, status, estimated_value, mother_id (self-FK), group_id → `livestock`.
- `animal_status_history` — status, changed_at, notes.
- `animal_health_records` — type (vaccination, deworming, treatment), date, notes, cost.
- `breeding_records` — animal_id, mate_id, bred_on, expected_due, outcome.
- `birth_records` — mother_id, birth_date, num_offspring, num_males, num_females, notes. Trigger/server-fn creates child `animals` rows and links `mother_id`.
- `milk_records` — animal_id (nullable for herd-level), group_id, date, liters.
- `livestock_valuation_snapshots` — group_id, snapshot_date, total_value (for historical net worth trends).
- `construction_activities` — project_id, name, description, start_date, end_date, status.
- `crop_activities_meta` — extends existing `activities` with status/start/end if needed (or add columns to `activities`).
- Add `activity_id` (nullable FK) and `expense_type` ('material' | 'labor') to existing `expenses`.

Existing tables/policies untouched except for additive columns.

## Phase 2 — Livestock advanced features

- Individual animal registry under each livestock group (list + create + edit).
- Animal profile page with timeline (status, health, breeding, births, milk, sales).
- Status tracking with history.
- Pregnancy → Birth workflow: record birth → auto-create offspring animals linked to mother.
- Milk production: daily entry, per-animal & per-herd daily/monthly/lifetime averages, charts (recharts).
- Livestock Net Worth section on dashboard: totals, per group, per type, historical trend chart.
- Statistics page: herd growth, births, mortality, sales, milk trends, revenue/expense/profit trends.
- Future Projections page: assumption inputs → 1/3/5-year herd size, value, offspring, sales potential per group.

## Phase 3 — Construction upgrades

- Construction Activities page per building project: unlimited custom activity names, description, start/end, status (Planned, In Progress, Completed).
- Expenses linked to a construction activity with `expense_type` (Material / Labor).
- Activity page shows Total Material Cost, Total Labor Cost, Total Activity Cost.
- Building dashboard rolls up activity costs.

## Phase 4 — Crop upgrades & Reports

- Crop activities get status + start/end dates (extend existing `activities`).
- Crop expenses link to an activity with `expense_type` (Material / Labor).
- Crop cost analytics: Total Cost / Labor / Material per crop, revenue per crop, profit per crop.
- Reports page additions: Livestock Net Worth, Animal Performance, Herd Growth, Milk Analysis, Future Projections, Construction Activity Costs, Construction Budget, Crop Profitability, Activity-Based Expense Analysis. Existing reports preserved.

---

## Technical notes

- All new server access via `createServerFn` + `requireSupabaseAuth` (existing pattern).
- Charts use existing `recharts` dependency.
- Project-scoped via existing `currentProject` helper.
- Sidebar conditionally shows new items (Animals, Milk, Statistics, Projections) only for livestock projects; Construction Activities only for building projects — preserving the current adaptive sidebar.
- Net worth trend is computed from `livestock_valuation_snapshots`; a server fn writes a snapshot whenever animals/values change (or on demand from the dashboard).
- Birth → offspring creation happens in a single server fn (transactional) so herd counts stay consistent.
- RWF formatting via existing `lib/format.ts`.

## What I need from you

1. **Confirm phased rollout.** Reply "ship phase 1" to start with the migration, then I'll proceed phase by phase. Or "ship all" and I'll do them sequentially in this session (large; multiple turns).
2. **Birth offspring defaults**: when a birth is recorded, should new offspring default to status `Growing` and `estimated_value = 0` (editable later)? Default: yes.
3. **Milk records granularity**: per-individual-animal entry, with an option to log a herd total when no individual breakdown is available? Default: yes.

If you don't answer 2–3, I'll proceed with the defaults noted.
