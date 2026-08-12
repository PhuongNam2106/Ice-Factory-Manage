import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type CatalogClient = Pick<SupabaseClient<Database>, 'from'>

export type CustomerOption = {
  id: string
  name: string
  phone: string | null
  paymentTermDays: number
}

export type CustomerRecord = CustomerOption & {
  address: string | null
  isActive: boolean
}

export type MachineOption = {
  id: string
  name: string
}

export type MachineRecord = MachineOption & {
  code: string | null
  isActive: boolean
}

async function getClient(client?: CatalogClient) {
  return client ?? createServerSupabaseClient()
}

export async function listCustomers(client?: CatalogClient): Promise<CustomerRecord[]> {
  const supabase = await getClient(client)
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, phone, address, payment_term_days, is_active')
    .order('is_active', { ascending: false })
    .order('name')

  if (error) throw new Error('Không thể tải danh sách khách hàng.')

  return data.map((customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
    paymentTermDays: customer.payment_term_days,
    isActive: customer.is_active,
  }))
}

export async function listActiveCustomers(client?: CatalogClient): Promise<CustomerOption[]> {
  const customers = await listCustomers(client)
  return customers
    .filter((customer) => customer.isActive)
    .map(({ id, name, phone, paymentTermDays }) => ({ id, name, phone, paymentTermDays }))
}

export async function listMachines(client?: CatalogClient): Promise<MachineRecord[]> {
  const supabase = await getClient(client)
  const { data, error } = await supabase
    .from('machines')
    .select('id, name, code, is_active')
    .order('is_active', { ascending: false })
    .order('name')

  if (error) throw new Error('Không thể tải danh sách máy.')

  return data.map((machine) => ({
    id: machine.id,
    name: machine.name,
    code: machine.code,
    isActive: machine.is_active,
  }))
}

export async function listActiveMachines(client?: CatalogClient): Promise<MachineOption[]> {
  const machines = await listMachines(client)
  return machines
    .filter((machine) => machine.isActive)
    .map(({ id, name }) => ({ id, name }))
}
