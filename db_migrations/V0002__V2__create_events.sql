CREATE TABLE t_p10048923_warehouse_management.events (
    id SERIAL PRIMARY KEY,
    object_id INTEGER REFERENCES t_p10048923_warehouse_management.objects(id),
    type VARCHAR(100) NOT NULL,
    description TEXT,
    user_name VARCHAR(255),
    severity VARCHAR(50) DEFAULT 'info',
    created_at TIMESTAMP DEFAULT NOW()
)
