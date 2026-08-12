import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type OperatingDayClient = Pick<SupabaseClient<Database>, 'from'>

export async function ensureOperatingDay(
  day: string,
  client?: OperatingDayClient,
): Promise<void> {
  const supabase = client ?? (await createServerSupabaseClient())
  const { error } = await supabase
    .from('operating_days')
    .upsert({ day }, { onConflict: 'day', ignoreDuplicates: true })

  if (error) throw new Error(`Không thể khởi tạo ngày vận hành: ${error.message}`)
}
