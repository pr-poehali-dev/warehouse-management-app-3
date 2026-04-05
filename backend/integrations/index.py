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
    """Получение списка интеграций с кол-вом объектов"""
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    method = event.get("httpMethod", "GET")

    conn = get_conn()
    cur = conn.cursor()

    try:
        if method == "GET":
            cur.execute(f"""
                SELECT i.id, i.name, i.icon, i.status, i.last_sync,
                       COUNT(DISTINCT oi.object_id) as object_count
                FROM {SCHEMA}.integrations i
                LEFT JOIN {SCHEMA}.object_integrations oi ON oi.integration_id = i.id
                GROUP BY i.id
                ORDER BY i.id
            """)
            rows = cur.fetchall()
            integrations = []
            for r in rows:
                integrations.append({
                    "id": r[0], "name": r[1], "icon": r[2],
                    "status": r[3], "lastSync": fmt_time(r[4]),
                    "objects": r[5],
                })
            return {"statusCode": 200, "headers": cors, "body": json.dumps({"integrations": integrations}, ensure_ascii=False)}

        elif method == "PUT":
            path = event.get("path", "/")
            parts = [p for p in path.split("/") if p]
            intg_id = parts[-1] if len(parts) >= 2 and parts[-1].isdigit() else None
            if not intg_id:
                return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "id required"})}
            body = json.loads(event.get("body") or "{}")
            new_status = body.get("status")
            if new_status not in ("connected", "disconnected"):
                return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "invalid status"})}
            last_sync = "NOW()" if new_status == "connected" else "NULL"
            cur.execute(f"UPDATE {SCHEMA}.integrations SET status = %s, last_sync = {last_sync} WHERE id = %s", (new_status, intg_id))
            conn.commit()
            return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

        return {"statusCode": 405, "headers": cors, "body": json.dumps({"error": "method not allowed"})}

    finally:
        cur.close()
        conn.close()
