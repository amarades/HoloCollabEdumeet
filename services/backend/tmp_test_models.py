import asyncio
import os
import sys

# Add the current directory to sys.path
sys.path.insert(0, os.getcwd())

from app.api.ai import ai_service
from app.config import settings

async def test_model(model_name):
    print(f"--- Testing Model: {model_name} ---")
    try:
        if not ai_service.client:
           print("Client not initialized")
           return
           
        response = await asyncio.wait_for(
            ai_service.client.aio.models.generate_content(
                model=model_name,
                contents="Hello!"
            ),
            timeout=10
        )
        print(f"✅ Success! Response text: {response.text}")
        return True
    except Exception as e:
        print(f"❌ Failed for {model_name}: {e}")
        return False

async def main():
    print(f"Gemini API Key: {settings.gemini_api_key[:5]}...{settings.gemini_api_key[-5:]}")
    
    # Try different model names
    models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "models/gemini-1.5-flash"]
    
    for m in models:
        if await test_model(m):
            print(f"\nFinal Recommendation: Set GEMINI_MODEL={m}")
            break

if __name__ == "__main__":
    asyncio.run(main())
