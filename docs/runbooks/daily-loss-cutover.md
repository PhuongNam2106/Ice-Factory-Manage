# Runbook chuyển sang đối soát hao hụt hằng ngày

## Phạm vi và quy tắc an toàn

- Nhánh ứng dụng dùng để thử nghiệm là `dev`.
- Supabase Dev có project ref `ycjzkesuvkyuuyptpzhb`.
- Supabase Production có project ref `mqclrhhatdkghvdebbyq` và không được nhận `supabase/seed.sql`.
- Ngày vận hành là khoảng nửa mở `[20:00 ngày D, 20:00 ngày D+1)` theo `Asia/Bangkok`.
- Không xóa các bảng cũ `stock_counts` và `inventory_ledger`; chúng được giữ để tra cứu và sao lưu.

## Cutover Supabase Dev và Vercel Preview

1. Xác nhận repo đang ở nhánh `dev` và `supabase/.temp/project-ref` bằng `ycjzkesuvkyuuyptpzhb`.
2. Nếu Dev đang có dữ liệu nhập tay cần giữ, tải bản sao lưu trước khi seed.
3. So sánh migration local/remote bằng `corepack pnpm exec supabase migration list`.
4. Áp migration và seed chỉ vào Dev bằng `corepack pnpm exec supabase db push --include-seed`.
5. Chạy lại `migration list`; toàn bộ migration `20260906` phải có cả cột local và remote.
6. Chạy `corepack pnpm db:types`, toàn bộ test, lint, typecheck và build.
7. Cấu hình Vercel Preview bằng URL/publishable key/service-role key của Supabase Dev, cùng `APP_TIME_ZONE=Asia/Bangkok`.
8. Deploy nhánh `dev`, sau đó chạy smoke với `EXPECTED_SUPABASE_HOST=ycjzkesuvkyuuyptpzhb.supabase.co`.
9. Kiểm tra bằng trình duyệt: nhập nhanh giờ hiện tại, nhập muộn lúc 19:50, nhập đúng 20:00, sản xuất, bán hàng, chi phí, hao hụt, xác nhận quản lý, khóa sổ, kế thừa tồn và tải Excel.

Seed Dev đặt cutover tại `2026-09-05 20:00 Asia/Bangkok`, ngưỡng cảnh báo `5%`, và tạo hai ngày thử `2026-09-05`/`2026-09-06`. Seed chỉ phục vụ Dev/test.

## Cutover Production

1. Tạo và kiểm tra bản sao lưu Production trước mọi thay đổi.
2. Chọn một mốc 20:00 Bangkok trong tương lai, khi xưởng có người phụ trách theo dõi.
3. Xác nhận CLI đang liên kết đúng Production trước khi áp migration. Không dùng `--include-seed` và không chạy `supabase/seed.sql`.
4. Áp migration, sau đó cập nhật duy nhất `settings.id = true` với `operating_day_cutover_at` bằng mốc đã chọn và `loss_warning_pct = 5`.
5. Deploy đúng phiên bản ứng dụng đã được chấp nhận trên Preview.
6. Tại ngày đầu tiên sau cutover, nhập tồn đầu thủ công và tồn cuối qua màn hình Hao hụt; các ngày sau phải kế thừa tồn từ ngày trước đã khóa.
7. Theo dõi trọn một chu kỳ 24 giờ: xả đá/số bao, bán sỉ/lẻ, chi phí, dashboard, cảnh báo, xác nhận vượt ngưỡng, khóa sổ và báo cáo.
8. Chỉ xác nhận hoàn tất sau khi số liệu 19:59:59 vẫn thuộc ngày cũ và đúng 20:00:00 thuộc ngày mới.

## Dừng hoặc rollback

- Nếu smoke hoặc đối chiếu thất bại trước khi cutover Production, dừng deploy và sửa trên `dev`.
- Nếu ứng dụng lỗi sau deploy, rollback deployment Vercel về bản ổn định gần nhất.
- Không rollback bằng cách xóa bảng mới, sửa migration đã áp hoặc viết lại ngày vận hành cũ.
- Giữ dữ liệu đã ghi, thu thập log/audit và chỉ chạy migration sửa lỗi mới sau khi đã kiểm thử trên Dev.

## Lệnh xác minh

```powershell
corepack pnpm exec supabase migration list
corepack pnpm db:types
corepack pnpm test
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
$env:EXPECTED_SUPABASE_HOST='ycjzkesuvkyuuyptpzhb.supabase.co'
corepack pnpm smoke -- 'https://<preview-url>'
Remove-Item Env:EXPECTED_SUPABASE_HOST
```
