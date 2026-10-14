import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, description="Mật khẩu tối thiểu 8 ký tự")
    display_name: str = Field(min_length=2, max_length=100, description="Tên hiển thị")


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    display_name: str
    status: str
    created_at: datetime


class AuthResponse(BaseModel):
    message: str
    user: UserResponse
    expires_at: datetime


class MessageResponse(BaseModel):
    message: str

