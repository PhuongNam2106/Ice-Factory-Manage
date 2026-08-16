# Chuyển đổi sạch từ QL.xlsx

## Nguyên tắc

- Chốt một ngày/giờ cutoff có chữ ký của chủ xưởng, người chuẩn bị và người duyệt.
- Giữ `QL.xlsx` ở chế độ chỉ đọc để tra cứu. Không nhập giao dịch cũ, công thức hoặc macro vào hệ thống mới.
- Chỉ chuyển: user, khách hàng, máy, thiết lập, tồn thành phẩm đầu kỳ và công nợ khách hàng đầu kỳ.
- Mọi số dư phải có người chuẩn bị, người duyệt và ghi chú nguồn.

## Trình tự

1. Trước cutoff: làm sạch tên tài khoản, khách trùng và mã máy; chạy UAT.
2. Tại cutoff: ngừng sửa Excel, sao lưu file và ghi checksum; kiểm kê bao thực tế, ký công nợ từng đầu mối.
3. Tạo user bằng tên tài khoản/mật khẩu tạm, buộc bàn giao riêng từng người; không dùng chung tài khoản.
4. Nhập khách, máy và settings; đối chiếu số dòng với danh sách đã ký.
5. Chỉ nhập tồn đầu kỳ sau khi RPC/migration `import_opening_stock` đã được bổ sung, review và diễn tập; không tạo sản lượng giả.
6. Chỉ nhập công nợ đầu kỳ sau khi RPC/migration `import_opening_receivable` đã được bổ sung, review và diễn tập; không tạo đơn bán giả vì sẽ làm sai doanh thu và kho.
7. Chạy báo cáo ngày đầu, đối chiếu tồn/công nợ, rồi mới cho nhân viên nhập giao dịch mới.

## Blocker phải xử lý trước go-live

Ứng dụng hiện chưa có UI/RPC an toàn để nhập tồn thành phẩm đầu kỳ hoặc công nợ đầu kỳ. Vì vậy chưa được tự ý chèn trực tiếp database, tạo sản lượng giả hay tạo đơn hàng giả.

Trước cutover thật phải bổ sung và diễn tập `import_opening_stock` và `import_opening_receivable`. Hai cơ chế này phải chỉ cho quản lý sử dụng, idempotent, có audit, ghi nguồn/người chuẩn bị/người duyệt, và không làm tăng sản lượng hay doanh thu. Nếu một hoặc cả hai số dư bằng 0, có thể bỏ qua cơ chế tương ứng sau khi ghi rõ số dư 0 và hai người ký xác nhận.

## Biên bản số dư

| Loại | Tổng/số dòng | Người chuẩn bị | Người duyệt | Nguồn/chứng từ | Kết quả đối soát |
|---|---:|---|---|---|---|
| User active |  |  |  | Danh sách nhân sự |  |
| Khách hàng |  |  |  | QL.xlsx chỉ đọc |  |
| Máy |  |  |  | Danh sách thiết bị |  |
| Tồn đầu kỳ (bao) |  |  |  | Biên bản kiểm kê |  |
| Công nợ đầu kỳ (VNĐ) |  |  |  | Xác nhận từng đầu mối |  |

## Tiêu chí mở hệ thống

- Tổng tồn và công nợ khớp biên bản; user thử đăng nhập thành công.
- Supabase/Vercel đúng môi trường, backup và rollback sẵn sàng.
- Chủ xưởng ký “mở nhập liệu”; sau thời điểm này Excel chỉ dùng tra cứu.
