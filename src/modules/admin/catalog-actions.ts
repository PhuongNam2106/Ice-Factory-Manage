'use server'

import { revalidatePath } from 'next/cache'
import type { Database } from '@/lib/supabase/database.types'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { actionFailure, actionSuccess, type ActionResult } from '@/lib/result'
import { getFieldErrors } from '@/lib/validation'
import { authorizeManagerAction } from '@/modules/auth/action-authorization'
import {
  catalogActiveSchema,
  customerMutationSchema,
  machineMutationSchema,
  type CustomerMutationInput,
  type MachineMutationInput,
} from './catalog-schema'

type CustomerRpcArgs = Database['public']['Functions']['upsert_customer']['Args']
type MachineRpcArgs = Database['public']['Functions']['upsert_machine']['Args']

function catalogFailure(message: string) {
  return actionFailure('CATALOG_MUTATION_FAILED', message)
}

export async function saveCustomer(
  input: CustomerMutationInput,
): Promise<ActionResult<{ id: string }>> {
  const authorization = await authorizeManagerAction()
  if (!authorization.ok) return authorization

  const parsed = customerMutationSchema.safeParse(input)
  if (!parsed.success) {
    return actionFailure(
      'VALIDATION_ERROR',
      'Thông tin khách hàng không hợp lệ.',
      getFieldErrors(parsed.error),
    )
  }

  const supabase = await createServerSupabaseClient()
  const args = {
    p_id: parsed.data.id ?? null,
    p_name: parsed.data.name,
    p_phone: parsed.data.phone ?? '',
    p_address: parsed.data.address ?? '',
    p_payment_term_days: parsed.data.paymentTermDays,
  } as unknown as CustomerRpcArgs
  const { data, error } = await supabase.rpc('upsert_customer', args)

  if (error) return catalogFailure('Không thể lưu khách hàng. Vui lòng thử lại.')
  revalidatePath('/admin/customers')
  return actionSuccess({ id: data })
}

export async function setCustomerActive(input: {
  id: string
  isActive: boolean
}): Promise<ActionResult<void>> {
  const authorization = await authorizeManagerAction()
  if (!authorization.ok) return authorization

  const parsed = catalogActiveSchema.safeParse(input)
  if (!parsed.success) {
    return actionFailure('VALIDATION_ERROR', 'Thông tin khách hàng không hợp lệ.')
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.rpc('set_customer_active', {
    p_id: parsed.data.id,
    p_is_active: parsed.data.isActive,
  })

  if (error) return catalogFailure('Không thể cập nhật trạng thái khách hàng.')
  revalidatePath('/admin/customers')
  return actionSuccess(undefined)
}

export async function saveMachine(
  input: MachineMutationInput,
): Promise<ActionResult<{ id: string }>> {
  const authorization = await authorizeManagerAction()
  if (!authorization.ok) return authorization

  const parsed = machineMutationSchema.safeParse(input)
  if (!parsed.success) {
    return actionFailure(
      'VALIDATION_ERROR',
      'Thông tin máy không hợp lệ.',
      getFieldErrors(parsed.error),
    )
  }

  const supabase = await createServerSupabaseClient()
  const args = {
    p_id: parsed.data.id ?? null,
    p_name: parsed.data.name,
    p_code: parsed.data.code ?? '',
  } as unknown as MachineRpcArgs
  const { data, error } = await supabase.rpc('upsert_machine', args)

  if (error) return catalogFailure('Không thể lưu máy. Vui lòng thử lại.')
  revalidatePath('/admin/machines')
  return actionSuccess({ id: data })
}

export async function setMachineActive(input: {
  id: string
  isActive: boolean
}): Promise<ActionResult<void>> {
  const authorization = await authorizeManagerAction()
  if (!authorization.ok) return authorization

  const parsed = catalogActiveSchema.safeParse(input)
  if (!parsed.success) {
    return actionFailure('VALIDATION_ERROR', 'Thông tin máy không hợp lệ.')
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.rpc('set_machine_active', {
    p_id: parsed.data.id,
    p_is_active: parsed.data.isActive,
  })

  if (error) return catalogFailure('Không thể cập nhật trạng thái máy.')
  revalidatePath('/admin/machines')
  return actionSuccess(undefined)
}
