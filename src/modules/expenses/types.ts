export type ExpenseStatus = 'pending' | 'approved' | 'rejected'

export interface ExpenseItem {
  id: string
  operatingDay: string
  categoryId: string
  categoryName: string
  amountVnd: number
  payee: string
  note: string | null
  status: ExpenseStatus
  reviewReason: string | null
  createdBy: string
  createdAt: string
  reviewedBy: string | null
  reviewedAt: string | null
  attachments: ExpenseAttachmentItem[]
}

export interface CreateExpenseResult {
  expenseId: string
}

export interface ReviewExpenseResult {
  expenseId: string
  status: 'approved' | 'rejected'
}

export interface CreateAttachmentUploadResult {
  objectPath: string
  signedUrl: string
  token: string
}

export interface FinalizeAttachmentResult {
  attachmentId: string
}

export interface ExpenseCategoryItem {
  id: string
  name: string
}

export interface ExpenseAttachmentItem {
  id: string
  expenseId: string
  originalName: string
  contentType: string
  sizeBytes: number
  createdAt: string
}
