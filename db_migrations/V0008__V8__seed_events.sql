INSERT INTO t_p10048923_warehouse_management.events (object_id, type, description, user_name, severity, created_at)
SELECT o.id, e.type, e.description, e.user_name, e.severity, e.created_at
FROM (VALUES
    ('OBJ-004', 'Инспекция', 'Плановая проверка оборудования', 'А. Смирнов', 'info', NOW() - INTERVAL '10 minutes'),
    ('OBJ-001', 'Инцидент', 'Превышение температурного режима в секции B', 'Система', 'warning', NOW() - INTERVAL '2 hours'),
    ('OBJ-002', 'Обновление', 'Обновлены контактные данные арендатора', 'М. Козлова', 'info', NOW() - INTERVAL '1 day'),
    ('OBJ-004', 'Документ', 'Загружен акт приёмки оборудования', 'И. Петров', 'success', NOW() - INTERVAL '1 day 3 hours'),
    ('OBJ-001', 'Инцидент', 'Зафиксирован несанкционированный доступ', 'Система', 'error', NOW() - INTERVAL '3 days'),
    ('OBJ-003', 'Обслуживание', 'Начало регламентного обслуживания СКУД', 'Сервис-группа', 'info', NOW() - INTERVAL '3 days 1 hour')
) AS e(code, type, description, user_name, severity, created_at)
JOIN t_p10048923_warehouse_management.objects o ON o.code = e.code
