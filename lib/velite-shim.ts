// Velite runtime shim — import entry point for the @/.velite alias.
//
// WHY THIS FILE EXISTS:
// Velite 0.3.x generates .velite/index.js using ES2023 JSON import assertions
// ("export { default as X } from './X.json' with { type: 'json' }").
// webpack 5 / Turbopack in Next.js do not reliably process that syntax, producing
// non-iterable module exports at runtime.
//
// HOW THIS WORKS:
// - tsconfig.json paths: "@/.velite" → this file (runtime values via static import)
// - This split gives correct types at compile time + correct values at runtime.
//
// Static JSON imports — Webpack/Turbopack inline these into the bundle, so the data
// travels with the serverless function on Vercel. require() leaves the files outside
// the lambda bundle (outputFileTracingIncludes also fails to pick them up reliably
// across route groups), causing HTTP 500 at runtime even when the build succeeds.
import researchData from '../.velite/research.json'
import type __vc from '../velite.config'

type Collections = typeof __vc.collections
type Research = Collections['research']['schema']['_output']

// Revive Date fields: the Velite schema uses s.coerce.date() so the in-memory
// shape has Date instances, but JSON serialization writes ISO strings. Without
// re-coercion the runtime calls research.date.toISOString() on a string and crashes.
export const research: Research[] = (researchData as unknown[]).map((raw) => {
  const r = raw as Research & { date: string | Date }
  return { ...r, date: new Date(r.date) } as Research
})
