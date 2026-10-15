import uuid
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr, ConfigDict


class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100, description="Tên nhóm")
    description: str | None = Field(default=None, max_length=255)


class GroupUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    status: str | None = None


class GroupMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    display_name: str
    email: str
    role: str
    status: str
    joined_at: datetime


class GroupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    created_by_user_id: uuid.UUID
    status: str
    created_at: datetime
    current_user_role: str = "MEMBER"
    member_count: int = 1


class GroupDetailResponse(GroupResponse):
    members: list[GroupMemberResponse]


class MemberRoleUpdate(BaseModel):
    role: str = Field(description="ADMIN hoặc MEMBER hoặc OWNER (chuyển quyền sở hữu)")


class AddMemberByEmailRequest(BaseModel):
    email: EmailStr = Field(description="Email của thành viên cần thêm vào nhóm")
    role: str = Field(default="MEMBER", description="Vai trò: MEMBER hoặc ADMIN")


class InvitationCreate(BaseModel):
    invited_email: EmailStr | None = None
    expires_in_days: int = Field(default=7, ge=1, le=30)
    reusable: bool = Field(default=False, description="Cho phép nhiều người cùng tham gia bằng mã này")


class InvitationResponse(BaseModel):
    id: uuid.UUID
    group_id: uuid.UUID
    group_name: str
    invited_email: str | None
    is_reusable: bool = False
    raw_token: str
    expires_at: datetime
    created_at: datetime


class JoinGroupRequest(BaseModel):
    token: str = Field(min_length=10, description="Token lời mời tham gia nhóm")

