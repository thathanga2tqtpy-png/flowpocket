from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    UserResponse,
    AuthResponse,
    MessageResponse,
)
from app.services.auth_service import (
    register_user,
    authenticate_user,
    create_user_session,
    revoke_session,
    revoke_all_user_sessions,
)
from app.api.deps import get_current_user, get_current_active_user
from app.core.config import settings
from app.core.csrf import verify_csrf

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _set_session_cookie(response: Response, raw_token: str) -> None:
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=raw_token,
        max_age=settings.SESSION_MAX_AGE_SECONDS,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite=settings.SESSION_COOKIE_SAMESITE,
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite=settings.SESSION_COOKIE_SAMESITE,
        path="/",
    )


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_csrf)],
)
def register(
    req: UserRegister,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """Đăng ký tài khoản người dùng mới và tự động tạo phiên đăng nhập an toàn"""
    user = register_user(db, req)

    # Automatically create session upon registration
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    raw_token, session = create_user_session(db, user.id, user_agent, client_ip)

    _set_session_cookie(response, raw_token)

    return AuthResponse(
        message="Đăng ký tài khoản thành công",
        user=UserResponse.model_validate(user),
        expires_at=session.expires_at,
    )


@router.post(
    "/login",
    response_model=AuthResponse,
    dependencies=[Depends(verify_csrf)],
)
def login(
    req: UserLogin,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """Đăng nhập tài khoản và thiết lập HttpOnly session cookie"""
    user = authenticate_user(db, req)

    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    raw_token, session = create_user_session(db, user.id, user_agent, client_ip)

    _set_session_cookie(response, raw_token)

    return AuthResponse(
        message="Đăng nhập thành công",
        user=UserResponse.model_validate(user),
        expires_at=session.expires_at,
    )


@router.get(
    "/me",
    response_model=UserResponse,
)
def get_me(
    current_user: User = Depends(get_current_active_user),
):
    """Lấy thông tin người dùng hiện tại từ session đã xác thực"""
    return UserResponse.model_validate(current_user)


@router.post(
    "/logout",
    response_model=MessageResponse,
    dependencies=[Depends(verify_csrf)],
)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Đăng xuất và thu hồi session hiện tại"""
    token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()

    if token:
        revoke_session(db, token)

    _clear_session_cookie(response)
    return MessageResponse(message="Đã đăng xuất thành công")


@router.post(
    "/revoke-all",
    response_model=MessageResponse,
    dependencies=[Depends(verify_csrf)],
)
def revoke_all(
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Thu hồi tất cả phiên đăng nhập của người dùng trên mọi thiết bị"""
    revoked_count = revoke_all_user_sessions(db, current_user.id)
    _clear_session_cookie(response)
    return MessageResponse(
        message=f"Đã thu hồi thành công {revoked_count} phiên đăng nhập"
    )

