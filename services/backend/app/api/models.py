from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse
from app.config import settings
from app.db.models import ModelMetadata
import os
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/models", tags=["Models"])


@router.post("/upload", response_model=ModelMetadata)
async def upload_model(
    model: UploadFile = File(...),
    name: str = Form(None),
    category: str = Form("Custom"),
    description: str = Form(None)
):
    """
    Upload a 3D model file (GLB/GLTF)
    
    - **model**: The model file to upload
    - **name**: Model name (optional, defaults to filename)
    - **category**: Model category
    - **description**: Model description
    """
    # Validate file extension
    if not model.filename.lower().endswith(('.glb', '.gltf')):
        raise HTTPException(
            status_code=400,
            detail="Only GLB and GLTF files are allowed"
        )
    
    # Validate file size
    contents = await model.read()
    if len(contents) > settings.max_file_size:
        raise HTTPException(
            status_code=400,
            detail=f"File size must be less than {settings.max_file_size / 1024 / 1024}MB"
        )
    
    # Generate unique filename
    file_extension = os.path.splitext(model.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(settings.upload_dir, unique_filename)
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Create metadata
    model_data = ModelMetadata(
        id=str(int(datetime.now().timestamp() * 1000)),
        name=name or model.filename.replace(file_extension, ''),
        category=category,
        thumbnail='📦',
        url=f"/api/models/{unique_filename}",
        description=description or "Custom uploaded model"
    )
    
    # Save to persistence layer
    from app.db.database import db
    await db.save_model(model_data)

    return model_data


@router.get("/", response_model=list[ModelMetadata])
async def list_models():
    """
    List all available models
    """
    from app.db.database import db
    return await db.list_models()


@router.get("/{filename}")
async def get_model(filename: str):
    """
    Serve a model file
    
    - **filename**: The model filename
    """
    file_path = os.path.join(settings.upload_dir, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Model not found")
    
    return FileResponse(file_path)
