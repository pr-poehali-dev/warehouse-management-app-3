INSERT INTO t_p10048923_warehouse_management.object_integrations (object_id, integration_id)
SELECT o.id, i.id
FROM t_p10048923_warehouse_management.objects o,
     t_p10048923_warehouse_management.integrations i
WHERE (o.code = 'OBJ-001' AND i.name IN ('1C:Предприятие', 'amoCRM'))
   OR (o.code = 'OBJ-002' AND i.name = 'Битрикс24')
   OR (o.code = 'OBJ-004' AND i.name IN ('1C:Предприятие', 'SAP ERP'))
