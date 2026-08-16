import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { AppUser } from '@/modules/auth/service'
import { getOperatingDay } from '@/modules/shared/operating-day'
import { buildBackupExport } from './excel/backup-export'
import { buildDailyWorkbook } from './excel/daily-report'
import { buildDetailWorkbook } from './excel/detail-reports'
import { buildMonthlyWorkbook } from './excel/monthly-report'
import { ReportReconciliationError, type ReportMetadata } from './excel/workbook'
import { getBackupTables, getDailyReportInput, getDetailReport, getLockStatus, getMonthlyReportDays, type ReportKind } from './report-data'

class ReportAuthorizationError extends Error {
  constructor(readonly status: 401 | 403) {
    super(status === 401 ? 'UNAUTHENTICATED' : 'FORBIDDEN')
  }
}

const reportNames: Record<ReportKind, string> = {
  sales: 'ban-hang', production: 'san-xuat', expenses: 'chi-phi',
  receivables: 'cong-no', inventory: 'so-kho', audit: 'nhat-ky-audit',
}

function validDay(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(value)
}

export function parseReportRange(request: NextRequest) {
  const today = getOperatingDay(new Date())
  const from = request.nextUrl.searchParams.get('from') ?? today
  const to = request.nextUrl.searchParams.get('to') ?? from
  if (!validDay(from) || !validDay(to) || from > to) throw new Error('INVALID_REPORT_RANGE')
  const days = Math.floor((Date.parse(to) - Date.parse(from)) / 86_400_000)
  if (days > 366) throw new Error('REPORT_RANGE_TOO_LARGE')
  return { from, to }
}

async function authorize(client: Awaited<ReturnType<typeof createServerSupabaseClient>>, managerOnly: boolean): Promise<AppUser> {
  const { data: claimsData, error: claimsError } = await client.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (claimsError || typeof userId !== 'string') throw new ReportAuthorizationError(401)
  const { data: profile, error } = await client.from('profiles')
    .select('id, username, phone, full_name, role, is_active').eq('id', userId).maybeSingle()
  if (error || !profile?.is_active) throw new ReportAuthorizationError(403)
  if (managerOnly && profile.role !== 'manager') throw new ReportAuthorizationError(403)
  return { id: profile.id, username: profile.username, phone: profile.phone, fullName: profile.full_name, role: profile.role }
}

function xlsxResponse(buffer: Buffer, filename: string, displayFilename: string) {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="${filename}.xlsx"; filename*=UTF-8''${encodeURIComponent(displayFilename)}.xlsx`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

function reportError(error: unknown) {
  if (error instanceof ReportAuthorizationError) return NextResponse.json({ error: error.message }, { status: error.status })
  if (error instanceof ReportReconciliationError) return NextResponse.json({ error: error.code }, { status: 409 })
  if (error instanceof Error && (error.message === 'INVALID_REPORT_RANGE' || error.message === 'REPORT_RANGE_TOO_LARGE')) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ error: 'REPORT_EXPORT_FAILED' }, { status: 500 })
}

async function metadata(client: Awaited<ReturnType<typeof createServerSupabaseClient>>, user: AppUser, from: string, to: string): Promise<ReportMetadata> {
  return { exportedAt: new Date(), exportedBy: user.fullName, from, to, lockStatus: await getLockStatus(client, from, to) }
}

export function createDailyReportRoute() {
  return async function GET(request: NextRequest) {
    try {
      const { from: day } = parseReportRange(request)
      const client = await createServerSupabaseClient()
      const user = await authorize(client, false)
      const [summary, reportMetadata] = await Promise.all([getDailyReportInput(client, day), metadata(client, user, day, day)])
      const expectedRevenueVnd = summary.wholesaleVnd + summary.retailVnd
      const buffer = await buildDailyWorkbook({ metadata: reportMetadata, summary, expectedRevenueVnd })
      return xlsxResponse(buffer, `bao-cao-ngay-${day}`, `Báo cáo ngày ${day}`)
    } catch (error) {
      return reportError(error)
    }
  }
}

export function createMonthlyReportRoute() {
  return async function GET(request: NextRequest) {
    try {
      const { from, to } = parseReportRange(request)
      const client = await createServerSupabaseClient()
      const user = await authorize(client, false)
      const [days, reportMetadata] = await Promise.all([getMonthlyReportDays(client, from, to), metadata(client, user, from, to)])
      const expectedRevenueVnd = days.reduce((sum, day) => sum + day.wholesaleVnd + day.retailVnd, 0)
      const buffer = await buildMonthlyWorkbook({ metadata: reportMetadata, days, expectedRevenueVnd })
      return xlsxResponse(buffer, `bao-cao-thang-${from}-${to}`, `Báo cáo tháng ${from} đến ${to}`)
    } catch (error) {
      return reportError(error)
    }
  }
}

export function createDetailReportRoute(kind: ReportKind) {
  return async function GET(request: NextRequest) {
    try {
      const { from, to } = parseReportRange(request)
      const client = await createServerSupabaseClient()
      const user = await authorize(client, kind === 'audit')
      const [dataset, reportMetadata] = await Promise.all([getDetailReport(client, kind, from, to), metadata(client, user, from, to)])
      const buffer = await buildDetailWorkbook({ ...dataset, metadata: reportMetadata })
      return xlsxResponse(buffer, `${reportNames[kind]}-${from}-${to}`, `${dataset.sheetName} ${from} đến ${to}`)
    } catch (error) {
      return reportError(error)
    }
  }
}

export function createBackupRoute() {
  return async function GET() {
    try {
      const client = await createServerSupabaseClient()
      await authorize(client, true)
      const backup = buildBackupExport(await getBackupTables(client))
      const filename = `sao-luu-xuong-nuoc-da-${backup.exportedAt.slice(0, 10)}`
      return new NextResponse(JSON.stringify(backup), { headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="${filename}.json"; filename*=UTF-8''${encodeURIComponent(`Sao lưu xưởng nước đá ${backup.exportedAt.slice(0, 10)}`)}.json`,
        'Content-Type': 'application/json; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      } })
    } catch (error) {
      return reportError(error)
    }
  }
}
