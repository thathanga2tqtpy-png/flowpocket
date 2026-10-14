import uuid
from sqlalchemy.orm import Session
from sqlalchemy import select, or_
from fastapi import HTTPException, status

from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryResponse


def list_categories(
    db: Session, user_id: uuid.UUID, kind: str | None = None
) -> list[CategoryResponse]:
    query = select(Category).where(
        or_(
            Category.owner_user_id.is_(None),  # System category
            Category.owner_user_id == user_id,  # User custom category
        ),
        Category.is_archived.is_(False),
    )

    if kind:
        query = query.where(Category.kind == kind.upper())

    query = query.order_by(
        Category.owner_user_id.is_(None).desc(),  # System categories first
        Category.name.asc(),
    )

    categories = db.execute(query).scalars().all()
    return [
        CategoryResponse(
            id=cat.id,
            owner_user_id=cat.owner_user_id,
            name=cat.name,
            kind=cat.kind,
            icon_key=cat.icon_key,
            is_archived=cat.is_archived,
            is_system=cat.owner_user_id is None,
        )
        for cat in categories
    ]


def create_custom_category(
    db: Session, user_id: uuid.UUID, data: CategoryCreate
) -> Category:
    kind_upper = data.kind.upper()
    if kind_upper not in ("INCOME", "EXPENSE"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Loại danh mục (kind) chỉ có thể là INCOME hoặc EXPENSE",
        )

    category = Category(
        owner_user_id=user_id,
        name=data.name.strip(),
        kind=kind_upper,
        icon_key=data.icon_key,
        is_archived=False,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def validate_category_accessible(
    db: Session, user_id: uuid.UUID, category_id: uuid.UUID, expected_kind: str | None = None
) -> Category:
    cat = db.execute(
        select(Category).where(
            Category.id == category_id,
            or_(
                Category.owner_user_id.is_(None),
                Category.owner_user_id == user_id,
            ),
        )
    ).scalar_one_or_none()

    if not cat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Danh mục không tồn tại hoặc bạn không có quyền sử dụng",
        )

    if expected_kind and cat.kind != expected_kind.upper():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Danh mục '{cat.name}' là danh mục {cat.kind}, không phù hợp cho giao dịch {expected_kind}",
        )

    return cat

