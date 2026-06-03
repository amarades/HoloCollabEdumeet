import requests
import uuid

BASE_URL = "http://localhost:8000"

def test_auth():
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    password = "password123"
    name = "Test User"
    
    print(f"Testing registration for {email}...")
    try:
        resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": password,
            "name": name,
            "role": "student"
        })
        print(f"Register Status: {resp.status_code}")
        print(f"Register Response: {resp.text}")
        
        if resp.status_code == 200:
            print("Testing login...")
            resp = requests.post(f"{BASE_URL}/api/auth/login", data={
                "username": email,
                "password": password
            })
            print(f"Login Status: {resp.status_code}")
            print(f"Login Response: {resp.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_auth()
