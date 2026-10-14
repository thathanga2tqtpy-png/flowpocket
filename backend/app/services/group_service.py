import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_, case
from fastapi import HTTPException, status

from app.models.group import FinanceGroup
from app.models.group_member import GroupMember
from app.models.group_invitation import GroupInvitation
from app.models.user import User
from app.schemas.group import (
    GroupCreate,
    GroupUpdate,
    GroupResponse,
    GroupDetailResponse,
    GroupMemberResponse,
    InvitationCreate,
    InvitationResponse,
)
from app.core.security import generate_session_token, hash_token


def require_group_membership(
    db: Session,
    group_id: uuid.UUID,
    user_id: uuid.UUID,
    required_roles: list[str] | None = None,
) -> GroupMember:
    """
    Validates that user is an active member of group_id.
    Optionally enforces that user role is in required_roles (e.g. ['OWNER', 'ADMIN']).
    Raises 404/403 to prevent ID-enumeration and ensure strict authorization.
    """
    # Check group exists
    group = db.execute(
        select(FinanceGroup).where(
            FinanceGroup.id == group_id,
            FinanceGroup.status == "ACTIVE",
        )
    ).scalar_one_or_none()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nhóm tài chính không tồn tại hoặc đã bị lưu trữ",
        )

    # Check user membership
    membership = db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id,
            GroupMember.status == "ACTIVE",
        )
    ).scalar_one_or_none()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không phải là thành viên của nhóm này",
        )

    if required_roles and membership.role not in required_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Hành động này yêu cầu quyền {', '.join(required_roles)}, bạn hiện là {membership.role}",
        )

    return membership


def create_group(db: Session, user_id: uuid.UUID, data: GroupCreate) -> GroupDetailResponse:
    group = FinanceGroup(
        name=data.name.strip(),
        description=data.description.strip() if data.description else None,
        created_by_user_id=user_id,
        status="ACTIVE",
    )
    db.add(group)
    db.flush()

    # Creator is automatically assigned role OWNER
    creator_member = GroupMember(
        group_id=group.id,
        user_id=user_id,
        role="OWNER",
        status="ACTIVE",
    )
    db.add(creator_member)
    db.commit()
    db.refresh(group)

    # Fetch creator user details
    user = db.execute(select(User).where(User.id == user_id)).scalar_one()

    return GroupDetailResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        created_by_user_id=group.created_by_user_id,
        status=group.status,
        created_at=group.created_at,
        current_user_role="OWNER",
        member_count=1,
        members=[
            GroupMemberResponse(
                id=creator_member.id,
                user_id=user.id,
                display_name=user.display_name,
                email=user.email,
                role="OWNER",
                status="ACTIVE",
                joined_at=creator_member.joined_at,
            )
        ],
    )


def list_user_groups(db: Session, user_id: uuid.UUID) -> list[GroupResponse]:
    query = (
        select(
            FinanceGroup,
            GroupMember.role,
            func.count(GroupMember.id).over(partition_by=FinanceGroup.id),
        )
        .join(GroupMember, FinanceGroup.id == GroupMember.group_id)
        .where(
            GroupMember.user_id == user_id,
            GroupMember.status == "ACTIVE",
            FinanceGroup.status == "ACTIVE",
        )
        .order_by(FinanceGroup.created_at.desc())
    )

    rows = db.execute(query).all()
    results = []
    for group, role, count in rows:
        # Get exact active member count for the group
        member_count = db.execute(
            select(func.count(GroupMember.id)).where(
                GroupMember.group_id == group.id,
                GroupMember.status == "ACTIVE",
            )
        ).scalar_one()

        results.append(
            GroupResponse(
                id=group.id,
                name=group.name,
                description=group.description,
                created_by_user_id=group.created_by_user_id,
                status=group.status,
                created_at=group.created_at,
                current_user_role=role,
                member_count=member_count,
            )
        )
    return results


def get_group_detail(db: Session, group_id: uuid.UUID, user_id: uuid.UUID) -> GroupDetailResponse:
    membership = require_group_membership(db, group_id, user_id)
    group = db.execute(select(FinanceGroup).where(FinanceGroup.id == group_id)).scalar_one()

    # Query active members
    members_query = (
        select(GroupMember, User.display_name, User.email)
        .join(User, GroupMember.user_id == User.id)
        .where(
            GroupMember.group_id == group_id,
            GroupMember.status == "ACTIVE",
        )
        .order_by(
            case(
                (GroupMember.role == "OWNER", 1),
                (GroupMember.role == "ADMIN", 2),
                else_=3,
            ),
            GroupMember.joined_at.asc(),
        )
    )

    member_rows = db.execute(members_query).all()
    member_list = [
        GroupMemberResponse(
            id=m.id,
            user_id=m.user_id,
            display_name=d_name,
            email=email,
            role=m.role,
            status=m.status,
            joined_at=m.joined_at,
        )
        for m, d_name, email in member_rows
    ]

    return GroupDetailResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        created_by_user_id=group.created_by_user_id,
        status=group.status,
        created_at=group.created_at,
        current_user_role=membership.role,
        member_count=len(member_list),
        members=member_list,
    )


def update_group(
    db: Session, group_id: uuid.UUID, user_id: uuid.UUID, data: GroupUpdate
) -> FinanceGroup:
    # Only Owner or Admin can update group details
    require_group_membership(db, group_id, user_id, required_roles=["OWNER", "ADMIN"])
    group = db.execute(select(FinanceGroup).where(FinanceGroup.id == group_id)).scalar_one()

    if data.name is not None:
        group.name = data.name.strip()
    if data.description is not None:
        group.description = data.description.strip()
    if data.status is not None:
        group.status = data.status

    db.commit()
    db.refresh(group)
    return group


def create_invitation(
    db: Session, group_id: uuid.UUID, user_id: uuid.UUID, data: InvitationCreate
) -> InvitationResponse:
    # Only Owner or Admin can generate invites
    require_group_membership(db, group_id, user_id, required_roles=["OWNER", "ADMIN"])
    group = db.execute(select(FinanceGroup).where(FinanceGroup.id == group_id)).scalar_one()

    raw_token = generate_session_token()
    token_digest = hash_token(raw_token)
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=data.expires_in_days)

    invited_email_norm = data.invited_email.lower().strip() if data.invited_email else None

    invitation = GroupInvitation(
        group_id=group.id,
        created_by_user_id=user_id,
        invited_email=invited_email_norm,
        token_hash=token_digest,
        expires_at=expires,
        created_at=now,
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    return InvitationResponse(
        id=invitation.id,
        group_id=group.id,
        group_name=group.name,
        invited_email=invitation.invited_email,
        raw_token=raw_token,
        expires_at=invitation.expires_at,
        created_at=invitation.created_at,
    )


def accept_invitation(db: Session, user: User, raw_token: str) -> FinanceGroup:
    token_digest = hash_token(raw_token.strip())
    now = datetime.now(timezone.utc)

    invitation = db.execute(
        select(GroupInvitation).where(
            GroupInvitation.token_hash == token_digest,
        )
    ).scalar_one_or_none()

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mã lời mời không tồn tại hoặc không hợp lệ",
        )

    if invitation.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lời mời này đã bị người quản lý thu hồi",
        )

    if invitation.accepted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lời mời này đã được sử dụng trước đó (mỗi lời mời chỉ dùng 1 lần)",
        )

    if invitation.expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lời mời tham gia nhóm này đã hết hạn sử dụng",
        )

    # If invite was restricted to specific email
    if invitation.invited_email and invitation.invited_email.lower() != user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Lời mời này được dành riêng cho email {invitation.invited_email}, bạn đang đăng nhập với {user.email}",
        )

    group = db.execute(
        select(FinanceGroup).where(
            FinanceGroup.id == invitation.group_id,
            FinanceGroup.status == "ACTIVE",
        )
    ).scalar_one_or_none()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nhóm này không còn hoạt động",
        )

    # Check if user already member
    existing_member = db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group.id,
            GroupMember.user_id == user.id,
        )
    ).scalar_one_or_none()

    if existing_member:
        if existing_member.status == "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bạn đã là thành viên của nhóm này rồi",
            )
        # Reactivate membership if previously left or removed
        existing_member.status = "ACTIVE"
        existing_member.role = "MEMBER"
        existing_member.joined_at = now
        existing_member.left_at = None
    else:
        new_member = GroupMember(
            group_id=group.id,
            user_id=user.id,
            role="MEMBER",
            status="ACTIVE",
            joined_at=now,
        )
        db.add(new_member)

    # Mark invitation as accepted (single-use invariant)
    invitation.accepted_at = now
    invitation.accepted_by_user_id = user.id

    db.commit()
    return group


def update_member_role(
    db: Session,
    group_id: uuid.UUID,
    current_user_id: uuid.UUID,
    target_user_id: uuid.UUID,
    new_role: str,
) -> GroupMember:
    # Only current OWNER can change member roles
    require_group_membership(db, group_id, current_user_id, required_roles=["OWNER"])

    new_role_upper = new_role.upper()
    if new_role_upper not in ("OWNER", "ADMIN", "MEMBER"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vai trò không hợp lệ. Chỉ chấp nhận OWNER, ADMIN, MEMBER",
        )

    target_membership = db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == target_user_id,
            GroupMember.status == "ACTIVE",
        )
    ).scalar_one_or_none()

    if not target_membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thành viên không tồn tại trong nhóm",
        )

    # Transfer ownership
    if new_role_upper == "OWNER":
        current_owner_membership = db.execute(
            select(GroupMember).where(
                GroupMember.group_id == group_id,
                GroupMember.user_id == current_user_id,
            )
        ).scalar_one()

        current_owner_membership.role = "ADMIN"
        target_membership.role = "OWNER"
    else:
        if target_user_id == current_user_id and target_membership.role == "OWNER":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Owner không thể tự hạ quyền của mình mà không chuyển quyền Owner cho thành viên khác trước",
            )
        target_membership.role = new_role_upper

    db.commit()
    db.refresh(target_membership)
    return target_membership


def remove_member(
    db: Session,
    group_id: uuid.UUID,
    current_user_id: uuid.UUID,
    target_user_id: uuid.UUID,
) -> None:
    current_membership = require_group_membership(
        db, group_id, current_user_id, required_roles=["OWNER", "ADMIN"]
    )

    if current_user_id == target_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tự xóa chính mình khỏi nhóm qua thao tác này (vui lòng dùng tính năng Rời nhóm)",
        )

    target_membership = db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == target_user_id,
            GroupMember.status == "ACTIVE",
        )
    ).scalar_one_or_none()

    if not target_membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thành viên không tồn tại trong nhóm",
        )

    # Admin cannot remove Owner or another Admin
    if current_membership.role == "ADMIN" and target_membership.role in ("OWNER", "ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Quản trị viên (Admin) không có quyền xóa Owner hoặc Admin khác",
        )

    target_membership.status = "REMOVED"
    target_membership.left_at = datetime.now(timezone.utc)
    db.commit()


def leave_group(db: Session, group_id: uuid.UUID, user_id: uuid.UUID) -> None:
    membership = require_group_membership(db, group_id, user_id)

    if membership.role == "OWNER":
        # Check active member count
        active_members_count = db.execute(
            select(func.count(GroupMember.id)).where(
                GroupMember.group_id == group_id,
                GroupMember.status == "ACTIVE",
            )
        ).scalar_one()

        if active_members_count > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chủ nhóm (Owner) không thể rời nhóm khi còn thành viên khác. Bạn cần chuyển quyền Owner trước.",
            )

    membership.status = "LEFT"
    membership.left_at = datetime.now(timezone.utc)
    db.commit()

