import urllib.request
import urllib.error
import json

url = 'http://localhost:8004/api/auth/register'
data = json.dumps({'username': 'testuser', 'password': 'pass', 'role': 'admin'}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req, timeout=5) as res:
        print(res.status)
        print(res.read().decode())
except urllib.error.HTTPError as e:
    print('HTTP', e.code)
    print(e.read().decode())
except Exception as e:
    print('ERROR', type(e).__name__, e)
