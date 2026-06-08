---
phase: "01"
plan: "03"
subsystem: i18n
tags: [i18n, next-intl, locale, cookie, format, language-switcher, server-action, playwright]
dependency_graph:
  requires:
    - 01-01 (next-intl installed, createNextIntlPlugin pre-wired in next.config.ts)
  provides:
    - i18n/request.ts (getRequestConfig reading NEXT_LOCALE cookie, defaulting to es-CO)
    - messages/es-CO/{common,lab}.json
    - messages/en/{common,lab}.json
    - lib/format/{currency,date,number,index}.ts
    - components/LanguageSwitcher.tsx
    - app/actions/set-locale.ts
    - tests/e2e/locale-switch.spec.ts (2 real Playwright tests)
    - tests/unit/i18n.test.ts (5 real Vitest tests)
    - tests/unit/format.test.ts (15 real Vitest tests)
  affects:
    - All downstream plans consuming getTranslations() in RSC pages (01-04 and beyond)
    - All downstream format usage (every phase that renders currency/date/number)
tech_stack:
  added: []
  patterns:
    - "next-intl v4 without routing: getRequestConfig reads NEXT_LOCALE cookie via cookies() from next/headers"
    - "Message files: nested JSON objects (not flat dot-notation keys) — e.g. { hero: { wordmark: 'd2p Finance' } }"
    - "LanguageSwitcher as server component: two <form action={serverAction}> elements with submit buttons"
    - "setLocale server action: cookies().set + revalidatePath('/', 'layout') — NOT router.refresh"
    - "Vitest mocking next-intl/server: vi.mock with getRequestConfig as identity wrapper to bypass RSC check"
    - "// @vitest-environment node for server-side module tests"
key_files:
  created:
    - i18n/request.ts
    - messages/es-CO/common.json
    - messages/es-CO/lab.json
    - messages/en/common.json
    - messages/en/lab.json
    - lib/format/currency.ts
    - lib/format/date.ts
    - lib/format/number.ts
    - lib/format/index.ts
    - components/LanguageSwitcher.tsx
    - app/actions/set-locale.ts
  modified:
    - tests/unit/i18n.test.ts (replaced 3 todo stubs with 5 real tests)
    - tests/unit/format.test.ts (replaced 8 todo stubs with 15 real tests)
    - tests/e2e/locale-switch.spec.ts (replaced 2 test.fixme stubs with 2 real Playwright tests)
    - app/layout.tsx (added NextIntlClientProvider, LanguageSwitcher, lang={locale} on html tag)
decisions:
  - "Message files use nested JSON objects — next-intl expects { namespace: { key: value } } not flat dot keys"
  - "i18n.test.ts uses // @vitest-environment node to avoid jsdom context and vi.mock for getRequestConfig identity"
  - "LanguageSwitcher uses two adjacent forms (not a dropdown/menu) — simpler a11y, no JS needed for submission"
  - "Playwright chromium binary installed as part of execution (was not present)"
  - "next.config.ts NOT modified — already wired by Plan 01 with createNextIntlPlugin('./i18n/request.ts')"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-11"
  tasks_completed: 3
  tasks_total: 3
  files_created: 11
  files_modified: 4
  commits: 3
---

# Phase 1 Plan 03: next-intl i18n Infrastructure Summary

next-intl v4 "without routing" wired via getRequestConfig reading NEXT_LOCALE cookie; both locales authored side-by-side; locale-aware Intl wrappers in lib/format/; LanguageSwitcher server component backed by setLocale server action; 22 real test assertions replacing Wave 0 stubs.

---

## What Was Built

### Task 1: i18n/request.ts + message files

**`i18n/request.ts`** reads the `NEXT_LOCALE` cookie via `await cookies()`, validates against the allowlist `['es-CO', 'en']`, defaults to `'es-CO'` on missing or unsupported cookie value, then merges `common.json` + `lab.json` for that locale via dynamic imports and returns `{ locale, messages }`.

**Pattern used (from 01-RESEARCH.md Pattern 2):**
```typescript
export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get('NEXT_LOCALE')?.value
  const locale = isSupportedLocale(cookieValue) ? cookieValue : 'es-CO'
  // merge common + lab
  return { locale, messages }
})
```

**Message file structure** (nested JSON, not flat dot keys):
```json
// messages/es-CO/common.json
{
  "nav": { "skip_to_content": "Saltar al contenido" },
  "language_switcher": { "label": "Idioma", "es-CO": "Español (Colombia)", "en": "English" }
}

// messages/es-CO/lab.json
{
  "hero": {
    "wordmark": "d2p Finance",
    "tagline": "Coberturas convexas verificadas para los riesgos macro del trabajador asalariado en mercados de frontera."
  },
  "iteration_counts": { "heading": "Iteraciones publicadas", "pass": "Confirmadas", ... }
}
```

All 4 message files authored side-by-side in both locales from day one (CROSS-02, CROSS-10). Zero banned phrasing (empower/seamless/etc.) confirmed by grep.

**Vitest testing pattern** for server-only modules:
- `// @vitest-environment node` directive on the test file
- `vi.mock('next-intl/server', () => ({ getRequestConfig: (cb) => cb }))` makes the identity wrapper callable in tests
- `vi.mock('next/headers', () => ({ cookies: vi.fn() }))` allows cookie mock injection

### Task 2: lib/format/ Intl wrappers

Three modules with no raw `toLocaleString()` calls anywhere:

| Function | Signature | es-CO example | en example |
|---------|-----------|---------------|------------|
| `formatCurrency` | `(amount, locale, opts?)` | `$ 1.234,5` (COP) | `$1,234.50` (USD) |
| `formatDate` | `(date, locale, opts?)` | `11 de mayo de 2026` | `May 11, 2026` |
| `formatDateTime` | `(date, locale)` | includes time | includes time |
| `formatRelative` | `(date, locale)` | relative via `Intl.RelativeTimeFormat` | same |
| `formatNumber` | `(value, locale, opts?)` | `1.234.567,89` | `1,234,567.89` |
| `formatPercent` | `(value, locale, digits?)` | `12,34 %` | `12.34%` |

Locale defaults: `es-CO` → `COP`, `en` → `USD`. Override via `{ currency: 'USD' }` option.

### Task 3: LanguageSwitcher + setLocale + e2e tests

**`app/actions/set-locale.ts`** (server action):
- `'use server'` directive
- Sets `NEXT_LOCALE` cookie (maxAge 1 year, sameSite lax, path /)
- Calls `revalidatePath('/', 'layout')` — **not** `router.refresh()` (Pitfall 2 compliance)

**`components/LanguageSwitcher.tsx`** (async server component):
- Two `<form action={serverAction}>` elements, each with a submit `<button>`
- `<nav aria-label={t('label')}>` — `"Idioma"` in es-CO, `"Language"` in en
- `aria-current="true"` on the active locale button; `disabled` on the active locale button
- Tab order: es-CO button → en button (es-CO button disabled by default, so English gets first focus)
- Accessible names: `"Español (Colombia)"` and `"English"` matching test selectors

**`app/layout.tsx`** (updated by parallel Plan 06 but compatible):
- `<html lang={locale}>` provides the selector for e2e `toHaveAttribute('lang', ...)`
- `<NextIntlClientProvider>` wraps children for client component locale access

**e2e tests** (`tests/e2e/locale-switch.spec.ts`):
- `language switcher persists locale across reload via cookie` — switches to English, verifies `html[lang]`, checks cookie value, reloads, switches back
- `language switcher is keyboard-navigable` — focuses English button, presses Enter, verifies locale change

---

## Authored Message Keys

**Both locales have identical key structure (nested JSON):**

| Namespace | Keys | es-CO | en |
|-----------|------|-------|-----|
| `nav` | `skip_to_content` | "Saltar al contenido" | "Skip to content" |
| `footer` | `org_link` | "Organización en GitHub" | "Organization on GitHub" |
| `language_switcher` | `label`, `es-CO`, `en` | "Idioma" | "Language" |
| `hero` | `wordmark`, `tagline` | "d2p Finance" / tagline | "d2p Finance" / tagline |
| `iteration_counts` | `heading`, `pass`, `fail`, `parked`, `in_progress` | Spanish | English |
| `status` | `pass.label`, `fail.label`, `parked.label`, `in_progress.label` | PASA/FALLA/... | PASS/FAIL/... |

Banned-words grep confirmed zero matches: no "empower", "seamless", "revolutionize", "next-gen", "cutting-edge".

---

## Confirmation: next.config.ts NOT Modified

`grep -q "createNextIntlPlugin" next.config.ts` → present, unmodified from Plan 01 commit f05fffd. Plan 03 only created the `i18n/request.ts` file that `createNextIntlPlugin('./i18n/request.ts')` references.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Message files restructured from flat to nested JSON**
- **Found during:** Task 3 implementation
- **Issue:** Plan's action step specified flat dot-notation keys (`"language_switcher.label": "Idioma"`) but next-intl v4 expects nested JSON objects (`{ "language_switcher": { "label": "Idioma" } }`) for `getTranslations('language_switcher')` namespace access to work correctly
- **Fix:** Restructured all 4 message files to use nested objects; updated i18n.test.ts assertions to use nested key access (`result.messages['language_switcher']['label']`)
- **Files modified:** All 4 message JSON files, tests/unit/i18n.test.ts
- **Commits:** bc1f765 (initial), a859421 (restructured)

**2. [Rule 3 - Blocking issue] Playwright Chromium browser not installed**
- **Found during:** Task 3 e2e test run
- **Issue:** `chrome-headless-shell` binary absent from `~/.cache/ms-playwright/`
- **Fix:** Ran `pnpm exec playwright install chromium` (downloaded 113.2 MiB)
- **Commits:** Not a code commit — system dependency installation

**3. [Rule 2 - Missing critical functionality] Vitest test environment for server-only code**
- **Found during:** Task 1 RED→GREEN phase
- **Issue:** `next-intl/server`'s `getRequestConfig` throws "not supported in Client Components" when called in jsdom environment; the `react-server` export condition is only resolved in actual RSC context
- **Fix:** Added `// @vitest-environment node` directive + `vi.mock('next-intl/server', () => ({ getRequestConfig: (cb) => cb }))` to make the callback directly invocable
- **Files modified:** tests/unit/i18n.test.ts
- **Commits:** bc1f765

### Out-of-Scope Observations (Deferred)

- `tests/unit/status-pill.test.ts` was replaced by `tests/unit/status-pill.test.tsx` by a parallel plan (01-02) with real assertions referencing `@/components/StatusPill` which doesn't exist yet. This introduces TypeScript errors in `tsc --noEmit`. This is a parallel-plan coordination issue outside Plan 03 scope — will be resolved when the StatusPill component is created.
- `experimental.typedRoutes` → `typedRoutes` warning from Next.js in playwright output — noted but outside Plan 03 scope (next.config.ts is FINAL per Plan 01 decision).

---

## Open Issues for Phase 2

- Add `messages/es-CO/iterations.json` and `messages/en/iterations.json` when the iterations page is built in Phase 2 (LAB-03, ITER-05)
- The `messages/{locale}/lab.json` stub keys (hero.wordmark, iteration_counts.*) will be consumed by Phase 2's real homepage — no schema changes needed, keys are already there
- Consider adding `@formatjs/intl` for more advanced plural/gender message formatting if needed in Phase 2+

---

## Verification Results

| Check | Result |
|-------|--------|
| `pnpm vitest run tests/unit/i18n.test.ts` | 5 passed |
| `pnpm vitest run tests/unit/format.test.ts` | 15 passed |
| `pnpm playwright test tests/e2e/locale-switch.spec.ts` | 2 passed |
| `i18n/request.ts` exists with `getRequestConfig` | PASS |
| `next.config.ts` unmodified (createNextIntlPlugin present) | PASS |
| 4 message files (both locales, common + lab) | PASS |
| `lib/format/{currency,date,number,index}.ts` exist | PASS |
| `components/LanguageSwitcher.tsx` with aria-current + aria-label | PASS |
| `app/actions/set-locale.ts` with 'use server' + revalidatePath | PASS |
| No `test.fixme` in locale-switch.spec.ts | PASS |
| No banned phrasing in messages/ | PASS |
| No raw `toLocaleString()` outside lib/format/ | PASS |

---

## Self-Check: PASSED
