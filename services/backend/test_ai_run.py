import requests
from app.core.security import create_access_token
from app.config import settings

def test_ai_status():
    token = create_access_token(subject="test@example.com", extra_claims={"uid": "test-user", "role": "student"})
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {
        "history": [],
        "message": "Hello, are you working?"
    }
    
    url = "http://localhost:8000/api/ai/chat"
    print(f"Testing AI Chat endpoint at {url}...")
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        print("Response Body:")
        print(response.json())
    except Exception as e:
        print(f"Error during test: {e}")

if __name__ == "__main__":
    test_ai_status()
