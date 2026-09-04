# Ice-Factory-Manage

PWA quản lý xưởng nước đá, vận hành theo đơn vị bao.

Màn hình Sản xuất theo dõi thời gian thực từng máy: bắt đầu chạy, xả đá, tắt máy và số bao của từng lần xả. Ngày sản xuất từ 20:00 đến 18:00 hôm sau; sản lượng máy là chỉ số năng suất và không tự làm thay đổi tồn kho thành phẩm.

## Yêu cầu

- Node.js 24
- pnpm 10 (được pin trong `packageManager`)

## Khởi chạy

```powershell
Copy-Item .env.example .env.local
pnpm install
pnpm dev
```

Điền các biến Supabase trong `.env.local`; không đưa khóa dịch vụ vào mã nguồn hoặc trình duyệt.

Nếu dùng Supabase Cloud, không cần chạy `pnpm db:start`; chỉ cần URL/key Cloud trong `.env.local`. Supabase local được dùng cho migration, integration test và full-day E2E cô lập.

## Kiểm tra chất lượng

```powershell
pnpm test
pnpm lint
pnpm typecheck
pnpm build
pnpm verify:env
```

Luồng E2E đầy đủ cần database local sạch:

```powershell
pnpm db:start
pnpm db:reset
$env:RUN_FULL_DAY_E2E='true'
pnpm test:e2e --grep "one operating day"
```

## Phát hành

- CI: [.github/workflows/ci.yml](.github/workflows/ci.yml)
- Deploy/rollback: [docs/operations/deployment.md](docs/operations/deployment.md)
- Backup/restore: [docs/operations/backup-restore.md](docs/operations/backup-restore.md)
- Cutover từ Excel: [docs/operations/cutover.md](docs/operations/cutover.md)
- UAT: [docs/operations/user-acceptance.md](docs/operations/user-acceptance.md)

Chủ dự án thực hiện deploy Vercel. Sau khi có Preview URL, chạy `pnpm smoke -- <preview-url>`; script không ghi dữ liệu nghiệp vụ.
