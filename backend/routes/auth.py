"""Prashna-AI Auth Routes — Registration, Login, Profile."""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, status

from backend.database import supabase
from backend.auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from backend.schemas import (
    UserRegister,
    UserLogin,
    UserProfile,
    UserProfileUpdate,
    TokenResponse,
)

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
def register(data: UserRegister):
    """Register a new user account."""
    # Check if email already exists
    existing = (
        supabase.table("users").select("id").eq("email", data.email).execute()
    )
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    user_record = {
        "id": user_id,
        "email": data.email,
        "name": data.name,
        "password_hash": hash_password(data.password),
        "preferred_difficulty": data.preferred_difficulty,
        "preferred_subjects": data.preferred_subjects,
        "preferred_question_types": data.preferred_question_types,
        "elo_rating": 1000.0,
        "created_at": now,
    }

    supabase.table("users").insert(user_record).execute()

    token = create_access_token(user_id, data.email)

    profile = UserProfile(
        id=user_id,
        email=data.email,
        name=data.name,
        preferred_difficulty=data.preferred_difficulty,
        preferred_subjects=data.preferred_subjects,
        preferred_question_types=data.preferred_question_types,
        elo_rating=1000.0,
        created_at=now,
    )

    return TokenResponse(access_token=token, user=profile)


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin):
    """Login with email and password."""
    result = (
        supabase.table("users").select("*").eq("email", data.email).execute()
    )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user = result.data[0]

    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(user["id"], user["email"])

    profile = UserProfile(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        preferred_difficulty=user["preferred_difficulty"],
        preferred_subjects=user.get("preferred_subjects", []),
        preferred_question_types=user.get("preferred_question_types", []),
        elo_rating=user.get("elo_rating", 1000.0),
        created_at=user["created_at"],
    )

    return TokenResponse(access_token=token, user=profile)


@router.get("/me", response_model=UserProfile)
def get_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile."""
    result = (
        supabase.table("users")
        .select("*")
        .eq("id", current_user["id"])
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    user = result.data[0]
    return UserProfile(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        preferred_difficulty=user["preferred_difficulty"],
        preferred_subjects=user.get("preferred_subjects", []),
        preferred_question_types=user.get("preferred_question_types", []),
        elo_rating=user.get("elo_rating", 1000.0),
        created_at=user["created_at"],
    )


@router.put("/profile", response_model=UserProfile)
def update_profile(
    data: UserProfileUpdate, current_user: dict = Depends(get_current_user)
):
    """Update user profile preferences."""
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.preferred_difficulty is not None:
        update_data["preferred_difficulty"] = data.preferred_difficulty
    if data.preferred_subjects is not None:
        update_data["preferred_subjects"] = data.preferred_subjects
    if data.preferred_question_types is not None:
        update_data["preferred_question_types"] = data.preferred_question_types

    if update_data:
        supabase.table("users").update(update_data).eq(
            "id", current_user["id"]
        ).execute()

    # Return updated profile
    result = (
        supabase.table("users")
        .select("*")
        .eq("id", current_user["id"])
        .execute()
    )
    user = result.data[0]
    return UserProfile(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        preferred_difficulty=user["preferred_difficulty"],
        preferred_subjects=user.get("preferred_subjects", []),
        preferred_question_types=user.get("preferred_question_types", []),
        elo_rating=user.get("elo_rating", 1000.0),
        created_at=user["created_at"],
    )
