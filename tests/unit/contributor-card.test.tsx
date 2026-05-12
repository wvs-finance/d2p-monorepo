// @vitest-environment jsdom
import { ContributorCard } from '@/components/ContributorCard'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

const baseContributor = {
  slug: 'jserrano',
  name: 'J. Serrano',
  role_es: 'Investigador principal',
  role_en: 'Lead researcher',
  github_handle: 'jmsbpp',
}

function mockT(key: string): string {
  const keys: Record<string, string> = {
    'team.github_link_label': 'GitHub',
    'team.current_iteration_label': 'Current iteration:',
    'team.no_assignment_label': 'None',
  }
  return keys[key] ?? key
}

describe('<ContributorCard />', () => {
  it('renders as a flex row <li> element', () => {
    const { container } = render(<ContributorCard contributor={baseContributor} t={mockT} />)
    const li = container.querySelector('li')
    expect(li).toBeInTheDocument()
    expect(li?.className).toContain('flex')
  })

  it('contains <img> with alt text matching "{name}\'s avatar"', () => {
    render(<ContributorCard contributor={baseContributor} t={mockT} />)
    const img = screen.getByRole('img')
    expect(img.getAttribute('alt')).toBe("J. Serrano's avatar")
  })

  it('GitHub link uses ArrowUpRight icon and points to https://github.com/{handle}', () => {
    const { container } = render(<ContributorCard contributor={baseContributor} t={mockT} />)
    const ghLink = container.querySelector('a[href^="https://github.com/"]')
    expect(ghLink).toBeInTheDocument()
    expect(ghLink?.getAttribute('href')).toBe('https://github.com/jmsbpp')
    // ArrowUpRight renders as an svg
    expect(ghLink?.querySelector('svg')).toBeInTheDocument()
  })

  it('row container has no border-radius class (divider-only treatment, no card)', () => {
    const { container } = render(<ContributorCard contributor={baseContributor} t={mockT} />)
    const li = container.querySelector('li')
    expect(li?.className).not.toContain('rounded-lg')
    expect(li?.className).not.toContain('rounded-xl')
    expect(li?.className).not.toContain('rounded-md')
  })
})
