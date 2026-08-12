import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { ensureOperatingDay } from './ensure-day'

describe('ensureOperatingDay', () => {
  it('inserts only the day and ignores conflicts so a locked row is never reopened', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const client = {
      from: vi.fn().mockReturnValue({ upsert }),
    } as unknown as Pick<SupabaseClient<Database>, 'from'>

    await ensureOperatingDay('2026-08-12', client)

    expect(upsert).toHaveBeenCalledWith(
      { day: '2026-08-12' },
      { onConflict: 'day', ignoreDuplicates: true },
    )
  })
})
