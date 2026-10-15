import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator, ConfigDict


class SupportedBank(BaseModel):
    code: str
    name: str
    bin: str
    short_name: str


# ---------------- Receiving Account Schemas ----------------

class ReceivingAccountCreate(BaseModel):
    bank_code: str = Field(..., min_length=2, max_length=20, description="Mã ngân hàng (VCB, MB, TCB...)")
    account_number: str = Field(..., min_length=4, max_length=50, description="Số tài khoản ngân hàng")
    account_holder_name: str = Field(..., min_length=2, max_length=100, description="Tên chủ tài khoản")
    display_name: Optional[str] = Field(None, max_length=100, description="Tên gợi nhớ")
    linked_wallet_id: Optional[uuid.UUID] = Field(None, description="Ví cá nhân liên kết")
    is_default: bool = False

    @field_validator("account_number")
    @classmethod
    def clean_account_number(cls, v: str) -> str:
        clean = "".join(v.split())
        if not clean.isalnum():
            raise ValueError("Số tài khoản chỉ được chứa chữ số và chữ cái")
        return clean

    @field_validator("account_holder_name")
    @classmethod
    def clean_holder_name(cls, v: str) -> str:
        clean = " ".join(v.strip().split())
        if len(clean) < 2:
            raise ValueError("Tên chủ tài khoản không hợp lệ")
        return clean.upper()


class ReceivingAccountUpdate(BaseModel):
    bank_code: Optional[str] = Field(None, min_length=2, max_length=20)
    account_number: Optional[str] = Field(None, min_length=4, max_length=50)
    account_holder_name: Optional[str] = Field(None, min_length=2, max_length=100)
    display_name: Optional[str] = Field(None, max_length=100)
    linked_wallet_id: Optional[uuid.UUID] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None

    @field_validator("account_number")
    @classmethod
    def clean_account_number(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        clean = "".join(v.split())
        if not clean.isalnum():
            raise ValueError("Số tài khoản chỉ được chứa chữ số và chữ cái")
        return clean

    @field_validator("account_holder_name")
    @classmethod
    def clean_holder_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        clean = " ".join(v.strip().split())
        if len(clean) < 2:
            raise ValueError("Tên chủ tài khoản không hợp lệ")
        return clean.upper()


class ReceivingAccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    bank_code: str
    bank_name: str
    account_number: str
    masked_account_number: str
    account_holder_name: str
    display_name: Optional[str]
    linked_wallet_id: Optional[uuid.UUID]
    is_default: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime


# ---------------- Reconciliation Schemas ----------------

class PaymentReconciliationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    payment_request_id: uuid.UUID
    expected_amount: int
    actual_amount: int
    difference_amount: int
    difference_type: str
    status: str
    notes: Optional[str]
    resolved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


class PaymentReconciliationUpdate(BaseModel):
    status: Optional[str] = Field(None, description="OPEN, REVIEWED, RESOLVED, IGNORED")
    notes: Optional[str] = None


# ---------------- Incoming Payment Request Schemas ----------------

class IncomingPaymentRequestCreate(BaseModel):
    receiving_account_id: Optional[uuid.UUID] = None
    target_wallet_id: uuid.UUID
    expected_amount: int = Field(..., gt=0, description="Số tiền cần nhận (VND > 0)")
    category_id: Optional[uuid.UUID] = None
    description: Optional[str] = Field(None, max_length=255, description="Ghi chú nội bộ")
    transfer_memo: Optional[str] = Field(None, max_length=50, description="Nội dung chuyển khoản tùy chỉnh")
    allow_flexible_amount: bool = Field(
        True,
        description="Cho phép người chuyển sửa số tiền trên app ngân hàng (Số tiền gợi ý thay vì khóa cứng)",
    )


class ConfirmPaymentReceivedRequest(BaseModel):
    actual_amount: int = Field(..., ge=0, description="Số tiền thực tế nhận được (VND >= 0)")
    category_id: Optional[uuid.UUID] = Field(None, description="Danh mục thu nhập (nếu muốn thay đổi)")
    notes: Optional[str] = Field(None, max_length=255, description="Ghi chú xác nhận / giải trình lệch")


class IncomingPaymentRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    reference_code: str
    expected_amount: int
    actual_amount: Optional[int]
    receiving_account_id: Optional[uuid.UUID] = None
    target_wallet_id: uuid.UUID
    category_id: Optional[uuid.UUID]
    description: Optional[str]
    transfer_memo: str
    qr_payload: str
    status: str
    bank_code_snapshot: str
    bank_name_snapshot: str
    account_number_snapshot: str
    masked_account_number_snapshot: str
    account_holder_snapshot: str
    confirmed_at: Optional[datetime]
    cancelled_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    reconciliation: Optional[PaymentReconciliationResponse] = None


class IncomingPaymentRequestListResponse(BaseModel):
    items: List[IncomingPaymentRequestResponse]
    total: int


class ParseVietQRRequest(BaseModel):
    qr_payload: str = Field(..., min_length=1, description="Chuỗi mã QR quét được")


class ParseVietQRResponse(BaseModel):
    is_valid_vietqr: bool
    bank_bin: Optional[str] = None
    bank_code: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    amount: Optional[int] = None
    memo: Optional[str] = None
    raw_payload: str


# ---------------- Outgoing Payment (Pending Expense) Schemas ----------------

class OutgoingPaymentRequestCreate(BaseModel):
    wallet_id: uuid.UUID
    category_id: Optional[uuid.UUID] = None
    amount: int = Field(..., gt=0, description="Số tiền chi (VND > 0)")
    description: Optional[str] = Field(None, max_length=255, description="Nội dung/mục đích chi tiêu")
    bank_code: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    account_holder_name: Optional[str] = None
    qr_payload: Optional[str] = None


class ConfirmOutgoingPaymentRequest(BaseModel):
    actual_amount: Optional[int] = Field(None, gt=0, description="Số tiền thực tế nếu có thay đổi")
    category_id: Optional[uuid.UUID] = None
    wallet_id: Optional[uuid.UUID] = None


class OutgoingPaymentRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_user_id: uuid.UUID
    wallet_id: uuid.UUID
    category_id: Optional[uuid.UUID]
    amount: int
    description: Optional[str]
    bank_code: Optional[str]
    bank_name: Optional[str]
    account_number: Optional[str]
    account_holder_name: Optional[str]
    qr_payload: Optional[str]
    status: str
    wallet_transaction_id: Optional[uuid.UUID]
    created_at: datetime
    confirmed_at: Optional[datetime]
    wallet_name: Optional[str] = None
    category_name: Optional[str] = None


class OutgoingPaymentRequestListResponse(BaseModel):
    items: List[OutgoingPaymentRequestResponse]
    total: int
    total_pending_amount: int
