# Nhiệm vụ: Nâng cấp toàn bộ Frontend Ice Factory Manage

## 1. Repo và nhánh làm việc

- Repo: `D:\Ice Factory\Ice-Factory-Manage`
- Làm trực tiếp trong repo này, không tạo hoặc làm trong `.worktrees`.
- Nhánh hiện tại: `dev`
- Working tree đang sạch tại thời điểm bàn giao.
- Commit gần nhất: `3782204 docs: record dev preview handoff`
- Không merge vào `main`, không deploy Production và không thay đổi Supabase Production nếu chưa được người dùng yêu cầu.

Trước khi sửa:

```powershell
cd "D:\Ice Factory\Ice-Factory-Manage"
git status
git branch --show-current
```

## 2. Tổng quan dự án

Đây là PWA quản lý một xưởng sản xuất nước đá lạnh, không phải xưởng đá xây dựng.

Quy mô hiện tại:

- Một xưởng.
- Khoảng 10 nhân viên.
- Dùng trên cả điện thoại và máy tính.
- Thành phẩm tính theo đơn vị `bao`.
- Người dùng tự nhập giá bán theo từng giao dịch.
- Có bán sỉ cho đầu mối và bán lẻ.
- Mọi nhân viên đang hoạt động đều có thể nhập dữ liệu nghiệp vụ.
- Quản lý có thêm quyền duyệt, xác nhận, khóa ngày, mở khóa và xem audit.

Tech stack:

- Next.js 16 App Router
- React 19
- TypeScript 5.9
- Tailwind CSS 4
- Supabase Cloud: PostgreSQL, Auth, RLS và RPC
- PWA bằng Serwist
- Vitest, Testing Library và Playwright
- pnpm 10
- Node.js 24

## 3. Chức năng hiện có

### Đăng nhập

- Đăng nhập bằng tên tài khoản và mật khẩu.
- Không dùng đăng nhập số điện thoại.
- Supabase vẫn quản lý phiên xác thực phía dưới.

### Sản xuất

Mỗi máy có các thao tác thời gian thực:

- Bắt đầu chạy.
- Xả đá.
- Tắt máy.
- Nhập số bao cho lần xả gần nhất chưa có sản lượng.
- Nhật ký riêng cho từng máy.
- Popup xác nhận phải hiển thị tên máy và thời gian hành động.
- Bắt đầu máy: màu xanh lá.
- Xả đá: màu xanh dương.
- Tắt máy: màu đỏ.
- Quản lý được sửa và xóa hành động, mọi thay đổi có audit.
- Sản lượng máy hiện chỉ dùng theo dõi năng suất và đối soát hao hụt.

### Bán hàng

- Bán sỉ và bán lẻ.
- Giá mỗi bao do nhân viên tự nhập.
- Tổng doanh thu gồm cả bán sỉ và bán lẻ.
- Có hỗ trợ nhập thời gian thực tế nếu giao dịch được nhập muộn.
- Giao dịch bị hủy không tính vào tổng bán.

### Chi phí

- Nhân viên nhập chi phí.
- Quản lý duyệt hoặc từ chối.
- Chỉ chi phí đã duyệt mới tính vào lợi nhuận chính thức.

### Công nợ

- Theo dõi công nợ theo khách hàng sỉ.
- Có lịch sử thu nợ và nợ quá hạn.

### Hao hụt và khóa ngày

Ngày vận hành thống nhất của toàn hệ thống là:

```text
[D 20:00, D+1 20:00)
```

Sự kiện đúng 20:00 thuộc ngày mới. Múi giờ là `Asia/Bangkok`.

Công thức:

```text
Chênh lệch = Tồn đầu + Tổng sản xuất - Tổng bán - Tồn cuối thực tế
Tỷ lệ = |Chênh lệch| / Tổng sản xuất × 100
```

Phân loại:

- Chênh lệch dương: hao hụt.
- Bằng 0: khớp kho.
- Âm: dư kho.
- Không có sản xuất thì không hiển thị phần trăm sai lệch giả.
- Ngưỡng cảnh báo mặc định là 5%.
- Quản lý khóa ngày thủ công, hệ thống không tự khóa lúc 20:00.

Tài liệu nghiệp vụ chính:

- `docs/superpowers/specs/2026-09-05-daily-production-loss-design.md`
- `docs/superpowers/plans/2026-09-06-daily-production-loss-implementation.md`

Lưu ý: `README.md` còn một dòng cũ nói ngày sản xuất kết thúc lúc 18:00. Quy tắc chính xác hiện tại là 20:00 đến 20:00 hôm sau. Không được khôi phục quy tắc 18:00 cũ.

## 4. Mục tiêu redesign

Nâng cấp toàn bộ frontend để:

- Thân thiện hơn với nhân viên xưởng.
- Dễ quan sát và thao tác bằng điện thoại.
- Hiển thị bao quát trên máy tính.
- Dùng màu có hệ thống để phân biệt thông tin.
- Đồng nhất tiêu đề, thẻ, nút, biểu mẫu, bảng, trạng thái và thông báo.
- Giữ nguyên chức năng, route, tên nghiệp vụ và hợp đồng dữ liệu hiện tại.

Sử dụng hướng dẫn tại:

```text
C:\Users\ADMIN\.codex\skills\taste-skill\SKILL.md
```

Đọc toàn bộ skill trước khi sửa.

Skill này không chuyên cho dashboard vận hành. Chỉ áp dụng các nguyên tắc audit, design token, accessibility, tính nhất quán và chống giao diện AI-generic. Không biến ứng dụng thành landing page hoặc thêm hiệu ứng trang trí không cần thiết.

## 5. Hướng thiết kế đã được người dùng chọn

Đây là `Redesign - Preserve`:

- Giữ nhận diện xanh nước đá hiện tại.
- Làm giao diện sáng, rõ, thân thiện và chuyên nghiệp hơn.
- Không thay đổi hoàn toàn thương hiệu.
- Không thay đổi information architecture.

Design read:

```text
Ice Operations: giao diện vận hành sáng, rõ ràng, ưu tiên tốc độ nhập liệu,
khả năng quét thông tin và độ tin cậy trên điện thoại lẫn máy tính.
```

Design dials:

- `DESIGN_VARIANCE: 4/10`
- `MOTION_INTENSITY: 2/10`
- `VISUAL_DENSITY: 7/10`
- Light theme thống nhất.
- Chưa cần dark mode.

## 6. Quy ước màu sắc

Dùng xanh nước đá làm accent chính. Màu trạng thái phải nhất quán toàn ứng dụng:

- Xanh dương: hành động chính, thông tin, xả đá.
- Xanh lá: thành công, máy đang chạy, dữ liệu khớp.
- Vàng cam: chờ duyệt, chưa hoàn tất, cần chú ý.
- Đỏ: lỗi, nguy hiểm, tắt máy, hao hụt vượt ngưỡng.
- Xám: trung tính, đã khóa hoặc không hoạt động.

Không dùng màu chỉ để trang trí. Mỗi trạng thái phải có:

- Màu.
- Biểu tượng.
- Nhãn chữ dễ hiểu.

Người mù màu vẫn phải hiểu được trạng thái mà không phụ thuộc riêng vào màu.

## 7. Phạm vi cần thực hiện

### Design foundation

- Tạo design token trong `src/app/globals.css`.
- Chuẩn hóa màu, typography, radius, shadow, spacing và focus ring.
- Ưu tiên Segoe UI hoặc system font dễ đọc tiếng Việt.
- Không dùng pure black.
- Không dùng gradient quá mức.
- Không thêm animation trang trí.
- Hỗ trợ `prefers-reduced-motion`.

### Shared UI components

Tạo hoặc chuẩn hóa các component dùng chung:

- `PageHeader`
- `SectionHeader`
- `Button`
- `IconButton`
- `Panel`
- `KpiCard`
- `StatusBadge`
- `Alert`
- `EmptyState`
- Form controls
- Loading và error state

Không over-engineer hoặc dựng một design system quá lớn.

### Icon

Hiện tại sidebar, mobile navigation và một số form dùng SVG tự viết cùng emoji bông tuyết.

- Thay bằng một icon family duy nhất.
- Ưu tiên `@phosphor-icons/react`.
- Không tiếp tục thêm SVG viết tay.
- Giữ icon có kích thước và stroke nhất quán.
- Nếu thêm dependency, kiểm tra bundle và lý do sử dụng.

### App shell

Cải thiện:

- Desktop sidebar.
- Sticky header.
- Mobile bottom navigation.
- User menu.
- Active state.
- Focus state.
- Safe area trên điện thoại.
- Khả năng đọc các mục quản trị dài.

Không đổi route hoặc tên mục điều hướng nếu chưa được duyệt.

## 8. Yêu cầu riêng cho trang “Hôm nay”

File chính:

```text
src/app/(app)/page.tsx
src/components/dashboard/*
src/modules/reporting/types.ts
src/modules/reporting/dashboard-service.ts
```

Sắp xếp trang theo thứ tự:

1. Trạng thái ngày vận hành và cảnh báo.
2. Các thao tác nhập nhanh.
3. KPI quan trọng.
4. Biểu đồ trực quan.
5. Danh sách cảnh báo vận hành.

### Sơ đồ dòng đá trong ngày

Thể hiện:

- Tồn đầu.
- Tổng sản xuất.
- Tổng bán.
- Tồn cuối dự kiến.
- Tồn cuối thực tế.
- Chênh lệch hao hụt hoặc dư kho.

Phải xử lý đúng trạng thái chưa nhập tồn cuối và chưa có báo cáo hao hụt.

### Biểu đồ cơ cấu doanh thu

Dạng vòng hoặc dạng phân chia rõ ràng:

- Doanh thu bán sỉ.
- Doanh thu bán lẻ.
- Tổng doanh thu.
- Giá trị và tỷ lệ của từng nhóm.

Phải xử lý trường hợp tổng doanh thu bằng 0.

### Biểu đồ dòng tiền

So sánh trực quan:

- Tổng doanh thu.
- Đã thu.
- Chi phí đã duyệt.
- Nợ mới.

Không gọi đây là biểu đồ xu hướng vì dữ liệu dashboard hiện tại chỉ là tổng trong ngày.

Dữ liệu hiện có trong `DailyDashboard`:

```typescript
wholesaleRevenueVnd
retailRevenueVnd
collectedVnd
newDebtVnd
totalDebtVnd
productionBags
soldBags
openingBags
expectedClosingBags
closingBags
differenceBags
differencePct
approvedExpenseVnd
pendingExpenseVnd
overdueDebtVnd
alerts
```

Chỉ dùng dữ liệu thật. Không tạo số liệu giả, lịch sử giả hoặc phần trăm tăng giảm giả.

Có thể dùng CSS/HTML cho biểu đồ đơn giản hoặc một thư viện nhẹ đã được đánh giá. Không dùng SVG viết tay chỉ để trang trí. Biểu đồ phải có nhãn chữ và số liệu để screen reader vẫn hiểu được.

## 9. Các màn hình cần đồng bộ

- Đăng nhập.
- Hôm nay.
- Sản xuất.
- Nhật ký từng máy.
- Bán hàng.
- Nhập bán sỉ và bán lẻ.
- Chi phí và duyệt chi phí.
- Công nợ và chi tiết khách hàng.
- Hao hụt và lịch sử hao hụt.
- Cảnh báo.
- Đối chiếu và khóa ngày.
- Báo cáo.
- Quản lý khách hàng, máy, tài khoản và audit.

Ưu tiên theo thứ tự:

1. Design token và shared components.
2. App shell và đăng nhập.
3. Trang Hôm nay cùng các biểu đồ.
4. Sản xuất, bán hàng, chi phí, công nợ và hao hụt.
5. Khóa sổ, báo cáo và các trang quản trị.

## 10. Responsive và accessibility

- Thiết kế mobile-first.
- Mục tiêu chạm tối thiểu 44×44 px, ưu tiên cao 48 px.
- Không để chữ hoặc nút bị tràn.
- Bảng rộng phải có phương án mobile như card hoặc horizontal scroll có chủ đích.
- Focus ring rõ ràng.
- Label không biến mất khi người dùng nhập.
- Contrast đạt WCAG AA.
- Thông báo lỗi đặt gần trường hoặc hành động gây lỗi.
- Loading, empty, success và error state phải rõ.
- Hành động nguy hiểm phải giữ popup xác nhận.
- Không thay đổi nội dung popup xác nhận nghiệp vụ nếu không cần thiết.

## 11. Điều không được làm

- Không sửa nghiệp vụ backend hoặc công thức hao hụt.
- Không sửa Supabase migration/RPC/RLS cho task này.
- Không thay đổi route.
- Không đổi tên trường form làm ảnh hưởng server action hoặc autofill.
- Không thay đổi ngày vận hành 20:00 đến 20:00.
- Không đưa sản lượng máy tự động vào tồn kho ngoài logic hao hụt hiện có.
- Không dùng dữ liệu giả trong biểu đồ.
- Không lạm dụng card, gradient, glassmorphism hoặc animation.
- Không dùng emoji làm icon giao diện.
- Không làm mất lịch sử audit.
- Không đọc, in hoặc commit secret trong `.env.local`.
- Không chỉnh Production hoặc `main`.

## 12. Kiểm thử bắt buộc

Sau từng nhóm thay đổi:

```powershell
pnpm lint
pnpm typecheck
pnpm test
```

Trước khi bàn giao:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Kiểm tra giao diện ít nhất ở:

- Mobile khoảng 390×844.
- Tablet khoảng 768 px.
- Desktop khoảng 1440 px.

Các luồng phải test thủ công:

- Đăng nhập.
- Nhập bán sỉ/lẻ.
- Thao tác máy và popup xác nhận.
- Nhập sản lượng sau khi xả.
- Nhập chi phí.
- Xem công nợ.
- Nhập tồn cuối và xem hao hụt.
- Khóa ngày.
- Các trạng thái dashboard có dữ liệu, không dữ liệu và cảnh báo.

Nếu sửa component có logic, bổ sung test phù hợp. Không chỉ kiểm tra rằng file tồn tại.

## 13. Tiêu chí hoàn thành

- Toàn bộ màn hình có cùng ngôn ngữ thiết kế.
- Trang Hôm nay có ít nhất ba sơ đồ hữu ích nêu trên.
- Màu sắc có ý nghĩa thống nhất.
- Giao diện điện thoại dễ thao tác bằng một tay.
- Giao diện desktop hiển thị bao quát nhưng không quá dày.
- Không có regression nghiệp vụ.
- Không có SVG icon tự viết mới.
- Không có dữ liệu biểu đồ giả.
- Lint, typecheck, test và build đều pass.
- Gemini báo rõ file đã thay đổi, quyết định thiết kế, kết quả kiểm thử và phần còn lại nếu có.

## 14. Cách triển khai khuyến nghị

Đây là task frontend diện rộng nhưng phải giữ nguyên nghiệp vụ hiện có. Nên triển khai theo từng lớp, bắt đầu từ token và component dùng chung, sau đó mới chỉnh từng trang. Cách làm này tránh việc mỗi màn hình có một phong cách khác nhau và giảm lượng code phải sửa lặp.
