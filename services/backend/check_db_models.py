import asyncio
import os
import sys

# Add the app directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'app'))

from app.db.database import db

async def check_models():
    try:
        models = await db.list_models()
        print(f"Models in DB: {len(models)}")
        for m in models:
            print(f"- {m.name} ({m.category}) [Curated: {m.is_curated}]: {m.url}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_models())
