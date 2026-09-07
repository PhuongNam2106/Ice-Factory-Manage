import { CheckCircle, Warning, WarningCircle } from '@phosphor-icons/react/dist/ssr'
import type { ClosingCheck } from '@/modules/closing/types'

export function CheckList({ checks }: { checks: ClosingCheck[] }) {
  if (!checks.length) {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-900 border border-emerald-200/80">
        <CheckCircle size={20} weight="fill" className="text-emerald-600 shrink-0" />
        <p className="text-sm">Ngày vận hành đã đủ điều kiện khóa sổ.</p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {checks.map((check) => {
        const isWarning = check.code === 'LOSS_REVIEW_REQUIRED'
        return (
          <li
            key={check.code}
            className={`flex items-start gap-3 rounded-2xl border p-4 ${
              isWarning ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-rose-200 bg-rose-50 text-rose-950'
            }`}
          >
            {isWarning ? (
              <WarningCircle size={20} weight="fill" className="text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <Warning size={20} weight="fill" className="text-rose-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold text-sm">{check.message}</p>
              <p className="mt-0.5 text-xs opacity-80">
                {isWarning
                  ? 'Quản lý phải kiểm tra và xác nhận cảnh báo hao hụt trước khi khóa sổ.'
                  : 'Phải xử lý triệt để trước khi thực hiện khóa sổ.'}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

