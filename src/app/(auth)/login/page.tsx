import { LoginForm } from '@/components/forms/login-form'
import { Snowflake } from '@phosphor-icons/react/dist/ssr'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section
        aria-labelledby="login-title"
        className="w-full max-w-md rounded-3xl border border-slate-200/90 bg-white p-7 shadow-xl sm:p-9"
      >
        <div className="mb-7 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-700 text-white shadow-md shadow-sky-700/20">
            <Snowflake className="h-7 w-7" weight="bold" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-sky-700">
            Hệ Thống Vận Hành
          </p>
          <h1
            id="login-title"
            className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl"
          >
            Đăng Nhập Xưởng Đá
          </h1>
          <p className="mt-1.5 text-xs text-slate-500">
            Nhập tên tài khoản và mật khẩu để bắt đầu phiên làm việc.
          </p>
        </div>

        <LoginForm />
      </section>
    </main>
  )
}
