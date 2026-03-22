import requests
import os
from app.config import settings

def test_gemini():
    api_key = settings.gemini_api_key
    if not api_key:
        print("❌ Error: GEMINI_API_KEY is not set in your config.")
        return

    print("🔑 Loaded API Key from config...")
    print("Testing connection to Google's Gemini API...")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    
    try:
        response = requests.get(url)
        if response.status_code == 200:
            models = response.json().get("models", [])
            print(f"✅ Success! Key works. Found {len(models)} accessible models.")
            for m in models[:3]:
                print(f" - {m['name']}")
        else:
            print(f"❌ Failed! API Error: {response.text}")
    except Exception as e:
        print(f"❌ Connection Error: {e}")

if __name__ == "__main__":
    test_gemini()
