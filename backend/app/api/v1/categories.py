from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.api.deps import get_current_active_user
from app.core.csrf import verify_csrf
from app.schemas.category import CategoryCreate, CategoryResponse
from app.services.category_service import (
    list_categories,
    create_custom_category,
)

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=list[CategoryResponse])
def get_categories(
    kind: str | None = Query(None, description="Lọc theo INCOME hoặc EXPENSE"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Lấy danh sách các danh mục hệ thống và danh mục cá nhân của người dùng"""
    return list_categories(db, current_user.id, kind=kind)


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_csrf)])
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Tạo danh mục chi tiêu / thu nhập riêng của người dùng"""
    category = create_custom_category(db, current_user.id, data)
    return CategoryResponse(
        id=category.id,
        owner_user_id=category.owner_user_id,
        name=category.name,
        kind=category.kind,
        icon_key=category.icon_key,
        is_archived=category.is_archived,
        is_system=False,
    )

