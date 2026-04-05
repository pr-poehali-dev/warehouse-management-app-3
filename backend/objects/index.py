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
    """CRUD для объектов: GET /objects, POST /objects, PUT /objects/{id}, DELETE /objects/{id}"""
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
    obj_id = parts[-1] if len(parts) >= 2 and parts[-1].isdigit() else None

    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == "GET" and not obj_id:
            cur.execute(f"""
                SELECT o.id, o.code, o.name, o.type, o.status, o.address,
                       COUNT(DISTINCT e.id) as event_count,
                       MAX(e.created_at) as last_event,
                       ARRAY_AGG(DISTINCT i.name) FILTER (WHERE i.name IS NOT NULL) as integrations
                FROM {SCHEMA}.objects o
                LEFT JOIN {SCHEMA}.events e ON e.object_id = o.id
                LEFT JOIN {SCHEMA}.object_integrations oi ON oi.object_id = o.id
                LEFT JOIN {SCHEMA}.integrations i ON i.id = oi.integration_id
                GROUP BY o.id
                ORDER BY o.id
            """)
            rows = cur.fetchall()
            objects = []
            for r in rows:
                objects.append({
                    "id": r[0], "code": r[1], "name": r[2], "type": r[3],
                    "status": r[4], "address": r[5],
                    "events": r[6],
                    "lastEvent": fmt_time(r[7]),
                    "integrations": r[8] if r[8] else [],
                })
            return {"statusCode": 200, "headers": cors, "body": json.dumps({"objects": objects}, ensure_ascii=False)}

        elif method == "GET" and obj_id:
            cur.execute(f"""
                SELECT o.id, o.code, o.name, o.type, o.status, o.address,
                       COUNT(DISTINCT e.id) as event_count,
                       MAX(e.created_at) as last_event,
                       ARRAY_AGG(DISTINCT i.name) FILTER (WHERE i.name IS NOT NULL) as integrations
                FROM {SCHEMA}.objects o
                LEFT JOIN {SCHEMA}.events e ON e.object_id = o.id
                LEFT JOIN {SCHEMA}.object_integrations oi ON oi.object_id = o.id
                LEFT JOIN {SCHEMA}.integrations i ON i.id = oi.integration_id
                WHERE o.id = {obj_id}
                GROUP BY o.id
            """)
            r = cur.fetchone()
            if not r:
                return {"statusCode": 404, "headers": cors, "body": json.dumps({"error": "not found"})}
            obj = {
                "id": r[0], "code": r[1], "name": r[2], "type": r[3],
                "status": r[4], "address": r[5],
                "events": r[6],
                "lastEvent": fmt_time(r[7]),
                "integrations": r[8] if r[8] else [],
            }
            return {"statusCode": 200, "headers": cors, "body": json.dumps({"object": obj}, ensure_ascii=False)}

        elif method == "POST":
            body = json.loads(event.get("body") or "{}")
            name = body.get("name", "").strip()
            obj_type = body.get("type", "").strip()
            status = body.get("status", "active")
            address = body.get("address", "").strip()
            if not name or not obj_type:
                return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "name and type required"})}

            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.objects")
            count = cur.fetchone()[0] + 1
            code = f"OBJ-{count:03d}"

            cur.execute(f"""
                INSERT INTO {SCHEMA}.objects (code, name, type, status, address)
                VALUES (%s, %s, %s, %s, %s) RETURNING id, code
            """, (code, name, obj_type, status, address))
            row = cur.fetchone()
            conn.commit()
            return {"statusCode": 201, "headers": cors, "body": json.dumps({"id": row[0], "code": row[1]}, ensure_ascii=False)}

        elif method == "PUT" and obj_id:
            body = json.loads(event.get("body") or "{}")
            fields = []
            vals = []
            for field in ["name", "type", "status", "address"]:
                if field in body:
                    fields.append(f"{field} = %s")
                    vals.append(body[field])
            if not fields:
                return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "no fields to update"})}
            vals.append(obj_id)
            cur.execute(f"UPDATE {SCHEMA}.objects SET {', '.join(fields)}, updated_at = NOW() WHERE id = %s", vals)
            conn.commit()
            return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

        return {"statusCode": 405, "headers": cors, "body": json.dumps({"error": "method not allowed"})}

    finally:
        cur.close()
        conn.close()
