'use client'

import type { MachineProductionState } from '@/modules/production/types'
import { MachineProductionLog } from './machine-production-log'
import { useProductionRealtime } from './use-production-realtime'

export function MachineLogScreen({ machine, productionDate, currentProductionDate, isManager, locked }: { machine: MachineProductionState; productionDate: string; currentProductionDate: string; isManager: boolean; locked: boolean }) {
  const { online, realtimeReady, connectionMessage } = useProductionRealtime()
  const historical = productionDate !== currentProductionDate
  const connected = online && realtimeReady
  const writable = connected && (isManager || !historical)

  return <div className="space-y-4">
    {connectionMessage ? <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-950" role="status">{connectionMessage}</div> : null}
    {historical ? <div className="rounded-2xl border border-slate-300 bg-slate-100 p-4 text-sm font-bold text-slate-800">Bạn đang xem ngày cũ. Nhân viên chỉ được xem; quản lý có thể hiệu chỉnh hoặc xóa từ hành động mới nhất nếu ngày chưa khóa.</div> : null}
    <MachineProductionLog isManager={isManager} locked={locked} machine={machine} writable={writable} />
  </div>
}
