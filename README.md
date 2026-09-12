# Mini Operations ERP

A production-oriented full-stack Operations ERP implementing a complete operations workflow:

**Inventory → Work Order → Stock Check → Internal Transfer → Customer Reservation**

---

## 1. Project Overview

Mini Operations ERP is a Full-Stack Developer Technical Case Study that implements a realistic internal operations system. It covers inventory tracking, work order management with automatic shortage detection, multi-step internal stock transfers, and customer order reservation — all protected by JWT authentication and role-based access control.

---

## 2. Key Features

- **JWT Authentication** — Secure login and session management using signed JSON Web Tokens
- **Role-Based Authorization (RBAC)** — Three roles (`ADMIN`, `OPERATIONS`, `SALES`) with per-route enforcement
- **Inventory Management** — Create, read, update, and delete inventory records with item, location, and batch tracking
- **Available Quantity Calculation** — `availableQuantity = physicalQuantity − reservedQuantity` computed on every response
- **Work Orders** — ADMIN creates work orders assigned to ADMIN/OPERATIONS users
- **Automatic Shortage Calculation** — Every work order response includes live `availableQuantity` and `shortageQuantity`
- **Internal Transfers** — Move stock between locations through a strict `REQUESTED → DISPATCHED → RECEIVED` lifecycle
- **Inventory Updates on Transfer** — Source decremented on dispatch; destination incremented only on receipt
- **Customer Orders** — SALES users reserve available stock for named customers
- **Inventory Reservation** — `reservedQuantity` is atomically incremented at order creation
- **Concurrent Reservation Protection** — Optimistic lock on `reservedQuantity` prevents double-booking under concurrent requests
- **Order Cancellation** — Cancellation atomically releases reserved stock in a database transaction
- **Input Validation** — Required fields, quantity bounds, email format, and business rule violations all return structured `400` errors
- **Error Handling** — Consistent `{ success, message }` error format across all endpoints
- **Automated Tests** — Jest + Supertest integration tests covering all critical business rules

---

## 3. User Roles

| Role | Permissions |
|---|---|
| **ADMIN** | Full access — manage inventory, create/update work orders, manage transfers (create/dispatch/receive), view all data |
| **OPERATIONS** | Manage inventory (create/update), create and dispatch/receive transfers, view work orders and customer orders |
| **SALES** | View inventory, work orders, and transfers; create and cancel their own customer orders |

> Role restrictions are enforced server-side on every request via the `authorizeRoles` middleware. The role cannot be overridden by the client.

> Public registration always assigns the `SALES` role regardless of any role value in the request body.

---

## 4. Tech Stack

### Frontend
- React 19 with TypeScript
- React Router v7
- Vite 8

### Backend
- Node.js with Express 5
- TypeScript compiled with `tsc`
- `tsx watch` for development hot-reload

### Database & ORM
- PostgreSQL (Neon serverless)
- Prisma ORM 5

### Authentication
- JSON Web Tokens (`jsonwebtoken`)
- `bcrypt` for password hashing

### Testing
- Jest 30
- Supertest (HTTP integration tests)
- `ts-jest` for TypeScript support

---

## 5. Project Structure

```
mini-operations-erp/
├── client/                  # React frontend (Vite)
│   └── src/
│       ├── components/      # Shared UI components (Navbar, etc.)
│       ├── context/         # Auth context (JWT state)
│       ├── pages/           # Page components per module
│       └── services/        # API fetch utilities
├── server/                  # Express backend
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   ├── migrations/      # Prisma migration history
│   │   └── seed.ts          # Development user seeder
│   └── src/
│       ├── controllers/     # Business logic per module
│       ├── middleware/       # JWT auth + RBAC
│       ├── routes/          # Express route definitions
│       ├── utils/           # JWT helpers
│       └── __tests__/       # Integration tests
└── docs/
    ├── API-DOCUMENTATION.md
    └── ER-DIAGRAM.md
```

---

## 6. Database

**PostgreSQL** managed via **Prisma ORM**.

### Models

| Model | Description |
|---|---|
| `User` | Application users with role (`ADMIN`, `OPERATIONS`, `SALES`) |
| `Location` | Physical stock locations (unique `code`) |
| `Item` | Products/materials (unique `sku`) |
| `Inventory` | Stock record per `(item, location, batch)` — unique composite key |
| `WorkOrder` | Work order assigned to a user for a specific item and location |
| `InternalTransfer` | Stock movement between two locations |
| `CustomerOrder` | Customer stock reservation |

### Key Relationships
- `Inventory` belongs to one `Item` and one `Location`
- `WorkOrder` references `Item`, `Location`, and optionally a `User`
- `InternalTransfer` references `Item` and two `Location` records (source + destination)
- `CustomerOrder` references `Item`, `Location`, and the `User` who created it

### Constraints
- `Inventory` is unique on `(itemId, locationId, batch)`
- `User.email`, `Location.code`, and `Item.sku` are each unique

See [`docs/ER-DIAGRAM.md`](docs/ER-DIAGRAM.md) for the full Mermaid ER diagram.

---

## 7. API Documentation

Complete REST API reference: [`docs/API-DOCUMENTATION.md`](docs/API-DOCUMENTATION.md)

Covers all 22 endpoints across 5 modules — including request/response examples, role restrictions, validation rules, and business rule documentation.

---

## 8. Environment Variables

### Server — `server/.env`

Copy `server/.env.example` and fill in your values:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"
JWT_SECRET="your-secure-random-secret"
```

### Client — `client/.env`

Copy `client/.env.example`:

```env
VITE_API_URL=http://localhost:5000/api
```

> Never commit `.env` files. They are listed in `.gitignore`.

---

## 9. Setup Instructions

### Prerequisites
- Node.js 18+
- A PostgreSQL database (local or cloud, e.g. Neon)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/hima9shusingh/mini-operations-erp.git
cd mini-operations-erp

# 2. Install backend dependencies
cd server
npm install

# 3. Configure backend environment
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET

# 4. Run database migrations
npx prisma migrate deploy

# 5. Seed development users
npm run db:seed

# 6. Start backend (development)
npm run dev

# 7. In a new terminal — install and start frontend
cd ../client
npm install
cp .env.example .env
npm run dev
```

The backend runs on `http://localhost:5000` and the frontend on `http://localhost:5173`.

---

## 10. Development Demo Accounts

> ⚠️ These accounts are for **development and demo use only**. Do not use in production.

Created by `npm run db:seed`:

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@mini-erp.local` | `Admin@12345` |
| SALES | `sales@mini-erp.local` | `Sales@12345` |

---

## 11. Running Tests

```bash
cd server
npm test
```

Tests use a separate `.env.test` file with a test database to avoid polluting development data.

### Test Coverage

| Test Suite | What is tested |
|---|---|
| **Authentication** | Valid login returns JWT; invalid credentials return 401; protected routes require a token |
| **Inventory & Work Orders** | Negative `physicalQuantity` is rejected (400); negative `requiredQuantity` is rejected (400) |
| **Transfers** | Cannot transfer more than available inventory; destination stock increases **only** after receipt; same transfer cannot be received twice; SALES role cannot dispatch or receive (403) |
| **Customer Orders** | Cannot reserve more than available inventory; valid reservation increments `reservedQuantity`; concurrent reservations are handled correctly (only one succeeds); ADMIN cannot create customer orders (403); cancellation releases reserved quantity |

---

## 12. Build

### Backend

```bash
cd server
npm run build
```

Compiles TypeScript to `server/dist/`. Start production server with:

```bash
npm start
```

### Frontend

```bash
cd client
npm run build
```

Produces a static build in `client/dist/`.

---

## 13. Business Flow

```
Login (JWT issued)
        ↓
Inventory (create stock records with physicalQuantity and batch)
        ↓
Work Order (ADMIN assigns work; system calculates availableQuantity and shortageQuantity live)
        ↓
Internal Transfer (move stock between locations)
    REQUESTED → DISPATCHED (source physicalQuantity decremented)
              → RECEIVED   (destination physicalQuantity incremented)
        ↓
Customer Order (SALES reserves stock)
    → reservedQuantity incremented atomically
    → availableQuantity = physicalQuantity − reservedQuantity
    → Cancellation releases reservedQuantity in a transaction
```

**Key stock rule:** `availableQuantity = physicalQuantity − reservedQuantity`. Reserved stock cannot be transferred or over-reserved.

---

## 14. Documentation

| Document | Location |
|---|---|
| ER Diagram | [`docs/ER-DIAGRAM.md`](docs/ER-DIAGRAM.md) |
| API Documentation | [`docs/API-DOCUMENTATION.md`](docs/API-DOCUMENTATION.md) |

---

## 15. Case Study Notes

- **Relational database** with normalized schema (User, Item, Location, Inventory, WorkOrder, InternalTransfer, CustomerOrder)
- **Backend-enforced RBAC** — role restrictions applied in Express middleware, not the client
- **Database transactions** used for all critical multi-step operations (dispatch, receive, reserve, cancel)
- **Concurrent reservation protection** implemented via optimistic locking on `reservedQuantity` using Prisma `updateMany` with a conditional `where` clause
- **Automated integration tests** verify every critical business rule using Jest and Supertest against a real test database
