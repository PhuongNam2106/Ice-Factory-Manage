import { actionFailure, actionSuccess, type ActionResult } from '@/lib/result'
import { AuthorizationError, requireManager, type AppUser } from './service'

export async function authorizeManagerAction(
  guard: () => Promise<AppUser> = requireManager,
): Promise<ActionResult<AppUser>> {
  try {
    return actionSuccess(await guard())
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return actionFailure('FORBIDDEN', 'Không có quyền quản lý.')
    }
    throw error
  }
}
