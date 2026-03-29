import asyncio
import sys
import os

# Add the current directory to sys.path so 'app' can be imported
sys.path.insert(0, os.getcwd())

from app.db.engine import init_db
from app.config import settings

async def main():
    print("Starting manual DB initialization...")
    # Forcing auto_create_tables to True for this run
    settings.auto_create_tables = True
    
    try:
        await init_db()
        print("Success! Database constraints updated.")
    except Exception as e:
        print(f"Failed to initialize database: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
