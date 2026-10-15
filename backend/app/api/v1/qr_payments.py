import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.api.deps import get_current_active_user
from app.core.csrf import verify_csrf
from app.schemas.qr_payment import (
    SupportedBank,
    ReceivingAccountCreate,
    ReceivingAccountUpdate,
    ReceivingAccountResponse,
    IncomingPaymentRequestCreate,
    IncomingPaymentRequestResponse,
    IncomingPaymentRequestListResponse,
    ConfirmPaymentReceivedRequest,
    PaymentReconciliationResponse,
    PaymentReconciliationUpdate,
    ParseVietQRRequest,
    ParseVietQRResponse,
    OutgoingPaymentRequestCreate,
    OutgoingPaymentRequestResponse,
    OutgoingPaymentRequestListResponse,
    ConfirmOutgoingPaymentRequest,
)
from app.services.qr_payment_service import QRPaymentService
from app.core.vietqr import parse_vietqr_payload

router = APIRouter(prefix="/qr-payments", tags=["QR Payments"])


# ---------------- Banks ----------------

@router.get("/banks", response_model=List[SupportedBank])
def get_supported_banks():
    """Lấy danh sách các ngân hàng Việt Nam được hỗ trợ sinh mã VietQR chuẩn Napas."""
    return QRPaymentService.get_supported_banks()


# ---------------- Receiving Accounts ----------------

@router.get("/receiving-accounts", response_model=List[ReceivingAccountResponse])
def get_receiving_accounts(
    active_only: bool = Query(True, description="Chỉ lấy tài khoản đang hoạt động"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Lấy danh sách tài khoản ngân hàng nhận tiền của người dùng hiện tại."""
    return QRPaymentService.list_receiving_accounts(
        db=db, user_id=current_user.id, active_only=active_only
    )


@router.post("/receiving-accounts", response_model=ReceivingAccountResponse, status_code=status.HTTP_201_CREATED)
def create_receiving_account(
    data: ReceivingAccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _csrf: None = Depends(verify_csrf),
):
    """Thêm mới tài khoản ngân hàng nhận tiền."""
    return QRPaymentService.create_receiving_account(
        db=db, user_id=current_user.id, data=data
    )


@router.get("/receiving-accounts/{account_id}", response_model=ReceivingAccountResponse)
def get_receiving_account_detail(
    account_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Lấy thông tin chi tiết một tài khoản nhận tiền."""
    acc = QRPaymentService.get_receiving_account(
        db=db, user_id=current_user.id, account_id=account_id
    )
    return QRPaymentService._to_account_response(acc)


@router.put("/receiving-accounts/{account_id}", response_model=ReceivingAccountResponse)
def update_receiving_account(
    account_id: uuid.UUID,
    data: ReceivingAccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _csrf: None = Depends(verify_csrf),
):
    """Cập nhật thông tin tài khoản nhận tiền (tên gợi nhớ, ví mặc định, trạng thái)."""
    return QRPaymentService.update_receiving_account(
        db=db, user_id=current_user.id, account_id=account_id, data=data
    )


@router.delete("/receiving-accounts/{account_id}")
def delete_receiving_account(
    account_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _csrf: None = Depends(verify_csrf),
):
    """Xóa tài khoản nhận tiền (tự động soft-delete nếu đã phát sinh yêu cầu nhận tiền lịch sử)."""
    return QRPaymentService.delete_receiving_account(
        db=db, user_id=current_user.id, account_id=account_id
    )


# ---------------- Incoming Payment Requests ----------------

@router.post("/requests", response_model=IncomingPaymentRequestResponse, status_code=status.HTTP_201_CREATED)
def create_payment_request(
    data: IncomingPaymentRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _csrf: None = Depends(verify_csrf),
):
    """
    Tạo yêu cầu nhận tiền với số tiền cụ thể:
    - Sinh mã tham chiếu duy nhất
    - Tạo chuỗi VietQR TLV chuẩn Napas EMVCo
    - Trạng thái ban đầu: PENDING (chưa ghi nhận thu nhập vào ví)
    """
    return QRPaymentService.create_payment_request(
        db=db, user_id=current_user.id, data=data
    )


@router.get("/requests", response_model=IncomingPaymentRequestListResponse)
def list_payment_requests(
    status: Optional[str] = Query(None, description="Lọc theo trạng thái: PENDING, USER_CONFIRMED, CANCELLED"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Danh sách các yêu cầu nhận tiền đã tạo kèm bộ lọc trạng thái."""
    items, total = QRPaymentService.list_payment_requests(
        db=db, user_id=current_user.id, status_filter=status, limit=limit, offset=offset
    )
    return IncomingPaymentRequestListResponse(items=items, total=total)


@router.get("/requests/{request_id}", response_model=IncomingPaymentRequestResponse)
def get_payment_request_detail(
    request_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Lấy chi tiết yêu cầu nhận tiền, bao gồm chuỗi QR và thông tin chênh lệch nếu có."""
    return QRPaymentService.get_payment_request(
        db=db, user_id=current_user.id, request_id=request_id
    )


@router.post("/requests/{request_id}/cancel", response_model=IncomingPaymentRequestResponse)
def cancel_payment_request(
    request_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _csrf: None = Depends(verify_csrf),
):
    """Hủy yêu cầu nhận tiền đang ở trạng thái PENDING."""
    return QRPaymentService.cancel_payment_request(
        db=db, user_id=current_user.id, request_id=request_id
    )


@router.post("/requests/{request_id}/confirm", response_model=IncomingPaymentRequestResponse)
def confirm_payment_received(
    request_id: uuid.UUID,
    data: ConfirmPaymentReceivedRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _csrf: None = Depends(verify_csrf),
):
    """
    Xác nhận thực tế người dùng đã nhận được tiền:
    - Ghi nhận khoản thu INCOME vào ví đích trong cùng 1 atomic transaction
    - Chuyển trạng thái yêu cầu sang USER_CONFIRMED
    - Tự động tạo bản ghi chênh lệch (reconciliation) nếu số tiền thực nhận lệch số tiền yêu cầu ban đầu
    """
    return QRPaymentService.confirm_payment_received(
        db=db, user_id=current_user.id, request_id=request_id, data=data
    )


# ---------------- Reconciliations ----------------

@router.get("/reconciliations", response_model=List[PaymentReconciliationResponse])
def list_reconciliations(
    status: Optional[str] = Query(None, description="Lọc theo trạng thái: OPEN, REVIEWED, RESOLVED, IGNORED"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Danh sách các bản ghi chênh lệch tiền thu nhận được."""
    return QRPaymentService.list_reconciliations(
        db=db, user_id=current_user.id, status_filter=status
    )


@router.put("/reconciliations/{reconciliation_id}", response_model=PaymentReconciliationResponse)
def update_reconciliation(
    reconciliation_id: uuid.UUID,
    data: PaymentReconciliationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _csrf: None = Depends(verify_csrf),
):
    """Cập nhật ghi chú hoặc đánh dấu đã xử lý (RESOLVED/IGNORED) bản ghi chênh lệch."""
    return QRPaymentService.update_reconciliation(
        db=db, user_id=current_user.id, recon_id=reconciliation_id, data=data
    )


# ---------------- Parse / Decode QR Code ----------------

@router.post("/parse", response_model=ParseVietQRResponse)
def parse_qr_code(
    data: ParseVietQRRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Phân giải chuỗi mã VietQR Napas EMVCo thành số tài khoản, ngân hàng thụ hưởng, số tiền và nội dung."""
    parsed = parse_vietqr_payload(data.qr_payload)
    return ParseVietQRResponse(**parsed)


# ---------------- Outgoing Payments (Pending Expenses) ----------------

@router.post("/outgoing", response_model=OutgoingPaymentRequestResponse, status_code=status.HTTP_201_CREATED)
def create_outgoing_payment(
    data: OutgoingPaymentRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _csrf: None = Depends(verify_csrf),
):
    """Lưu khoản chi tiền quét QR ở trạng thái chờ xác nhận (PENDING)."""
    return QRPaymentService.create_outgoing_request(
        db=db, user_id=current_user.id, data=data
    )


@router.get("/outgoing", response_model=OutgoingPaymentRequestListResponse)
def list_outgoing_payments(
    status: Optional[str] = Query(None, description="Lọc theo trạng thái: PENDING, CONFIRMED, CANCELLED"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Lấy danh sách các khoản chi quét QR (mặc định hoặc lọc theo trạng thái)."""
    return QRPaymentService.list_outgoing_requests(
        db=db,
        user_id=current_user.id,
        status_filter=status,
        limit=limit,
        offset=offset,
    )


@router.post("/outgoing/{request_id}/confirm", response_model=OutgoingPaymentRequestResponse)
def confirm_outgoing_payment(
    request_id: uuid.UUID,
    data: Optional[ConfirmOutgoingPaymentRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _csrf: None = Depends(verify_csrf),
):
    """Xác nhận người dùng đã chuyển tiền/thanh toán thành công khoản chi (chuyển sang EXPENSE vào ví)."""
    return QRPaymentService.confirm_outgoing_request(
        db=db, user_id=current_user.id, request_id=request_id, data=data
    )


@router.post("/outgoing/confirm-all", response_model=List[OutgoingPaymentRequestResponse])
def confirm_all_outgoing_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _csrf: None = Depends(verify_csrf),
):
    """Chốt sổ cuối ngày: Xác nhận hàng loạt tất cả các khoản chi PENDING trong 1 cú click."""
    return QRPaymentService.confirm_all_outgoing_requests(
        db=db, user_id=current_user.id
    )


@router.post("/outgoing/{request_id}/cancel", response_model=OutgoingPaymentRequestResponse)
def cancel_outgoing_payment(
    request_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    _csrf: None = Depends(verify_csrf),
):
    """Hủy bỏ một khoản chi chờ xác nhận."""
    return QRPaymentService.cancel_outgoing_request(
        db=db, user_id=current_user.id, request_id=request_id
    )

