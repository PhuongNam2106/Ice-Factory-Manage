# Kiểm thử chấp nhận người dùng (UAT)

Mỗi mục ghi người test, ngày, thiết bị, kết quả và bằng chứng. Chỉ ký go-live khi tất cả mục bắt buộc đạt.

## Tài khoản và phân quyền

- [ ] Nhân viên đăng nhập bằng tên tài khoản/mật khẩu trên điện thoại.
- [ ] Quản lý đăng nhập trên máy tính; nhân viên không mở được quản lý user, duyệt chi, khóa sổ, audit/backup.
- [ ] User bị vô hiệu hóa bị đăng xuất và không vào lại được.

## Một ngày vận hành chuẩn

- [ ] Tồn đầu 100 bao; sản xuất 50 bao.
- [ ] Bán sỉ 30 bao × 7.000 = 210.000 đ, chưa thu tại thời điểm bán.
- [ ] Bán lẻ 20 bao × 12.000 = 240.000 đ và thu đủ.
- [ ] Thu công nợ sỉ 100.000 đ; còn nợ 110.000 đ.
- [ ] Nhập và duyệt chi phí 50.000 đ.
- [ ] Kiểm kê cuối ngày 100 bao, chênh lệch 0.
- [ ] Dashboard: doanh thu 450.000 đ, lợi nhuận tạm tính 400.000 đ, công nợ 110.000 đ.
- [ ] Quản lý xác nhận nguồn sản xuất, khóa ngày và tải được Excel ngày.

## Ngoại lệ và thiết bị

- [ ] Hủy thử một chứng từ ngày mở có lý do; tồn/công nợ đảo đúng và audit có đúng một sự kiện.
- [ ] Không hủy/sửa được ngày đã khóa; version cũ báo xung đột thay vì ghi đè.
- [ ] Màn hình 360 px không tràn ngang; máy tính 1440 px hiển thị bảng và bộ lọc rõ ràng.
- [ ] PWA cài được, manifest/service worker tải được; trang offline xuất hiện khi mất mạng.

## Ký duyệt

| Vai trò | Họ tên | Ngày | Kết quả/chữ ký |
|---|---|---|---|
| Chủ xưởng |  |  |  |
| Quản lý xưởng |  |  |  |
| Người phụ trách kỹ thuật |  |  |  |
