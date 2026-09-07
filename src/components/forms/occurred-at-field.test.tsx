import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { OccurredAtField } from './occurred-at-field'

afterEach(cleanup)

describe('OccurredAtField', () => {
  it('defaults to server current time without submitting a local timestamp', () => {
    render(<OccurredAtField />)

    expect(screen.getByRole('checkbox', { name: 'Dùng giờ hiện tại' })).toBeChecked()
    expect(screen.queryByLabelText('Thời gian thực tế')).not.toBeInTheDocument()
  })

  it('requires an actual time after the user disables fast entry', async () => {
    const user = userEvent.setup()
    render(<OccurredAtField />)

    await user.click(screen.getByRole('checkbox', { name: 'Dùng giờ hiện tại' }))

    const input = screen.getByLabelText('Thời gian thực tế')
    expect(input).toHaveAttribute('name', 'occurredAt')
    expect(input).toBeRequired()
    expect(input).toHaveAttribute('type', 'datetime-local')
  })
})
