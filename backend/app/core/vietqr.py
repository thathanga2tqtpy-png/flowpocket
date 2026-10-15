"""
VietQR EMVCo QR Code Generator & Parser
Tuân thủ tiêu chuẩn EMVCo QR Code Specification và Napas VietQR cho thanh toán liên ngân hàng tại Việt Nam.

Định dạng TLV (Tag-Length-Value):
- Tag 00: Payload Format Indicator ("01")
- Tag 01: Point of Initiation Method ("12" - Dynamic QR với số tiền và nội dung cụ thể, hoặc "11" - Static QR)
- Tag 38: Merchant Account Information (Napas/VietQR AID: "A000000727", Bank BIN + Account No)
- Tag 53: Transaction Currency ("704" - VND)
- Tag 54: Transaction Amount (Số tiền VND)
- Tag 58: Country Code ("VN")
- Tag 62: Additional Data Field (Sub-tag 08: Nội dung chuyển khoản)
- Tag 63: CRC16-CCITT checksum (4 ký tự Hex in hoa)
"""

import unicodedata
import re

# Danh sách ngân hàng phổ biến nhất Việt Nam với mã BIN Napas chuẩn 6 chữ số
VIETNAM_BANKS = [
    {"code": "VCB", "name": "Vietcombank", "bin": "970436", "short_name": "Vietcombank"},
    {"code": "TCB", "name": "Techcombank", "bin": "970407", "short_name": "Techcombank"},
    {"code": "MB", "name": "MBBank", "bin": "970422", "short_name": "MBBank"},
    {"code": "ICB", "name": "VietinBank", "bin": "970415", "short_name": "VietinBank"},
    {"code": "BIDV", "name": "BIDV", "bin": "970418", "short_name": "BIDV"},
    {"code": "ACB", "name": "ACB", "bin": "970416", "short_name": "ACB"},
    {"code": "VPB", "name": "VPBank", "bin": "970432", "short_name": "VPBank"},
    {"code": "TPB", "name": "TPBank", "bin": "970423", "short_name": "TPBank"},
    {"code": "STB", "name": "Sacombank", "bin": "970403", "short_name": "Sacombank"},
    {"code": "HDB", "name": "HDBank", "bin": "970437", "short_name": "HDBank"},
    {"code": "VIB", "name": "VIB", "bin": "970441", "short_name": "VIB"},
    {"code": "SHB", "name": "SHB", "bin": "970443", "short_name": "SHB"},
    {"code": "OCB", "name": "OCB", "bin": "970448", "short_name": "OCB"},
    {"code": "MSB", "name": "MSB", "bin": "970426", "short_name": "MSB"},
    {"code": "LPB", "name": "LPBank", "bin": "970449", "short_name": "LPBank"},
    {"code": "SEAB", "name": "SeABank", "bin": "970440", "short_name": "SeABank"},
    {"code": "VAB", "name": "VietABank", "bin": "970427", "short_name": "VietABank"},
    {"code": "BVB", "name": "BaoVietBank", "bin": "970438", "short_name": "BaoVietBank"},
    {"code": "KLB", "name": "KienLongBank", "bin": "970452", "short_name": "Kienlongbank"},
    {"code": "CAKE", "name": "Cake by VPBank", "bin": "546034", "short_name": "CAKE"},
    {"code": "TIMO", "name": "Timo by BVBank", "bin": "963388", "short_name": "Timo"},
    {"code": "BVBANK", "name": "BVBank (Bản Việt)", "bin": "970454", "short_name": "BVBank"},
]

BANK_LOOKUP = {b["code"].upper(): b for b in VIETNAM_BANKS}
BIN_LOOKUP = {b["bin"]: b for b in VIETNAM_BANKS}
SUPPORTED_BANKS = BANK_LOOKUP


def get_bank_info(bank_code_or_bin: str) -> dict | None:
    query = bank_code_or_bin.strip().upper()
    if query in BANK_LOOKUP:
        return BANK_LOOKUP[query]
    if query in BIN_LOOKUP:
        return BIN_LOOKUP[query]
    return None


def remove_vietnamese_accents(input_str: str) -> str:
    """Loại bỏ dấu tiếng Việt để nội dung chuyển khoản an toàn cho mọi ứng dụng ngân hàng"""
    if not input_str:
        return ""
    nfkd = unicodedata.normalize("NFKD", input_str)
    no_accent = "".join([c for c in nfkd if not unicodedata.combining(c)])
    no_accent = no_accent.replace("đ", "d").replace("Đ", "D")
    cleaned = re.sub(r"[^a-zA-Z0-9 ]", "", no_accent)
    return " ".join(cleaned.split())


clean_ascii_for_vietqr = remove_vietnamese_accents


def compute_crc16(data: str) -> str:
    """Tính toán CRC16-CCITT thuần Python (polynomial 0x1021, init 0xFFFF) theo chuẩn EMVCo"""
    crc = 0xFFFF
    for byte in data.encode("utf-8"):
        crc ^= (byte << 8)
        for _ in range(8):
            if crc & 0x8000:
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF
            else:
                crc = (crc << 1) & 0xFFFF
    return f"{crc:04X}"


def format_tlv(tag: str, value: str) -> str:
    """Định dạng chuỗi TLV: Tag (2 ký tự) + Length (2 ký tự) + Value"""
    length = f"{len(value):02d}"
    return f"{tag}{length}{value}"


def parse_tlv(payload: str) -> dict[str, str]:
    """Phân giải chuỗi TLV thành dictionary {tag: value}"""
    result = {}
    idx = 0
    while idx + 4 <= len(payload):
        tag = payload[idx : idx + 2]
        length = int(payload[idx + 2 : idx + 4])
        idx += 4
        value = payload[idx : idx + length]
        idx += length
        result[tag] = value
    return result


def generate_vietqr_payload(
    bank_bin: str | None = None,
    account_number: str = "",
    amount: int | None = None,
    description: str | None = None,
    bank_code: str | None = None,
    memo: str | None = None,
    flexible_amount: bool = True,
) -> str:
    """
    Tạo chuỗi VietQR chuẩn EMVCo hoàn chỉnh.
    Hỗ trợ cả bank_bin (6 số) hoặc bank_code (VCB, MB...).
    Nếu flexible_amount=True: dùng Tag 01 = "11" (Static/Flexible QR) kèm Tag 54 gợi ý số tiền,
    cho phép người chuyển quét QR thấy số tiền nhưng vẫn có thể sửa lại (làm tròn, típ thêm...) trên ứng dụng ngân hàng.
    Nếu flexible_amount=False: dùng Tag 01 = "12" (Dynamic QR khóa cứng số tiền).
    """
    actual_bin = bank_bin
    if not actual_bin and bank_code:
        bank_info = get_bank_info(bank_code)
        if bank_info:
            actual_bin = bank_info["bin"]

    if not actual_bin:
        raise ValueError(f"Không xác định được mã BIN cho ngân hàng (bank_code={bank_code}, bank_bin={bank_bin})")

    actual_memo = memo if memo is not None else description
    clean_account = "".join(filter(str.isalnum, account_number))
    clean_bin = "".join(filter(str.isdigit, actual_bin))

    # 1. Payload Format Indicator
    tlv_00 = format_tlv("00", "01")

    # 2. Point of Initiation Method: 11 (Static/Gợi ý số tiền, cho phép sửa) hoặc 12 (Dynamic khóa số tiền)
    if flexible_amount:
        initiation_method = "11"
    else:
        initiation_method = "12" if (amount and amount > 0) else "11"
    tlv_01 = format_tlv("01", initiation_method)

    # 3. Merchant Account Information (Tag 38 - Napas/VietQR)
    # Sub-tag 00: GUID "A000000727"
    sub_00 = format_tlv("00", "A000000727")
    # Sub-tag 01: Beneficiary Org (Bank BIN + Account Number)
    sub_beneficiary_00 = format_tlv("00", clean_bin)
    sub_beneficiary_01 = format_tlv("01", clean_account)
    sub_01_val = f"{sub_beneficiary_00}{sub_beneficiary_01}"
    sub_01 = format_tlv("01", sub_01_val)
    # Sub-tag 02: Service Code (QRIBFTTC - Chuyển nhanh 24/7 tới tài khoản)
    sub_02 = format_tlv("02", "QRIBFTTC")

    tag_38_val = f"{sub_00}{sub_01}{sub_02}"
    tlv_38 = format_tlv("38", tag_38_val)

    # 4. Transaction Currency (Tag 53): 704 (VND)
    tlv_53 = format_tlv("53", "704")

    # 5. Transaction Amount (Tag 54) nếu có
    tlv_54 = ""
    if amount and amount > 0:
        tlv_54 = format_tlv("54", str(int(amount)))

    # 6. Country Code (Tag 58): VN
    tlv_58 = format_tlv("58", "VN")

    # 7. Additional Data Field Template (Tag 62) cho Nội dung chuyển khoản
    tlv_62 = ""
    if actual_memo:
        safe_desc = remove_vietnamese_accents(actual_memo)[:25]
        if safe_desc:
            sub_62_08 = format_tlv("08", safe_desc)
            tlv_62 = format_tlv("62", sub_62_08)

    # 8. Ghép lại chuỗi trước CRC
    raw_payload = f"{tlv_00}{tlv_01}{tlv_38}{tlv_53}{tlv_54}{tlv_58}{tlv_62}6304"

    # 9. Tính checksum CRC16
    crc = compute_crc16(raw_payload)
    final_payload = f"{raw_payload[:-4]}{format_tlv('63', crc)}"

    return final_payload


def verify_vietqr_payload(payload: str) -> bool:
    """Kiểm tra tính toàn vẹn CRC16 của chuỗi VietQR"""
    if len(payload) < 8 or not payload.endswith(payload[-4:]):
        return False
    data_part = payload[:-4]
    expected_crc = payload[-4:]
    return compute_crc16(data_part) == expected_crc


def parse_vietqr_payload(payload: str) -> dict:
    """Phân giải chuỗi mã VietQR Napas EMVCo thành thông tin ngân hàng, số tài khoản, số tiền và nội dung"""
    clean_p = payload.strip()
    tlv = parse_tlv(clean_p)
    result = {
        "is_valid_vietqr": False,
        "bank_bin": None,
        "bank_code": None,
        "bank_name": None,
        "account_number": None,
        "amount": None,
        "memo": None,
        "raw_payload": clean_p,
    }

    if "38" in tlv:
        sub_38 = parse_tlv(tlv["38"])
        # Napas GUID
        if sub_38.get("00") == "A000000727" and "01" in sub_38:
            beneficiary = parse_tlv(sub_38["01"])
            bin_code = beneficiary.get("00")
            account_no = beneficiary.get("01")
            result["bank_bin"] = bin_code
            result["account_number"] = account_no
            result["is_valid_vietqr"] = True
            if bin_code and bin_code in BIN_LOOKUP:
                b_info = BIN_LOOKUP[bin_code]
                result["bank_code"] = b_info["code"]
                result["bank_name"] = b_info["name"]

    if "54" in tlv:
        try:
            result["amount"] = int(tlv["54"])
        except (ValueError, TypeError):
            pass

    if "62" in tlv:
        sub_62 = parse_tlv(tlv["62"])
        if "08" in sub_62:
            result["memo"] = sub_62["08"]

    return result
