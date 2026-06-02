import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeKatex from 'rehype-katex'
import rehypeSlug from 'rehype-slug'
import remarkDirective from 'remark-directive'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { visit } from 'unist-util-visit'
import { defineCollection, defineConfig, s } from 'velite'

// ── remarkTheoremDirective ────────────────────────────────────────────────────
// Maps :::theorem / :::definition / :::lemma / :::proof container directives
// to the `TheoremBlock` component name so Plan C's component map can render them.
// remark-directive parses the `:::name` syntax into `containerDirective` nodes.
// This plugin sets `hName = 'TheoremBlock'` so rehype-mdx turns them into
// <TheoremBlock kind="theorem" label="…"> elements in the compiled body.
type DirectiveNode = {
  type: string
  name?: string
  data?: {
    hName?: string
    hProperties?: Record<string, unknown>
  }
  attributes?: Record<string, string>
}

function remarkTheoremDirective() {
  const theoremNames = new Set(['theorem', 'definition', 'lemma', 'proof'])
  return (tree: Parameters<typeof visit>[0]) => {
    visit(tree, 'containerDirective', (node) => {
      const dn = node as DirectiveNode
      if (!dn.name || !theoremNames.has(dn.name)) return
      dn.data = dn.data ?? {}
      dn.data.hName = 'TheoremBlock'
      dn.data.hProperties = {
        kind: dn.name,
        label: dn.attributes?.label ?? '',
      }
    })
  }
}

// ── researchSchema ────────────────────────────────────────────────────────────
// Export the raw Zod schema shape for unit test isolation (no Velite build pipeline).
// The research collection is the lab's public-facing record of published work
// (papers, decision memos, write-ups, talks). The underlying econometric exercise
// lives in the wvs-finance/abrigo-analytics repo and is intentionally NOT rendered
// on this site — only finished research artifacts are surfaced here and on X.
//
// SPLIT: this exported const holds the Phase-2 frontmatter shape ONLY.
// Body, locale, and toc live on the COLLECTION schema below (Plan C consumes them).
// Plan B owns frontmatter field additions (track, readable_on_site, etc.).
export const researchSchema = s.object({
  slug: s.string().regex(/^[a-z0-9-]+$/),
  title_es: s.string().min(1),
  title_en: s.string().min(1),
  authors: s.array(s.string()).min(1),
  date: s.coerce.date(),
  type: s.enum(['paper', 'decision-memo', 'write-up', 'talk']),
  // Plan B: track is REQUIRED — adding it breaks velite build until all files carry it.
  // Migration of the 3 existing research MDX and this schema change land ATOMICALLY.
  track: s.enum(['cfmm-microstructure', 'abrigo-hedge-design', 'notes']),
  readable_on_site: s.boolean().default(false),
  external_url: s.string().url().optional(),
  summary_es: s.string().min(1),
  summary_en: s.string().min(1),
  abstract_es: s.string().optional(),
  abstract_en: s.string().optional(),
  // arxiv_id: post-2007 format only (YYYY.NNNNN[vN]); abs/PDF URLs derived at render time
  arxiv_id: s
    .string()
    .regex(/^\d{4}\.\d{4,5}(v\d+)?$/)
    .optional(),
  pdf_url: s.string().url().optional(),
  doi: s.string().optional(),
  bibtex: s.string().optional(),
  tags: s.array(s.string()).default([]),
  order: s.number().int().positive().optional(),
})

// ── M2: exported consts for velite non-collision test (05.1-03) ──────────────
// The test asserts veliteRoot === 'content' and researchPattern does NOT include
// 'docs/book' — proving docs/book/ is outside the Velite glob and cannot perturb
// the build (DEFI-09 non-collision invariant).
export const veliteRoot = 'content'
export const researchPattern = 'research/*.{es,en}.mdx'

// ── research collection (SPLIT) ───────────────────────────────────────────────
// The COLLECTION schema = researchSchema frontmatter fields + body + locale + toc.
// Pattern changed from 'research/*.mdx' to 'research/*.{es,en}.mdx' for locale-split.
//
// gfm: false — CRITICAL.
// Velite@0.3.1 source (node_modules/velite/dist/index.js L4982/L4989):
//   enableGfm = options.gfm ?? mdx.gfm ?? true
//   if (enableGfm) remarkPlugins.push(remarkGfm)   ← prepended BEFORE user plugins
// Without gfm:false the effective order is [remarkGfm(auto), …user plugins…],
// making remarkGfm double-registered and breaking math-first order.
// With gfm:false the effective order is exactly the user array:
//   [remarkMath, remarkGfm, remarkDirective, remarkTheoremDirective]
// — math first, GFM registered once. Spec §0 order honored.
//
// locale derivation: s.path() returns the SOURCE path relative to content/ root,
// stripping only the LAST extension. For 'research/spike-katex.es.mdx' it returns
// 'research/spike-katex.es' (the .es segment is preserved). We derive locale from
// the trailing '.es' or '.en' suffix.
const research = defineCollection({
  name: 'Research',
  pattern: researchPattern,
  schema: researchSchema.extend({
    body: s.mdx({
      // CRITICAL: suppress Velite's auto-prepend of remarkGfm (see above).
      gfm: false,
      // Spec §0 plugin order: remark-math → remark-gfm → remark-directive → theoremDirective
      remarkPlugins: [remarkMath, remarkGfm, remarkDirective, remarkTheoremDirective],
      // Spec §0 rehype order: rehype-slug → rehype-autolink-headings → rehype-katex
      // rehype-pretty-code DROPPED from v1 (no fenced code in spike fixtures; deferred to v2)
      rehypePlugins: [
        rehypeSlug,
        rehypeAutolinkHeadings,
        [rehypeKatex, { output: 'htmlAndMathml', throwOnError: false }],
      ],
    }),
    toc: s.toc(),
    // locale: derived from the source file path suffix (.es / .en)
    // s.path() returns e.g. 'research/spike-katex.es' for spike-katex.es.mdx
    locale: s.path().transform((p: string): 'es' | 'en' => (p.endsWith('.es') ? 'es' : 'en')),
  }),
})

export default defineConfig({
  root: veliteRoot,
  output: {
    data: '.velite',
    assets: 'public/static',
    base: '/static/',
    name: '[name]-[hash:6].[ext]',
    clean: true,
  },
  collections: { research },
})
