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
// - tsconfig.json paths: "@/.velite" → ".velite/index.ts" (TypeScript type declarations)
// - This split gives correct types at compile time + correct values at runtime.
//
// Uses relative path from lib/ to .velite/ so webpack can trace it statically.

import type __vc from '../velite.config'

type Collections = typeof __vc.collections
type Iteration = Collections['iterations']['schema']['_output']
type Research = Collections['research']['schema']['_output']

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const iterations: Iteration[] = require('../.velite/iterations.json')
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const research: Research[] = require('../.velite/research.json')
