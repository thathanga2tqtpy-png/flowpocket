import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import select, update
from fastapi import HTTPException, status

from app.models.user import User
from app.models.session import AuthSession
from app.schemas.auth import UserRegister, UserLogin
from app.core.security import hash_password, verify_password, generate_session_token, hash_token
from app.core.config import settings


def register_user(db: Session, req: UserRegister) -> User:
    normalized_email = req.email.strip().lower()

    # Check if email is already taken
    existing = db.execute(
        select(User).where(User.email == normalized_email)
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email này đã được sử dụng trong hệ thống",
        )

    # Hash password with Argon2id
    pwd_hash = hash_password(req.password)

    user = User(
        email=normalized_email,
        display_name=req.display_name.strip(),
        password_hash=pwd_hash,
        status="ACTIVE",
    )
    db.add(user)
    db.flush()

    # Tự động tạo ví Tiền mặt mặc định (Auto-provisioning)
    from app.models.wallet import Wallet
    default_wallet = Wallet(
        owner_user_id=user.id,
        name="Tiền mặt",
        wallet_type="CASH",
        currency="VND",
        opening_balance=0,
    )
    db.add(default_wallet)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, req: UserLogin) -> User:
    normalized_email = req.email.strip().lower()

    user = db.execute(
        select(User).where(User.email == normalized_email)
    ).scalar_one_or_none()

    # Generic message to avoid email enumeration
    if not user or user.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác",
        )

    if not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác",
        )

    return user


def create_user_session(
    db: Session,
    user_id: uuid.UUID,
    user_agent: str | None = None,
    ip_address: str | None = None,
) -> tuple[str, AuthSession]:
    raw_token = generate_session_token()
    token_digest = hash_token(raw_token)

    now = datetime.now(timezone.utc)
    expires = now + timedelta(seconds=settings.SESSION_MAX_AGE_SECONDS)

    # Truncate user agent & ip to protect privacy and respect field bounds
    ua_summary = user_agent[:250] if user_agent else None
    ip_prefix = ip_address[:45] if ip_address else None

    session = AuthSession(
        user_id=user_id,
        token_hash=token_digest,
        created_at=now,
        last_seen_at=now,
        expires_at=expires,
        user_agent_summary=ua_summary,
        ip_prefix=ip_prefix,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return raw_token, session


def get_user_by_session_token(db: Session, raw_token: str) -> User | None:
    token_digest = hash_token(raw_token)
    now = datetime.now(timezone.utc)

    session = db.execute(
        select(AuthSession).where(
            AuthSession.token_hash == token_digest,
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > now,
        )
    ).scalar_one_or_none()

    if not session:
        return None

    user = db.execute(
        select(User).where(
            User.id == session.user_id,
            User.status == "ACTIVE",
        )
    ).scalar_one_or_none()

    if not user:
        return None

    # Update last seen timestamp
    session.last_seen_at = now
    db.commit()

    return user


def revoke_session(db: Session, raw_token: str) -> bool:
    token_digest = hash_token(raw_token)
    now = datetime.now(timezone.utc)

    session = db.execute(
        select(AuthSession).where(
            AuthSession.token_hash == token_digest,
            AuthSession.revoked_at.is_(None),
        )
    ).scalar_one_or_none()

    if not session:
        return False

    session.revoked_at = now
    db.commit()
    return True


def revoke_all_user_sessions(db: Session, user_id: uuid.UUID) -> int:
    now = datetime.now(timezone.utc)
    result = db.execute(
        update(AuthSession)
        .where(
            AuthSession.user_id == user_id,
            AuthSession.revoked_at.is_(None),
        )
        .values(revoked_at=now)
    )
    db.commit()
    return result.rowcount

