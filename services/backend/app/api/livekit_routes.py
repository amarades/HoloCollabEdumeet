from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.api.auth import get_current_user_token as get_current_user
from app.db.engine import get_db
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

try:
    # Explicitly import from the package, not the local file shadowing it
    import livekit.api as lk_api
    LIVEKIT_AVAILABLE = True
except (ImportError, AttributeError) as e:
    LIVEKIT_AVAILABLE = False
    print(f"⚠️ LiveKit SDK Import Failed: {e}")
    lk_api = None

@router.post("/token")
async def get_livekit_token(
    room_name: str,
    participant_name: str,
    participant_identity: str = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a LiveKit access token for a participant to join a room.
    """
    if not LIVEKIT_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="LiveKit SFU is not available. Install LiveKit Python SDK."
        )

    if not settings.livekit_api_key or not settings.livekit_api_secret:
        raise HTTPException(
            status_code=503,
            detail="LiveKit configuration is missing"
        )

    try:
        # Create access token
        token = lk_api.AccessToken(
            settings.livekit_api_key,
            settings.livekit_api_secret
        )

        # Set token options
        token.with_identity(participant_identity or current_user["id"])
        token.with_name(participant_name or current_user["username"])

        # Grant permissions
        grant = lk_api.VideoGrant()
        grant.room_join = True
        grant.room = room_name
        grant.can_publish = True
        grant.can_subscribe = True

        token.with_grants(grant)

        # Add metadata
        token.with_metadata(f'{{"user_id": "{current_user["id"]}"}}')

        jwt_token = token.to_jwt()

        return {
            "token": jwt_token,
            "livekit_url": settings.livekit_url,
            "room_name": room_name
        }

    except Exception as e:
        logger.error(f"Failed to generate LiveKit token: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate access token"
        )

@router.get("/rooms/{room_name}/participants")
async def get_room_participants(
    room_name: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of participants in a LiveKit room.
    """
    if not LIVEKIT_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="LiveKit SFU is not available"
        )

    try:
        # Create room service client
        room_client = lk_api.RoomServiceClient(
            settings.livekit_url.replace('ws://', 'http://').replace('wss://', 'https://'),
            settings.livekit_api_key,
            settings.livekit_api_secret
        )

        # List participants
        participants = room_client.list_participants(room_name)

        return {
            "participants": [
                {
                    "identity": p.identity,
                    "name": p.name,
                    "state": p.state,
                    "joined_at": p.joined_at,
                    "metadata": p.metadata
                }
                for p in participants
            ]
        }

    except Exception as e:
        logger.error(f"Failed to get room participants: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve participants"
        )