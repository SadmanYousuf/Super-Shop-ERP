import sqlite3
import hashlib
import os

DB_FILE = 'db.sqlite'
username = 'Sadman'
new_password = 'sadman123'

if not os.path.exists(DB_FILE):
    raise SystemExit('Database file not found: ' + DB_FILE)

salt = os.urandom(16).hex()
dk = hashlib.pbkdf2_hmac('sha256', new_password.encode('utf-8'), salt.encode('utf-8'), 100000)
password_hash = salt + ':' + dk.hex()

conn = sqlite3.connect(DB_FILE)
cur = conn.cursor()
cur.execute('SELECT user_id, username, role FROM users WHERE username = ?', (username,))
row = cur.fetchone()
if not row:
    print(f'User {username} not found.')
    conn.close()
    raise SystemExit(1)

cur.execute('UPDATE users SET password_hash = ? WHERE username = ?', (password_hash, username))
conn.commit()
conn.close()
print(f'Password updated for user: {username}')
