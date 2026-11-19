import uuid
from datetime import UTC, datetime
from enum import Enum

from pydantic import EmailStr
from sqlmodel import Field, Relationship, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(UTC)


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on creation
class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(SQLModel):
    email: EmailStr | None = Field(default=None, max_length=255)
    is_active: bool | None = None
    is_superuser: bool | None = None
    full_name: str | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    created_at: datetime | None = Field(default_factory=get_datetime_utc)
    items: list[Item] = Relationship(back_populates="owner", cascade_delete=True)


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    created_at: datetime | None = None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(ItemBase):
    pass


# Properties to receive on item update
class ItemUpdate(SQLModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime | None = Field(default_factory=get_datetime_utc)
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="items")


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime | None = None


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


# ---- Voxel mini-game models ----

TOTAL_LEVELS = 12
# L1 4x10, L2 5x20, L3 chest 50, L4 cannon 4 balloons, L5 6x10, L6 7x20,
# L7 memory 3x20, L8 chest 50, L9 cannon 5x20+4x15, L10 8x10,
# L11 memory 5x20, L12 6 stars x15 + rocket 100.
MAX_GAME_POINTS = 40 + 100 + 50 + 80 + 60 + 140 + 60 + 50 + 160 + 80 + 100 + 190


class AvatarType(str, Enum):
    """The four big animal avatars a kid can pick with one mouse click."""

    LION = "lion"
    FOX = "fox"
    BEAR = "bear"
    FROG = "frog"


class QuickLoginRequest(SQLModel):
    avatar: AvatarType
    player_name: str | None = Field(default=None, min_length=1, max_length=32)


# Database model: one finished game run submitted from the browser.
# avatar is stored as a plain string so PostgreSQL never needs a native enum type.
class Score(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    player_name: str = Field(max_length=32, index=True)
    avatar: str = Field(default=AvatarType.LION.value, max_length=16)
    points: int = Field(default=0, ge=0, le=MAX_GAME_POINTS)
    completed_levels: int = Field(default=0, ge=0, le=TOTAL_LEVELS)
    created_at: datetime | None = Field(default_factory=get_datetime_utc)


# Properties to receive on score creation (player_name comes from the token, not the client)
class ScoreCreate(SQLModel):
    avatar: AvatarType = AvatarType.LION
    points: int = Field(ge=0, le=MAX_GAME_POINTS)
    completed_levels: int = Field(default=0, ge=0, le=TOTAL_LEVELS)


class ScorePublic(SQLModel):
    id: uuid.UUID
    player_name: str
    avatar: AvatarType
    points: int
    completed_levels: int
    created_at: datetime | None = None


class LeaderboardPublic(SQLModel):
    scores: list[ScorePublic]


# Per-kid persisted game state: which level to resume at and the points bank.
# Failed levels keep current_level unchanged, so the kid always returns there.
class GameProgress(SQLModel, table=True):
    user_id: uuid.UUID = Field(
        foreign_key="user.id", primary_key=True, ondelete="CASCADE"
    )
    current_level: int = Field(default=1, ge=1, le=TOTAL_LEVELS)
    total_points: int = Field(default=0, ge=0, le=MAX_GAME_POINTS)
    is_finished: bool = Field(default=False)
    updated_at: datetime | None = Field(default_factory=get_datetime_utc)


class ProgressUpdate(SQLModel):
    current_level: int = Field(ge=1, le=TOTAL_LEVELS)
    total_points: int = Field(ge=0, le=MAX_GAME_POINTS)
    is_finished: bool = False


class ProgressPublic(SQLModel):
    current_level: int
    total_points: int
    is_finished: bool
