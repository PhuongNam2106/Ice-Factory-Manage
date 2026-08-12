export type ActionError = {
  code: string
  message: string
  fieldErrors?: Record<string, string[]>
}

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError }

export function actionFailure(
  code: string,
  message: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return {
    ok: false,
    error: fieldErrors ? { code, message, fieldErrors } : { code, message },
  }
}

export function actionSuccess<T>(data: T): ActionResult<T> {
  return { ok: true, data }
}
