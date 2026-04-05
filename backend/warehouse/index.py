import json
import os
import psycopg2
from datetime import datetime

SCHEMA = "t_p10048923_warehouse_management"

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def fmt_time(dt):
    if not dt:
        return "—"
    now = datetime.utcnow()
    diff = now - dt.replace(tzinfo=None)
    s = diff.total_seconds()
    if s < 3600:
        m = int(s // 60)
        return f"{m} мин назад" if m > 0 else "только что"
    if s < 86400:
        h = int(s // 3600)
        return f"{h} ч назад"
    d = int(s // 86400)
    return f"{d} д назад"

def handler(event: dict, context) -> dict:
    """
    Склад: управление товарами и транзакциями.
    GET /           — список товаров с остатками
    POST /          — добавить товар (admin)
    PUT /{id}       — обновить товар
    GET /tx         — список транзакций (приход/расход)
    POST /tx        — создать транзакцию (приход или списание)
    """
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    parts = [p for p in path.split("/") if p]

    conn = get_conn()
    cur = conn.cursor()

    try:
        # Транзакции: /tx
        if len(parts) >= 1 and parts[-1] == "tx":
            if method == "GET":
                params = event.get("queryStringParameters") or {}
                item_id = params.get("item_id")
                object_id = params.get("object_id")

                where = []
                if item_id:
                    where.append(f"t.item_id = {int(item_id)}")
                if object_id:
                    where.append(f"t.object_id = {int(object_id)}")
                where_sql = ("WHERE " + " AND ".join(where)) if where else ""

                cur.execute(f"""
                    SELECT t.id, t.item_id, i.name as item_name, i.unit,
                           t.object_id, o.name as object_name, o.code as object_code,
                           t.type, t.quantity, t.user_name, t.note, t.created_at
                    FROM {SCHEMA}.warehouse_transactions t
                    JOIN {SCHEMA}.warehouse_items i ON i.id = t.item_id
                    LEFT JOIN {SCHEMA}.objects o ON o.id = t.object_id
                    {where_sql}
                    ORDER BY t.created_at DESC
                    LIMIT 200
                """)
                rows = cur.fetchall()
                txs = []
                for r in rows:
                    txs.append({
                        "id": r[0], "itemId": r[1], "itemName": r[2], "unit": r[3],
                        "objectId": r[4], "objectName": r[5], "objectCode": r[6],
                        "type": r[7], "quantity": r[8],
                        "user": r[9], "note": r[10],
                        "time": fmt_time(r[11]),
                    })
                return {"statusCode": 200, "headers": cors, "body": json.dumps({"transactions": txs}, ensure_ascii=False)}

            elif method == "POST":
                body = json.loads(event.get("body") or "{}")
                item_id = body.get("item_id")
                tx_type = body.get("type")  # income | outcome
                quantity = int(body.get("quantity", 0))
                object_id = body.get("object_id")
                user_name = body.get("user_name", "").strip()
                note = body.get("note", "").strip()

                if not item_id or tx_type not in ("income", "outcome") or quantity <= 0:
                    return {"statusCode": 400, "headers": cors,
                            "body": json.dumps({"error": "item_id, type (income|outcome), quantity required"})}

                # Проверка остатка при списании
                if tx_type == "outcome":
                    cur.execute(f"SELECT quantity FROM {SCHEMA}.warehouse_items WHERE id = %s", (item_id,))
                    row = cur.fetchone()
                    if not row:
                        return {"statusCode": 404, "headers": cors, "body": json.dumps({"error": "item not found"})}
                    if row[0] < quantity:
                        return {"statusCode": 400, "headers": cors,
                                "body": json.dumps({"error": f"Недостаточно товара. Остаток: {row[0]}"})}

                # Запись транзакции
                obj_id_val = object_id if object_id else None
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.warehouse_transactions
                        (item_id, object_id, type, quantity, user_name, note)
                    VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
                """, (item_id, obj_id_val, tx_type, quantity, user_name, note))
                tx_id = cur.fetchone()[0]

                # Обновляем остаток
                delta = quantity if tx_type == "income" else -quantity
                cur.execute(f"""
                    UPDATE {SCHEMA}.warehouse_items
                    SET quantity = quantity + %s, updated_at = NOW()
                    WHERE id = %s
                """, (delta, item_id))

                # Если списание на объект — создаём событие
                if tx_type == "outcome" and object_id:
                    cur.execute(f"SELECT name FROM {SCHEMA}.warehouse_items WHERE id = %s", (item_id,))
                    item_name = cur.fetchone()[0]
                    desc = f"Установлено: {item_name} — {quantity} {body.get('unit', 'шт')}"
                    if note:
                        desc += f". {note}"
                    cur.execute(f"""
                        INSERT INTO {SCHEMA}.events (object_id, type, description, user_name, severity)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (object_id, "Монтаж", desc, user_name or "Склад", "success"))

                conn.commit()
                return {"statusCode": 201, "headers": cors, "body": json.dumps({"id": tx_id})}

        # Товары: /
        elif method == "GET":
            cur.execute(f"""
                SELECT id, name, category, unit, quantity, min_quantity, updated_at
                FROM {SCHEMA}.warehouse_items
                ORDER BY category, name
            """)
            rows = cur.fetchall()
            items = []
            for r in rows:
                items.append({
                    "id": r[0], "name": r[1], "category": r[2],
                    "unit": r[3], "quantity": r[4], "minQuantity": r[5],
                    "updatedAt": fmt_time(r[6]),
                    "low": r[4] <= r[5],
                })
            return {"statusCode": 200, "headers": cors, "body": json.dumps({"items": items}, ensure_ascii=False)}

        elif method == "POST":
            body = json.loads(event.get("body") or "{}")
            name = body.get("name", "").strip()
            category = body.get("category", "").strip()
            unit = body.get("unit", "шт").strip()
            quantity = int(body.get("quantity", 0))
            min_quantity = int(body.get("min_quantity", 0))

            if not name:
                return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "name required"})}

            cur.execute(f"""
                INSERT INTO {SCHEMA}.warehouse_items (name, category, unit, quantity, min_quantity)
                VALUES (%s, %s, %s, %s, %s) RETURNING id
            """, (name, category, unit, quantity, min_quantity))
            new_id = cur.fetchone()[0]

            # Если начальное количество > 0 — записываем как приход
            if quantity > 0:
                cur.execute(f"""
                    INSERT INTO {SCHEMA}.warehouse_transactions (item_id, type, quantity, user_name, note)
                    VALUES (%s, 'income', %s, %s, 'Начальный остаток')
                """, (new_id, quantity, body.get("user_name", "Администратор")))

            conn.commit()
            return {"statusCode": 201, "headers": cors, "body": json.dumps({"id": new_id})}

        elif method == "PUT":
            item_id = parts[-1] if parts and parts[-1].isdigit() else None
            if not item_id:
                return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "id required"})}
            body = json.loads(event.get("body") or "{}")
            fields, vals = [], []
            for f in ["name", "category", "unit", "min_quantity"]:
                if f in body:
                    fields.append(f"{f} = %s")
                    vals.append(body[f])
            if not fields:
                return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "no fields"})}
            vals.append(item_id)
            cur.execute(f"UPDATE {SCHEMA}.warehouse_items SET {', '.join(fields)}, updated_at = NOW() WHERE id = %s", vals)
            conn.commit()
            return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

        return {"statusCode": 405, "headers": cors, "body": json.dumps({"error": "method not allowed"})}

    finally:
        cur.close()
        conn.close()
