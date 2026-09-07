import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CorrectOccurredAtDialog } from './correct-occurred-at-dialog'

vi.mock('@/modules/shared/document-time-actions', () => ({
  correctDocumentOccurredAt: vi.fn(),
}))

afterEach(cleanup)

describe('CorrectOccurredAtDialog', () => {
  it('shows the current Bangkok occurrence time before editing', async () => {
    const user = userEvent.setup()
    render(
      <CorrectOccurredAtDialog
        entityId="11111111-1111-4111-8111-111111111111"
        entityType="sale"
        label="đơn bán"
        occurredAt="2026-09-06T12:50:00.000Z"
        version={2}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Sửa thời gian' }))

    expect(screen.getByRole('dialog', { name: 'Sửa thời gian đơn bán' })).toBeVisible()
    expect(screen.getByLabelText('Thời gian thực tế')).toHaveValue('2026-09-06T19:50')
    expect(screen.getByText('Ngày vận hành sẽ được hệ thống tính lại theo mốc 20:00.')).toBeVisible()
  })
})
