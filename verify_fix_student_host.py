import requests
import uuid

BASE_URL = "http://localhost:8000"

def verify_student_host_upload():
    print("Verifying student host upload...")
    
    # 1. Register a student
    email = f"student_{uuid.uuid4().hex[:8]}@example.com"
    password = "password123"
    reg_data = {
        "email": email,
        "password": password,
        "name": "Test Student",
        "role": "student"
    }
    resp = requests.post(f"{BASE_URL}/api/auth/register", json=reg_data)
    if resp.status_code != 200:
        print(f"Registration failed: {resp.text}")
        return
    
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Registered student: {email}")

    # 2. Create a session as this student
    session_data = {
        "session_name": "Test Upload Session",
        "topic": "Testing",
        "user_name": "Test Student"
    }
    resp = requests.post(f"{BASE_URL}/api/sessions/create", json=session_data, headers=headers)
    if resp.status_code != 200:
        print(f"Session creation failed: {resp.text}")
        return
    
    session_id = resp.json()["session_id"]
    print(f"Created session: {session_id}")

    # 3. Upload a model for this session
    glb_content = b'glTF' + (2).to_bytes(4, 'little') + (12).to_bytes(4, 'little')
    files = {'model': ('test_fix.glb', glb_content, 'application/octet-stream')}
    data = {'name': 'Fix Test Model', 'category': 'Testing', 'session_id': session_id}
    
    resp = requests.post(f"{BASE_URL}/api/models/upload", files=files, data=data, headers=headers)
    
    if resp.status_code == 200:
        print("Upload successful for student host!")
        print(resp.json())
    else:
        print(f"Upload failed with status {resp.status_code}")
        print(resp.text)

if __name__ == "__main__":
    verify_student_host_upload()
