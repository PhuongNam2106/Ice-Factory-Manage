# Triển khai và rollback

## Phạm vi và trách nhiệm

- Chủ dự án thực hiện kết nối Git và deploy Vercel.
- Thay đổi database chỉ đi qua migration đã commit; áp dụng bằng Supabase MCP hoặc CLI trong một cửa sổ bảo trì có ghi nhận.
- Không đưa `SUPABASE_SERVICE_ROLE_KEY` vào biến `NEXT_PUBLIC_*`, log, ảnh chụp hay preview dùng chung.

## Trạng thái vùng hiện tại

- `vercel.json` ghim Serverless Functions ở Singapore (`sin1`).
- Supabase Cloud hiện tại ở `ap-south-1` (India), không phải Singapore.
- Trước go-live phải chọn và ký xác nhận một trong hai: chấp nhận độ trễ India sau khi đo thực tế, hoặc tạo dự án Supabase Singapore mới rồi diễn tập migrate/restore. Không được ghi checklist là “cùng vùng Singapore” khi chưa thực hiện việc này.

## Chuẩn bị Vercel

1. Import repository, chọn branch production là `main` và framework Next.js.
2. Khai báo cho Production và Preview: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_TIME_ZONE=Asia/Bangkok`.
3. Preview nên dùng dự án Supabase riêng. Tuyệt đối không sao chép service-role key production sang Preview.
4. Chạy `pnpm verify:env -- --production` trong môi trường có đủ biến.
5. Cấu hình custom domain, HTTPS và redirect URL trong Supabase Auth. Hệ thống dùng tên tài khoản/mật khẩu; email kỹ thuật nội bộ không hiển thị cho nhân viên.

## Quy trình phát hành

1. Prepare: CI xanh, migration đã review, UAT ký, không còn blocker trong `cutover.md`.
2. Backup: xác nhận backup gần nhất và tải application export do quản lý thực hiện.
3. Database: áp dụng migration theo thứ tự, rồi chạy advisor Security/Performance; dừng nếu có lỗi Critical/Error mới.
4. App: chủ dự án deploy Preview, chạy `pnpm smoke -- <preview-url>`, sau đó mới promote Production.
5. Verify: đăng nhập tài khoản smoke, mở dashboard, tải báo cáo ngày và kiểm tra log lỗi trong 5, 15 và 60 phút đầu.
6. Confirm: ghi commit, deployment URL, người duyệt và kết quả smoke vào biên bản phát hành.

## Điều kiện rollback

- Rollback ngay nếu không đăng nhập được, sai doanh thu/tồn/công nợ, ghi trùng chứng từ, hoặc lỗi diện rộng.
- App: redeploy commit Vercel xanh gần nhất.
- Database: không chạy migration ngược phá hủy dữ liệu. Nếu migration mới chỉ bổ sung tương thích thì giữ schema và rollback app; nếu dữ liệu hỏng, cô lập production và restore sang dự án mới theo `backup-restore.md`.
- Sau rollback, khóa nhập liệu, ghi thời điểm/sự cố và chỉ mở lại khi đối soát hoàn tất.

## Chuyển đổi màn hình sản xuất thời gian thực

Migration `20260904054132_realtime_machine_production.sql` thay hoàn toàn dữ liệu sản xuất theo mẻ/ca. Trước khi chạy phải xuất backup và đối chiếu số dòng của `production_batches`, `production_shift_totals`, `production_source_selections` cùng các dòng ledger có nguồn `production_*`.

Migration xóa dữ liệu sản xuất cũ và các bút toán tồn kho do luồng sản xuất cũ tạo; dữ liệu bán hàng, thu tiền, công nợ, chi phí, khách hàng và người dùng được giữ nguyên. Sau khi chạy, Supabase Realtime phải cho phép private Broadcast topic `production:machines`; chạy security/performance advisors và smoke test Bắt đầu → Xả đá → Số bao → Tắt máy trước khi mở cho nhân viên.

## Smoke test

Thiết lập `SMOKE_USERNAME` và `SMOKE_PASSWORD` cho một tài khoản active chỉ dùng kiểm tra, rồi chạy:

```powershell
pnpm smoke -- https://preview.example.com
```

Script chỉ đọc trang login, manifest và service worker, sau đó gửi tài khoản smoke tới `/api/health` của chính bản Preview. Endpoint này đăng nhập bằng cấu hình Supabase đã được deploy cùng Preview và đọc bảng `settings` qua RLS, nên không thể vô tình kiểm tra project lấy từ biến môi trường của máy chạy script. Vùng Supabase vẫn phải được đối chiếu trực tiếp trong Dashboard vì response công khai không chứng minh đáng tin cậy vị trí project.
