import { LoginForm } from '@/components/forms/login-form'

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12">
      {/* Ambient ice glow background circles */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />

      <section aria-labelledby="login-title" className="relative z-10 w-full max-w-md rounded-3xl border border-slate-800/80 bg-slate-900/90 p-7 shadow-2xl backdrop-blur-xl sm:p-9">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-2xl shadow-xl shadow-sky-500/20">
            ❄️
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-sky-400">Vận hành xưởng nước đá</p>
          <h1 id="login-title" className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">Đăng Nhập</h1>
          <p className="mt-1.5 text-xs text-slate-400">Nhập tên tài khoản và mật khẩu để bắt đầu ca làm việc.</p>
        </div>

        <LoginForm />
      </section>
    </main>
  )
}
