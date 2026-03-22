import requests
import time

def test_endpoint():
    url = "http://localhost:8000/api/ai/chat"
    payload = {
        "history": [],
        "message": "Hello Gemini! If you receive this, reply 'Integration Successful!'"
    }
    headers = {"Content-Type": "application/json"}
    
    # Wait for server to boot
    time.sleep(3)
    
    print(f"Testing {url} ...")
    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code == 200:
            print("✅ Success! Server responded with:")
            print(response.json())
        else:
            print("❌ Failed! Server returned:")
            print(response.status_code, response.text)
    except Exception as e:
        print("❌ Connection Error:", e)

if __name__ == "__main__":
    test_endpoint()
