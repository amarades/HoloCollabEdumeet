import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"
EMAIL = "tester@example.com"
PASSWORD = "password123"

def print_result(name, passed, details=""):
    print(f"[{'PASS' if passed else 'FAIL'}] {name}: {details}")

try:
    # 1. Register User
    print("1. Registering User...")
    res = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": EMAIL, "password": PASSWORD, "name": "Tester", "role": "teacher"
    })
    if res.status_code == 400: # Already exists is fine
         # Login instead
         res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": EMAIL, "password": PASSWORD
         })
    
    if res.status_code != 200:
        print_result("Auth", False, f"Failed: {res.text}")
        exit(1)
    
    data = res.json()
    token = data["access_token"]
    print_result("Auth", True, "Got Token")
    
    headers = {"Authorization": f"Bearer {token}"}

    # 2. List Models (Initially empty or existing)
    print("2. Listing Models...")
    res = requests.get(f"{BASE_URL}/api/models/", headers=headers)
    if res.status_code != 200:
         print_result("List Models", False, f"Failed: {res.text}")
    else:
         models = res.json()
         print_result("List Models", True, f"Found {len(models)} models")

    # 3. Create Session (Authenticated)
    print("3. Creating Session...")
    res = requests.post(f"{BASE_URL}/api/sessions/create", headers=headers, json={
        "session_name": "Test Session",
        "topic": "Test Topic",
        "model_id": "test-model-id"
    })
    
    if res.status_code != 200:
        print_result("Create Session", False, f"Failed: {res.text}")
    else:
        session = res.json()
        print_result("Create Session", True, f"ID: {session['session_id']}")
        
        # 4. Join Session (Public/Student)
        print("4. Joining Session...")
        res = requests.post(f"{BASE_URL}/api/sessions/join", json={
             "room_code": session["room_code"],
             "user_name": "Student1"
        })
        if res.status_code != 200:
             print_result("Join Session", False, f"Failed: {res.text}")
        else:
             print_result("Join Session", True)

    # 5. Helper: Check Auth /me
    print("5. Checking /me...")
    res = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
    if res.status_code == 200:
        print_result("Auth /me", True, f"As {res.json()['name']}")
    else:
        print_result("Auth /me", False, f"Failed: {res.text}")

except Exception as e:
    print(f"ERROR: {e}")
