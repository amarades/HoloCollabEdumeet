import requests
import json

BASE_URL = "http://localhost:8000"

def test_ai():
    # Login first
    login_resp = requests.post(f"{BASE_URL}/api/auth/login", data={
        "username": "test_a8af18d2@example.com",
        "password": "password123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print("Testing AI chat...")
    try:
        resp = requests.post(f"{BASE_URL}/api/ai/chat", headers=headers, json={
            "history": [],
            "message": "Hello, who are you?"
        })
        print(f"AI Chat Status: {resp.status_code}")
        print(f"AI Chat Response: {resp.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_ai()
