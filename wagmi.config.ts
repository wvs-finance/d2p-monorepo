import { defineConfig } from '@wagmi/cli'
import { foundry, react } from '@wagmi/cli/plugins'

// Phase 1 placeholder configuration.
// The actual '../abrigo/out/' directory may not yet contain compiled Foundry artifacts.
// 'pnpm contracts:gen' is intentionally NOT part of the default CI build.
// Phase 2 spike resolves the real artifact paths before Phase 3 codegen runs.
//
// When Phase 2 confirms abrigo artifact paths:
//   1. Update `project` and `artifacts` fields below.
//   2. Run `pnpm contracts:gen` to populate lib/contracts/generated.ts.
//   3. Commit the generated file.

export default defineConfig({
  out: 'lib/contracts/generated.ts',
  plugins: [
    foundry({
      project: '../abrigo',
      artifacts: 'out/',
    }),
    react(),
  ],
})
