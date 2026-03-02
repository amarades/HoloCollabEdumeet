import urllib.request
import json

url = "http://localhost:8000/api/auth/register"
data = json.dumps({"email": "test_api2@example.com", "password": "password123", "name": "Test API"}).encode("utf-8")
headers = {"Content-Type": "application/json"}

req = urllib.request.Request(url, data=data, headers=headers, method="POST")

try:
    with urllib.request.urlopen(req) as response:
        print("Success:", response.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode()}")
except Exception as e:
    print("Error:", e)
