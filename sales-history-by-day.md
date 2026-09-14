# Sales History By Operating Day

## Goal
Cho phép mọi nhân viên xem giao dịch bán hàng của từng ngày vận hành `[20:00, 20:00 hôm sau)` ngay tại màn hình Bán hàng.

## Tasks
- [x] Thêm bộ phân giải ngày được chọn và phép tính ngày trước/ngày sau → Verify: unit test ngày hợp lệ, tương lai và dữ liệu sai.
- [x] Tạo thanh điều hướng ngày thân thiện với điện thoại → Verify: component test cho lịch, ngày trước/ngày sau và nút về hôm nay.
- [x] Cập nhật trang `/sales?day=YYYY-MM-DD`, tiêu đề và trạng thái nhập liệu → Verify: ngày cũ chỉ hiển thị lịch sử, ngày hiện tại vẫn có nút nhập.
- [x] Thêm tổng hợp giao dịch hiệu lực theo loại và doanh thu → Verify: unit/component test loại trừ giao dịch đã hủy.
- [x] Bổ sung E2E cho chuyển ngày và quyền xem của nhân viên → Verify: Playwright chạy trên cơ sở dữ liệu sạch.
- [x] Chạy toàn bộ lint, typecheck, test và build → Verify: tất cả lệnh kết thúc mã 0.

## Done When
- [x] Người dùng xem được mọi ngày không vượt quá ngày vận hành hiện tại.
- [x] Chu kỳ ngày vẫn là 20:00–20:00 theo Asia/Bangkok.
- [x] URL giữ ngày đã chọn và hoạt động với back/forward.
- [x] Quyền sửa/hủy giao dịch không thay đổi.
- [x] Không có migration Supabase mới.

## Notes
- Giữ `supabase/backups/` ngoài Git.
- Khi xem ngày cũ, thay nút nhập bằng nút quay về hôm nay để tránh nhập nhầm ngày.
