"""
WebRTC signaling helpers.
Offer/answer/ICE candidate messages are forwarded via room_manager.send_to_peer().
This module provides type definitions for signaling payloads.
"""
from pydantic import BaseModel
from typing import Any, Optional


class SignalPayload(BaseModel):
    type: str          # "offer" | "answer" | "candidate"
    target: str        # peer id to send to
    sender: str        # sender peer id
    data: Any          # SDP or ICE candidate object
