// Typed TS array of DS2P Lab contributors — seeded from wvs-finance/abrigo-analytics git log.
// No runtime GitHub API fetch. This list is updated manually when contributors join the lab.

export interface Contributor {
  slug: string
  name: string
  role_es: string
  role_en: string
  github_handle: string
  avatar_url?: string
  focus_iteration_slug?: string
}

export const contributors: readonly Contributor[] = [
  {
    slug: 'jmsbpp',
    name: 'Juan Serrano',
    role_es: 'Investigador principal — econometría estructural',
    role_en: 'Principal researcher — structural econometrics',
    github_handle: 'JMSBPP',
    focus_iteration_slug: 'pair-d',
  },
] as const
