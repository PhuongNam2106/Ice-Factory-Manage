# Thiết kế website quản lý xưởng nước đá

Ngày thiết kế: 2026-08-12

Trạng thái: Đã được người dùng duyệt ngày 2026-08-12

Phạm vi: Phiên bản vận hành cốt lõi cho một xưởng, khoảng 10 người dùng

## 1. Mục tiêu

Xây dựng một website responsive dạng Progressive Web App (PWA) để nhân viên nhập liệu thuận tiện trên điện thoại và quản lý đối chiếu, duyệt, khóa sổ, xem báo cáo trên máy tính. Hệ thống thay thế quy trình ghi chép bằng workbook `QL.xlsx`, nhưng không sao chép các công thức và cấu trúc lỗi của workbook cũ.

Đây là hệ thống cho xưởng sản xuất nước đá lạnh. Đơn vị vận hành chính là **bao đá**. Người dùng tự nhập đơn giá cho mỗi bao tại thời điểm bán; hệ thống không mặc định quy đổi bao sang kilogram.

### Tiêu chí thành công

- Nhân viên có thể hoàn thành một lần nhập bán hàng, sản xuất, chi phí, thu tiền hoặc kiểm kê bằng điện thoại với ít thao tác.
- Số liệu doanh thu, công nợ và tồn thành phẩm được tính từ chứng từ gốc, không nhập tổng bằng tay.
- Quản lý có thể đối chiếu và khóa sổ từng ngày vận hành.
- Mọi sửa đổi quan trọng đều truy vết được người thực hiện, thời điểm, lý do, dữ liệu cũ và dữ liệu mới.
- Báo cáo Excel ngày/tháng đối chiếu đúng với dashboard.
- Giao diện sử dụng tốt trên điện thoại và máy tính từ cùng một địa chỉ web.

## 2. Phạm vi phiên bản đầu

### Bao gồm

- Tài khoản nhân viên và quản lý.
- Danh mục khách hàng sỉ.
- Danh mục máy sản xuất.
- Bán sỉ theo từng lần giao.
- Bán lẻ tổng hợp cuối ca hoặc cuối ngày.
- Sản xuất chi tiết theo từng mẻ và tổng hợp cuối ca theo từng máy.
- Chi phí có ảnh chứng từ và quy trình duyệt.
- Phiếu thu, bán chịu, thanh toán một phần và công nợ khách hàng.
- Tồn kho thành phẩm theo số bao.
- Kiểm kê, điều chỉnh tồn và cảnh báo chênh lệch.
- Dashboard ngày/tháng.
- Khóa và mở lại sổ ngày.
- Xuất báo cáo Excel và bản sao dữ liệu.
- Nhật ký thay đổi.

### Không bao gồm

- Quản lý nguyên vật liệu như bao bì, NH3, dầu máy hoặc linh kiện.
- Chấm công, tính lương và quản lý nhân sự chuyên sâu.
- Bảo trì máy và lịch sửa chữa.
- Nhiều chi nhánh hoặc nhiều xưởng.
- Ứng dụng native trên App Store hoặc Google Play.
- Chế độ làm việc ngoại tuyến đầy đủ; mạng tại xưởng được giả định ổn định.
- Nhập toàn bộ lịch sử giao dịch từ workbook cũ.

## 3. Người dùng và quyền hạn

Hệ thống có hai vai trò.

### Nhân viên

- Có thể nhập mọi loại dữ liệu: bán hàng, sản xuất, chi phí, phiếu thu và kiểm kê.
- Có thể xem dữ liệu vận hành của xưởng.
- Có thể sửa hoặc hủy bản ghi do chính mình tạo trong ngày chưa khóa.
- Không thể duyệt khoản chi do mình hoặc người khác nhập.
- Không thể sửa dữ liệu của ngày đã khóa.

### Quản lý

- Có mọi quyền của nhân viên.
- Có thể duyệt hoặc từ chối chi phí.
- Có thể sửa hoặc hủy bản ghi của bất kỳ người dùng nào khi ngày chưa khóa; thao tác phải có lý do.
- Có thể khóa hoặc mở lại ngày vận hành.
- Có thể xác nhận ngoại lệ khi chênh lệch tồn vượt ngưỡng.
- Có thể quản lý tài khoản, khách hàng, máy sản xuất và cấu hình cảnh báo.
- Có thể xem lợi nhuận, công nợ và xuất báo cáo.

Mỗi người dùng có một tài khoản riêng. Đăng nhập sử dụng số điện thoại và mã PIN tối thiểu 6 chữ số. Thông tin xác thực do Supabase Auth quản lý; ứng dụng không lưu PIN dạng đọc được. Đăng nhập sai nhiều lần bị giới hạn và tạm khóa.

## 4. Kiến trúc hệ thống

```text
Điện thoại hoặc máy tính
          |
        HTTPS
          |
Next.js PWA trên Vercel
|- Giao diện React
|- Backend API / nghiệp vụ
|- Xác thực và kiểm tra dữ liệu
|- Tạo báo cáo Excel
          |
Supabase tại Singapore
|- PostgreSQL
|- Auth
|- Storage riêng tư cho ảnh hóa đơn
|- Row Level Security
```

### Công nghệ

- Ngôn ngữ: TypeScript.
- Framework giao diện và backend-for-frontend: Next.js App Router.
- Giao diện: React và Tailwind CSS, thiết kế mobile-first.
- Kiểm tra dữ liệu đầu vào: Zod.
- Database: PostgreSQL trên Supabase.
- Authentication: Supabase Auth.
- Lưu ảnh: Supabase Storage với bucket riêng tư.
- PWA: Web App Manifest và service worker cho app shell; không cam kết nhập ngoại tuyến.
- Triển khai frontend và backend: Vercel, Functions đặt tại Singapore (`sin1`).
- Database, Auth và Storage: Supabase Singapore (`ap-southeast-1`).
- Kiểm thử: Vitest cho đơn vị/nghiệp vụ và Playwright cho luồng end-to-end.

### Ranh giới mô-đun

Mã nguồn là một ứng dụng Next.js nhưng chia thành các mô-đun nghiệp vụ độc lập:

- `auth`: đăng nhập, phiên làm việc và vai trò.
- `sales`: bán sỉ, bán lẻ và hủy giao dịch.
- `production`: mẻ sản xuất và tổng cuối ca.
- `expenses`: chi phí, chứng từ và phê duyệt.
- `receivables`: công nợ, phiếu thu và phân bổ tiền.
- `inventory`: sổ tồn thành phẩm, kiểm kê và điều chỉnh.
- `closing`: đối chiếu, khóa và mở lại ngày.
- `reporting`: dashboard, truy vấn tổng hợp và xuất Excel.
- `audit`: nhật ký thay đổi bất biến.
- `admin`: tài khoản, khách hàng, máy và cấu hình.

Mỗi mô-đun chứa schema kiểm tra dữ liệu, nghiệp vụ, truy cập database và API của riêng nó. Giao diện gọi nghiệp vụ qua API/server action; không đặt công thức tài chính hoặc tồn kho chỉ ở phía trình duyệt.

## 5. Trải nghiệm người dùng

### Điện thoại

Trang chủ hiển thị tóm tắt ngày hiện tại, các cảnh báo và sáu thao tác nhanh:

- Bán sỉ.
- Bán lẻ.
- Sản xuất.
- Chi phí.
- Thu nợ.
- Kiểm kho.

Các biểu mẫu dùng nút lớn, bàn phím số phù hợp, giá trị mặc định hợp lý và hiển thị rõ trạng thái `Đang lưu`, `Đã lưu` hoặc `Chưa lưu`. Sau khi lưu, nhân viên thấy ngay bản ghi vừa tạo và có thể sửa trong phạm vi quyền hạn.

### Máy tính

Giao diện sử dụng cùng dữ liệu và tài khoản nhưng mở rộng thành:

- Bảng dữ liệu nhiều cột.
- Tìm kiếm, lọc, phân trang và sắp xếp.
- Đối chiếu sản xuất, bán hàng và tồn kho.
- Duyệt chi phí.
- Theo dõi công nợ.
- Dashboard, biểu đồ và xuất Excel.
- Quản trị danh mục và tài khoản.

## 6. Luồng nghiệp vụ

### 6.1 Bán sỉ

Nhân viên chọn khách hàng, nhập số bao, đơn giá mỗi bao, số tiền nhận ngay (có thể bằng 0), phương thức thanh toán và ghi chú. Backend tự tính thành tiền.

```text
Thành tiền = Số bao x Đơn giá mỗi bao
Còn phải thu = Thành tiền - Tiền nhận ngay
```

Nếu còn phải thu lớn hơn 0, hệ thống tạo khoản công nợ gắn với giao dịch. Một giao dịch bán chịu bắt buộc có khách hàng.

### 6.2 Bán lẻ

Bán lẻ không cần ghi từng khách. Nhân viên nhập một bản tổng hợp cuối ca hoặc cuối ngày. Mỗi mức giá bán trong ca là một dòng gồm số bao và đơn giá; backend tính thành tiền từng dòng và tổng doanh thu bán lẻ. Nếu cả ca chỉ có một mức giá, biểu mẫu mặc định chỉ hiển thị một dòng.

Hệ thống cho phép nhiều ca trong ngày nhưng ngăn tạo hai bản tổng hợp trùng cùng ca. Tổng tiền đã thu bán lẻ không được vượt tổng doanh thu. Cách này giữ đúng yêu cầu nhân viên tự nhập giá theo bao, đồng thời bảo đảm doanh thu luôn truy ngược được về số bao và đơn giá.

### 6.3 Sản xuất

Có hai chế độ:

- Chi tiết từng mẻ: máy, thời gian bắt đầu/kết thúc, số bao đạt, số bao hỏng và ghi chú.
- Tổng cuối ca: máy, ca, tổng số bao đạt, tổng số bao hỏng và ghi chú.

Người dùng đánh dấu bản tổng cuối ca là `Tổng hợp từ các mẻ` hoặc `Nhập độc lập`. Nếu tổng hợp từ các mẻ, hệ thống đối chiếu với tổng chi tiết và cảnh báo chênh lệch; không cộng cả hai nguồn vào tồn kho. Nguồn chính thức cho nhập kho của một máy/ca chỉ được chọn một lần.

### 6.4 Chi phí

Nhân viên nhập loại chi phí, số tiền, người nhận, ghi chú và ảnh hóa đơn tùy chọn. Trạng thái ban đầu là `Chờ duyệt`.

- Quản lý có thể `Duyệt` hoặc `Từ chối` và ghi chú.
- Chỉ chi phí đã duyệt được tính vào lợi nhuận chính thức.
- Khoản bị từ chối vẫn giữ trong lịch sử.
- Một người dùng có vai trò quản lý không được tự động duyệt ngay trong cùng thao tác tạo; duyệt là thao tác riêng được audit.

### 6.5 Công nợ và phiếu thu

Mỗi giao dịch bán chịu phát sinh một khoản phải thu. Mỗi lần khách trả tạo một phiếu thu và có thể phân bổ vào một hoặc nhiều khoản phải thu của cùng khách hàng.

```text
Công nợ còn lại = Tổng bán chịu - Tổng tiền đã phân bổ - Điều chỉnh hợp lệ
```

Hệ thống không cho phân bổ vượt số tiền phiếu thu hoặc vượt dư nợ của khoản phải thu. Tiền chưa phân bổ được hiển thị riêng, không tự động làm giảm một khoản nợ bất kỳ.

### 6.6 Tồn thành phẩm

Tồn kho chỉ quản lý thành phẩm theo số bao. Mỗi phát sinh tạo một dòng sổ kho bất biến:

- Nhập kho từ sản xuất chính thức.
- Xuất kho từ bán sỉ hoặc bán lẻ.
- Điều chỉnh tăng/giảm từ kiểm kê đã xác nhận.
- Đảo bút toán khi chứng từ nguồn bị hủy.

```text
Tồn dự kiến = Tồn đầu + Nhập từ sản xuất - Xuất bán +/- Điều chỉnh
Chênh lệch = Tồn kiểm kê - Tồn dự kiến
Tỷ lệ chênh lệch = |Chênh lệch| / max(Tồn dự kiến, 1) x 100%
```

Nếu tồn dự kiến bằng 0, hệ thống không chia cho 0; tỷ lệ được hiển thị theo quy tắc an toàn và luôn cảnh báo nếu kiểm kê khác 0. Bán vượt tồn khả dụng bị chặn mặc định. Quản lý có thể cho phép tồn âm bằng một cấu hình có cảnh báo, nhưng cấu hình mặc định là không cho phép.

### 6.7 Khóa sổ ngày

Ngày vận hành theo múi giờ `Asia/Bangkok`, từ 00:00:00 đến 23:59:59.

Trước khi khóa, hệ thống kiểm tra:

- Đã có kiểm kê tồn cuối ngày.
- Không còn chi phí chờ duyệt.
- Không có giao dịch bán chịu thiếu khách hàng.
- Không có giao dịch thiếu số bao hoặc giá trị bắt buộc.
- Không có mẻ/tổng sản xuất bị tính trùng.
- Chênh lệch tồn không vượt 5%.

Nếu chênh lệch vượt 5%, quản lý phải nhập lý do và xác nhận ngoại lệ. Các lỗi làm sai tính toàn vẹn dữ liệu thì không thể bỏ qua.

Khi khóa:

- Hệ thống lưu snapshot báo cáo ngày.
- Tồn cuối trở thành tồn đầu ngày kế tiếp.
- Giao dịch trong ngày không thể sửa/hủy.
- Mở lại ngày yêu cầu lý do, ghi audit và làm mất hiệu lực snapshot cũ.
- Sau khi sửa, quản lý phải đối chiếu và khóa lại.

## 7. Mô hình dữ liệu

Các bảng logic chính:

| Bảng | Mục đích |
|---|---|
| `profiles` | Hồ sơ người dùng, vai trò, trạng thái |
| `customers` | Danh sách khách sỉ và điều khoản thanh toán |
| `machines` | Danh sách máy sản xuất |
| `operating_days` | Ngày vận hành, trạng thái khóa và snapshot |
| `sales` | Header giao dịch bán sỉ/bán lẻ |
| `sale_lines` | Số bao, đơn giá và thành tiền |
| `production_batches` | Mẻ sản xuất chi tiết |
| `production_shift_totals` | Tổng sản xuất cuối ca theo máy |
| `expenses` | Khoản chi và trạng thái duyệt |
| `expense_attachments` | Tham chiếu ảnh hóa đơn |
| `receivables` | Khoản phải thu phát sinh từ bán chịu |
| `receipts` | Phiếu thu khách hàng |
| `receipt_allocations` | Phân bổ phiếu thu vào khoản phải thu |
| `inventory_ledger` | Sổ nhập, xuất, điều chỉnh thành phẩm |
| `stock_counts` | Kiểm kê thực tế cuối ngày |
| `audit_log` | Nhật ký thay đổi bất biến |
| `settings` | Ngưỡng cảnh báo và cấu hình xưởng |

Mọi bảng chứng từ có `id`, ngày vận hành, người tạo, thời điểm tạo, người cập nhật, thời điểm cập nhật, trạng thái và phiên bản khóa lạc quan. Tiền lưu bằng số nguyên đồng Việt Nam; số bao hỗ trợ số thập phân có kiểm soát để không mất dữ liệu nếu xưởng bán phần bao.

Các khóa ngoại, unique constraint và check constraint bảo vệ tính toàn vẹn. Tổng doanh thu, công nợ và tồn kho được tính từ các dòng chứng từ hoặc sổ phát sinh; không lưu một ô tổng cho người dùng sửa trực tiếp.

## 8. Tính nhất quán và xử lý lỗi

Các nghiệp vụ nhiều bước chạy trong PostgreSQL transaction. Ví dụ tạo bán sỉ gồm lưu giao dịch, tạo dòng sổ kho, tạo khoản phải thu, ghi phiếu thu ban đầu và audit; hoặc thành công toàn bộ, hoặc rollback toàn bộ.

Mỗi yêu cầu tạo chứng từ có `idempotency_key` duy nhất. Nếu điện thoại gửi lại do mất phản hồi, backend trả về kết quả cũ thay vì tạo bản ghi trùng.

Quy tắc lỗi giao diện:

- Lỗi tại trường nào hiển thị sát trường đó.
- Xung đột do người khác vừa sửa trả về thông báo tải lại dữ liệu, không ghi đè âm thầm.
- Ngày đã khóa trả về thông báo rõ và không ghi dữ liệu.
- Upload ảnh thất bại không làm mất nội dung biểu mẫu; người dùng có thể thử lại.
- Không hiển thị `Đã lưu` trước khi transaction hoàn tất.
- Không xóa vật lý chứng từ đã phát sinh; dùng trạng thái hủy và bút toán đảo.

## 9. Dashboard và cảnh báo

Dashboard ngày hiển thị:

- Số bao sản xuất.
- Số bao bán.
- Doanh thu bán sỉ và bán lẻ.
- Tiền đã thu trong ngày.
- Công nợ phát sinh và tổng công nợ hiện tại.
- Tồn đầu, tồn dự kiến, tồn kiểm kê và chênh lệch.
- Chi phí đã duyệt và chờ duyệt.
- Lợi nhuận tạm tính.
- Trạng thái ngày.

```text
Doanh thu = Tong(so bao x don gia) của tất cả dòng bán sỉ và bán lẻ
Lợi nhuận tạm tính = Doanh thu - Chi phí đã duyệt
```

Cảnh báo ưu tiên:

- Chênh lệch tồn vượt 5%.
- Bán vượt tồn khả dụng.
- Công nợ quá hạn.
- Bán chịu thiếu khách hàng.
- Chi phí chờ duyệt.
- Tổng sản xuất không khớp chi tiết mẻ.
- Số bao, đơn giá hoặc số tiền bất thường so với lịch sử gần đây.
- Ngày trước chưa khóa.

Ngưỡng 5% được lưu trong cài đặt và quản lý có thể thay đổi; lịch sử thay đổi ngưỡng được audit.

## 10. Báo cáo và xuất dữ liệu

Hệ thống xuất các workbook Excel sau:

- Tổng hợp ngày.
- Tổng hợp tháng.
- Chi tiết bán hàng.
- Sản xuất theo ngày, máy và ca.
- Chi phí theo nhóm và trạng thái duyệt.
- Công nợ theo khách hàng, tuổi nợ và lịch sử thanh toán.
- Nhập - xuất - tồn thành phẩm.
- Nhật ký thay đổi.
- Toàn bộ dữ liệu để dự phòng.

Báo cáo tháng tách rõ ngày đã khóa và chưa khóa. Các tổng trong Excel được tạo từ cùng truy vấn/logic với dashboard và có bước đối chiếu tự động trước khi tải xuống.

## 11. Bảo mật và vận hành

- Mọi kết nối dùng HTTPS.
- API xác minh phiên, vai trò, quyền sở hữu bản ghi và trạng thái ngày ở mỗi thao tác.
- Row Level Security được bật trên mọi bảng có thể truy cập qua Supabase Data API.
- Service role chỉ tồn tại ở backend, không gửi xuống trình duyệt.
- Ảnh hóa đơn nằm trong bucket riêng tư và được xem qua signed URL có thời hạn.
- Không ghi PIN, token hoặc bí mật vào log.
- Login có rate limiting; các thao tác nhạy cảm có audit.
- Database sản xuất dùng gói có sao lưu tự động hằng ngày.
- Có quy trình xuất bản sao dữ liệu định kỳ và diễn tập khôi phục.
- Môi trường development, preview và production tách biệt.
- Thay đổi mã nguồn qua Git; bản preview được kiểm tra trước khi đưa lên production.

## 12. Khởi tạo dữ liệu

Không nhập toàn bộ lịch sử từ `QL.xlsx` vì workbook cũ có công thức sai, nguồn công nợ bị đứt và dữ liệu tổng không đáng tin cậy. Chọn một ngày chuyển đổi và nhập số dư mở đầu đã được xác nhận:

- Tồn thành phẩm đầu kỳ.
- Công nợ thực tế theo từng khách hàng.
- Danh sách khách hàng.
- Danh sách máy sản xuất.
- Tài khoản người dùng.
- Cấu hình cảnh báo.

Workbook cũ được lưu chỉ để tham khảo. Số dư mở đầu phải có người nhập, người xác nhận, ngày chốt và ghi chú nguồn.

## 13. Kiểm thử và nghiệm thu

### Kiểm thử tự động

- Unit test cho doanh thu, công nợ, phân bổ phiếu thu, tồn kho, chênh lệch và lợi nhuận.
- Integration test cho transaction bán hàng, hủy chứng từ, duyệt chi và khóa/mở ngày.
- Permission test cho nhân viên, quản lý, quyền sở hữu bản ghi và ngày đã khóa.
- Concurrency test để ngăn bán vượt tồn và ghi đè dữ liệu.
- Idempotency test để ngăn tạo trùng khi gửi lại.
- End-to-end test cho các luồng cốt lõi trên kích thước màn hình điện thoại và máy tính.
- Test xuất Excel và đối chiếu tổng với dashboard.

### Chạy thử tại xưởng

- Tạo môi trường thử nghiệm với dữ liệu giả.
- Hướng dẫn 10 người dùng trên thiết bị thực tế.
- Vận hành song song với Excel trong 7 ngày.
- Đối chiếu từng ngày: sản xuất, bán, thu tiền, công nợ, tồn và chi phí.
- Chỉ chuyển chính thức khi báo cáo khớp và các lỗi nghiêm trọng đã được xử lý.

### Điều kiện nghiệm thu phiên bản đầu

- Nhập và sửa dữ liệu đúng quyền trên điện thoại và máy tính.
- Bán sỉ, bán lẻ, sản xuất, chi phí, phiếu thu và kiểm kê hoạt động xuyên suốt.
- Không tạo chứng từ trùng khi gửi lại.
- Công nợ hỗ trợ trả một phần/nhiều lần và không phân bổ vượt.
- Tồn kho khớp với sổ phát sinh; hủy chứng từ tạo bút toán đảo.
- Ngày khóa không thể bị sửa trái phép.
- Dashboard và báo cáo Excel đối chiếu đúng.
- Nhật ký thay đổi ghi đủ các thao tác quan trọng.
- Backup và quy trình khôi phục đã được kiểm tra.

## 14. Triển khai theo giai đoạn

1. Nền tảng: tài khoản, phân quyền, danh mục, audit và cấu hình.
2. Bán hàng, công nợ và phiếu thu.
3. Sản xuất và tồn thành phẩm.
4. Chi phí và phê duyệt.
5. Đối chiếu, khóa sổ, dashboard và cảnh báo.
6. Báo cáo Excel, backup và kiểm thử hoàn chỉnh.
7. Nhập số dư mở đầu, đào tạo và chạy song song 7 ngày.

Mỗi giai đoạn phải có kiểm thử và dữ liệu demo trước khi chuyển sang giai đoạn kế tiếp.
