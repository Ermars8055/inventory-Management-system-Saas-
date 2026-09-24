# Inventory Variant System — Implementation Plan

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Done

---

## Overview
Add variant support to the inventory system so a product like "Uniform Shirt" can have child variants (Size 28, 30, 32…) each with independent stock, while remaining linked as a product family.

---

## Schema Design

**New table: `item_variant_groups`**
```
id                  string PK
organization_id     FK → organizations
name                string  (e.g. "Uniform Shirt")
description         string  (nullable)
category_id         FK → categories (nullable)
created_at          string
```

**Additions to existing `items` table (2 nullable columns only)**
```
variant_group_id    FK → item_variant_groups  (nullable — null = standalone, no change)
variant_label       string                    (nullable — "Size 32", "500mg", "Red/XL")
```

Backward compatible: all existing items have both as null → standalone → zero behavior change.

---

## Phase 1 — Schema + Backend CRUD ✅
> Risk: Zero — purely additive

- [x] Add `ItemVariantGroup` model to `models.py`
  - `UniqueConstraint(organization_id, name)`
- [x] Add `variant_group_id` + `variant_label` nullable columns to `Item` model
- [x] Add migration SQL to `migrate.py`
  - `CREATE TABLE item_variant_groups (...)`
  - `ALTER TABLE items ADD COLUMN variant_group_id TEXT`
  - `ALTER TABLE items ADD COLUMN variant_label TEXT`
- [x] Add `ItemVariantGroupOut`, `ItemVariantGroupCreate` schemas to `schemas.py`
- [x] Add `variantGroupId` + `variantLabel` to `ItemOut` schema
- [x] Create `backend/app/routers/item_variants.py` with endpoints:
  - [x] `GET  /item-variant-groups` — list all groups with rollup totals
  - [x] `POST /item-variant-groups` — create group + optionally bulk-create variants
  - [x] `GET  /item-variant-groups/{id}` — group detail + all variant items
  - [x] `PUT  /item-variant-groups/{id}` — rename/update group
  - [x] `DELETE /item-variant-groups/{id}` — unlink all variants, delete group
  - [x] `POST /item-variant-groups/{id}/variants` — add new variant to existing group
  - [x] `DELETE /item-variant-groups/{id}/variants/{item_id}` — unlink item from group
- [x] Update `POST /inventory` to accept `variantGroupId` + `variantGroupName` + `variantLabel`
- [x] Register router in `main.py`
- [x] Audit log all group create/update/delete/link/unlink actions

---

## Phase 2 — Grouped Inventory Endpoint + List UI ✅
> Risk: Low — new UI path alongside existing

- [x] `GET /inventory/grouped` backend endpoint
  - Returns: `[{ type: "standalone", item }, { type: "group", group: { rollup totals }, variants: [...] }]`
  - Group rollup: `totalQty`, `totalAvailable`, `variantCount`, `status` (worst of all variants)
- [x] Add `variantGroupService` to `src/services/index.ts`
- [x] Add `ItemVariantGroup` + `GroupedInventoryRow` types to `src/types/index.ts`
- [x] Inventory list page — grouped view (auto-selected when groups exist)
  - Collapsible group rows showing rollup (total qty, available, worst status)
  - Expanded view: variant items with individual stock + actions
  - Grid / Table / Grouped (Layers2 icon) three-way view toggle
  - Status badge on group reflects worst variant status
  - "+ Add Variant" button inside group header

---

## Phase 3 — Create / Edit with Variants ✅
> Risk: Low

- [x] Create Item dialog — "Single item" / "Product with variants" toggle
  - Variant mode: product name + description + category + repeating variant rows (label, SKU, qty, min_qty, location)
  - "Add row" / "Remove row"
  - Single submit → creates group + all variant items atomically via POST /item-variant-groups
- [x] "Add variant to existing group" flow — dedicated dialog from grouped view "+ Add Variant" button
- [x] Item detail page
  - If `variantGroupId` set: shows "Part of: **Group Name**" breadcrumb with variant label badge
  - "Variants" tab showing all siblings with stock counts + link to each variant
- [x] Edit item: variantLabel field shown in edit dialog when item belongs to a group

---

## Phase 4 — Variant Picker in Issuance Flows
> Risk: Medium — touches several flows

- [ ] Assignment / Issuance create form
  - Item picker: shows groups collapsed; selecting a group shows second "Variant" dropdown
  - Standalone items: no variant picker (exactly as today)
  - Assignment stored to specific variant item ID — zero schema change
- [ ] Bulk Issue page — variant-aware item selection
- [ ] Class Templates — variant-aware item rows (template line item stores specific variant item ID)
- [ ] Class Detail / distribute flow — if template items have variants, show label in distribute summary

---

## Phase 5 — Purchase Orders + Reports
> Risk: Medium

- [ ] PO creation — item picker shows groups
  - Selecting a group: auto-expands into one line item row per variant
  - Each variant line item has independent qty + unit price
  - Visual group header in PO line items table
- [ ] PO detail view — group line items under product header
- [ ] Reports page
  - Inventory report: "Group by product" option → variant rollup rows
  - Low stock report: per variant AND per group summary
  - Stock value: rollup by variant group

---

## Edge Cases (all handled by design)

| Case | Handling |
|---|---|
| Delete group | Unlinks variants (sets `variant_group_id = null`), items become standalone |
| Last variant removed from group | Group auto-deleted |
| Move variant to another group | Update `variant_group_id` on item |
| Standalone → make it a variant | Set `variant_group_id` + `variant_label` |
| Group low stock | Shows LOW STOCK if ANY variant hits min_qty |
| Plan limits (item count) | Count individual variant items, not groups |
| Search | "Uniform Shirt" returns all variant items in that group |
| SKU | Each variant has own SKU, uniqueness enforced per org |
| Existing items/assignments/POs | Zero change — all still reference item IDs |

---

## Variant Label Convention
Free-form string — user decides the dimension:

| Product | Labels |
|---|---|
| Uniform Shirt | Size 28, Size 30, Size 32, Size 34, Size 36 |
| Paracetamol | 250mg, 500mg, 650mg |
| Maths Textbook | Grade 5 / 2026-27, Grade 6 / 2026-27 |
| Paint | Red/1L, Red/5L, Blue/1L |

---

## Files to Touch (by phase)

### Phase 1
- `backend/app/models.py`
- `backend/app/migrate.py`
- `backend/app/schemas.py`
- `backend/app/routers/item_variants.py` ← new
- `backend/app/routers/inventory.py`
- `backend/app/main.py`

### Phase 2
- `backend/app/routers/inventory.py` (grouped endpoint)
- `src/types/index.ts`
- `src/services/index.ts`
- `src/pages/Inventory.tsx`

### Phase 3
- `src/pages/Inventory.tsx` (create dialog)
- `src/pages/ItemDetail.tsx`

### Phase 4
- `src/pages/Assignments.tsx`
- `src/pages/BulkIssue.tsx`
- `src/pages/settings/ClassTemplates.tsx`
- `src/pages/ClassDetail.tsx`

### Phase 5
- `src/pages/Procurement.tsx`
- `src/pages/Reports.tsx`
- `backend/app/routers/inventory.py`

---

## Progress Log

| Date | Phase | What was done |
|---|---|---|
| — | — | Plan created |
| 2026-09-24 | Phase 1 | Full Phase 1 complete: ItemVariantGroup model + migration + schemas + CRUD router (7 endpoints) + POST /inventory variant fields + router registered in main.py |
| 2026-09-24 | Phase 2 | Full Phase 2 complete: GET /inventory/grouped endpoint + ItemVariantGroup/GroupedInventoryRow types + variantGroupService + Inventory grouped view (collapsible groups, rollup, expand/collapse, status badges, + Add Variant) |
| 2026-09-24 | Phase 3 | Full Phase 3 complete: Create dialog variant mode (product + rows table), Add Variant to group dialog, ItemDetail group breadcrumb, Variants tab with siblings, variantLabel edit field |
