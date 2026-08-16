# Backup và diễn tập phục hồi

## Chính sách đề xuất

| Hạng mục | Tần suất | Người chịu trách nhiệm |
|---|---:|---|
| Supabase managed backup | Hằng ngày | Người phụ trách kỹ thuật (điền tên trước go-live) |
| Application export JSON + CSV | Hằng tuần | Quản lý xưởng (điền tên trước go-live) |
| Kiểm tra tải được một báo cáo XLSX | Hằng tuần | Quản lý xưởng |
| Restore drill vào project non-production | Hằng tháng | Kỹ thuật + quản lý xưởng |

Mục tiêu đề xuất: RPO 24 giờ, RTO 4 giờ. Chủ xưởng phải phê duyệt hoặc thay đổi hai con số này trước go-live.

## Tạo bằng chứng backup

1. Quản lý vào `/reports`, tải “Bản sao lưu JSON + CSV”.
2. Lưu file trong kho mã hóa, không gửi qua nhóm chat công cộng.
3. Ghi checksum SHA-256, thời điểm, project, người thực hiện và thời gian giữ file.
4. Kiểm tra Supabase Dashboard xác nhận managed backup thành công. Application export không thay thế backup database/Auth.

## Restore drill hằng tháng

1. Tạo/chọn project Supabase non-production trống, đúng major PostgreSQL và không dùng service-role production trong app Preview.
2. Phục hồi backup database theo công cụ của gói Supabase; áp dụng các migration còn thiếu từ repository.
3. Tạo lại redirect URL và secret riêng của môi trường drill.
4. Xác minh tối thiểu: số user active; số khách/máy; các chứng từ nguồn; số dư tồn; tổng công nợ; một báo cáo XLSX ngày đã khóa.
5. So sánh tổng với biên bản backup. Không đạt bất kỳ mục nào thì drill thất bại và chưa được phép xóa môi trường bằng chứng.
6. Lưu ảnh/kết quả truy vấn, checksum, thời gian restore và người ký tại thư mục vận hành được phân quyền.

## Sự cố thật

- Dừng nhập liệu và ghi mốc thời gian sự cố.
- Không restore đè lên project đang hỏng. Restore vào project mới, đối soát, đổi secret/URL rồi mới chuyển traffic.
- Đổi toàn bộ service-role key đã có khả năng lộ và thu hồi phiên không cần thiết.
- Sau phục hồi, đối chiếu từ bản ghi cuối trước sự cố đến thời điểm mở lại.
