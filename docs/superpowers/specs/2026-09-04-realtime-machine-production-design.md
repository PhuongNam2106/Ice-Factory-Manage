# Thiết kế theo dõi sản xuất theo thời gian thực

Ngày thiết kế: 2026-09-04

Trạng thái: Đã được người dùng chấp thuận triển khai theo phương án A

Phạm vi: Thay thế toàn bộ luồng sản xuất theo mẻ/tổng ca bằng theo dõi trạng thái và năng suất từng máy

## 1. Mục tiêu

Trang `Sản xuất` phải cho nhân viên vận hành từng máy ngay trên điện thoại hoặc máy tính bằng bốn thao tác: **Bắt đầu chạy**, **Xả đá**, **Tắt máy** và **Nhập số bao**. Mọi thời điểm nghiệp vụ lấy từ PostgreSQL, mọi thay đổi được đồng bộ gần thời gian thực tới các thiết bị đang mở, và nhật ký được hiển thị riêng cho từng máy.

Chức năng này chỉ theo dõi hoạt động và năng suất máy. Số bao sản xuất không tạo bút toán tồn kho, không quyết định lượng hàng có thể bán và không tạo điều kiện bắt buộc cho khóa sổ tài chính/tồn kho.

## 2. Quy ước ngày sản xuất

- Múi giờ nghiệp vụ là `Asia/Bangkok`.
- Một ngày sản xuất mang nhãn ngày bắt đầu, từ 20:00 ngày đó đến 18:00 ngày kế tiếp.
- Từ 00:00 đến trước 20:00, màn hình mặc định vẫn mở ngày sản xuất bắt đầu từ ngày hôm trước. Từ 20:00 trở đi, màn hình mặc định chuyển sang ngày hiện tại.
- Chỉ cho bắt đầu phiên chạy mới trong cửa sổ 20:00–18:00.
- Khoảng 18:00–20:00 không cho bắt đầu phiên mới, nhưng vẫn cho xả đá, nhập/sửa số bao và tắt máy đối với dữ liệu đang hoạt động.
- Phiên đã bắt đầu không tự dừng lúc 18:00. Mọi lần xả của phiên tiếp tục thuộc ngày sản xuất mà phiên đã bắt đầu.
- Phiên chạy qua 18:00 hiển thị cảnh báo quá giờ. Phiên chạy qua 20:00 hiển thị cảnh báo nghiêm trọng nhưng không tự chia phiên hoặc đổi ngày.
- `production_days` là phạm vi khóa độc lập với `operating_days`. Khóa ngày sản xuất không khóa bán hàng, tồn kho hoặc tài chính và ngược lại.

## 3. Trạng thái nghiệp vụ

### 3.1 Trạng thái máy

- Máy dừng khi không có `machine_run` nào chưa có `stopped_at`.
- Nhấn **Bắt đầu chạy** tạo một `machine_run`; nút này bị vô hiệu hóa cho đến khi phiên được tắt.
- Nhấn **Tắt máy** đặt `stopped_at` và `stopped_by` cho phiên đang mở, sau đó cho phép bắt đầu phiên mới khi thời gian nằm trong cửa sổ cho phép.
- Một máy có thể có nhiều phiên chạy trong cùng ngày sản xuất nhưng chỉ có tối đa một phiên đang mở.
- Nhân viên bất kỳ đang hoạt động được tiếp tục thao tác trên phiên do người khác bắt đầu; từng hành động vẫn ghi đúng người thực hiện.

### 3.2 Trạng thái xả đá

- Chỉ được xả khi máy đang chạy.
- Nhấn **Xả đá** tạo một `machine_harvest` với giờ máy chủ và chưa có `bag_quantity`.
- Mỗi máy chỉ được có tối đa một lần xả chưa nhập số bao, kể cả lần xả đó thuộc phiên đã tắt hoặc ngày sản xuất trước.
- Khi còn lần xả chưa nhập số bao, nút **Xả đá** bị khóa và giao diện giải thích rõ nguyên nhân.
- Lần xả chưa nhập không ngăn Tắt máy hoặc Bắt đầu lại máy trong khung giờ hợp lệ.
- Số bao là số nguyên không âm; `0` là hợp lệ và phải được làm nổi bật để tránh bị hiểu là chưa nhập.
- Sau khi nhập số bao, máy vẫn tiếp tục chạy; chỉ thao tác Tắt máy mới đóng phiên.

### 3.3 Nhắc nhập số bao

- Không tự mở biểu mẫu ngay sau khi xả vì cần thời gian tổng kết.
- Giao diện hiển thị thời gian đã trôi qua từ lúc xả.
- Sau ngưỡng cấu hình, mặc định 30 phút, lần xả được đánh dấu “Đã đến lúc nhập số bao”.
- Hệ thống vẫn cho nhập sớm hơn 30 phút; ngưỡng chỉ là lời nhắc, không phải khóa nghiệp vụ.
- Phiên bản đầu chỉ có nhắc trong ứng dụng, không gửi push notification.

## 4. Mô hình dữ liệu

### `production_days`

- `id bigint identity` làm khóa chính.
- `production_date date` duy nhất, là ngày nhãn.
- `starts_at`, `ends_at` là `timestamptz` và phải đúng cửa sổ 20:00–18:00 theo `Asia/Bangkok`.
- `status` gồm `open`, `locked`.
- `locked_at`, `locked_by`, `reopened_at`, `reopened_by` lưu vòng đời khóa.

### `machine_runs`

- `id bigint identity`.
- `machine_id`, `production_day_id` là khóa ngoại có index.
- `started_at`, `started_by`, `stopped_at`, `stopped_by`.
- Partial unique index trên `machine_id where stopped_at is null` bảo đảm mỗi máy chỉ có một phiên mở.
- Check constraint bảo đảm `stopped_at > started_at` và metadata tắt máy đầy đủ theo cặp.

### `machine_harvests`

- `id bigint identity`.
- `machine_id`, `machine_run_id` là khóa ngoại có index.
- `harvested_at`, `harvested_by`.
- `bag_quantity bigint null`, `quantity_updated_at`, `quantity_updated_by`.
- Partial unique index trên `machine_id where bag_quantity is null` bảo đảm mỗi máy chỉ có một lần xả chờ nhập.
- Check constraint bảo đảm số bao không âm và metadata số lượng đầy đủ theo cặp.

### `machine_harvest_revisions`

- Lưu `harvest_id`, `old_quantity`, `new_quantity`, `changed_at`, `changed_by` cho mỗi lần nhập hoặc sửa số bao.
- Dòng lịch sử là bất biến đối với người dùng ứng dụng.

### `production_action_requests`

- Khóa chính là UUID do trình duyệt sinh cho từng lần bấm.
- Lưu `actor_id`, `operation`, `machine_id`, `result` và thời điểm tạo.
- Cùng một người gửi lại cùng `request_id` sẽ nhận lại kết quả cũ, không tạo hành động trùng.

### Audit

- Tái sử dụng `audit_log` hiện có cho thao tác quản trị: thêm hành động bị bỏ sót, sửa giờ và sửa số lượng.
- Audit lưu dữ liệu trước/sau, người thực hiện và thời điểm. Không bắt buộc nhập lý do cho chỉnh sửa sản xuất.

## 5. Transaction và phân quyền

Các thao tác ghi chỉ đi qua RPC giao dịch trong PostgreSQL; trình duyệt không được ghi trực tiếp vào bảng sản xuất.

- RPC xác minh `auth.uid()` thuộc một `profile` đang hoạt động.
- Bắt đầu/xả/tắt/nhập số bao: nhân viên hoặc quản lý đang hoạt động.
- Sửa số bao: người đã nhập số lượng gần nhất hoặc quản lý, khi ngày sản xuất còn mở.
- Thêm hành động bỏ sót, sửa thời điểm, khóa và mở lại ngày sản xuất: chỉ quản lý.
- Ngày sản xuất đã khóa chỉ đọc. Muốn sửa phải mở lại trước.
- Mỗi RPC lấy `clock_timestamp()` tại database, giữ transaction-level advisory lock theo `machine_id`, kiểm tra trạng thái rồi mới ghi.
- Các thao tác quản trị sửa thời điểm phải kiểm tra lại toàn bộ thứ tự: bắt đầu < các lần xả < tắt máy, không chồng hai phiên của cùng máy và mỗi lần xả phải nằm trong phiên tương ứng.
- RPC trả mã lỗi ổn định để giao diện giải thích: máy đã chạy, máy chưa chạy, còn lần xả chờ nhập, ngoài giờ bắt đầu, ngày đã khóa, mất quyền hoặc dữ liệu vừa thay đổi.

Các bảng trong `public` bật RLS. Người dùng đang hoạt động được đọc dữ liệu sản xuất; quyền ghi trực tiếp bị thu hồi. Các RPC đặc quyền phải đặt `search_path = ''`, tự kiểm tra danh tính/quyền và chỉ cấp `execute` cho `authenticated`/`service_role` khi cần.

## 6. Realtime và trạng thái kết nối

- Trigger sau thay đổi trên `machine_runs` và `machine_harvests` gọi `realtime.broadcast_changes()` vào private topic `production:machines`.
- Chỉ tài khoản xác thực và đang hoạt động được phép nhận broadcast thông qua policy trên `realtime.messages`.
- Client gọi `supabase.realtime.setAuth()`, đăng ký private channel và tải lại snapshot từ server khi nhận sự kiện. Payload broadcast chỉ dùng làm tín hiệu; snapshot từ database vẫn là nguồn sự thật.
- Khi kết nối lại, client tải lại toàn bộ danh sách máy của ngày đang xem để bù sự kiện bị lỡ.
- Khi `navigator.onLine` là false hoặc channel chưa đồng bộ, các nút ghi bị khóa và hiển thị nguyên nhân. Dữ liệu đã tải vẫn được xem.
- Không xếp hàng thao tác ghi khi offline vì thời điểm và thứ tự hành động phải do server quyết định.

## 7. Giao diện

### Trang chính `/production`

- Header hiển thị ngày sản xuất, cửa sổ 20:00–18:00, trạng thái mở/khóa và kết nối realtime.
- Bộ chọn ngày cho phép xem lịch sử; ngày cũ mặc định chỉ đọc.
- Danh sách máy dùng một card riêng cho từng máy. Trên điện thoại là một cột; màn hình rộng là lưới hai cột.
- Mỗi card hiển thị tên/mã máy, trạng thái, thời gian chạy hiện tại, lần xả gần nhất, tổng bao và bốn thao tác.
- Bắt đầu, Xả và Tắt đều có hộp xác nhận. Nút đang gửi bị khóa để ngăn bấm lặp.
- **Nhập số bao** mở vùng nhập ngay trong card cho lần xả đang chờ, không điều hướng trang.
- Mỗi máy có nhật ký riêng, mới nhất trước. Lần xả đã nhập hiển thị cùng một dòng, ví dụ: `22:10 · Xả đá / 42 bao · cập nhật lúc 22:43 bởi A`.
- Lỗi giữ nguyên ngữ cảnh của card và có nội dung hành động được, không chỉ báo “Có lỗi”.

### Quản lý

- Có thể khóa ngày khi không còn máy đang chạy và không còn lần xả chờ nhập.
- Có thể mở lại ngày đã khóa.
- Có bảng điều chỉnh cho phép thêm Bắt đầu/Xả/Tắt bị bỏ sót hoặc sửa thời điểm bằng thời gian tuyệt đối.
- Có lịch sử sửa đổi chi tiết. Nhân viên chỉ xem nhật ký vận hành thông thường.

## 8. Báo cáo năng suất

Trang sản xuất có tổng hợp theo khoảng ngày, so sánh từng máy bằng:

- Tổng số bao.
- Số lần xả đã có số lượng.
- Số lần xả chờ nhập.
- Trung bình bao trên một lần xả.
- Tổng thời gian chạy.
- Thời gian dừng trong cửa sổ sản xuất.
- Khoảng thời gian trung bình giữa các lần xả.
- Trạng thái hiện tại và lần xả mới nhất.

Báo cáo Excel sản xuất chuyển sang dữ liệu phiên chạy/lần xả. Dashboard có thể hiển thị tổng bao theo dõi theo `production_date`, nhưng con số này không đi vào công thức tồn kho hoặc điều kiện khóa sổ tài chính.

## 9. Thay thế dữ liệu cũ

Migration mới thực hiện theo transaction và đúng thứ tự phụ thuộc:

1. Thay các view/function báo cáo và khóa sổ đang tham chiếu mô hình cũ.
2. Xóa các dòng `inventory_ledger` được sinh từ đối soát sản xuất cũ và các dòng đảo tương ứng.
3. Xóa dữ liệu rồi drop `production_source_selections`, `production_shift_totals`, `production_batches` cùng RPC/trigger chỉ phục vụ chúng.
4. Tạo mô hình sản xuất mới, indexes, RLS, RPC, audit và realtime trigger.
5. Giữ nguyên `machines`, người dùng, khách hàng, bán hàng, phiếu thu/công nợ, chi phí và kiểm kê.

Không nhập lại hoặc chuyển đổi lịch sử sản xuất cũ theo quyết định của người dùng. Trước khi áp dụng lên Supabase Cloud phải truy vấn số dòng và xác minh chính xác các bảng/bút toán sắp xóa.

## 10. Kiểm thử và nghiệm thu

- Unit test cho cách xác định ngày sản xuất, trạng thái nút, nhắc 30 phút, thời lượng và chỉ số năng suất.
- Integration test cho mọi RPC, idempotency, quyền hạn, ngày khóa, 0 bao và các thao tác cạnh tranh trên cùng máy.
- Integration test chứng minh số bao không tạo hoặc thay đổi `inventory_ledger`.
- Realtime test xác nhận trigger phát tín hiệu và client tải lại snapshot.
- Component test cho từng machine card, xác nhận hành động, lý do nút bị khóa, nhập số bao và trạng thái mất mạng.
- Playwright kiểm tra luồng chính trên viewport điện thoại và máy tính.
- Chạy đầy đủ `test`, `lint`, `typecheck` và `build` trước bàn giao.

## 11. Ngoài phạm vi phiên bản này

- Push notification.
- Điều khiển máy vật lý hoặc đọc cảm biến tự động.
- Nhập thao tác khi offline rồi đồng bộ sau.
- Quản lý nguyên liệu, điện năng hoặc bảo trì máy.
- Tự động cộng sản lượng vào kho thành phẩm.
