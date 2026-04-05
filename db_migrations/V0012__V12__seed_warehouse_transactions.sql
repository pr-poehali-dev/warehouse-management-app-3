INSERT INTO t_p10048923_warehouse_management.warehouse_transactions (item_id, object_id, type, quantity, user_name, note, created_at)
SELECT i.id, o.id, t.type, t.quantity, t.user_name, t.note, t.created_at
FROM (VALUES
    ('Датчик температуры DS18B20', 'OBJ-004', 'income', 20, 'Администратор', 'Закупка партии', NOW() - INTERVAL '10 days'),
    ('Кабель UTP Cat5e (бухта 100м)', 'OBJ-004', 'income', 5, 'Администратор', 'Закупка для производства', NOW() - INTERVAL '10 days'),
    ('Датчик температуры DS18B20', 'OBJ-004', 'outcome', 5, 'И. Петров', 'Установка на производстве Тверь', NOW() - INTERVAL '5 days'),
    ('Датчик движения PIR HC-SR501', 'OBJ-001', 'outcome', 3, 'А. Смирнов', 'Монтаж в складе №3', NOW() - INTERVAL '3 days'),
    ('Кабель питания ВВГнг 3х2.5', 'OBJ-001', 'outcome', 30, 'А. Смирнов', 'Прокладка кабеля склад №3', NOW() - INTERVAL '3 days'),
    ('Прибор учёта электроэнергии Меркурий 201', 'OBJ-002', 'outcome', 2, 'М. Козлова', 'Установка в офисе Питер', NOW() - INTERVAL '1 day')
) AS t(item_name, obj_code, type, quantity, user_name, note, created_at)
JOIN t_p10048923_warehouse_management.warehouse_items i ON i.name = t.item_name
JOIN t_p10048923_warehouse_management.objects o ON o.code = t.obj_code
