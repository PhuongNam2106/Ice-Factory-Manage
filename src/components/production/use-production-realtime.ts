'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/browser'

export function useProductionRealtime() {
  const router = useRouter()
  const [online, setOnline] = useState(true)
  const [realtimeReady, setRealtimeReady] = useState(false)

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    const syncOnline = () => { setOnline(navigator.onLine); if (navigator.onLine) router.refresh() }
    window.addEventListener('online', syncOnline)
    window.addEventListener('offline', syncOnline)

    let active = true
    const initialOnlineCheck = window.setTimeout(() => {
      if (active) setOnline(navigator.onLine)
    }, 0)
    const channel = supabase.channel('production:machines', { config: { private: true } })
    for (const event of ['INSERT', 'UPDATE', 'DELETE']) {
      channel.on('broadcast', { event }, () => router.refresh())
    }
    void supabase.realtime.setAuth().then(() => {
      if (!active) return
      channel.subscribe((status) => {
        const ready = status === 'SUBSCRIBED'
        setRealtimeReady(ready)
        if (ready) router.refresh()
      })
    })

    return () => {
      active = false
      window.clearTimeout(initialOnlineCheck)
      window.removeEventListener('online', syncOnline)
      window.removeEventListener('offline', syncOnline)
      void supabase.removeChannel(channel)
    }
  }, [router])

  return {
    online,
    realtimeReady,
    connectionMessage: !online
      ? 'Thiết bị đang mất mạng. Bạn vẫn xem được dữ liệu đã tải nhưng không thể ghi thao tác mới.'
      : !realtimeReady
        ? 'Đang kết nối đồng bộ thời gian thực. Các nút tạm khóa để tránh ghi trùng.'
        : null,
  }
}
