import asyncio
import os
import sys

# Add the current directory to sys.path so 'app' can be imported
sys.path.insert(0, os.getcwd())

from app.api.ai import ai_service
from app.config import settings

async def main():
    print(f"AI Service: {settings.ai_service}")
    print(f"Gemini API Key set: {bool(settings.gemini_api_key)}")
    print(f"Gemini Model: {settings.gemini_model}")
    print(f"Client Initialized: {bool(ai_service.client)}")
    
    if not ai_service.client:
        print("❌ AI Service client is NOT initialized.")
        return

    try:
        print("Testing simple content generation (10s timeout)...")
        # Use wait_for for timeout
        response = await asyncio.wait_for(
            ai_service.generate_content("Hello! Are you working correctly? Give me a 5 word response."),
            timeout=10
        )
        print(f"✅ AI Response: {response}")
    except asyncio.TimeoutError:
        print("❌ AI Test Failed: Request timed out (10s)")
    except Exception as e:
        print(f"❌ AI Test Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
