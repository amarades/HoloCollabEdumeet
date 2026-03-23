import requests
from app.core.security import create_access_token

def test_ai_features():
    token = create_access_token(subject="test@example.com", extra_claims={"uid": "test-user", "role": "student"})
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    transcript = "User: Hello everyone. Model: Hi. User: Today we are discussing the new AI features. Model: That sounds great. User: Let's implement summaries and notes. Model: I will help with that."
    
    # Test Summarize
    print("\n--- Testing /api/ai/summarize ---")
    try:
        res = requests.post("http://127.0.0.1:8000/api/ai/summarize", 
                           json={"transcript": transcript}, 
                           headers=headers)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.json().get('response')[:100]}...")
    except Exception as e:
        print(f"Error: {e}")

    # Test Notes
    print("\n--- Testing /api/ai/notes ---")
    try:
        res = requests.post("http://127.0.0.1:8000/api/ai/notes", 
                           json={"transcript": transcript}, 
                           headers=headers)
        print(f"Status: {res.status_code}")
        print(f"Response: {res.json().get('response')[:100]}...")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_ai_features()
