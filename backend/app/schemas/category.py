import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    kind: str = Field(description="INCOME hoặc EXPENSE")
    icon_key: str | None = None


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_user_id: uuid.UUID | None
    name: str
    kind: str
    icon_key: str | None
    is_archived: bool
    is_system: bool = False

