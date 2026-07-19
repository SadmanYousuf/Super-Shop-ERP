import sqlite3
conn = sqlite3.connect('backend/erp.db')
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
print('Tables:', [r[0] for r in c.fetchall()])
c.execute("SELECT user_id, username, password_hash, role FROM users")
for row in c.fetchall():
    print(f'ID={row[0]} user={row[1]} role={row[3]} hash={str(row[2])[:60]}...')
conn.close()
