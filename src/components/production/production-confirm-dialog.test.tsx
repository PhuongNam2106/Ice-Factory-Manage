import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProductionConfirmDialog } from './production-confirm-dialog'

afterEach(cleanup)

describe('ProductionConfirmDialog', () => {
  it('shows the selected machine and the proposed action time', () => {
    render(
      <ProductionConfirmDialog
        action="Xả đá"
        actionAt={new Date('2026-09-05T14:07:00Z')}
        busy={false}
        machineName="Máy 1"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByText('Máy 1')).toBeInTheDocument()
    expect(screen.getByText('21:07 · 05/09/2026')).toBeInTheDocument()
  })
})
