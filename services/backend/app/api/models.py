from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse
from app.config import settings
from app.db.models import ModelMetadata
import os
import uuid

router = APIRouter(prefix="/api/models", tags=["Models"])


@router.post("/upload", response_model=ModelMetadata)
async def upload_model(
    model: UploadFile = File(...),
    name: str = Form(None),
    category: str = Form("Custom"),
    description: str = Form(None),
):
    """Upload a 3D model file (GLB/GLTF)."""
    if not model.filename.lower().endswith(('.glb', '.gltf')):
        raise HTTPException(status_code=400, detail="Only GLB and GLTF files are allowed")

    contents = await model.read()
    if len(contents) > settings.max_file_size:
        raise HTTPException(status_code=400, detail=f"File size must be less than {settings.max_file_size / 1024 / 1024:.0f}MB")

    file_extension = os.path.splitext(model.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(settings.upload_dir, "models", unique_filename)

    with open(file_path, "wb") as f:
        f.write(contents)

    model_data = ModelMetadata(
        id=str(uuid.uuid4()),  # UUID, not timestamp
        name=name or model.filename.replace(file_extension, ''),
        category=category,
        thumbnail='📦',
        url=f"/uploads/models/{unique_filename}",
        description=description or "Custom uploaded model",
    )

    from app.db.database import db
    await db.save_model(model_data)
    return model_data


@router.get("/", response_model=list[ModelMetadata])
async def list_models():
    """List all available models."""
    from app.db.database import db
    return await db.list_models()


@router.get("/{filename}")
async def get_model(filename: str):
    """Serve a model file — path traversal protected."""
    upload_root = os.path.realpath(settings.upload_dir)
    file_path = os.path.realpath(os.path.join(upload_root, filename))

    # Reject any path that escapes upload_dir
    if not file_path.startswith(upload_root + os.sep):
        raise HTTPException(status_code=400, detail="Invalid file path")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Model not found")

    return FileResponse(file_path)
