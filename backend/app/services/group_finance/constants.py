import uuid
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.group_member import GroupMember

DEFAULT_GROUP_CATEGORY_ID = uuid.UUID("11111111-1111-1111-1111-111111111108")


def get_user_member_record(db: Session, group_id: uuid.UUID, user_id: uuid.UUID) -> GroupMember:
    member = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id,
        GroupMember.status == "ACTIVE",
    ).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không phải là thành viên hoạt động của nhóm này.",
        )
    return member

