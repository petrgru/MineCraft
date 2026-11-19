"""Kid-friendly quick login and score endpoints for the voxel mini-game."""

import re
import secrets
import unicodedata
from datetime import timedelta

from fastapi import APIRouter, HTTPException, status
from sqlalchemy.exc import IntegrityError

from app import crud
from app.api.deps import CurrentUser, SessionDep
from app.core import security
from app.core.config import settings
from app.models import (
    AvatarType,
    LeaderboardPublic,
    ProgressPublic,
    ProgressUpdate,
    QuickLoginRequest,
    Score,
    ScoreCreate,
    ScorePublic,
    Token,
    UserCreate,
    UserUpdate,
)

router = APIRouter(prefix="/game", tags=["game"])

# Reserved pseudo-domain for kid accounts: these addresses can never receive
# mail; they only give every avatar + name combo a stable identity.
KID_EMAIL_DOMAIN = "kids.example.com"
LEADERBOARD_LIMIT = 10
_MAX_SLUG_LENGTH = 24


def _slugify(value: str) -> str:
    """Turn a display name into a safe ASCII email local-part fragment."""
    normalized = unicodedata.normalize("NFKD", value)
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_only.lower()).strip("-")
    return slug[:_MAX_SLUG_LENGTH].strip("-")


def _kid_email(display_name: str, avatar: AvatarType) -> str:
    slug = _slugify(display_name) or avatar.value
    return f"kid-{slug}@{KID_EMAIL_DOMAIN}"


@router.post("/quick-login", response_model=Token)
def quick_login(*, session: SessionDep, body: QuickLoginRequest) -> Token:
    """One-click login: create-or-fetch the kid account, return a standard JWT.

    The account gets a random password hash the kid never knows, so only this
    endpoint can sign them in. The same avatar + name always maps to the same
    account, so returning players keep their identity across sessions.
    """
    display_name = (body.player_name or "").strip() or body.avatar.value.capitalize()
    email = _kid_email(display_name, body.avatar)

    user = crud.get_user_by_email(session=session, email=email)
    if user is None:
        try:
            user = crud.create_user(
                session=session,
                user_create=UserCreate(
                    email=email,
                    password=secrets.token_urlsafe(32),
                    full_name=display_name,
                ),
            )
        except IntegrityError:
            # Another simultaneous login for the same kid won the race.
            session.rollback()
            user = crud.get_user_by_email(session=session, email=email)
            if user is None:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Could not create player account",
                )
    elif user.full_name != display_name:
        crud.update_user(
            session=session, db_user=user, user_in=UserUpdate(full_name=display_name)
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return Token(
        access_token=security.create_access_token(
            user.id, expires_delta=access_token_expires
        )
    )


@router.post("/scores", response_model=ScorePublic, status_code=status.HTTP_201_CREATED)
def save_score(
    *, session: SessionDep, current_user: CurrentUser, score_in: ScoreCreate
) -> Score:
    """Store one finished game run for the logged-in kid.

    player_name is taken from the authenticated user, never from the client,
    so nobody can post scores under someone else's name.
    """
    return crud.create_score(
        session=session,
        score_in=score_in,
        player_name=current_user.full_name or "Player",
    )


@router.get("/leaderboard", response_model=LeaderboardPublic)
def read_leaderboard(
    *, session: SessionDep, current_user: CurrentUser
) -> LeaderboardPublic:
    """Top 10 scores, highest first, earlier achievement breaking ties."""
    scores = crud.get_leaderboard(session=session, limit=LEADERBOARD_LIMIT)
    return LeaderboardPublic(scores=list(scores))


@router.get("/progress", response_model=ProgressPublic)
def read_progress(
    *, session: SessionDep, current_user: CurrentUser
) -> ProgressPublic:
    """The kid's saved level so a returning player resumes where they left."""
    progress = crud.get_progress(session=session, user_id=current_user.id)
    if progress is None:
        return ProgressPublic(current_level=1, total_points=0, is_finished=False)
    return ProgressPublic.model_validate(progress)


@router.put("/progress", response_model=ProgressPublic)
def save_progress(
    *, session: SessionDep, current_user: CurrentUser, body: ProgressUpdate
) -> ProgressPublic:
    """Store level completion / failure / finish state for the logged-in kid."""
    progress = crud.upsert_progress(
        session=session, user_id=current_user.id, progress_in=body
    )
    return ProgressPublic.model_validate(progress)
