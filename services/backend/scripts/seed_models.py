import asyncio
import os
import sys

# Add current directory to path so we can import app
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# Ensure we have a database URL for the script
os.environ["DATABASE_URL"] = os.getenv("DATABASE_URL", "postgresql+asyncpg://holo_user:change-me@localhost:5432/holocollab")

from app.db.database import db
from app.db.models import ModelMetadata
from app.db.engine import async_session_maker, init_db, engine
from app.db.schema import DBModelMetadata
from sqlalchemy import delete

DEFAULT_MODELS = [
    {
        "id": "brain",
        "name": "Human Brain",
        "category": "Biology",
        "thumbnail": "🧠",
        "url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/brain/model.gltf",
        "description": "High-fidelity human brain model for anatomical study.",
        "is_curated": True
    },
    {
        "id": "heart",
        "name": "Anatomy Heart",
        "category": "Biology",
        "thumbnail": "❤️",
        "url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/heart/model.gltf",
        "description": "Detailed human heart model.",
        "is_curated": True
    },
    {
        "id": "earth",
        "name": "Planet Earth",
        "category": "Space",
        "thumbnail": "🌍",
        "url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/earth/model.gltf",
        "description": "Interactive planet Earth with topographical details.",
        "is_curated": True
    },
    {
        "id": "mars",
        "name": "Planet Mars",
        "category": "Space",
        "thumbnail": "🔴",
        "url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/mars/model.gltf",
        "description": "Study the red planet's surface features.",
        "is_curated": True
    },
    {
        "id": "dna",
        "name": "DNA Helix",
        "category": "Biology",
        "thumbnail": "🧬",
        "url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/dna/model.gltf",
        "description": "Rotating DNA double helix model.",
        "is_curated": True
    }
]

async def seed():
    print(f"Seed: Starting with DB URL: {os.environ['DATABASE_URL']}")
    
    print("Seed: Initializing database...")
    await init_db()
    
    print("Seed: Cleaning existing models...")
    async with async_session_maker() as session:
        await session.execute(delete(DBModelMetadata))
        await session.commit()
    
    print(f"Seed: Adding {len(DEFAULT_MODELS)} curated models...")
    for m_data in DEFAULT_MODELS:
        model = ModelMetadata(**m_data)
        await db.save_model(model)
    
    final_list = await db.list_models()
    print(f"Seed: Completed. Total models in DB: {len(final_list)}")
    
    # Clean up engine
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed())
