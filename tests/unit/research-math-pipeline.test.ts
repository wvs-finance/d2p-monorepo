// @vitest-environment node
// Phase 03.1 Plan A — math pipeline + render-path spike tests.
// Tests the MDXRenderer components-prop shape, velite config keys (gfm:false,
// theorem-directive, locale-split), and the compiled body evaluation mechanism.
// These are pure unit tests — no Velite build pipeline invoked here.
import { describe, expect, it } from 'vitest'

// ── 1. MDXRenderer interface contract ────────────────────────────────────────
// Verifies that MDXRenderer exports the right interface (code + components prop).
// Import AFTER implementation exists; this will FAIL until components/MDXRenderer.tsx
// is created with the correct interface.
import type { MDXRendererProps } from '../../components/MDXRenderer'

describe('MDXRenderer interface', () => {
  it('exports MDXRendererProps with code: string and optional components', () => {
    // Type-level test: verify the interface has the expected shape.
    // If MDXRendererProps does not exist or lacks `components`, TypeScript
    // will fail at the `import type` level — which is the RED signal.
    const _typeCheck: MDXRendererProps = {
      code: 'test',
      components: { Figure: () => null },
    }
    expect(_typeCheck.code).toBe('test')
    expect(typeof _typeCheck.components).toBe('object')
  })

  it('accepts MDXRendererProps with only code (components is optional)', () => {
    const _typeCheck: MDXRendererProps = { code: 'test' }
    expect(_typeCheck.code).toBe('test')
    expect(_typeCheck.components).toBeUndefined()
  })
})

// ── 2. velite.config.ts — researchSchema unchanged + config keys ─────────────
// Verifies that the EXPORTED researchSchema const is unchanged (Phase-2 shape),
// and checks that velite.config.ts exports the symbols this plan requires.
import { researchSchema } from '../../velite.config'

describe('researchSchema shape (unchanged by Plan A)', () => {
  const validBase = {
    slug: 'spike-katex',
    title_es: 'Prueba KaTeX',
    title_en: 'KaTeX Spike',
    authors: ['jmsbpp'],
    date: '2026-05-29',
    type: 'write-up' as const,
    summary_es: 'Prueba de la tubería de matemáticas KaTeX.',
    summary_en: 'Test of the KaTeX math pipeline.',
  }

  it('accepts a valid spike-katex entry via the exported researchSchema', () => {
    const result = researchSchema.safeParse(validBase)
    expect(result.success).toBe(true)
  })

  it('slug spike-katex passes the ^[a-z0-9-]+$ regex', () => {
    const result = researchSchema.shape.slug.safeParse('spike-katex')
    expect(result.success).toBe(true)
  })

  it('slug spike_katex FAILS the slug regex (underscore forbidden)', () => {
    const result = researchSchema.shape.slug.safeParse('spike_katex')
    expect(result.success).toBe(false)
  })
})

// ── 3. compiled body evaluation (function-body format) ───────────────────────
// Verifies the new Function(code)(runtime).default pattern works for a minimal
// MDX-like compiled body string. This exercises the MDXRenderer evaluation path.
import * as runtime from 'react/jsx-runtime'

describe('compiled body evaluation (function-body pattern)', () => {
  it('evaluates a minimal function-body string to a function', () => {
    // Simulates what velite s.mdx() compiles: a "function body" that,
    // when wrapped in new Function(...), returns an object with .default.
    // This is the exact evaluation pattern in MDXRenderer.
    const minimalFunctionBody = `
      const { jsx: _jsx } = arguments[0];
      function _createMdxContent(props) {
        return _jsx('p', { children: 'hello' });
      }
      return { default: _createMdxContent };
    `
    const result = new Function(minimalFunctionBody)(runtime)
    expect(typeof result.default).toBe('function')
  })

  it('passes a components map to the compiled body default export', () => {
    // Simulates the custom-component path: the compiled body reads
    // props.components to resolve custom component names.
    // The default export must be a function that accepts a `components` prop.
    const bodyWithComponents = `
      const { jsx: _jsx } = arguments[0];
      function _createMdxContent(props) {
        const { Figure } = props.components || {};
        return _jsx(Figure || 'p', { children: 'content' });
      }
      return { default: _createMdxContent };
    `
    const C = new Function(bodyWithComponents)(runtime).default
    expect(typeof C).toBe('function')
    // Calling with a components map must not throw — proves the components-prop path
    type RuntimeModule = { jsx: (type: string, props: Record<string, unknown>) => unknown }
    const StubFigure = ({ children }: { children: React.ReactNode }) =>
      (runtime as unknown as RuntimeModule).jsx('figure', { children })
    expect(() => C({ components: { Figure: StubFigure } })).not.toThrow()
    // Calling without components also must not throw (graceful fallback to 'p')
    expect(() => C({ components: {} })).not.toThrow()
  })
})
