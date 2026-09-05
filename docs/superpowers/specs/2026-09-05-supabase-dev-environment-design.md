# Thiết kế môi trường Supabase Dev

**Ngày:** 2026-09-05
**Trạng thái:** Đã thống nhất thiết kế, chờ triển khai
**Phạm vi:** Repo `Ice-Factory-Manage`, Supabase Cloud và cấu hình môi trường Vercel

## 1. Mục tiêu

Tạo một môi trường Supabase Cloud dùng lâu dài để kiểm thử thay đổi trước khi đưa vào nhánh `main` và database production. Môi trường dev phải hỗ trợ đầy đủ Database, Auth, Realtime và dữ liệu thử, nhưng không chứa dữ liệu vận hành thật.

## 2. Kiến trúc môi trường

Hệ thống sử dụng hai Supabase project độc lập trong organization `Ice Factory`:

| Môi trường | Supabase project | Git branch | Vercel | Mục đích |
| --- | --- | --- | --- | --- |
| Development | `Ice Factory Dev` | `dev` và các feature branch | Preview | Kiểm thử migration và chức năng |
| Production | `Ice Factory` | `main` | Production | Vận hành xưởng thực tế |

Project dev được tạo ở region `ap-south-1`, giống production, để giảm khác biệt về cấu hình và hành vi. Theo kết quả kiểm tra tại thời điểm thiết kế, project thứ hai trong organization hiện có chi phí tạo project là `0 USD/tháng`.

Supabase Branching không được sử dụng trong giai đoạn này vì organization đang ở gói Free, trong khi preview branch yêu cầu gói Pro và phát sinh chi phí tài nguyên. Supabase local vẫn được giữ cho integration test tự động nhưng không phải môi trường kiểm thử chung.

## 3. Luồng phát triển và phát hành

```text
Feature branch
      ↓
Merge vào dev
      ↓
Migration → Ice Factory Dev
      ↓
Vercel Preview + kiểm thử nghiệp vụ
      ↓
Pull Request dev → main
      ↓
Cùng migration → Ice Factory (Production)
      ↓
Vercel Production
```

Mọi thay đổi database phải được lưu thành migration trong `supabase/migrations`. Không chỉnh schema production trực tiếp bằng Dashboard hoặc SQL Editor, trừ thao tác khẩn cấp có migration bù ngay sau đó.

Một migration chỉ được áp dụng vào production sau khi đã:

1. Áp dụng thành công trên `Ice Factory Dev`.
2. Chạy kiểm thử liên quan và build production.
3. Chạy Supabase security/performance advisors và đánh giá cảnh báo mới.
4. Kiểm tra đăng nhập bằng cả tài khoản quản lý và nhân viên.
5. Kiểm tra thủ công luồng nghiệp vụ bị ảnh hưởng trên Vercel Preview.
6. Merge Pull Request từ `dev` vào `main`.

Nếu migration thất bại trên dev, sửa bằng migration mới hoặc chỉnh migration chưa phát hành. Không thử migration lỗi trên production.

## 4. Khởi tạo database dev

Project `Ice Factory Dev` bắt đầu rỗng và được dựng bằng toàn bộ migration đã commit trong repo, theo đúng thứ tự tên file. Không sao chép database hoặc backup production sang dev.

Sau migrations, môi trường dev được nạp dữ liệu thử có kiểm soát:

- Tài khoản quản lý: `quanly / 123456`.
- Tài khoản nhân viên: `nhanvien / 123456`.
- Một máy làm nước đá thử nghiệm.
- Một khách hàng thử nghiệm.
- Dữ liệu tồn đầu phục vụ kiểm thử.

Dữ liệu seed phải có tính lặp lại an toàn: chạy lại không tạo bản ghi trùng. Seed dev được tách rõ khỏi dữ liệu production và không được tự động chạy khi phát hành production.

Mật khẩu `123456` chỉ dùng cho môi trường dev. Giao diện dev phải được xem là môi trường thử nghiệm, không cung cấp cho người dùng vận hành thật.

## 5. Cấu hình biến môi trường

Ứng dụng tiếp tục sử dụng các tên biến hiện tại:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_TIME_ZONE=Asia/Bangkok`

Quy tắc phân tách:

- `.env.local` trên máy lập trình trỏ tới `Ice Factory Dev`.
- Vercel Preview trỏ tới `Ice Factory Dev`.
- Vercel Production tiếp tục trỏ tới `Ice Factory`.
- Không commit giá trị khóa vào Git.
- `SUPABASE_SERVICE_ROLE_KEY` không bao giờ dùng tên có tiền tố `NEXT_PUBLIC_` và không được gửi xuống trình duyệt.

Việc thay `.env.local` chỉ thực hiện sau khi project dev đã khỏe, migrations và seed hoàn tất. Trước khi thay, giữ bản sao an toàn của cấu hình hiện tại ngoài Git để có thể khôi phục kết nối production khi cần quản trị.

## 6. Auth và phân quyền

Auth của dev độc lập hoàn toàn với production. UUID, phiên đăng nhập và người dùng production không được sao chép sang dev.

Hai tài khoản seed phải có bản ghi tương ứng trong `auth.users`, `auth.identities` và `public.profiles`, đồng thời tuân thủ cơ chế tên tài khoản hiện tại. Kiểm thử phải chứng minh:

- `quanly` đăng nhập được và truy cập chức năng quản lý.
- `nhanvien` đăng nhập được nhưng bị chặn khỏi chức năng quản lý.
- Người chưa đăng nhập không truy cập được màn hình ứng dụng.
- Các RPC có quyền quản lý vẫn từ chối tài khoản nhân viên.

## 7. Realtime và dữ liệu thử

Realtime trên dev phải được bật giống production. Các trigger Broadcast và quyền channel hiện có được tạo qua migrations, sau đó được kiểm tra bằng ít nhất một luồng Sản xuất trên hai phiên trình duyệt hoặc bằng integration test tương đương.

Dữ liệu thử có thể được xóa hoặc đặt lại mà không cần bảo toàn. Việc reset dev không được tác động tới project production. Trước khi reset phải xác nhận chính xác project ref là của `Ice Factory Dev`.

## 8. Quy trình kiểm thử trước production

Mỗi thay đổi cần qua các lớp kiểm tra sau:

1. Unit test, lint và TypeScript.
2. Build Next.js production.
3. Áp dụng migration vào dev.
4. Supabase advisors và kiểm tra quyền truy cập RPC/RLS liên quan.
5. Smoke test `/api/health`, đăng nhập và chức năng thay đổi.
6. Kiểm tra giao diện trên Vercel Preview bằng điện thoại và máy tính khi thay đổi UI.

Kết quả kiểm thử dev phải được ghi trong Pull Request trước khi merge vào `main`.

## 9. Khôi phục và xử lý lỗi

- Lỗi ứng dụng trên Preview: sửa trên feature branch hoặc `dev`; không merge vào `main`.
- Lỗi migration dev: dừng phát hành, đọc log/advisors và sửa migration trước khi tiếp tục.
- Sai hoặc hỏng dữ liệu dev: reset hoặc nạp lại seed dev.
- Sai biến môi trường Preview: khôi phục URL và publishable key của project dev rồi redeploy Preview.
- Migration đã vào production nhưng gây lỗi: ưu tiên migration tiến để khôi phục tính tương thích; rollback Vercel về commit trước nếu lỗi nằm ở ứng dụng.

## 10. Tiêu chí hoàn thành

Môi trường dev được coi là sẵn sàng khi:

- Project `Ice Factory Dev` ở trạng thái khỏe.
- Tất cả migration trong repo đã được áp dụng đúng thứ tự.
- Seed dev chạy thành công và không tạo trùng khi chạy lại.
- Hai tài khoản thử đăng nhập đúng quyền.
- Realtime của chức năng Sản xuất hoạt động.
- Local app kết nối được dev và `/api/health` trả kết quả tốt.
- Có hướng dẫn cấu hình Vercel Preview dùng khóa dev, tách khỏi Production.
- Production không bị thay đổi dữ liệu hoặc cấu hình trong quá trình thiết lập dev.
