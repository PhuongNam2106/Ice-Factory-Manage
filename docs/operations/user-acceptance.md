# Kiểm thử chấp nhận người dùng (UAT)

Mỗi mục ghi người test, ngày, thiết bị, kết quả và bằng chứng. Chỉ ký go-live khi tất cả mục bắt buộc đạt.

## Tài khoản và phân quyền

- [ ] Nhân viên đăng nhập bằng tên tài khoản/mật khẩu trên điện thoại.
- [ ] Quản lý đăng nhập trên máy tính; nhân viên không mở được quản lý user, duyệt chi, khóa sổ, audit/backup.
- [ ] User bị vô hiệu hóa bị đăng xuất và không vào lại được.

## Một ngày vận hành chuẩn

- [ ] Mỗi máy có nhật ký riêng; Bắt đầu/Xả đá/Tắt máy ghi đúng giờ máy chủ và đúng người thực hiện.
- [ ] Sau Xả đá, nút Xả bị khóa kèm lý do cho tới khi nhập số bao; nhập `0` vẫn được ghi nhận hợp lệ.
- [ ] Sau 30 phút chưa nhập số bao có nhắc; không tự bật màn hình nhập ngay khi xả.
- [ ] Tồn đầu 100 bao; sản xuất 50 bao chỉ dùng để theo dõi năng suất, không tự cộng vào tồn kho.
- [ ] Bán sỉ 30 bao × 7.000 = 210.000 đ, chưa thu tại thời điểm bán.
- [ ] Bán lẻ 20 bao × 12.000 = 240.000 đ và thu đủ.
- [ ] Thu công nợ sỉ 100.000 đ; còn nợ 110.000 đ.
- [ ] Nhập và duyệt chi phí 50.000 đ.
- [ ] Kiểm kê cuối ngày 50 bao, chênh lệch 0.
- [ ] Dashboard: doanh thu 450.000 đ, lợi nhuận tạm tính 400.000 đ, công nợ 110.000 đ.
- [ ] Quản lý sửa được giờ, xem lịch sử trước/sau, khóa/mở ngày sản xuất và tải được Excel năng suất.

## Ngoại lệ và thiết bị

- [ ] Hủy thử một chứng từ ngày mở có lý do; tồn/công nợ đảo đúng và audit có đúng một sự kiện.
- [ ] Không hủy/sửa được ngày đã khóa; version cũ báo xung đột thay vì ghi đè.
- [ ] Màn hình 360 px không tràn ngang; máy tính 1440 px hiển thị bảng và bộ lọc rõ ràng.
- [ ] PWA cài được, manifest/service worker tải được; trang offline xuất hiện khi mất mạng.
- [ ] Khi mất mạng hoặc Realtime chưa sẵn sàng, nút ghi bị khóa và có thông báo nguyên nhân; dữ liệu đang xem vẫn còn.
- [ ] Trước 20:00 dữ liệu vẫn mang nhãn ngày sản xuất hôm trước; 18:00–20:00 không bắt đầu phiên mới.

## Ký duyệt

| Vai trò | Họ tên | Ngày | Kết quả/chữ ký |
|---|---|---|---|
| Chủ xưởng |  |  |  |
| Quản lý xưởng |  |  |  |
| Người phụ trách kỹ thuật |  |  |  |
