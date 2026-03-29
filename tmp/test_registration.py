import requests
import uuid

BASE_URL = "http://localhost:8000"

def test_registration():
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "email": email,
        "password": "password123",
        "name": "Test Instructor",
        "role": "instructor"
    }
    
    print(f"Attempting to register user with email: {email} and role: instructor")
    response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
    
    if response.status_code == 200:
        print("Success! Registration successful.")
        print(response.json())
    else:
        print(f"Failed! Status code: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    test_registration()
