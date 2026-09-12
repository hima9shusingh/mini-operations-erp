# Mini Operations ERP — Entity Relationship Diagram

Generated from `server/prisma/schema.prisma`.

## Enums

| Enum | Values |
|---|---|
| `Role` | `ADMIN`, `OPERATIONS`, `SALES` |
| `WorkOrderStatus` | `ASSIGNED`, `IN_PROGRESS`, `COMPLETED` |
| `TransferStatus` | `REQUESTED`, `DISPATCHED`, `RECEIVED` |
| `CustomerOrderStatus` | `CREATED`, `RESERVED`, `CANCELLED` |

## ER Diagram

```mermaid
erDiagram
    USER {
        String  id           PK "uuid"
        String  name
        String  email        UK
        String  passwordHash
        Role    role
        DateTime createdAt
        DateTime updatedAt
    }

    LOCATION {
        String  id        PK "uuid"
        String  name
        String  code      UK
        DateTime createdAt
        DateTime updatedAt
    }

    ITEM {
        String  id        PK "uuid"
        String  name
        String  sku       UK
        String  category
        DateTime createdAt
        DateTime updatedAt
    }

    INVENTORY {
        String  id               PK "uuid"
        String  itemId           FK
        String  locationId       FK
        String  batch
        Int     physicalQuantity
        Int     reservedQuantity
        DateTime createdAt
        DateTime updatedAt
    }

    WORK_ORDER {
        String          id               PK "uuid"
        String          locationId       FK
        String          itemId           FK
        String          assignedUserId   FK "nullable"
        Int             requiredQuantity
        WorkOrderStatus status
        DateTime        createdAt
        DateTime        updatedAt
    }

    INTERNAL_TRANSFER {
        String         id                    PK "uuid"
        String         sourceLocationId      FK
        String         destinationLocationId FK
        String         itemId                FK
        Int            quantity
        TransferStatus status
        DateTime       createdAt
        DateTime       updatedAt
    }

    CUSTOMER_ORDER {
        String              id           PK "uuid"
        String              customerName
        String              locationId   FK
        String              itemId       FK
        String              createdById  FK
        Int                 quantity
        CustomerOrderStatus status
        DateTime            createdAt
        DateTime            updatedAt
    }

    ITEM ||--o{ INVENTORY          : "has batches"
    LOCATION ||--o{ INVENTORY      : "stores"

    ITEM ||--o{ WORK_ORDER         : "required by"
    LOCATION ||--o{ WORK_ORDER     : "assigned to"
    USER |o--o{ WORK_ORDER         : "assigned to"

    ITEM ||--o{ INTERNAL_TRANSFER       : "transferred"
    LOCATION ||--o{ INTERNAL_TRANSFER   : "source"
    LOCATION ||--o{ INTERNAL_TRANSFER   : "destination"

    ITEM ||--o{ CUSTOMER_ORDER     : "ordered"
    LOCATION ||--o{ CUSTOMER_ORDER : "fulfilled from"
    USER ||--o{ CUSTOMER_ORDER     : "created by"
```

## Relationship Summary

| Relationship | Type | Description |
|---|---|---|
| `Item` → `Inventory` | One-to-Many | One item can have many inventory batches across locations |
| `Location` → `Inventory` | One-to-Many | One location can hold many inventory records |
| `Item` → `WorkOrder` | One-to-Many | One item can appear in many work orders |
| `Location` → `WorkOrder` | One-to-Many | One location can have many work orders |
| `User` → `WorkOrder` | Zero-or-One-to-Many | A user can be optionally assigned to many work orders |
| `Item` → `InternalTransfer` | One-to-Many | One item can be transferred many times |
| `Location` → `InternalTransfer` (source) | One-to-Many | One location can be source of many transfers |
| `Location` → `InternalTransfer` (destination) | One-to-Many | One location can be destination of many transfers |
| `Item` → `CustomerOrder` | One-to-Many | One item can have many customer orders |
| `Location` → `CustomerOrder` | One-to-Many | One location can serve many customer orders |
| `User` → `CustomerOrder` | One-to-Many | One user (SALES) can create many customer orders |

## Unique Constraints

| Model | Constraint |
|---|---|
| `User` | `email` |
| `Location` | `code` |
| `Item` | `sku` |
| `Inventory` | `(itemId, locationId, batch)` — composite unique |

## Notes

- `Inventory.reservedQuantity` is incremented when a `CustomerOrder` is placed and decremented on cancellation. The available quantity is computed as `physicalQuantity − reservedQuantity`.
- `InternalTransfer` uses two named relations (`SourceLocation`, `DestLocation`) on `Location` to distinguish source from destination.
- `WorkOrder.assignedUserId` is nullable — a work order may exist without an assigned user.
- `CustomerOrder` defaults to status `RESERVED` (not `CREATED`) at creation, reflecting that stock reservation happens atomically at order creation time.
