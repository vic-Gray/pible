import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'


describe('Button', () => {
  it('renders its children as text', () => {
    render(<Button>Save changes</Button>)
    expect(screen.getByText('Save changes')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(<Button onClick={handleClick}>Click me</Button>)
    await user.click(screen.getByRole('button', { name: 'Click me' }))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(
      <Button onClick={handleClick} disabled>
        Click me
      </Button>
    )
    await user.click(screen.getByRole('button', { name: 'Click me' }))

    expect(handleClick).not.toHaveBeenCalled()
  })

  it('disables the button and shows a spinner when loading', () => {
    render(<Button loading>Submit</Button>)

    const button = screen.getByRole('button', { name: 'Submit' })
    expect(button).toBeDisabled()
    expect(button.querySelector('svg.animate-spin')).toBeInTheDocument()
  })

  it('does not call onClick when loading', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(
      <Button onClick={handleClick} loading>
        Submit
      </Button>
    )
    await user.click(screen.getByRole('button', { name: 'Submit' }))

    expect(handleClick).not.toHaveBeenCalled()
  })
})