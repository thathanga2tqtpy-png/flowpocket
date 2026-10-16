# SO SÁNH FLOWPOCKET VÀ MOMO (PRODUCT COMPARISON & VALUE PROPOSITION)

> **Tài liệu chiến lược sản phẩm**: Phân tích chi tiết ưu thế cạnh tranh, nhược điểm, giá trị cốt lõi (Value Proposition) và lộ trình khắc phục của **FlowPocket** so với giải pháp chia tiền / quản lý chi tiêu của **MoMo**.

---

## 1. TỔNG QUAN ĐỊNH VỊ THỊ TRƯỜNG

* **MoMo**: Siêu ứng dụng (Super-App) ví điện tử khép kín, tập trung vào thanh toán trung gian, tài chính tiêu dùng, dịch vụ giá trị gia tăng và giữ tiền của người dùng trong hệ sinh thái MoMo.
* **FlowPocket**: Nền tảng **Mở (Open Banking / VietQR)** chuyên sâu về **Quản lý chi tiêu cá nhân & Tối ưu hóa phân chia nợ nhóm (Debt Simplification)**, tiền chạy trực tiếp giữa tài khoản ngân hàng của các thành viên thông qua chuẩn quốc gia VietQR (EMVCo) mà không giam vốn người dùng.

---

## 2. BẢNG SO SÁNH ĐỐI ĐẦU CHI TIẾT

| Tiêu chí so sánh | FlowPocket | MoMo (Ví điện tử) | Ý nghĩa thực tế |
| :--- | :--- | :--- | :--- |
| **Rào cản gia nhập (Barrier to Entry)** | **Cực thấp (Web / PWA)**: Chỉ cần mở link trên trình duyệt là xem và tham gia nhóm được ngay. | **Rất cao**: Bắt buộc 100% người dùng phải cài app (~200MB+), đăng ký SĐT, xác thực danh tính eKYC & CCCD. | Trong nhóm bạn 5-10 người, chỉ cần 1-2 người không dùng MoMo hoặc ngại eKYC là luồng chia tiền của MoMo bị gãy hoàn toàn. |
| **Tính mở của dòng tiền (Capital Flow)** | **Tiền về thẳng tài khoản ngân hàng chính**: Thanh toán qua VietQR, tiền chạy trực tiếp từ Bank người chuyển sang Bank người nhận. | **Bị giam vốn trong ví**: Tiền chuyển vào ví MoMo. Muốn rút về tài khoản ngân hàng thường bị giới hạn lượt miễn phí hoặc tốn phí rút tiền. | Người dùng không muốn tiền bị kẹt rải rác ở ví điện tử phụ khi cần chi tiêu vào việc khác. |
| **Thuật toán tối ưu nợ nhóm (Debt Simplification)** | **Tự động tối ưu đồ thị nợ đa phương**: A nợ B 100k, B nợ C 100k $\rightarrow$ hệ thống gộp thành A trả thẳng C 100k. Giảm từ $N(N-1)$ giao dịch xuống tối thiểu. | **Chỉ chia đều đơn giản theo bill**: Không có thuật toán bù trừ chéo nhiều giao dịch phức tạp của cả chuyến đi. | Giảm thiểu số lần chuyển khoản giữa các thành viên sau chuyến du lịch dài ngày từ hàng chục lần xuống 2 - 3 lần. |
| **Xử lý VietQR thông minh** | Quét ảnh VietQR bất kỳ $\rightarrow$ trích xuất STK, ngân hàng, số tiền, nội dung $\rightarrow$ sinh mã VietQR động để nhóm thanh toán lại $\rightarrow$ lưu vết chi tiêu. | Quét QR chỉ để trừ tiền tức thì tại điểm bán, không tích hợp quy trình lưu nháp & bổ nhỏ chia nợ cho nhóm sau đó. | FlowPocket biến mọi hóa đơn ăn uống/mua sắm thực tế thành khoản nợ nhóm minh bạch. |
| **Hỗ trợ liên ngân hàng** | Hỗ trợ tất cả ngân hàng tại Việt Nam (MB, Vietcombank, Techcombank, Shinhan, BIDV, VietinBank...). | Chỉ hỗ trợ giữa các tài khoản Ví MoMo với nhau. | Bất kỳ ai dùng tài khoản ngân hàng nào cũng tham gia được. |
| **Trải nghiệm người dùng (Clean UX)** | **Giao diện sạch 100%**: Tập trung thuần túy vào tài chính nhóm, không quảng cáo, không pop-up, tốc độ tải tức thì. | **Bloatware**: Rất nhiều banner quảng cáo vay nợ, game tương tác, lì xì, khuyến mãi làm rối mắt người dùng. | Trải nghiệm thanh toán và theo dõi tài chính nhanh gọn, không phiền toái. |
| **Khả năng tự chủ dữ liệu** | **Mã nguồn độc lập**: Có thể tự host (Self-hosted), tùy biến theo quy trình công ty, phòng trọ, hội nhóm. | Đóng kín, phụ thuộc hoàn toàn vào hệ sinh thái của MoMo. | Phù hợp cho tổ chức muốn bảo mật và linh hoạt tích hợp riêng. |

---

## 3. NHƯỢC ĐIỂM CỦA FLOWPOCKET SO VỚI MOMO

Mặc dù có nhiều ưu thế vượt trội về tính mở và nghiệp vụ chia nợ, FlowPocket vẫn có một số rào cản kỹ thuật do tính chất là nền tảng độc lập không phải tổ chức trung gian thanh toán được cấp phép:

### 3.1. Không thể tự động trừ tiền 1 chạm (In-app Direct Debit)
* **MoMo:** Có giấy phép trung gian thanh toán, cho phép người dùng bấm xác nhận bằng vân tay/FaceID là tiền tự trừ trong số dư ví.
* **FlowPocket:** Phải làm cầu nối điều hướng (Deep Link / QR) sang ứng dụng ngân hàng của người dùng. Người dùng phải xác thực trên app ngân hàng của họ, sau đó quay lại FlowPocket để ghi nhận trạng thái.

### 3.2. Đối soát gạch nợ tự động thời gian thực (Real-time Auto Reconciliation)
* **MoMo:** Chuyển tiền nội bộ MoMo xong là hệ thống tự động gạch nợ thành công 100% tức thì.
* **FlowPocket:** Hiện tại chuyển sang trạng thái chờ xác nhận (`pending`). Người nhận cần bấm xác nhận hoặc sau này cần tích hợp thêm Webhook biến động số dư (Open Banking / Casso / SePay) để tự động gạch nợ.

### 3.3. Giới hạn Deeplink Autofill của các ngân hàng bên thứ ba
* Một số app ngân hàng (như Shinhan Bank SOL, Vietcombank, Techcombank) đặt cờ `autofill: 0` vì lý do bảo mật, không cho phép trình duyệt ngoài tự điền sẵn số tiền vào form chuyển khoản.
* **Giải pháp của FlowPocket:** Cung cấp tính năng "Tải mã QR về máy để quét từ thư viện ảnh" và các nút "Sao chép nhanh tất cả thông tin" để khắc phục 100% rào cản này.

### 3.4. Hệ sinh thái và tính năng thông báo (Push Notification)
* **MoMo:** Sở hữu hơn 30 triệu người dùng, danh bạ điện thoại đồng bộ sẵn, hệ thống Push Notification gốc trên iOS/Android rất mạnh mẽ.
* **FlowPocket:** Là web app độc lập, việc gửi thông báo phụ thuộc vào Web Push Notification, Email hoặc liên kết Zalo/Telegram Bot.

---

## 4. CHIẾN LƯỢC VÀ LỘ TRÌNH KHẮC PHỤC NHƯỢC ĐIỂM CỦA FLOWPOCKET

Để nâng cao năng lực cạnh tranh và biến FlowPocket thành công cụ không thể thay thế cho người dùng Việt Nam:

1. **Tích hợp Webhook biến động số dư (Open Banking / SePay / Casso):**
   - Khi người nợ quét VietQR và chuyển tiền thành công, hệ thống ngân hàng bắn Webhook về FlowPocket $\rightarrow$ Hệ thống tự động chuyển trạng thái nợ từ `pending` sang `settled` tức thì mà không cần người nhận bấm nút thủ công.
2. **Triển khai PWA (Progressive Web App) & Web Push:**
   - Cho phép người dùng "Thêm vào màn hình chính" (Add to Home Screen) như một app native, nhận thông báo nổi khi có bạn bè thêm chi tiêu hoặc trả nợ.
3. **Mở rộng Zalo Mini App / Telegram Mini App (Tùy chọn):**
   - Tận dụng hệ sinh thái Zalo để gửi thông báo chia tiền qua ZNS hoặc tin nhắn nhóm Zalo mà người dùng không cần cài thêm ứng dụng gì.
4. **Chia sẻ hóa đơn thông minh dạng ảnh / Story:**
   - Xuất tóm tắt chi phí chuyến đi và mã QR thanh toán thành dạng ảnh đẹp mắt để người dùng dễ dàng gửi thẳng vào các nhóm chat Messenger, Zalo, Telegram.

---

## 5. KẾT LUẬN & ĐỊNH VỊ SẢN PHẨM (CORE VALUE PROPOSITION)

> **"FlowPocket là giải pháp Splitwise chuyên sâu cho người Việt, khắc phục triệt để điểm yếu giam vốn và rào cản cài app của MoMo nhờ sức mạnh của chuẩn mở VietQR."**

* **Khi nào dùng MoMo?** Khi tất cả thành viên trong nhóm đều có sẵn ví MoMo, đều có số dư trong ví và đồng ý chuyển tiền lòng vòng trong ví.
* **Khi nào FlowPocket là lựa chọn tối thượng?** Khi nhóm bạn đa dạng (người dùng Vietcombank, người dùng Shinhan, người dùng MB, người không dùng ví điện tử), muốn tiền chuyển thẳng về tài khoản ngân hàng chính, và cần một thuật toán thông minh để xóa sạch các khoản nợ chéo phức tạp chỉ bằng vài lần chuyển khoản.

