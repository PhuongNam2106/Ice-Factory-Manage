import { z } from 'zod'

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày sản xuất không hợp lệ')
const idempotencyKeySchema = z.string().uuid('Mã thao tác không hợp lệ')

export const machineActionSchema = z.object({
  machineId: z.string().uuid('Máy không hợp lệ'),
  idempotencyKey: idempotencyKeySchema,
})

export const harvestQuantitySchema = z.object({
  harvestId: z.string().uuid('Lần xả đá không hợp lệ'),
  quantity: z.coerce.number().int('Số bao phải là số nguyên').min(0, 'Số bao không được âm').max(10_000_000),
  idempotencyKey: idempotencyKeySchema,
})

export const productionDateSchema = z.object({ productionDate: dateSchema })
export const productionRangeSchema = z.object({ from: dateSchema, to: dateSchema })
  .refine(({ from, to }) => from <= to, { path: ['to'], message: 'Ngày kết thúc phải từ ngày bắt đầu trở đi' })

const correctionBase = {
  occurredAt: z.string().datetime({ offset: true, message: 'Thời gian không hợp lệ' }),
  idempotencyKey: idempotencyKeySchema,
}

export const productionCorrectionSchema = z.discriminatedUnion('actionType', [
  z.object({ ...correctionBase, actionType: z.literal('add_start'), machineId: z.string().uuid() }),
  z.object({ ...correctionBase, actionType: z.literal('add_harvest'), machineId: z.string().uuid(), bagQuantity: z.coerce.number().int().min(0).max(10_000_000).optional() }),
  z.object({ ...correctionBase, actionType: z.literal('add_stop'), machineId: z.string().uuid() }),
  z.object({ ...correctionBase, actionType: z.literal('change_run_start'), runId: z.string().uuid() }),
  z.object({ ...correctionBase, actionType: z.literal('change_run_stop'), runId: z.string().uuid() }),
  z.object({ ...correctionBase, actionType: z.literal('change_harvest_time'), harvestId: z.string().uuid() }),
])

export type MachineActionInput = z.input<typeof machineActionSchema>
export type HarvestQuantityInput = z.input<typeof harvestQuantitySchema>
export type ProductionCorrectionInput = z.input<typeof productionCorrectionSchema>
export type ProductionDateInput = z.input<typeof productionDateSchema>
