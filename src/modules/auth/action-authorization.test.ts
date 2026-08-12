import { describe, expect, it, vi } from 'vitest'
import { AuthorizationError } from './service'
import { authorizeManagerAction } from './action-authorization'

describe('authorizeManagerAction', () => {
  it('returns FORBIDDEN for an employee authorization error', async () => {
    const result = await authorizeManagerAction(
      vi.fn().mockRejectedValue(new AuthorizationError('Không có quyền quản lý')),
    )

    expect(result).toEqual({
      ok: false,
      error: { code: 'FORBIDDEN', message: 'Không có quyền quản lý.' },
    })
  })

  it('does not swallow a redirect used to clear an inactive session', async () => {
    const redirectError = new Error('NEXT_REDIRECT')

    await expect(
      authorizeManagerAction(vi.fn().mockRejectedValue(redirectError)),
    ).rejects.toBe(redirectError)
  })
})
