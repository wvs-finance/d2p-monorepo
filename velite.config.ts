import { defineCollection, defineConfig, s } from 'velite'

// Export the raw Zod schema shape for unit test isolation (no Velite build pipeline).
// The research collection is the lab's public-facing record of published work
// (papers, decision memos, write-ups, talks). The underlying econometric exercise
// lives in the wvs-finance/abrigo-analytics repo and is intentionally NOT rendered
// on this site — only finished research artifacts are surfaced here and on X.
export const researchSchema = s.object({
  slug: s.string().regex(/^[a-z0-9-]+$/),
  title_es: s.string().min(1),
  title_en: s.string().min(1),
  authors: s.array(s.string()).min(1),
  date: s.coerce.date(),
  type: s.enum(['paper', 'decision-memo', 'write-up', 'talk']),
  external_url: s.string().url().optional(),
  summary_es: s.string().min(1),
  summary_en: s.string().min(1),
  tags: s.array(s.string()).default([]),
  order: s.number().int().positive().optional(),
})

const research = defineCollection({
  name: 'Research',
  pattern: 'research/*.mdx',
  schema: researchSchema,
})

export default defineConfig({
  root: 'content',
  output: {
    data: '.velite',
    assets: 'public/static',
    base: '/static/',
    name: '[name]-[hash:6].[ext]',
    clean: true,
  },
  collections: { research },
})
