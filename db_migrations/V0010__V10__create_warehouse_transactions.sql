CREATE TABLE t_p10048923_warehouse_management.warehouse_transactions (
    id SERIAL PRIMARY KEY,
    item_id INTEGER REFERENCES t_p10048923_warehouse_management.warehouse_items(id),
    object_id INTEGER REFERENCES t_p10048923_warehouse_management.objects(id),
    type VARCHAR(20) NOT NULL,
    quantity INTEGER NOT NULL,
    user_name VARCHAR(255),
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
)
