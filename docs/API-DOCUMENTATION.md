# Mini Operations ERP — API Documentation

## Base URL

```
http://localhost:5000/api
```

All endpoints are prefixed with `/api`.

---

## Authentication

All protected endpoints require a JWT bearer token in the `Authorization` header:

```
Authorization: Bearer <JWT_TOKEN>
```

A token is obtained from the **Login** endpoint. Tokens contain the user's `userId` and `role`, and are verified on every protected request.

If the token is missing or invalid, the server responds with `401`.

---

## Roles

The system has three roles. Each role controls which endpoints a user can call.

| Role | Description |
|---|---|
| `ADMIN` | Full access to all endpoints |
| `OPERATIONS` | Inventory (read/write), Work Orders (read), Transfers (read/write/dispatch/receive) |
| `SALES` | Inventory (read), Work Orders (read), Transfers (read), Customer Orders (create/cancel) |

Role enforcement is applied per-route. Calling a route with an insufficient role returns `403`.

---

## HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | Success (read / update / delete / cancel) |
| `201` | Created (resource successfully created) |
| `400` | Bad request — validation failed or business rule violated |
| `401` | Unauthorized — missing, invalid, or expired JWT token |
| `403` | Forbidden — authenticated but insufficient role |
| `404` | Resource not found |
| `409` | Conflict — duplicate record or concurrent reservation failure |
| `500` | Internal server error |

---

## Authentication APIs

Base path: `/api/auth`

---

### POST /api/auth/register

Register a new user. All public registrations are assigned the `SALES` role regardless of any role field in the request body.

**Authentication:** Not required

**Request Body:**

```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "secret123"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | Yes | Non-empty |
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Minimum 6 characters |

**Success Response — 201:**

```json
{
  "success": true,
  "message": "Registration successful",
  "user": {
    "id": "uuid",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "role": "SALES"
  }
}
```

**Error Responses:**

| Status | Message |
|---|---|
| `400` | `Name, email, and password are required` |
| `400` | `Invalid email format` |
| `400` | `Password must be at least 6 characters long` |
| `409` | `Email already in use` |

---

### POST /api/auth/login

Authenticate a user and return a JWT token.

**Authentication:** Not required

**Request Body:**

```json
{
  "email": "admin@mini-erp.local",
  "password": "Admin@12345"
}
```

**Success Response — 200:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "Admin User",
    "email": "admin@mini-erp.local",
    "role": "ADMIN"
  }
}
```

**Error Responses:**

| Status | Message |
|---|---|
| `400` | `Email and password are required` |
| `401` | `Invalid credentials` |

---

### GET /api/auth/me

Get the profile of the currently authenticated user.

**Authentication:** Required  
**Roles:** Any authenticated user

**Success Response — 200:**

```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "Admin User",
    "email": "admin@mini-erp.local",
    "role": "ADMIN"
  }
}
```

---

### GET /api/auth/users

Get a list of all registered users. Used by the frontend to populate assignee dropdowns.

**Authentication:** Required  
**Roles:** Any authenticated user

**Success Response — 200:**

```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "Admin User", "email": "admin@mini-erp.local", "role": "ADMIN" },
    { "id": "uuid", "name": "Sales User", "email": "sales@mini-erp.local", "role": "SALES" }
  ]
}
```

---

### GET /api/auth/admin-test

Role verification test endpoint.

**Authentication:** Required  
**Roles:** `ADMIN`

**Success Response — 200:**

```json
{ "success": true, "message": "Admin access granted" }
```

---

### GET /api/auth/operations-test

**Authentication:** Required  
**Roles:** `ADMIN`, `OPERATIONS`

**Success Response — 200:**

```json
{ "success": true, "message": "Operations access granted" }
```

---

### GET /api/auth/sales-test

**Authentication:** Required  
**Roles:** `ADMIN`, `SALES`

**Success Response — 200:**

```json
{ "success": true, "message": "Sales access granted" }
```

---

## Inventory APIs

Base path: `/api/inventory`

All inventory endpoints require authentication.

Item and Location records are created automatically if they do not already exist when creating or updating inventory.

---

### GET /api/inventory

List all inventory records with pagination, search, and filters.

**Authentication:** Required  
**Roles:** `ADMIN`, `OPERATIONS`, `SALES`

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `page` | integer | Page number (default: `1`) |
| `limit` | integer | Records per page (default: `10`) |
| `search` | string | Case-insensitive search across item name, category, and location name |
| `location` | string | Filter by exact location name (case-insensitive) |
| `category` | string | Filter by exact category (case-insensitive) |

**Success Response — 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "item": "Steel Rod",
      "category": "Raw Material",
      "location": "Warehouse A",
      "batch": "BATCH-001",
      "physicalQuantity": 100,
      "reservedQuantity": 20,
      "availableQuantity": 80,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

> **Note:** `availableQuantity` is computed as `physicalQuantity − reservedQuantity`. It is not stored in the database.

---

### GET /api/inventory/:id

Get a single inventory record by ID.

**Authentication:** Required  
**Roles:** `ADMIN`, `OPERATIONS`, `SALES`

**URL Parameters:**

| Parameter | Description |
|---|---|
| `id` | Inventory record UUID |

**Success Response — 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "item": "Steel Rod",
    "category": "Raw Material",
    "location": "Warehouse A",
    "batch": "BATCH-001",
    "physicalQuantity": 100,
    "reservedQuantity": 20,
    "availableQuantity": 80,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Message |
|---|---|
| `404` | `Inventory not found` |

---

### POST /api/inventory

Create a new inventory record.

**Authentication:** Required  
**Roles:** `ADMIN`, `OPERATIONS`

**Request Body:**

```json
{
  "item": "Steel Rod",
  "category": "Raw Material",
  "location": "Warehouse A",
  "batch": "BATCH-001",
  "physicalQuantity": 100,
  "reservedQuantity": 0
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `item` | string | Yes | Item name; auto-created if not found |
| `category` | string | Yes | Item category |
| `location` | string | Yes | Location name; auto-created if not found |
| `batch` | string | Yes | Batch identifier |
| `physicalQuantity` | number | Yes | Must be `>= 0` |
| `reservedQuantity` | number | No | Must be `>= 0` and `<= physicalQuantity`; defaults to `0` |

**Success Response — 201:**

```json
{
  "success": true,
  "data": { ... }
}
```

**Error Responses:**

| Status | Message |
|---|---|
| `400` | `Item, category, location, and batch are required.` |
| `400` | `physicalQuantity must be a number >= 0.` |
| `400` | `reservedQuantity must be a number >= 0.` |
| `400` | `reservedQuantity cannot be greater than physicalQuantity.` |
| `409` | `Duplicate inventory record for this item, location, and batch.` |

---

### PUT /api/inventory/:id

Update an existing inventory record. All fields are optional; only provided fields are changed.

**Authentication:** Required  
**Roles:** `ADMIN`, `OPERATIONS`

**Request Body (all fields optional):**

```json
{
  "item": "Aluminium Rod",
  "category": "Raw Material",
  "location": "Warehouse B",
  "batch": "BATCH-002",
  "physicalQuantity": 150
}
```

> **Note:** `reservedQuantity` cannot be updated directly through this endpoint. It is managed by Customer Order creation and cancellation.

**Business Rules:**

- `physicalQuantity` cannot be set below the current `reservedQuantity`.
- If item, location, or batch change, the new combination must not create a duplicate record.

**Success Response — 200:**

```json
{
  "success": true,
  "data": { ... }
}
```

**Error Responses:**

| Status | Message |
|---|---|
| `400` | `physicalQuantity must be a number >= 0.` |
| `400` | `physicalQuantity cannot be less than reservedQuantity.` |
| `404` | `Inventory not found` |
| `409` | `Duplicate inventory record for this item, location, and batch.` |

---

### DELETE /api/inventory/:id

Delete an inventory record.

**Authentication:** Required  
**Roles:** `ADMIN` only

**Success Response — 200:**

```json
{
  "success": true,
  "message": "Inventory deleted successfully."
}
```

**Error Responses:**

| Status | Message |
|---|---|
| `404` | `Inventory not found` |

---

## Work Order APIs

Base path: `/api/work-orders`

All work order endpoints require authentication.

---

### GET /api/work-orders

List all work orders with pagination and filters. Each work order includes a live `materialAvailability` calculation.

**Authentication:** Required  
**Roles:** `ADMIN`, `OPERATIONS`, `SALES`

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `page` | integer | Page number (default: `1`) |
| `limit` | integer | Records per page (default: `10`) |
| `status` | string | Filter by status: `ASSIGNED`, `IN_PROGRESS`, or `COMPLETED` |
| `location` | string | Filter by exact location name (case-insensitive) |

**Success Response — 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "location": "Warehouse A",
      "item": "Steel Rod",
      "requiredQuantity": 50,
      "status": "ASSIGNED",
      "assignedUser": {
        "id": "uuid",
        "name": "Admin User",
        "email": "admin@mini-erp.local",
        "role": "ADMIN"
      },
      "materialAvailability": {
        "availableQuantity": 80,
        "shortageQuantity": 0
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

> **Note:** `shortageQuantity = max(0, requiredQuantity − availableQuantity)`. If `shortageQuantity > 0`, there is insufficient stock for the work order.

---

### GET /api/work-orders/:id

Get a single work order by ID, including live material availability.

**Authentication:** Required  
**Roles:** `ADMIN`, `OPERATIONS`, `SALES`

**Success Response — 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "location": "Warehouse A",
    "item": "Steel Rod",
    "requiredQuantity": 50,
    "status": "ASSIGNED",
    "assignedUser": { ... },
    "materialAvailability": {
      "availableQuantity": 80,
      "shortageQuantity": 0
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Message |
|---|---|
| `404` | `Work Order not found` |

---

### POST /api/work-orders

Create a new work order.

**Authentication:** Required  
**Roles:** `ADMIN` only

**Request Body:**

```json
{
  "location": "Warehouse A",
  "item": "Steel Rod",
  "requiredQuantity": 50,
  "assignedUserId": "uuid-of-user"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `location` | string | Yes | Must match an existing Location name |
| `item` | string | Yes | Must match an existing Item name |
| `requiredQuantity` | number | Yes | Must be `> 0` |
| `assignedUserId` | string | Yes | Must be an existing user with role `ADMIN` or `OPERATIONS` |

**Success Response — 201:**

```json
{
  "success": true,
  "data": { ... }
}
```

**Error Responses:**

| Status | Message |
|---|---|
| `400` | `location, item, and assignedUserId are required.` |
| `400` | `requiredQuantity must be > 0.` |
| `404` | `Location or item not found.` |
| `404` | `Assigned user not found or cannot be assigned work.` |

---

### PATCH /api/work-orders/:id/status

Update the status of a work order.

**Authentication:** Required  
**Roles:** `ADMIN` only

**Request Body:**

```json
{
  "status": "IN_PROGRESS"
}
```

Valid values: `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`

**Success Response — 200:**

```json
{
  "success": true,
  "data": { ... }
}
```

**Error Responses:**

| Status | Message |
|---|---|
| `400` | `Invalid status` |
| `404` | `Work Order not found` |

---

## Internal Transfer APIs

Base path: `/api/transfers`

All transfer endpoints require authentication.

Transfers follow a strict state machine:

```
REQUESTED → DISPATCHED → RECEIVED
```

---

### GET /api/transfers

List all transfers with pagination and optional status filter.

**Authentication:** Required  
**Roles:** `ADMIN`, `OPERATIONS`, `SALES`

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `page` | integer | Page number (default: `1`) |
| `limit` | integer | Records per page (default: `10`) |
| `status` | string | Filter by: `REQUESTED`, `DISPATCHED`, or `RECEIVED` |

**Success Response — 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sourceLocation": "Warehouse A",
      "destinationLocation": "Warehouse B",
      "item": "Steel Rod",
      "quantity": 30,
      "status": "REQUESTED",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### GET /api/transfers/:id

Get a single transfer by ID.

**Authentication:** Required  
**Roles:** `ADMIN`, `OPERATIONS`, `SALES`

**Success Response — 200:**

```json
{
  "success": true,
  "data": { ... }
}
```

**Error Responses:**

| Status | Message |
|---|---|
| `404` | `Transfer not found` |

---

### POST /api/transfers

Create a new transfer request. The transfer begins in `REQUESTED` status. No inventory changes occur at this point.

**Authentication:** Required  
**Roles:** `ADMIN`, `OPERATIONS`

**Request Body:**

```json
{
  "sourceLocation": "Warehouse A",
  "destinationLocation": "Warehouse B",
  "item": "Steel Rod",
  "quantity": 30
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `sourceLocation` | string | Yes | Must be different from `destinationLocation` |
| `destinationLocation` | string | Yes | Must be different from `sourceLocation` |
| `item` | string | Yes | Item name; auto-created if not found |
| `quantity` | number | Yes | Must be `> 0` |

**Success Response — 201:**

```json
{
  "success": true,
  "data": { ... }
}
```

**Error Responses:**

| Status | Message |
|---|---|
| `400` | `sourceLocation, destinationLocation, and item are required.` |
| `400` | `Source and destination locations must be different.` |
| `400` | `Quantity must be > 0.` |

---

### PATCH /api/transfers/:id/dispatch

Dispatch a transfer. This moves stock from the source location.

- Transfer must be in `REQUESTED` state.
- The system finds the first inventory batch at the source location with sufficient available quantity (`physicalQuantity − reservedQuantity >= transfer quantity`).
- Source inventory `physicalQuantity` is decremented by the transfer quantity inside a database transaction.
- Transfer status changes to `DISPATCHED`.

**Authentication:** Required  
**Roles:** `ADMIN`, `OPERATIONS`

**No request body required.**

**Success Response — 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "DISPATCHED",
    ...
  }
}
```

**Error Responses:**

| Status | Message |
|---|---|
| `400` | `Transfer must be in REQUESTED state to dispatch.` |
| `400` | `Insufficient available inventory at source location` |
| `404` | `Transfer not found` |

---

### PATCH /api/transfers/:id/receive

Mark a transfer as received. This adds stock to the destination location.

- Transfer must be in `DISPATCHED` state — a `RECEIVED` transfer cannot be received again.
- Destination inventory `physicalQuantity` is incremented by the transfer quantity inside a database transaction.
- If no inventory record exists at the destination for that item, a new one is created with batch `DEFAULT`.
- Transfer status changes to `RECEIVED`.

**Authentication:** Required  
**Roles:** `ADMIN`, `OPERATIONS`

**No request body required.**

**Success Response — 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "RECEIVED",
    ...
  }
}
```

**Error Responses:**

| Status | Message |
|---|---|
| `400` | `Transfer must be in DISPATCHED state to receive.` |
| `404` | `Transfer not found` |

---

## Customer Order APIs

Base path: `/api/customer-orders`

All customer order endpoints require authentication.

Customer orders reserve stock atomically at the time of creation using an optimistic concurrency check on `reservedQuantity`.

---

### GET /api/customer-orders

List all customer orders with pagination and optional status filter.

**Authentication:** Required  
**Roles:** `ADMIN`, `OPERATIONS`, `SALES`

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `page` | integer | Page number (default: `1`) |
| `limit` | integer | Records per page (default: `10`) |
| `status` | string | Filter by: `RESERVED` or `CANCELLED` |

**Success Response — 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "customerName": "Acme Corp",
      "location": "Warehouse A",
      "item": "Steel Rod",
      "quantity": 20,
      "status": "RESERVED",
      "createdBy": "Sales User",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### GET /api/customer-orders/:id

Get a single customer order by ID.

**Authentication:** Required  
**Roles:** `ADMIN`, `OPERATIONS`, `SALES`

**Success Response — 200:**

```json
{
  "success": true,
  "data": { ... }
}
```

**Error Responses:**

| Status | Message |
|---|---|
| `404` | `Customer order not found` |

---

### POST /api/customer-orders

Create a new customer order and atomically reserve the requested stock.

**Authentication:** Required  
**Roles:** `SALES` only

**Request Body:**

```json
{
  "customerName": "Acme Corp",
  "location": "Warehouse A",
  "item": "Steel Rod",
  "quantity": 20
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `customerName` | string | Yes | Non-empty |
| `location` | string | Yes | Must match an existing Location name |
| `item` | string | Yes | Must match an existing Item name |
| `quantity` | number | Yes | Must be `> 0` and `<= availableQuantity` |

**Concurrency:** The system uses an `updateMany` with an optimistic lock on `reservedQuantity` to prevent double-reservation under concurrent requests.

**Success Response — 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "customerName": "Acme Corp",
    "location": "Warehouse A",
    "item": "Steel Rod",
    "quantity": 20,
    "status": "RESERVED",
    "createdBy": "Sales User",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**

| Status | Message |
|---|---|
| `400` | `customerName, location, and item are required.` |
| `400` | `Quantity must be > 0.` |
| `400` | `Insufficient available inventory` |
| `404` | `Location or item not found.` |
| `409` | `Insufficient available inventory due to concurrent reservation.` |

---

### PATCH /api/customer-orders/:id/cancel

Cancel a customer order and release the reserved stock.

**Authentication:** Required  
**Roles:** `SALES` only

**Business Rules:**
- A SALES user can only cancel orders they personally created.
- Only `RESERVED` orders can be cancelled.
- Cancellation decrements `reservedQuantity` on the inventory record inside a database transaction.

**No request body required.**

**Success Response — 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "CANCELLED",
    ...
  }
}
```

**Error Responses:**

| Status | Message |
|---|---|
| `400` | `Order is already cancelled` |
| `400` | `Only reserved orders can be cancelled` |
| `403` | `Cannot cancel an order you did not create` |
| `404` | `Customer order not found` |

---

## Error Response Format

All error responses follow this consistent structure:

```json
{
  "success": false,
  "message": "Human-readable error message"
}
```

---

## Business Rules

### Inventory

- `availableQuantity = physicalQuantity − reservedQuantity` (computed, not stored)
- `physicalQuantity` must always be `>= 0`
- `reservedQuantity` must always be `>= 0` and `<= physicalQuantity`
- `physicalQuantity` cannot be updated to a value below the current `reservedQuantity`
- An inventory record is uniquely identified by `(item, location, batch)` — duplicates are rejected with `409`
- Item and Location records are auto-created when referenced by name in Inventory or Transfer creation

### Work Orders

- Only `ADMIN` can create or update work orders
- Work orders can only be assigned to users with role `ADMIN` or `OPERATIONS`
- A live `materialAvailability` is returned with every work order showing current `availableQuantity` and `shortageQuantity` based on real-time inventory
- `shortageQuantity = max(0, requiredQuantity − availableQuantity)`

### Transfers

- Source and destination locations must be different
- State machine is strictly enforced: `REQUESTED → DISPATCHED → RECEIVED`
- Dispatch checks for a batch with sufficient available quantity (`physicalQuantity − reservedQuantity >= transfer.quantity`) at source
- Dispatch decrements source `physicalQuantity` in a database transaction
- Receive increments destination `physicalQuantity` in a database transaction
- If no inventory exists at the destination, a new record with batch `DEFAULT` is created
- A transfer in `RECEIVED` state cannot be received again (`400` is returned)

### Customer Orders

- Only `SALES` can create or cancel customer orders
- Stock reservation is atomic: the system uses `updateMany` with an optimistic lock on `reservedQuantity` to prevent concurrent over-reservation
- If a concurrent reservation conflict is detected, `409` is returned
- Cancellation releases the reserved stock by decrementing `reservedQuantity`
- Only `RESERVED` orders can be cancelled
- A SALES user can only cancel their own orders
