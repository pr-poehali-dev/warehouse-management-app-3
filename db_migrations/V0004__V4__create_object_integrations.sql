CREATE TABLE t_p10048923_warehouse_management.object_integrations (
    object_id INTEGER REFERENCES t_p10048923_warehouse_management.objects(id),
    integration_id INTEGER REFERENCES t_p10048923_warehouse_management.integrations(id),
    PRIMARY KEY (object_id, integration_id)
)
