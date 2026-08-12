# Ice-Factory-Manage

PWA quản lý xưởng nước đá, vận hành theo đơn vị bao.

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
