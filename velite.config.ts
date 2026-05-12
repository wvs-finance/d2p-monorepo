import { defineCollection, defineConfig, s } from 'velite'

// Export the raw Zod schema shape so unit tests can parse objects directly
// without invoking the full Velite build pipeline.
export const iterationSchema = s
  .object({
    slug: s.string().regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumerics + hyphens'),
    version: s.number().int().positive(),
    status: s.enum(['PASS', 'FAIL', 'PARKED', 'IN_PROGRESS']),
    title_es: s.string().min(1),
    title_en: s.string().min(1),
    notebook_url: s.string().url().optional(),
    dataset_ref: s.string().min(1).optional(),
    analysis_date: s.coerce.date(),
    replication_hash: s
      .string()
      .regex(/^[a-f0-9]{64}$/, 'replication_hash must be lowercase sha256 hex (64 chars)')
      .optional(),
    beta: s.number().optional(),
    ci_lower: s.number().optional(),
    ci_upper: s.number().optional(),
    p_value: s.number().min(0).max(1).optional(),
    sample_size: s.number().int().positive().optional(),
    disposition_memo: s.string().optional(),
  })
  .refine(
    (data) =>
      data.status !== 'FAIL' ||
      (typeof data.disposition_memo === 'string' && data.disposition_memo.length > 0),
    {
      message: 'disposition_memo is required when status is FAIL',
      path: ['disposition_memo'],
    },
  )

const iterations = defineCollection({
  name: 'Iteration',
  pattern: 'iterations/**/*.mdx',
  schema: iterationSchema,
})

// Export the raw Zod schema shape for unit test isolation (no Velite build pipeline).
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
  collections: { iterations, research },
})
