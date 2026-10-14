from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.services.auth_service import get_user_by_session_token
from app.core.config import settings


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    # 1. Primary: HttpOnly session cookie
    token = request.cookies.get(settings.SESSION_COOKIE_NAME)

    # 2. Fallback: Authorization Bearer header (for automated testing or external API clients)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Chưa đăng nhập hoặc phiên làm việc đã hết hạn",
        )

    user = get_user_by_session_token(db, token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập không hợp lệ hoặc đã bị thu hồi",
        )

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản hiện đang bị khóa hoặc vô hiệu hóa",
        )
    return current_user

