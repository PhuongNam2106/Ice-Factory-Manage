import { LoginForm } from '@/components/forms/login-form'

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-sky-950 px-5 py-8">
      <section aria-labelledby="login-title" className="w-full max-w-md rounded-2xl bg-slate-50 p-6 shadow-xl sm:p-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Xưởng nước đá</p>
        <h1 id="login-title" className="text-3xl font-bold tracking-tight text-slate-950">Đăng nhập</h1>
        <p className="mb-7 mt-2 text-sm text-slate-600">Dùng số điện thoại và mã PIN của bạn.</p>
        <LoginForm />
      </section>
    </main>
  )
}
