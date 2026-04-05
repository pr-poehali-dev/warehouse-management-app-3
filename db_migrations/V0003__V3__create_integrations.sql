CREATE TABLE t_p10048923_warehouse_management.integrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(100),
    status VARCHAR(50) DEFAULT 'disconnected',
    last_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
)
