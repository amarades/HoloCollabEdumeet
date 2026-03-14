import asyncio
import os
import sys
import uuid

# Add the app directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'services', 'backend'))

async def test_insert():
    try:
        from app.db.database import db
        from app.db.models import ModelMetadata
        
        test_id = uuid.uuid4().hex
        model_data = ModelMetadata(
            id=test_id,
            name=f"Test Model {test_id[:8]}",
            category="Testing",
            thumbnail="📦",
            url=f"/api/models/test_{test_id}.glb",
            description="Diagnostic test model",
            is_curated=False
        )
        
        print(f"Attempting to save model: {model_data.name}")
        await db.save_model(model_data)
        print("Save successful!")
        
        # Verify
        models = await db.list_models()
        found = any(m.id == test_id for m in models)
        print(f"Verified in list: {found}")
        
    except Exception as e:
        print(f"Error during save: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_insert())
