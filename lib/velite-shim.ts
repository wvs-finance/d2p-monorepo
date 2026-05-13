// Velite runtime shim — webpack entry point for @/.velite alias.
//
// WHY THIS FILE EXISTS:
// Velite 0.3.x generates .velite/index.js using ES2023 JSON import assertions
// ("export { default as X } from './X.json' with { type: 'json' }").
// webpack 5 in Next.js does not reliably process this syntax, producing
// non-iterable module exports at runtime.
//
// HOW THIS WORKS:
// - next.config.ts webpack alias: "@/.velite" → this file (runtime values via static require)
// - tsconfig.json paths: "@/.velite" → ".velite/index.d.ts" (TypeScript type declarations)
// - This split gives correct types at compile time + correct values at runtime.
//
// Uses relative path from lib/ to .velite/ so webpack can trace it statically.

// Static JSON imports — Webpack/Turbopack inline these into the bundle, so the data
// travels with the serverless function on Vercel. require() leaves the files outside
// the lambda bundle (outputFileTracingIncludes also fails to pick them up reliably
// across route groups), causing HTTP 500 at runtime even when the build succeeds.
import iterationsData from '../.velite/iterations.json'
import researchData from '../.velite/research.json'
import type __vc from '../velite.config'

type Collections = typeof __vc.collections
type Iteration = Collections['iterations']['schema']['_output']
type Research = Collections['research']['schema']['_output']

// Revive Date fields: the Velite schema uses s.coerce.date() so the in-memory
// shape has Date instances, but JSON serialization writes ISO strings. Without
// re-coercion the runtime calls iteration.analysis_date.toISOString() on a string
// and crashes with TypeError.
export const iterations: Iteration[] = (iterationsData as unknown[]).map((raw) => {
  const i = raw as Iteration & { analysis_date: string | Date }
  return { ...i, analysis_date: new Date(i.analysis_date) } as Iteration
})
export const research: Research[] = (researchData as unknown[]).map((raw) => {
  const r = raw as Research & { date: string | Date }
  return { ...r, date: new Date(r.date) } as Research
})
