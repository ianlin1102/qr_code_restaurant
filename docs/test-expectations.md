# Feature Test Expectations — Phase 1-7

> Manual QA checklist for all features implemented in the Phase 1-7 batch.
> Run `pnpm dev` (client + server) and `stripe listen --forward-to localhost:3001/api/webhook/stripe` before testing.

---

## Phase 1: Table ID Pool (Pre-generation + Enable/Disable)

### 1.1 Table Pre-generation
| # | Step | Expected |
|---|------|----------|
| 1 | Start server with empty `tables.json` | 20 table records auto-created for each store (all `enabled: false`) |
| 2 | Check `server/data/tables.json` | Each table has `id: "{storeId}-table-001"` format, `number: 1-20`, `enabled: false`, `status: "idle"` |
| 3 | Existing tables without `number` field | Migration assigns sequential numbers and `enabled: true` on first access |

### 1.2 Enable / Disable Table (Admin)
| # | Step | Expected |
|---|------|----------|
| 1 | Go to admin Tables page | See "Enable New Table" button (not "Add Table") |
| 2 | Click "Enable New Table" | Dialog shows next available table number (auto-increment), optional display name |
| 3 | Confirm enable | Table appears in list with `#{number}` prefix, status "Available" |
| 4 | Select an idle enabled table → click "Disable" | Confirm prompt appears → table disappears from default view |
| 5 | Toggle "Show Disabled" checkbox | Disabled tables appear with `opacity-50` styling |
| 6 | Try to disable an occupied table | Error: "Cannot disable an occupied table" |
| 7 | All table numbers used → click "Enable" | Shows "All table numbers are in use" message |

### 1.3 QR Code Labels
| # | Step | Expected |
|---|------|----------|
| 1 | Click "Print All QR" | All tables (including disabled) shown in QR print view |
| 2 | Each QR code label | Shows "Table #{number}" (not display name) |

### 1.4 Customer: Scan Disabled Table
| # | Step | Expected |
|---|------|----------|
| 1 | Scan QR code of a disabled table | ScanPage shows amber-colored "not in service" UI |
| 2 | No retry button | Only informational message, no action buttons |
| 3 | Scan QR of enabled table | Normal flow → name input → menu |

---

## Phase 2: Bill Entity + Pay Later Mode

### 2.1 Pay-First Mode (Default, Existing Behavior)
| # | Step | Expected |
|---|------|----------|
| 1 | Store has no `paymentMode` set (or `pay-first`) | Customer sees "Proceed to Payment" on CartPage |
| 2 | Complete Stripe payment | Order created via webhook with `isPaid: true` |
| 3 | Check `bills.json` | Bill created with `status: "pending-payment"` → `"settled"` after payment |
| 4 | Table has `currentBillId` pointing to the bill | Verified in `tables.json` |

### 2.2 Pay-Later Mode
| # | Step | Expected |
|---|------|----------|
| 1 | Set store `paymentMode: "pay-later"` in settings | Setting persists |
| 2 | Customer scans table → adds items to cart | Cart page shows "Place Order" button (not "Proceed to Payment") |
| 3 | Click "Place Order" | Order created directly (no Stripe), `isPaid: false` |
| 4 | Redirect to order confirm page | Shows order number and items |
| 5 | Add more items → place another order | Both orders added to the same Bill (same `currentBillId`) |
| 6 | Check `bills.json` | Bill has `status: "open"`, `orderIds` contains both orders, `subtotal` is sum |
| 7 | `GET /api/stores/:storeId/tables/:tableId` | Response includes `paymentMode: "pay-later"` |

### 2.3 Bill API
| # | Step | Expected |
|---|------|----------|
| 1 | `GET /bills?tableId={id}` | Returns active bill with splits array |
| 2 | `GET /bills/:billId` | Returns bill details (validates storeId match) |
| 3 | `POST /bills/:billId/settle` with `paidBy: "waiter"` | Bill → `settled`, table → `idle` |

---

## Phase 3: Split Bill + Coupon Application

### 3.1 BillSettleDialog (Admin)
| # | Step | Expected |
|---|------|----------|
| 1 | Select occupied table in TablesPage → click "Bill" button | BillSettleDialog opens showing subtotal, discount, total due |
| 2 | Button only appears when table has `currentBillId` | No "Bill" button for idle tables |

### 3.2 Pay in Full
| # | Step | Expected |
|---|------|----------|
| 1 | In BillSettleDialog → click "Pay in Full" | Bill settled, table released to idle |
| 2 | Refresh tables | Table shows as "Available" |

### 3.3 Split Equally
| # | Step | Expected |
|---|------|----------|
| 1 | Set split count to 3 → click "Create Splits" | 3 splits shown with per-person amounts |
| 2 | Amounts add up | Last person absorbs remainder cents (e.g., $33.33 + $33.33 + $33.34) |
| 3 | Click "Mark Paid" on split #1 | Split shows "Paid" badge, bill status → `partially-paid` |
| 4 | Mark all splits paid | Bill → `settled`, table → `idle` |

### 3.4 Coupon Application
| # | Step | Expected |
|---|------|----------|
| 1 | Create a coupon in Coupon Management (e.g., "SAVE10", 10%, active) | Coupon created |
| 2 | Open BillSettleDialog → enter "SAVE10" → Apply | Discount appears, total due recalculated |
| 3 | Coupon shows green badge with code | Remove button visible |
| 4 | Click "Remove" | Discount removed, total due restored to subtotal |
| 5 | Apply coupon, then settle bill | Coupon `currentUses` incremented |
| 6 | Apply to settled bill | Error: "Bill is already settled" |

---

## Phase 4: Customer Name + Announcement

### 4.1 Customer Name Input
| # | Step | Expected |
|---|------|----------|
| 1 | Scan QR code of enabled table | After table check, name input dialog appears |
| 2 | Enter name "Alice" → click "Continue" | Name saved to session store, redirect to menu |
| 3 | Click "Skip" | Redirect to menu without name |
| 4 | Place an order (with name set) | Order has `customerName: "Alice"` |
| 5 | Admin dashboard shows order | Customer name visible on order card |

### 4.2 Announcement Popup
| # | Step | Expected |
|---|------|----------|
| 1 | Set store announcement in admin settings | Text saved |
| 2 | Customer opens MenuPage for first time | Announcement popup appears |
| 3 | Dismiss popup | Hash stored in localStorage, popup won't show again |
| 4 | Update announcement text in admin | Customer sees popup again (hash changed) |
| 5 | Same announcement, revisit | No popup (hash matches) |

---

## Phase 5: CSV Menu Import/Export

### 5.1 Export
| # | Step | Expected |
|---|------|----------|
| 1 | Go to Menu Management → click "Export CSV" | CSV file downloads |
| 2 | Open CSV | Columns: name, nameEn, price (in yuan), category name, description |
| 3 | Prices in CSV | Displayed in yuan (÷100), e.g., "12.50" not "1250" |

### 5.2 Import
| # | Step | Expected |
|---|------|----------|
| 1 | Click "Import CSV" | File picker dialog opens |
| 2 | Select a valid CSV file | Shows column mapping step with auto-detected columns |
| 3 | Map columns → click "Preview" | Preview table with rows, prices in yuan, category match indicators |
| 4 | Rows with unknown category | Highlighted in yellow with "⚠ Unknown" |
| 5 | Click "Confirm Import" | Shows result: X items created, Y rows skipped |
| 6 | Skipped rows | Reason shown (missing name, invalid price, unknown category) |
| 7 | Import > 500 rows | Error: "Maximum 500 items per import" |
| 8 | Refresh menu list | New items appear |

### 5.3 Round-trip
| # | Step | Expected |
|---|------|----------|
| 1 | Export → re-import the same CSV | All items created successfully (category names match) |

---

## Phase 6: RBAC Permission System

### 6.1 System Roles
| # | Step | Expected |
|---|------|----------|
| 1 | `GET /api/stores/:storeId/roles` | Returns 3 system roles: owner, manager, waiter |
| 2 | Owner role | Has all 13 permissions, `isSystem: true` |
| 3 | Manager role | All permissions except `staff:manage` |
| 4 | Waiter role | `menu:read`, `orders:read/write`, `tables:read/write`, `bill:write` |

### 6.2 Custom Roles
| # | Step | Expected |
|---|------|----------|
| 1 | `POST /roles` with name + permissions | Custom role created with `isSystem: false` |
| 2 | `PUT /roles/:roleId` | Can update permissions on custom role |
| 3 | `PUT /roles/:ownerRoleId` | Error: "Cannot modify owner role" |
| 4 | `DELETE /roles/:customRoleId` | Custom role deleted |
| 5 | `DELETE /roles/:systemRoleId` | Error: "Cannot delete system roles" |

### 6.3 JWT Permissions
| # | Step | Expected |
|---|------|----------|
| 1 | Login as owner | JWT payload contains `permissions: [all 13]` |
| 2 | Login as staff (legacy) | JWT fallback resolves waiter permissions |
| 3 | `usePermission('staff:manage')` in frontend | Returns `true` for owner, `false` for staff |
| 4 | `useIsOwner()` hook | Correctly identifies owner users |

### 6.4 Permission Middleware
| # | Step | Expected |
|---|------|----------|
| 1 | `requirePermission('menu:write')` on a route | Owner passes, waiter rejected |
| 2 | Legacy JWT without permissions array | Fallback to role-based resolution |

---

## Phase 7: Floor Map Enhancement

### 7.1 FloorCanvas Rendering
| # | Step | Expected |
|---|------|----------|
| 1 | Navigate to Floor Plan page (admin) | SVG canvas with grid background |
| 2 | Tables with x/y coordinates | Rendered at correct positions |
| 3 | Table colors | idle=green, occupied=red, cleaning=yellow, bill-requested=orange |
| 4 | Disabled tables | Shown at 40% opacity |
| 5 | Table labels | Show `#{number}` and truncated display name |

### 7.2 FloorPlanPage (View Mode)
| # | Step | Expected |
|---|------|----------|
| 1 | Stats bar | Shows occupancy %, available count |
| 2 | Zone tabs | One tab per unique `table.zone` value + "All" tab |
| 3 | Select zone | Only tables in that zone shown |
| 4 | Click a table | Side panel shows table details (number, name, status) |
| 5 | Auto-refresh | Table statuses update every 10 seconds |

### 7.3 FloorPlanEditorPage (Edit Mode)
| # | Step | Expected |
|---|------|----------|
| 1 | Drag a table | Snaps to 20px grid |
| 2 | Position persists | After refresh, table stays at new position |
| 3 | Properties panel | Can edit shape (square/round/long), zone, size |
| 4 | Table shapes render correctly | Square = rounded rect, Round = ellipse, Long = wide rect |

---

## Cross-Cutting Concerns

### i18n
| # | Check | Expected |
|---|-------|----------|
| 1 | Switch admin language to EN | All new Phase 1-7 strings translated |
| 2 | Switch admin language to ZH | All strings in Chinese |
| 3 | Customer-side language detection | Announcement, name input, cart buttons all in detected language |

### Multi-Tenant Isolation
| # | Check | Expected |
|---|-------|----------|
| 1 | All new API endpoints include `:storeId` prefix | Yes |
| 2 | Bill routes validate `bill.storeId === req.params.storeId` | Yes (after fix) |
| 3 | Role routes scoped to store | Yes |

### Data Integrity
| # | Check | Expected |
|---|-------|----------|
| 1 | `bills.json` created on first order | Valid bill records |
| 2 | `splits.json` created on split | Valid split records linked to bill |
| 3 | `roles.json` seeded on first access | 3 system roles per store |
| 4 | Bill version increments on each write | Prevents stale updates |

---

## Known Limitations (Not Bugs)

- **RBAC middleware not yet wired to routes**: `requirePermission()` exists but routes still use `requireAuth` only. Wiring is deferred to avoid breaking existing auth flow.
- **Tiptap rich text editor not installed**: Announcement is plain text for now; Tiptap dependencies deferred.
- **No customer-side Stripe payment for splits**: Splits are waiter-marked only; customer self-pay via Stripe on splits is future work.
- **FloorPlanEditor position changes**: Require tables to already have x/y coordinates set in the database.
- **Tax/service fee rates**: Still hardcoded inconsistently (10%+5% in TablesPage, 8% in MenuManagePage).
- **`announcementEn` admin input**: Settings page needs a second textarea for English announcement (deferred).

---

> Generated: 2026-03-27 | Covers commits `5e5d7ce` through `e737f72` + fixes
