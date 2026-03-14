from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi import Depends
import aiofiles
from app.config import settings
from app.db.models import ModelMetadata
from app.api.auth import get_current_user_token
import os
import uuid

router = APIRouter(prefix="/api/models", tags=["Models"])


@router.post("/upload", response_model=ModelMetadata)
async def upload_model(
    model: UploadFile = File(...),
    name: str = Form(None),
    category: str = Form("Custom"),
    description: str = Form(None),
    session_id: str = Form(None),
    user: dict = Depends(get_current_user_token),
):
    """
    Upload a 3D model file (GLB/GLTF)
    
    - **model**: The model file to upload
    - **name**: Model name (optional, defaults to filename)
    - **category**: Model category
    - **description**: Model description
    """
    from app.services.permission_service import PermissionService
    
    is_authorized = PermissionService.is_instructor(user)
    
    if not is_authorized and session_id:
        try:
            # If the user is a student host of this session, they are authorized
            await PermissionService.require_host(session_id, user)
            is_authorized = True
        except HTTPException:
            pass

    if not is_authorized:
        raise HTTPException(status_code=403, detail="Only instructors or session hosts can upload models")

    # Validate file extension
    if not model.filename or not model.filename.lower().endswith((".glb", ".gltf")):
        raise HTTPException(
            status_code=400,
            detail="Only GLB and GLTF files are allowed"
        )
    
    # Generate unique filename
    file_extension = os.path.splitext(model.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(settings.upload_dir, unique_filename)

    # Stream file asynchronously to avoid loading full file into memory.
    file_size = 0
    chunk_size = 1024 * 1024
    async with aiofiles.open(file_path, "wb") as f:
        while True:
            chunk = await model.read(chunk_size)
            if not chunk:
                break
            file_size += len(chunk)
            if file_size > settings.max_file_size:
                await model.close()
                try:
                    os.remove(file_path)
                except OSError:
                    pass
                raise HTTPException(
                    status_code=400,
                    detail=f"File size must be less than {settings.max_file_size / 1024 / 1024}MB"
                )
            await f.write(chunk)
    await model.close()
    
    # Create metadata
    model_data = ModelMetadata(
        id=uuid.uuid4().hex,
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
    safe_name = os.path.basename(filename)
    if safe_name != filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    file_path = os.path.join(settings.upload_dir, safe_name)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Model not found")
    
    return FileResponse(file_path)
