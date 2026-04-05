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
    """CRUD для событий: GET /events?object_id=..., POST /events"""
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    method = event.get("httpMethod", "GET")
    params = event.get("queryStringParameters") or {}
    object_id = params.get("object_id")

    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == "GET":
            if object_id:
                cur.execute(f"""
                    SELECT e.id, e.object_id, o.code as object_code, o.name as object_name,
                           e.type, e.description, e.user_name, e.severity, e.created_at
                    FROM {SCHEMA}.events e
                    JOIN {SCHEMA}.objects o ON o.id = e.object_id
                    WHERE e.object_id = {int(object_id)}
                    ORDER BY e.created_at DESC
                """)
            else:
                cur.execute(f"""
                    SELECT e.id, e.object_id, o.code as object_code, o.name as object_name,
                           e.type, e.description, e.user_name, e.severity, e.created_at
                    FROM {SCHEMA}.events e
                    JOIN {SCHEMA}.objects o ON o.id = e.object_id
                    ORDER BY e.created_at DESC
                    LIMIT 100
                """)
            rows = cur.fetchall()
            events = []
            for r in rows:
                events.append({
                    "id": r[0], "objectId": r[1], "objectCode": r[2], "objectName": r[3],
                    "type": r[4], "desc": r[5], "user": r[6],
                    "severity": r[7], "time": fmt_time(r[8]),
                })
            return {"statusCode": 200, "headers": cors, "body": json.dumps({"events": events}, ensure_ascii=False)}

        elif method == "POST":
            body = json.loads(event.get("body") or "{}")
            obj_id = body.get("object_id")
            ev_type = body.get("type", "").strip()
            desc = body.get("description", "").strip()
            user = body.get("user_name", "").strip()
            severity = body.get("severity", "info")

            if not obj_id or not ev_type:
                return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "object_id and type required"})}

            cur.execute(f"""
                INSERT INTO {SCHEMA}.events (object_id, type, description, user_name, severity)
                VALUES (%s, %s, %s, %s, %s) RETURNING id
            """, (obj_id, ev_type, desc, user, severity))
            new_id = cur.fetchone()[0]
            conn.commit()
            return {"statusCode": 201, "headers": cors, "body": json.dumps({"id": new_id})}

        return {"statusCode": 405, "headers": cors, "body": json.dumps({"error": "method not allowed"})}

    finally:
        cur.close()
        conn.close()
