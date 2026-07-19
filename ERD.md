# ERP Database ERD (Mermaid)

```mermaid
erDiagram
    BRANCHES ||--o{ USERS : hosts
    BRANCHES ||--o{ INVENTORY : "holds"
    BRANCHES ||--o{ PURCHASES : "receives"
    BRANCHES ||--o{ SALES : "records"
    USERS ||--o{ SALES : "processes"
    USERS ||--o{ SESSIONS : "owns"

    PRODUCTS ||--o{ INVENTORY : "stock"
    CATEGORIES ||--o{ PRODUCTS : "categorizes"

    SUPPLIERS ||--o{ PURCHASES : "supplies"
    PURCHASES ||--o{ PURCHASE_ITEMS : "lines"
    PRODUCTS ||--o{ PURCHASE_ITEMS : "purchased"

    SALES ||--o{ SALE_ITEMS : "lines"
    PRODUCTS ||--o{ SALE_ITEMS : "sold"
    CUSTOMERS ||--o{ SALES : "buys"

    STOCK_TRANSFERS ||--o{ STOCK_TRANSFER_ITEMS : "items"
    PRODUCTS ||--o{ STOCK_TRANSFER_ITEMS : "moved"

    PAYMENTS ||--o{ PURCHASES : "pays"
    PAYMENTS ||--o{ SALES : "payments"
```

Notes:
- `users.role` is kept as a string enum for simplicity.
- `inventory` stores per-branch stock and last known cost for moving-average calculations.
- `payments` is a simplified ledger for supplier/customer payments and expense payments.

You can render the above Mermaid diagram in any markdown viewer that supports Mermaid.
