# Thiết kế đăng nhập bằng tên tài khoản và mật khẩu

Ngày thiết kế: 2026-08-12

Trạng thái: Đã được người dùng duyệt phương án ngày 2026-08-12; chờ duyệt tài liệu viết

Phạm vi: Thay thế đăng nhập bằng số điện thoại/mã PIN trong ứng dụng quản lý xưởng nước đá

## 1. Mục tiêu

Người dùng đăng nhập bằng `tên tài khoản` và `mật khẩu`. Số điện thoại không còn là thông tin xác thực; hệ thống chỉ giữ số điện thoại như thông tin liên hệ tùy chọn của nhân viên.

Mật khẩu giữ quy tắc hiện tại: chỉ gồm chữ số và có ít nhất 6 chữ số. Mật khẩu do Supabase Auth lưu và kiểm tra; ứng dụng không lưu mật khẩu dạng đọc được trong `public.profiles`, log hay audit.

Thay đổi này phải giữ nguyên:

- ID người dùng và liên kết tới các chứng từ đã tạo.
- Vai trò `manager` hoặc `employee`.
- Trạng thái hoạt động của tài khoản.
- Cơ chế phiên đăng nhập, kiểm tra hồ sơ hoạt động và Row Level Security hiện có.

## 2. Quy tắc tên tài khoản

Quản lý tự đặt tên tài khoản khi tạo nhân viên. Tên tài khoản:

- dài từ 3 đến 32 ký tự;
- bắt đầu bằng chữ cái hoặc chữ số;
- chỉ gồm chữ cái Latin không dấu viết thường, chữ số, dấu chấm, gạch dưới hoặc gạch ngang;
- không chứa khoảng trắng;
- không phân biệt chữ hoa và chữ thường khi người dùng nhập;
- là duy nhất trong toàn hệ thống;
- không được đổi trong phiên bản này.

Ứng dụng chuẩn hóa đầu vào bằng cách bỏ khoảng trắng ở hai đầu và chuyển về chữ thường. Ví dụ `NhanVien01` trở thành `nhanvien01`. Giá trị không đạt quy tắc sẽ bị từ chối, không tự động bỏ dấu hoặc thay ký tự để tránh tạo tên ngoài ý muốn.

## 3. Kiến trúc xác thực

Supabase Auth hỗ trợ mật khẩu gắn với email hoặc số điện thoại, không có trường tên tài khoản riêng. Ứng dụng vì vậy ánh xạ tên tài khoản sang một email kỹ thuật theo công thức xác định:

```text
<tên-tài-khoản-đã-chuẩn-hóa>@account.icefactory.invalid
```

Ví dụ:

```text
quanly -> quanly@account.icefactory.invalid
```

Tên miền `.invalid` là địa chỉ kỹ thuật không nhận thư. Email này chỉ tồn tại trong Supabase Auth và không xuất hiện trong giao diện, báo cáo hoặc hồ sơ nghiệp vụ. Tài khoản được quản lý tạo bằng Admin API với `email_confirm: true`, vì vậy quy trình không gửi email và không cần cấu hình SMTP. Supabase Email/Password Auth vẫn phải được bật; Phone Provider không cần bật.

Hàm ánh xạ là hàm thuần dùng chung cho đăng nhập, tạo tài khoản, seed và kiểm thử. Ứng dụng không tra cứu công khai tên tài khoản trước khi đăng nhập, nhờ đó không tạo thêm API làm lộ tài khoản nào đang tồn tại.

## 4. Mô hình dữ liệu

`public.profiles` được thay đổi như sau:

- thêm `username text not null`;
- ràng buộc đúng định dạng tên tài khoản;
- ràng buộc duy nhất cho tên đã chuẩn hóa;
- đổi `phone` từ bắt buộc thành nullable.

`profiles.id` tiếp tục tham chiếu `auth.users.id`. Quyền và RLS tiếp tục dựa vào ID này, không dựa vào username, email kỹ thuật hoặc số điện thoại.

Không lưu email kỹ thuật trong `public.profiles` vì email có thể được tái tạo hoàn toàn từ username. Không dùng `user_metadata` để quyết định quyền truy cập.

## 5. Luồng đăng nhập

1. Người dùng nhập tên tài khoản và mật khẩu.
2. Server Action kiểm tra và chuẩn hóa tên tài khoản, đồng thời kiểm tra mật khẩu có ít nhất 6 chữ số.
3. Ứng dụng tạo email kỹ thuật bằng hàm ánh xạ.
4. Supabase gọi `signInWithPassword({ email, password })`.
5. Sau khi xác thực thành công, ứng dụng đọc `profiles` theo `auth.users.id`.
6. Nếu hồ sơ không tồn tại hoặc đã ngừng hoạt động, ứng dụng đăng xuất phiên vừa tạo và từ chối truy cập.
7. Nếu hồ sơ hoạt động, người dùng được chuyển vào trang chính; proxy và server guard hiện có tiếp tục bảo vệ các trang.

Mọi lỗi sai tên tài khoản hoặc mật khẩu dùng cùng thông báo: `Tên tài khoản hoặc mật khẩu không đúng.` Hệ thống không cho biết riêng tên tài khoản có tồn tại hay không. Lỗi cấu hình hoặc lỗi dịch vụ được ghi log ở mức an toàn, không kèm mật khẩu.

## 6. Quản lý tài khoản

Màn hình quản lý người dùng gồm:

- Họ tên.
- Tên tài khoản.
- Số điện thoại liên hệ, không bắt buộc.
- Vai trò.
- Mật khẩu ban đầu gồm ít nhất 6 chữ số.

Khi tạo tài khoản:

1. Server xác nhận người thực hiện là quản lý.
2. Dữ liệu được kiểm tra và chuẩn hóa.
3. Admin API tạo Supabase Auth user bằng email kỹ thuật và mật khẩu.
4. Ứng dụng tạo `profiles` với cùng user ID, username, họ tên, số điện thoại và vai trò.
5. Nếu tạo profile thất bại, ứng dụng xóa Auth user vừa tạo. Nếu hoàn tác cũng thất bại, hệ thống trả lỗi cần đối soát như cơ chế hiện có.

Chức năng `Đặt lại mã PIN` đổi thành `Đặt lại mật khẩu`, nhưng vẫn yêu cầu mật khẩu chỉ gồm ít nhất 6 chữ số. Bật/tắt tài khoản tiếp tục hoạt động như hiện tại.

## 7. Chuyển đổi tài khoản hiện có

Việc chuyển đổi không tạo user ID mới. Migration thêm username và cho phép số điện thoại nullable; bước ứng dụng quản trị sau đó cập nhật email kỹ thuật cho Auth user hiện có.

Quy tắc dữ liệu chuẩn:

- Tài khoản quản lý dùng để kiểm thử hiện tại: username `quanly`, mật khẩu giữ nguyên `123456`.
- Seed cục bộ: quản lý dùng `quanly`, nhân viên dùng `nhanvien`; mật khẩu giữ nguyên `123456`.
- Nếu môi trường từ xa có thêm tài khoản ngoài danh sách đã biết, quá trình chuyển đổi phải dừng và báo danh sách cần gán username; không tự sinh tên khó hiểu hoặc đoán từ họ tên.

Trước khi thay đổi từ xa, hệ thống kiểm tra trước trùng username và kiểm kê đủ cặp `auth.users`/`profiles`. Sau chuyển đổi, kiểm tra lại từng ID, vai trò, trạng thái và khả năng đăng nhập bằng username. Phone Provider vẫn được để tắt.

## 8. Giao diện

Màn hình đăng nhập thay đổi:

- `Số điện thoại` thành `Tên tài khoản`.
- `Mã PIN` thành `Mật khẩu`.
- Gợi ý tên tài khoản: `nhanvien01`.
- Mô tả thành: `Dùng tên tài khoản và mật khẩu của bạn.`
- Bàn phím tên tài khoản dùng chế độ văn bản; mật khẩu vẫn dùng trường password và autocomplete phù hợp.

Màn hình quản lý tài khoản hiển thị username làm định danh chính. Số điện thoại nằm ở dòng thông tin liên hệ và có thể bỏ trống. Giao diện responsive trên điện thoại và máy tính không thay đổi bố cục tổng thể.

## 9. Bảo mật và vận hành

- Service-role key chỉ được dùng trong mã server-only cho thao tác quản trị.
- Trình duyệt chỉ nhận publishable key.
- Không log mật khẩu, email kỹ thuật, access token hoặc refresh token.
- Không dùng username để phân quyền; mọi quyền tiếp tục dựa vào user ID và profile hoạt động.
- Thông báo đăng nhập không phân biệt tài khoản không tồn tại với sai mật khẩu.
- Tận dụng rate limit của Supabase Auth; không xây kho mật khẩu hoặc phiên đăng nhập riêng.
- Không có chức năng tự đăng ký hoặc tự khôi phục mật khẩu bằng email. Quản lý tạo tài khoản và đặt lại mật khẩu.

## 10. Kiểm thử và tiêu chí chấp nhận

### Kiểm thử đơn vị

- Chuẩn hóa username về chữ thường và bỏ khoảng trắng hai đầu.
- Chấp nhận đúng các ký tự được phép và từ chối username quá ngắn, quá dài, có dấu hoặc khoảng trắng.
- Ánh xạ username sang email kỹ thuật ổn định.
- Mật khẩu dưới 6 chữ số hoặc chứa ký tự không phải số bị từ chối.
- Lỗi đăng nhập không làm lộ tài khoản có tồn tại.

### Kiểm thử dịch vụ và tích hợp

- Tạo Auth user bằng email kỹ thuật rồi tạo đúng một profile.
- Username trùng bị từ chối và không để lại Auth user mồ côi.
- Profile tạo lỗi sẽ kích hoạt hoàn tác Auth user.
- Đặt lại mật khẩu cập nhật đúng Auth user.
- Tài khoản không hoạt động bị đăng xuất sau khi xác thực.
- RLS và vai trò giữ nguyên sau migration.

### Kiểm thử end-to-end

- `quanly` / `123456` đăng nhập được và thấy chức năng quản lý.
- `nhanvien` / `123456` đăng nhập được nhưng không truy cập trang quản lý.
- Số điện thoại cũ không còn được giao diện chấp nhận làm tên đăng nhập.
- Sai mật khẩu hiển thị thông báo chung.
- Quản lý tạo một tài khoản mới, đăng xuất, rồi đăng nhập thành công bằng username vừa tạo.

Thay đổi được chấp nhận khi toàn bộ kiểm thử, lint, typecheck và production build đều đạt; xác minh trực tiếp trên Supabase development project thành công; và không còn mã giao diện/nghiệp vụ nào gọi đăng nhập bằng phone.

## 11. Ngoài phạm vi

- Mật khẩu chữ và ký tự đặc biệt.
- Người dùng tự đổi hoặc tự khôi phục mật khẩu.
- Đổi username sau khi tạo.
- Đăng ký tài khoản công khai.
- Gửi email xác nhận hoặc email khôi phục.
- Đăng nhập đồng thời bằng cả username và số điện thoại.
