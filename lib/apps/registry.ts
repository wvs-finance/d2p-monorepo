// lib/apps/registry.ts — typed source of truth for all hedge-instrument app families.
// Adding a new app is a one-line change to the `apps` array (NAV-02).
// The dropdown component, /apps index page, and MCP list_apps() tool all read from here.

export type AppStatus = 'active' | 'coming-soon' | 'archived'

export interface AppEntry {
  /** URL segment, e.g., 'abrigo' */
  slug: string
  /** Display name, e.g., 'Abrigo' */
  name: string
  /** i18n key into messages/{locale}/nav.json apps namespace */
  description_key: string
  status: AppStatus
  /** Where the dropdown entry's primary click navigates */
  internal_path: `/apps/${string}`
  /** Secondary icon-only link affordance — opens in new tab (e.g., Twitter presence) */
  external_url?: string
}

export const apps: readonly AppEntry[] = [
  {
    slug: 'abrigo',
    name: 'Abrigo',
    description_key: 'apps.abrigo.description',
    status: 'active',
    internal_path: '/apps/abrigo',
    external_url: 'https://x.com/d2pfinabrigo',
  },
] as const

export function getApp(slug: string): AppEntry | undefined {
  return apps.find((a) => a.slug === slug)
}
