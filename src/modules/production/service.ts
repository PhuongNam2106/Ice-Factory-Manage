import 'server-only'

import { z } from 'zod'
import { actionFailure, actionSuccess, type ActionResult } from '@/lib/result'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getFieldErrors } from '@/lib/validation'
import {
  correctProductionActionRecord, deleteProductionActionRecord, getProductionBoardRecord, getProductionSummaryRecord,
  recordHarvestRecord, setHarvestQuantityRecord, startMachineRecord, stopMachineRecord, type ProductionClient,
} from './repository'
import {
  deleteProductionActionSchema, harvestQuantitySchema, machineActionSchema, productionCorrectionSchema,
  productionRangeSchema,
  type DeleteProductionActionInput, type HarvestQuantityInput, type MachineActionInput, type ProductionCorrectionInput,
} from './schema'
import type { MachineActionResult, MachineProductivitySummary, ProductionBoardSnapshot } from './types'

const logSchema = z.object({
  id: z.string(), type: z.enum(['start', 'harvest', 'stop']), occurredAt: z.string(), actorName: z.string(),
  runId: z.string().uuid(), harvestId: z.string().uuid().optional(), bagQuantity: z.number().nullable().optional(),
  quantityUpdatedAt: z.string().nullable().optional(), quantityUpdatedBy: z.string().nullable().optional(),
})
const boardSchema: z.ZodType<ProductionBoardSnapshot> = z.object({
  productionDate: z.string(), startsAt: z.string(), endsAt: z.string(), status: z.enum(['open', 'locked']),
  reminderMinutes: z.number().int().positive(),
  machines: z.array(z.object({
    id: z.string().uuid(), name: z.string(), code: z.string(),
    openRun: z.object({ id: z.string().uuid(), productionDate: z.string(), startedAt: z.string(), startedBy: z.string() }).nullable(),
    pendingHarvest: z.object({ id: z.string().uuid(), runId: z.string().uuid(), harvestedAt: z.string(), harvestedBy: z.string() }).nullable(),
    totalBags: z.number(), harvestCount: z.number(), logs: z.array(logSchema),
  })),
})
const summarySchema: z.ZodType<MachineProductivitySummary[]> = z.array(z.object({
  machineId: z.string().uuid(), machineName: z.string(), machineCode: z.string(), totalBags: z.number(),
  harvestCount: z.number(), pendingHarvestCount: z.number(), averageBagsPerHarvest: z.number().nullable(),
  runtimeSeconds: z.number(), downtimeSeconds: z.number(), averageHarvestIntervalSeconds: z.number().nullable(),
  latestHarvestAt: z.string().nullable(), isRunning: z.boolean(),
}))
const actionResultSchema: z.ZodType<MachineActionResult> = z.object({
  machineId: z.string().uuid(), runId: z.string().uuid().optional(), harvestId: z.string().uuid().optional(),
  productionDate: z.string().optional(), startedAt: z.string().optional(), harvestedAt: z.string().optional(),
  stoppedAt: z.string().optional(), quantity: z.number().optional(), quantityUpdatedAt: z.string().optional(),
})

export function mapProductionError(message: string): ActionResult<never> {
  const mappings: Array<[string, string, string]> = [
    ['MACHINE_ALREADY_RUNNING', 'MACHINE_ALREADY_RUNNING', 'Máy đang chạy nên không thể bắt đầu thêm lần nữa.'],
    ['MACHINE_NOT_RUNNING', 'MACHINE_NOT_RUNNING', 'Máy chưa chạy nên không thể thực hiện thao tác này.'],
    ['PENDING_HARVEST_EXISTS', 'PENDING_HARVEST_EXISTS', 'Lần xả gần nhất chưa nhập số bao. Hãy cập nhật số bao trước khi xả tiếp.'],
    ['CUTOVER_NOT_CONFIGURED', 'CUTOVER_NOT_CONFIGURED', 'Hệ thống chưa được cấu hình thời điểm bắt đầu vận hành. Vui lòng báo quản lý.'],
    ['OCCURRED_AT_BEFORE_CUTOVER', 'OCCURRED_AT_BEFORE_CUTOVER', 'Thời gian hành động phải từ thời điểm bắt đầu vận hành hệ thống trở đi.'],
    ['PRODUCTION_DAY_LOCKED', 'PRODUCTION_DAY_LOCKED', 'Ngày sản xuất đã khóa nên không thể chỉnh sửa.'],
    ['DAY_LOCKED', 'DAY_LOCKED', 'Ngày vận hành đã khóa nên không thể chỉnh sửa sản xuất.'],
    ['FORBIDDEN_QUANTITY_EDIT', 'FORBIDDEN_QUANTITY_EDIT', 'Bạn chỉ có thể sửa số bao do chính mình nhập.'],
    ['OPEN_MACHINE_RUNS', 'OPEN_MACHINE_RUNS', 'Còn máy đang chạy. Hãy tắt toàn bộ máy trước khi khóa ngày.'],
    ['PENDING_HARVESTS', 'PENDING_HARVESTS', 'Còn lần xả chưa nhập số bao. Hãy hoàn tất trước khi khóa ngày.'],
    ['DELETE_ACTION_NOT_LATEST', 'DELETE_ACTION_NOT_LATEST', 'Phải xóa hành động mới nhất của máy trước.'],
    ['DELETE_ACTION_NOT_FOUND', 'DELETE_ACTION_NOT_FOUND', 'Hành động này không còn tồn tại hoặc đã được xóa.'],
    ['PRODUCTION_DAY_NOT_FOUND', 'PRODUCTION_DAY_NOT_FOUND', 'Ngày này chưa có hoạt động sản xuất để khóa.'],
    ['MACHINE_RUN_OVERLAP', 'INVALID_TIMELINE', 'Thời gian chỉnh sửa làm các phiên chạy bị chồng lấn.'],
    ['HARVEST_OUTSIDE_RUN', 'INVALID_TIMELINE', 'Thời gian xả phải nằm trong thời gian máy chạy.'],
    ['RUN_OUTSIDE_PRODUCTION_DAY', 'INVALID_TIMELINE', 'Giờ bắt đầu phải nằm trong ngày sản xuất của phiên này.'],
    ['machine_runs_check', 'INVALID_TIMELINE', 'Giờ tắt máy phải sau giờ bắt đầu.'],
    ['ACTIVE_MACHINE_NOT_FOUND', 'MACHINE_NOT_FOUND', 'Máy không tồn tại hoặc đã ngừng hoạt động.'],
    ['HARVEST_NOT_FOUND', 'HARVEST_NOT_FOUND', 'Không tìm thấy lần xả đá.'],
    ['FORBIDDEN', 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.'],
  ]
  const match = mappings.find(([needle]) => message.includes(needle))
  return match ? actionFailure(match[1], match[2]) : actionFailure('PRODUCTION_WRITE_FAILED', 'Không thể cập nhật sản xuất. Vui lòng thử lại.')
}

async function parsedRpc<T>(result: PromiseLike<{ data: unknown; error: { message: string } | null }>, schema: z.ZodType<T>): Promise<ActionResult<T>> {
  const { data, error } = await result
  if (error) return mapProductionError(error.message)
  const parsed = schema.safeParse(data)
  return parsed.success ? actionSuccess(parsed.data) : actionFailure('INVALID_SERVER_RESPONSE', 'Máy chủ trả về dữ liệu không hợp lệ.')
}

function validate<T>(schema: z.ZodType<T>, input: unknown): ActionResult<T> {
  const parsed = schema.safeParse(input)
  return parsed.success ? actionSuccess(parsed.data) : actionFailure('VALIDATION_ERROR', 'Thông tin sản xuất không hợp lệ.', getFieldErrors(parsed.error))
}
async function clientOrDefault(client?: ProductionClient) { return client ?? await createServerSupabaseClient() }

export async function getProductionBoard(client: ProductionClient, productionDate: string) {
  return parsedRpc(getProductionBoardRecord(client, productionDate), boardSchema)
}
export async function getProductionSummary(client: ProductionClient, from: string, to: string) {
  const input = validate(productionRangeSchema, { from, to }); if (!input.ok) return input
  return parsedRpc(getProductionSummaryRecord(client, from, to), summarySchema)
}
export async function startMachineWithClient(input: MachineActionInput, client?: ProductionClient) {
  const value = validate(machineActionSchema, input); if (!value.ok) return value
  return parsedRpc(startMachineRecord(await clientOrDefault(client), value.data.machineId, value.data.idempotencyKey), actionResultSchema)
}
export async function recordHarvestWithClient(input: MachineActionInput, client?: ProductionClient) {
  const value = validate(machineActionSchema, input); if (!value.ok) return value
  return parsedRpc(recordHarvestRecord(await clientOrDefault(client), value.data.machineId, value.data.idempotencyKey), actionResultSchema)
}
export async function stopMachineWithClient(input: MachineActionInput, client?: ProductionClient) {
  const value = validate(machineActionSchema, input); if (!value.ok) return value
  return parsedRpc(stopMachineRecord(await clientOrDefault(client), value.data.machineId, value.data.idempotencyKey), actionResultSchema)
}
export async function setHarvestQuantityWithClient(input: HarvestQuantityInput, client?: ProductionClient) {
  const value = validate(harvestQuantitySchema, input); if (!value.ok) return value
  return parsedRpc(setHarvestQuantityRecord(await clientOrDefault(client), value.data.harvestId, value.data.quantity, value.data.idempotencyKey), actionResultSchema)
}
export async function correctProductionActionWithClient(input: ProductionCorrectionInput, client?: ProductionClient) {
  const value = validate(productionCorrectionSchema, input); if (!value.ok) return value
  return parsedRpc(correctProductionActionRecord(await clientOrDefault(client), value.data, value.data.idempotencyKey), actionResultSchema)
}
export async function deleteProductionActionWithClient(input: DeleteProductionActionInput, client?: ProductionClient) {
  const value = validate(deleteProductionActionSchema, input); if (!value.ok) return value
  return parsedRpc(deleteProductionActionRecord(await clientOrDefault(client), value.data), actionResultSchema)
}
