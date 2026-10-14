import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.api.deps import get_current_active_user
from app.core.csrf import verify_csrf
from app.schemas.group import (
    GroupCreate,
    GroupUpdate,
    GroupResponse,
    GroupDetailResponse,
    GroupMemberResponse,
    MemberRoleUpdate,
    InvitationCreate,
    InvitationResponse,
    JoinGroupRequest,
)
from app.services.group_service import (
    create_group,
    list_user_groups,
    get_group_detail,
    update_group,
    create_invitation,
    accept_invitation,
    update_member_role,
    remove_member,
    leave_group,
)

router = APIRouter(prefix="/groups", tags=["Finance Groups"])


@router.get("", response_model=list[GroupResponse])
def get_my_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Lấy danh sách các nhóm tài chính mà người dùng đang tham gia"""
    return list_user_groups(db, current_user.id)


@router.post("", response_model=GroupDetailResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_csrf)])
def create_new_group(
    data: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Tạo nhóm tài chính mới (người tạo tự động trở thành Chủ nhóm - OWNER)"""
    return create_group(db, current_user.id, data)


@router.get("/{group_id}", response_model=GroupDetailResponse)
def get_group_information(
    group_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Lấy thông tin chi tiết nhóm và danh sách thành viên (chỉ thành viên nhóm mới được xem)"""
    return get_group_detail(db, group_id, current_user.id)


@router.patch("/{group_id}", response_model=GroupResponse, dependencies=[Depends(verify_csrf)])
def update_group_info(
    group_id: uuid.UUID,
    data: GroupUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Cập nhật tên, mô tả hoặc trạng thái nhóm (yêu cầu quyền OWNER hoặc ADMIN)"""
    group = update_group(db, group_id, current_user.id, data)
    return GroupResponse.model_validate(group)


@router.post("/{group_id}/invitations", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_csrf)])
def generate_group_invite(
    group_id: uuid.UUID,
    data: InvitationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Tạo mã mời tham gia nhóm (chỉ lưu token_hash, trả token thô 1 lần duy nhất)"""
    return create_invitation(db, group_id, current_user.id, data)


@router.post("/join", response_model=GroupDetailResponse, dependencies=[Depends(verify_csrf)])
def join_group(
    data: JoinGroupRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Gia nhập nhóm bằng mã lời mời (kiểm tra hạn dùng, single-use, chống dùng lại)"""
    group = accept_invitation(db, current_user, data.token)
    return get_group_detail(db, group.id, current_user.id)


@router.patch("/{group_id}/members/{target_user_id}", response_model=GroupMemberResponse, dependencies=[Depends(verify_csrf)])
def change_member_role(
    group_id: uuid.UUID,
    target_user_id: uuid.UUID,
    data: MemberRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Thay đổi vai trò thành viên (ADMIN/MEMBER) hoặc chuyển nhượng quyền OWNER (chỉ OWNER hiện tại thực hiện)"""
    member = update_member_role(
        db, group_id, current_user.id, target_user_id, data.role
    )
    user = member.user
    return GroupMemberResponse(
        id=member.id,
        user_id=member.user_id,
        display_name=user.display_name,
        email=user.email,
        role=member.role,
        status=member.status,
        joined_at=member.joined_at,
    )


@router.delete("/{group_id}/members/{target_user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(verify_csrf)])
def remove_group_member(
    group_id: uuid.UUID,
    target_user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Xóa thành viên khỏi nhóm (Owner hoặc Admin thực hiện; Admin không thể xóa Owner)"""
    remove_member(db, group_id, current_user.id, target_user_id)
    return None


@router.post("/{group_id}/leave", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(verify_csrf)])
def leave_finance_group(
    group_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Rời khỏi nhóm tài chính (Owner phải chuyển quyền sở hữu trước khi rời nếu nhóm còn thành viên khác)"""
    leave_group(db, group_id, current_user.id)
    return None

