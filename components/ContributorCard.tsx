// Server Component — no 'use client'
import { ArrowUpRight } from 'lucide-react'

export interface Contributor {
  slug: string
  name: string
  role_es: string
  role_en: string
  github_handle: string
  avatar_url?: string
  focus_iteration_slug?: string
}

export interface ContributorCardProps {
  contributor: Contributor
  t: (key: string) => string
  locale?: 'es-CO' | 'en'
  'data-testid'?: string
}

export function ContributorCard({
  contributor,
  t,
  locale = 'en',
  'data-testid': testId,
}: ContributorCardProps) {
  const { name, role_es, role_en, github_handle, avatar_url, focus_iteration_slug } = contributor
  const role = locale === 'es-CO' ? role_es : role_en
  const avatarSrc = avatar_url ?? `https://github.com/${github_handle}.png`

  return (
    <li
      data-testid={testId}
      className="flex items-center gap-4 py-4 border-b border-border-default last:border-b-0"
    >
      <img
        src={avatarSrc}
        alt={`${name}'s avatar`}
        className="h-10 w-10 rounded-full bg-bg-surface"
        loading="lazy"
        width={40}
        height={40}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">{name}</p>
        <p className="text-sm text-text-secondary truncate">{role}</p>
        {focus_iteration_slug && (
          <p className="text-xs text-text-muted mt-0.5">
            {t('team.current_iteration_label')} {focus_iteration_slug}
          </p>
        )}
      </div>
      <a
        href={`https://github.com/${github_handle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-accent-default hover:underline shrink-0"
        aria-label={`${t('team.github_link_label')}: ${name}`}
      >
        {t('team.github_link_label')}
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </li>
  )
}
