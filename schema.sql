-- ERP Schema for Super Shop (SQLite-compatible)
PRAGMA foreign_keys = ON;

-- Branches
CREATE TABLE IF NOT EXISTS branches (
    branch_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    address TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users and Roles
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL CHECK(role IN ('superadmin','admin','manager','cashier','warehouse','account head')),
    branch_id INTEGER,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(branch_id) REFERENCES branches(branch_id)
);

-- Product categories
CREATE TABLE IF NOT EXISTS categories (
    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    product_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category_id INTEGER,
    sku_barcode TEXT UNIQUE,
    unit_of_measure TEXT,
    cost_price REAL DEFAULT 0.0,
    selling_price REAL DEFAULT 0.0,
    item_condition TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(category_id) REFERENCES categories(category_id)
);

-- Inventory: per-branch stock levels
CREATE TABLE IF NOT EXISTS inventory (
    inventory_id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    current_stock REAL DEFAULT 0.0,
    last_cost REAL DEFAULT 0.0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(branch_id, product_id),
    FOREIGN KEY(branch_id) REFERENCES branches(branch_id),
    FOREIGN KEY(product_id) REFERENCES products(product_id)
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    loyalty_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Purchases (purchase header)
CREATE TABLE IF NOT EXISTS purchases (
    purchase_id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER NOT NULL,
    branch_id INTEGER NOT NULL,
    invoice_no TEXT,
    total_amount REAL DEFAULT 0.0,
    status TEXT DEFAULT 'received',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(supplier_id) REFERENCES suppliers(supplier_id),
    FOREIGN KEY(branch_id) REFERENCES branches(branch_id)
);

-- Purchase items (lines)
CREATE TABLE IF NOT EXISTS purchase_items (
    item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    qty REAL NOT NULL,
    unit_cost REAL NOT NULL,
    line_total REAL NOT NULL,
    FOREIGN KEY(purchase_id) REFERENCES purchases(purchase_id),
    FOREIGN KEY(product_id) REFERENCES products(product_id)
);

-- Sales transactions (POS header)
CREATE TABLE IF NOT EXISTS sales (
    sale_id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER NOT NULL,
    customer_id INTEGER,
    user_id INTEGER, -- cashier
    total_amount REAL DEFAULT 0.0,
    payment_status TEXT DEFAULT 'paid',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(branch_id) REFERENCES branches(branch_id),
    FOREIGN KEY(customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY(user_id) REFERENCES users(user_id)
);

-- Sale items (POS lines)
CREATE TABLE IF NOT EXISTS sale_items (
    sale_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    qty REAL NOT NULL,
    unit_price REAL NOT NULL,
    cost_price REAL,
    line_total REAL NOT NULL,
    FOREIGN KEY(sale_id) REFERENCES sales(sale_id),
    FOREIGN KEY(product_id) REFERENCES products(product_id)
);

-- Stock transfers between branches
CREATE TABLE IF NOT EXISTS stock_transfers (
    transfer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_branch INTEGER NOT NULL,
    to_branch INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(from_branch) REFERENCES branches(branch_id),
    FOREIGN KEY(to_branch) REFERENCES branches(branch_id)
);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
    transfer_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    transfer_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    qty REAL NOT NULL,
    FOREIGN KEY(transfer_id) REFERENCES stock_transfers(transfer_id),
    FOREIGN KEY(product_id) REFERENCES products(product_id)
);

-- Payments (supplier/customer)
CREATE TABLE IF NOT EXISTS payments (
    payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_id INTEGER, -- purchase_id or sale_id
    reference_type TEXT, -- 'purchase' or 'sale' or 'expense'
    amount REAL NOT NULL,
    method TEXT,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Expenses (operational)
CREATE TABLE IF NOT EXISTS expenses (
    expense_id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER,
    category TEXT,
    amount REAL NOT NULL,
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(branch_id) REFERENCES branches(branch_id)
);

-- Audit / Sessions (optional)
CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku_barcode);
CREATE INDEX IF NOT EXISTS idx_inventory_branch_product ON inventory(branch_id, product_id);
CREATE INDEX IF NOT EXISTS idx_sales_branch ON sales(branch_id);

-- End of schema
