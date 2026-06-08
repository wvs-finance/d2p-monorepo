// @vitest-environment jsdom
import { CheckmarkList } from '@/components/CheckmarkList'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('<CheckmarkList />', () => {
  const items = [
    'Decision-citation block before every test',
    'Trio checkpoint after every code cell',
    'HALT + disposition memo on spec/data conflict',
    'Rejection carries equal narrative weight as approval',
  ]

  it('renders <ul> (not <ol> or <div>)', () => {
    const { container } = render(<CheckmarkList items={items} />)
    expect(container.querySelector('ul')).toBeInTheDocument()
    expect(container.querySelector('ol')).not.toBeInTheDocument()
  })

  it('each item has CheckCircle2 icon with text-status-pass color class', () => {
    const { container } = render(<CheckmarkList items={items} />)
    const icons = container.querySelectorAll('.text-status-pass')
    expect(icons.length).toBe(items.length)
  })

  it('items are flex items-start gap-2 (icon top-aligned with text)', () => {
    const { container } = render(<CheckmarkList items={items} />)
    const listItems = container.querySelectorAll('li')
    expect(listItems.length).toBe(items.length)
    for (const li of listItems) {
      expect(li.className).toContain('flex')
      expect(li.className).toContain('items-start')
      expect(li.className).toContain('gap-2')
    }
  })
})
