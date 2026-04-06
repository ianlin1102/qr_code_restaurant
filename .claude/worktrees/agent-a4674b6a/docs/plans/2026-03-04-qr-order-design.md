# QR Code Ordering System - Design Document

Date: 2026-03-04

## Overview

A multi-tenant QR code restaurant ordering system. Customers scan a table-specific QR code to browse the menu and place orders. Store owners and staff manage menus, tables, and orders via an admin dashboard.

Tech stack: Vite + React + TypeScript + shadcn/ui (frontend), Express + TypeScript (backend), JSON file storage (MVP).

## Architecture

Monorepo with MVC pattern on the server side.

```
qr-order/
├── client/                    # Vite + React + TypeScript
│   ├── src/
│   │   ├── views/             # Page components (View layer)
│   │   │   ├── customer/      # Customer-facing pages
│   │   │   │   ├── MenuPage.tsx
│   │   │   │   ├── CartPage.tsx
│   │   │   │   └── OrderConfirmPage.tsx
│   │   │   └── admin/         # Store owner/staff pages
│   │   │       ├── LoginPage.tsx
│   │   │       ├── DashboardPage.tsx
│   │   │       ├── MenuManagePage.tsx
│   │   │       ├── TableManagePage.tsx
│   │   │       └── OrderListPage.tsx
│   │   ├── components/        # Reusable UI components
│   │   ├── services/          # API call layer
│   │   ├── stores/            # State management (zustand)
│   │   ├── types/             # Shared TypeScript types
│   │   ├── lib/               # Utility functions
│   │   └── App.tsx            # Router entry
│   └── package.json
│
├── server/                    # Express + TypeScript
│   ├── src/
│   │   ├── controllers/       # Controller - handle request/response
│   │   ├── models/            # Model - data structures & validation
│   │   ├── services/          # Service - business logic orchestration
│   │   ├── storage/           # Data persistence (JSON → SQLite → PostgreSQL)
│   │   │   ├── index.ts       # Unified interface
│   │   │   └── json-store.ts  # JSON file implementation
│   │   ├── middleware/        # Express middleware
│   │   ├── routes/            # Route definitions
│   │   └── app.ts             # Express entry
│   ├── data/                  # JSON data files
│   └── package.json
│
├── shared/                    # Shared types between client/server
│   └── types.ts
│
└── package.json               # Workspace root
```

**MVC Layers (Server)**:
- **Model**: Data structure definitions + validation, storage-agnostic
- **Controller**: Receives HTTP requests, calls Service, returns responses
- **Service**: Business logic orchestration, connects Controller and Storage
- **Storage**: Data persistence abstraction, swappable (JSON → SQLite → PostgreSQL)

## Data Models

```typescript
// ===== Store =====
interface Store {
  id: string
  name: string
  logo?: string
  description?: string
  openingHours?: string        // "09:00-22:00"
  createdAt: string
}

// ===== User/Role =====
type Role = 'owner' | 'staff'

interface StoreUser {
  id: string
  storeId: string
  username: string
  passwordHash: string
  role: Role
  name: string
  createdAt: string
}

// ===== Menu =====
interface Category {
  id: string
  storeId: string
  name: string
  sortOrder: number
}

interface MenuItem {
  id: string
  storeId: string
  categoryId: string
  name: string
  description?: string
  price: number                // Unit: cents (integer to avoid floating point)
  image?: string
  available: boolean
  sortOrder: number
}

// ===== Tables =====
interface Table {
  id: string
  storeId: string
  name: string                 // "A1", "B3", etc.
  qrCode?: string
  status: 'idle' | 'occupied'
  currentOrderId?: string      // Links to current active order
}

// ===== Cart (frontend only, not persisted to backend) =====
interface CartItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  remark?: string              // e.g. "no spice"
}

// ===== Orders =====
type OrderStatus = 'pending' | 'preparing' | 'completed'

interface OrderItem {
  menuItemId: string
  name: string                 // Snapshot: menu item name at order time
  price: number                // Snapshot: price at order time (cents)
  quantity: number
  remark?: string
}

interface Order {
  id: string
  orderNumber: string          // Human-readable: "A012"
  storeId: string
  tableId: string
  tableName: string
  items: OrderItem[]
  totalPrice: number           // Unit: cents
  status: OrderStatus
  customerName?: string        // Only if customer is logged in
  createdAt: string
  updatedAt: string
}
```

**Key decisions**:
- Prices in cents (integer) to avoid floating point issues
- Cart is frontend-only (zustand), submitted as one batch
- OrderItem snapshots name/price because menu items may change after ordering
- OrderStatus simplified to 3 states for MVP (expand later)
- Table.currentOrderId for direct lookup without reverse query

## API Design

### MVP Core (implement first)

```
GET    /api/stores/:storeId/menu                # Public: get full menu grouped by category
POST   /api/stores/:storeId/orders              # Public: customer places order
GET    /api/stores/:storeId/orders              # Admin: list orders (filterable)
PATCH  /api/stores/:storeId/orders/:id/status   # Admin: update order status
```

### Phase 2 (after core flow works)

```
POST   /api/stores                              # Create store
GET    /api/stores/:storeId                     # Get store info

POST   /api/stores/:storeId/categories          # Create category
PUT    /api/stores/:storeId/categories/:id      # Update category
DELETE /api/stores/:storeId/categories/:id      # Delete category

POST   /api/stores/:storeId/menu                # Add menu item
PUT    /api/stores/:storeId/menu/:id            # Update menu item
DELETE /api/stores/:storeId/menu/:id            # Delete menu item
PATCH  /api/stores/:storeId/menu/:id/available  # Toggle availability

GET    /api/stores/:storeId/tables              # List all tables
POST   /api/stores/:storeId/tables              # Create table
PUT    /api/stores/:storeId/tables/:id          # Update table
DELETE /api/stores/:storeId/tables/:id          # Delete table
GET    /api/stores/:storeId/tables/:id/qrcode   # Generate QR code
```

**Notes**:
- All APIs prefixed with `/api/stores/:storeId` for natural multi-tenancy
- Backend validates prices on order creation (never trust frontend prices)
- MVP admin endpoints have no auth; add later with bcrypt + JWT
- Order creation returns `orderNumber` (human-readable, e.g. "A012") alongside UUID

## Frontend Routes

```
# Customer
/scan/:storeId/:tableId       # QR code entry point
/menu/:storeId                # Menu browsing
/cart                          # Shopping cart
/order/confirm                 # Order confirmation

# Admin
/admin/login                   # Store owner/staff login
/admin/dashboard               # Order overview
/admin/menu                    # Menu management
/admin/tables                  # Table management
```

## Implementation Order

1. **Phase 1 - Scaffolding**: Project setup, routing, shared types, seed data
2. **Phase 2 - Admin backend**: Menu CRUD + table management + QR generation (hardcoded store)
3. **Phase 3 - Customer flow**: Scan → menu → cart → order
4. **Phase 4 - Staff view**: Real-time order dashboard + status updates
5. **Phase 5 - Optional login**: Customer accounts + order history

## Storage Strategy

MVP: JSON files in `server/data/`. Abstracted behind a storage interface so we can swap to SQLite (Prisma) then PostgreSQL later without changing service/controller layers.
