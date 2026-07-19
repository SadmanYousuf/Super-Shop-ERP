import sqlite3, os
DB_FILE = 'db.sqlite'
if not os.path.exists(DB_FILE):
    raise SystemExit('Database file not found: ' + DB_FILE)
conn = sqlite3.connect(DB_FILE)
cur = conn.cursor()
cur.execute('SELECT user_id, username, role, created_at FROM users ORDER BY user_id')
rows = cur.fetchall()
for row in rows:
    print(row)
conn.close()
