import requests
import json

BASE_URL = "http://localhost:8000"

def test_session():
    # Login first
    login_resp = requests.post(f"{BASE_URL}/api/auth/login", data={
        "username": "test_a8af18d2@example.com",
        "password": "password123"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print("Testing session creation...")
    try:
        resp = requests.post(f"{BASE_URL}/api/sessions/create", headers=headers, json={
            "session_name": "Test Session",
            "topic": "Math",
            "user_name": "Test Host"
        })
        print(f"Create Status: {resp.status_code}")
        print(f"Create Response: {resp.text}")
        
        if resp.status_code == 200:
            room_code = resp.json()["room_code"]
            print(f"Testing session join for {room_code}...")
            resp = requests.post(f"{BASE_URL}/api/sessions/join", json={
                "room_code": room_code,
                "user_name": "Test Guest"
            })
            print(f"Join Status: {resp.status_code}")
            print(f"Join Response: {resp.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_session()
