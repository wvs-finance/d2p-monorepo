---
phase: "01"
plan: "01"
subsystem: scaffold
tags: [scaffold, toolchain, next.js, biome, vitest, playwright, msw, lefthook, wave-0]
dependency_graph:
  requires: []
  provides:
    - package.json locked manifest with all Phase 1 deps
    - next.config.ts FINAL with env+intl+velite integrations
    - tsconfig.json strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes
    - biome.json lint+format config
    - lefthook.yml pre-commit + commit-msg hooks
    - vitest.config.ts + playwright.config.ts + lighthouserc.cjs
    - tests/setup.ts MSW bootstrap
    - 14 Wave 0 stub test files (it.todo/test.fixme)
  affects:
    - All subsequent plans (01-02 through 08) — every plan commits against this scaffold
tech_stack:
  added:
    - next@16.2.6
    - react@19.2.4
    - typescript@5.9.3
    - tailwindcss@4.3.0
    - "@biomejs/biome@1.9.4"
    - lefthook@2.1.6
    - vitest@4.1.6
    - "@playwright/test@1.60.0"
    - msw@2.14.6
    - velite@0.3.1
    - next-intl@4.11.2
    - wagmi@2.19.5
    - viem@2.48.11
    - "@rainbow-me/rainbowkit@2.2.11"
    - "@t3-oss/env-nextjs@0.13.11"
    - mcp-handler@1.1.0
    - "@modelcontextprotocol/sdk@1.29.0"
    - schema-dts@2.0.0
    - "@axe-core/playwright@4.11.3"
    - "@lhci/cli@0.15.1"
    - "@wagmi/cli@2.10.0"
    - commitlint@21.0.0
  patterns:
    - tmpdir workaround for pnpm create next-app in directory with existing .git
    - biome-ignore lint/suspicious/noExplicitAny for webpack config type
    - it.skipIf(hasSemanticTokens()) for tokens.test.ts to defer until Plan 02
    - exactOptionalPropertyTypes-safe webServer in playwright.config.ts (conditional spread)
key_files:
  created:
    - package.json
    - tsconfig.json
    - next.config.ts
    - lib/env.ts
    - biome.json
    - lefthook.yml
    - commitlint.config.cjs
    - vitest.config.ts
    - playwright.config.ts
    - lighthouserc.cjs
    - tests/setup.ts
    - msw/handlers.ts
    - msw/server.ts
    - tests/unit/format.test.ts
    - tests/unit/tokens.test.ts
    - tests/unit/i18n.test.ts
    - tests/unit/velite-schema.test.ts
    - tests/unit/wagmi-config.test.ts
    - tests/unit/status-pill.test.ts
    - tests/unit/anti-patterns.test.ts
    - tests/api/health.test.ts
    - tests/architecture/no-wallet-in-lab.test.ts
    - tests/e2e/homepage.spec.ts
    - tests/e2e/agent-stubs.spec.ts
    - tests/e2e/locale-switch.spec.ts
    - tests/a11y/homepage.spec.ts
    - .nvmrc
    - .editorconfig
    - .gitattributes
    - .env.example
  modified:
    - .gitignore
    - app/layout.tsx
    - app/page.tsx
decisions:
  - "@biomejs/biome@1.9.4 installed (NOT the standalone 'biome' package at v0.3.x)"
  - "next.config.ts is THE FINAL VERSION — Plans 03/06/07 only create referenced files"
  - "architecture test uses .test.ts extension (Vitest collects, Playwright excludes)"
  - "tokens.test.ts uses hasSemanticTokens() helper to skip gracefully until Plan 02"
  - "biome.json ignores .planning/ and .claude/ directories to prevent config.json noise"
  - "exactOptionalPropertyTypes requires webServer conditional spread in playwright.config.ts"
metrics:
  duration: "~9 minutes"
  completed: "2026-05-11"
  tasks_completed: 3
  tasks_total: 3
  files_created: 30
  commits: 3
---

# Phase 1 Plan 01: Project Scaffold and Wave 0 Test Infrastructure Summary

Bootstrap Next.js 16.2 + TypeScript 5.8 + Tailwind v4 toolchain with FINAL next.config.ts
pre-wiring env validation, next-intl plugin, and VeliteWebpackPlugin; seeded all 14 Wave 0
stub test files so every later plan writes code against a test that already exists.

---

## What Was Built

### Task 1: Bootstrap Next.js 16.2 + FINAL next.config.ts

Used the tmpdir workaround (scaffold in `/tmp/nextjs-scaffold-tmp`, copy app/, public/,
package.json, tsconfig.json, next.config.ts, etc.) since `pnpm create next-app` refuses
to scaffold into a directory containing `.git`.

**Final installed versions (from `pnpm list --depth 0`):**

| Package | Installed |
|---------|-----------|
| next | 16.2.6 |
| react / react-dom | 19.2.4 |
| typescript | 5.9.3 |
| tailwindcss | 4.3.0 |
| @biomejs/biome | 1.9.4 |
| lefthook | 2.1.6 |
| vitest | 4.1.6 |
| @playwright/test | 1.60.0 |
| playwright | 1.60.0 |
| msw | 2.14.6 |
| velite | 0.3.1 |
| next-intl | 4.11.2 |
| wagmi | 2.19.5 |
| viem | 2.48.11 |
| @rainbow-me/rainbowkit | 2.2.11 |
| @t3-oss/env-nextjs | 0.13.11 |
| mcp-handler | 1.1.0 |
| @modelcontextprotocol/sdk | 1.29.0 |
| schema-dts | 2.0.0 |
| @axe-core/playwright | 4.11.3 |
| @lhci/cli | 0.15.1 |
| @wagmi/cli | 2.10.0 |
| commitlint | 21.0.0 |

**Confirmation:** `@biomejs/biome` (the correct Biome linter/formatter at v1.9.4) was
installed — NOT the unrelated `biome` package at v0.3.x.

**FINAL `next.config.ts` content** (Plans 03/06/07 will NOT modify this file):

```typescript
import './lib/env'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

class VeliteWebpackPlugin {
  static started = false
  apply(compiler: any) {
    compiler.hooks.beforeCompile.tapPromise('VeliteWebpackPlugin', async () => {
      if (VeliteWebpackPlugin.started) return
      VeliteWebpackPlugin.started = true
      const dev = compiler.options.mode === 'development'
      const { build } = await import('velite')
      await build({ watch: dev, clean: !dev })
    })
  }
}

const nextConfig = {
  reactStrictMode: true,
  experimental: { typedRoutes: true },
  webpack: (config: any) => {
    config.plugins.push(new VeliteWebpackPlugin())
    return config
  },
}

export default withNextIntl(nextConfig)
```

**Note:** This config will fail `next build` until Plans 03 (i18n/request.ts), 06
(velite.config.ts), and 07 (lib/env.ts full schema) complete. That is intentional —
those plans are wave-2 dependencies.

`lib/env.ts` is a minimal placeholder that makes the import side-effect succeed:

```typescript
export const env = createEnv({
  server: { NODE_ENV: z.enum(['development', 'test', 'production']).default('development') },
  client: {},
  runtimeEnv: { NODE_ENV: process.env.NODE_ENV },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
})
```

### Task 2: Biome, lefthook, commitlint, test framework configs

- **biome.json:** recommended preset, useImportType=error, a11y rules enabled, ignores
  `.planning/` and `.claude/` directories (which contain JSON files not part of the app)
- **lefthook.yml:** pre-commit runs biome check (staged files) + tsc --incremental +
  velite-validate (MDX files only); commit-msg runs commitlint
- **Verified:** `.git/hooks/pre-commit` and `.git/hooks/commit-msg` both exist
- **playwright.config.ts:** uses conditional spread `...(webServer ? { webServer } : {})`
  to satisfy `exactOptionalPropertyTypes: true` TypeScript strictness
- **lighthouserc.cjs:** Moto G Power 412x823 @ 2.625 DPR, Slow 4G simulation;
  LCP < 2500ms as `error`, TBT < 200ms as `error`

### Task 3: Wave 0 Stub Test Files

All 14 stub test files created. Architecture test uses `.test.ts` (Vitest collects it;
Playwright ignores `**/architecture/**`):

| File | Covers | Extension |
|------|--------|-----------|
| tests/unit/format.test.ts | FOUND-13, CROSS-06/07/08 | .test.ts (Vitest) |
| tests/unit/tokens.test.ts | FOUND-02, CROSS-05 | .test.ts (Vitest) |
| tests/unit/i18n.test.ts | FOUND-03, CROSS-02 | .test.ts (Vitest) |
| tests/unit/velite-schema.test.ts | FOUND-04 | .test.ts (Vitest) |
| tests/unit/wagmi-config.test.ts | FOUND-05 | .test.ts (Vitest) |
| tests/unit/status-pill.test.ts | CROSS-09 | .test.ts (Vitest) |
| tests/unit/anti-patterns.test.ts | CROSS-04 | .test.ts (Vitest) |
| tests/api/health.test.ts | smoke | .test.ts (Vitest) |
| tests/architecture/no-wallet-in-lab.test.ts | FOUND-11 | .test.ts (Vitest, NOT Playwright) |
| tests/e2e/homepage.spec.ts | CROSS-02 | .spec.ts (Playwright) |
| tests/e2e/agent-stubs.spec.ts | FOUND-12 | .spec.ts (Playwright) |
| tests/e2e/locale-switch.spec.ts | CROSS-02 | .spec.ts (Playwright) |
| tests/a11y/homepage.spec.ts | FOUND-09, CROSS-01 | .spec.ts (Playwright axe) |

**Note:** Architecture test uses `.test.ts` (not `.spec.ts`) so Vitest collects it and
Playwright's `testIgnore: ['**/architecture/**']` excludes it correctly.

**Test run result:** `vitest run` exits 0 with 2 passing tests (Intl primitives sanity
tests in format.test.ts), 3 skipped (tokens tests deferred until Plan 02 provides full
globals.css), 28 todo stubs.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript error: `Cannot find module 'webpack'` in next.config.ts**
- **Found during:** Task 2 commit (pre-commit hook caught it)
- **Issue:** Original plan's `next.config.ts` used `import('webpack').Compiler` type but
  webpack types are not a direct dependency
- **Fix:** Changed to `compiler: any` with `biome-ignore lint/suspicious/noExplicitAny`
  comment; also moved velite import to dynamic import inside tapPromise
- **Files modified:** next.config.ts
- **Commit:** f05fffd

**2. [Rule 1 - Bug] TypeScript error: exactOptionalPropertyTypes breaks webServer in playwright.config.ts**
- **Found during:** Task 2 commit (pre-commit tsc hook caught it)
- **Issue:** `process.env.CI ? undefined : { ... }` assigned to `webServer` property fails
  with `exactOptionalPropertyTypes: true` because `undefined` is not assignable
- **Fix:** Extract `webServer` const first, then use `...(webServer ? { webServer } : {})`
  conditional spread in defineConfig
- **Files modified:** playwright.config.ts
- **Commit:** f05fffd

**3. [Rule 1 - Bug] TypeScript error: `Cannot find module '../msw/server'` in tests/setup.ts**
- **Found during:** Task 2 commit (msw/ files are Task 3 work but tests/setup.ts needs them)
- **Issue:** tests/setup.ts imports from msw/server which didn't exist yet
- **Fix:** Created msw/handlers.ts and msw/server.ts in Task 2 commit to satisfy the import
- **Files modified:** msw/handlers.ts (created), msw/server.ts (created)
- **Commit:** f05fffd

**4. [Rule 1 - Bug] tokens.test.ts fails because globals.css has default Next.js content**
- **Found during:** Task 3 vitest run
- **Issue:** The plan's `it.skipIf(!existsSync(globalsPath))` skips if the file doesn't
  exist, but globals.css exists (from scaffold) without the d2p Finance semantic tokens.
  Tests would fail instead of skip.
- **Fix:** Changed `skipIf` condition to `hasSemanticTokens()` helper that checks for
  `--color-bg-canvas` presence in the CSS file content. Tests now skip gracefully until
  Plan 02 installs the full design token set.
- **Files modified:** tests/unit/tokens.test.ts
- **Commit:** fc7a883

**5. [Rule 2 - Missing critical functionality] biome.json must ignore .planning/ and .claude/**
- **Found during:** Task 2 biome check run
- **Issue:** Biome was trying to format `.planning/config.json` and `.claude/settings.json`
  which are outside the app's source scope; format differences caused check failures
- **Fix:** Added `.planning/**` and `.claude/**` to biome.json `files.ignore` array
- **Files modified:** biome.json
- **Commit:** f05fffd

**6. [Rule 1 - Bug] Geist font in app/layout.tsx violates impeccable anti-pattern**
- **Found during:** Task 2 review
- **Issue:** The scaffolded layout.tsx used `next/font/google` with Geist fonts, which is
  on the impeccable `overused-font` blocklist. Running impeccable in CI would fail on PR #1.
- **Fix:** Removed Geist font imports, replaced with plain system font via CSS. Updated
  metadata to d2p Finance branding.
- **Files modified:** app/layout.tsx
- **Commit:** f05fffd

### User Setup Items (Non-blocking)

Per the plan's `user_setup` section, the following manual steps are deferred to the user:

1. **Vercel project linking:** Create Vercel project via dashboard, link to GitHub repo,
   run `vercel link` to create `.vercel/project.json`. The plan notes this doesn't block
   execution. No `.vercel/project.json` exists yet.
2. **GitHub repo creation:** Push the scaffold commits to `wvs-finance/frontend` (or
   chosen repo name) at GitHub.

---

## Verification Results

| Check | Result |
|-------|--------|
| `pnpm install --frozen-lockfile=false` | exit 0 |
| `pnpm tsc --noEmit` | exit 0 |
| `pnpm biome check .` | exit 0, 29 files checked |
| `pnpm vitest run` | exit 0, 2 pass / 3 skip / 28 todo |
| `.git/hooks/pre-commit` exists | yes |
| `.git/hooks/commit-msg` exists | yes |
| `next.config.ts` contains env import | yes |
| `next.config.ts` contains createNextIntlPlugin | yes |
| `next.config.ts` contains VeliteWebpackPlugin | yes |
| architecture test uses `.test.ts` | yes |
| `grep -r "it.todo\|test.fixme" tests/ \| wc -l` | 36 (>= 20 required) |

---

## Self-Check: PASSED

All files confirmed present on disk. All 3 commits confirmed in git log.

| Item | Status |
|------|--------|
| All key source files exist | PASSED |
| All 13 Wave 0 test files exist | PASSED |
| Task 1 commit b3ee9a0 | FOUND |
| Task 2 commit f05fffd | FOUND |
| Task 3 commit fc7a883 | FOUND |
| `pnpm vitest run` exits 0 | PASSED |
| `pnpm tsc --noEmit` exits 0 | PASSED |
| `pnpm biome check .` exits 0 | PASSED |
| `.git/hooks/pre-commit` exists | PASSED |
| `.git/hooks/commit-msg` exists | PASSED |
