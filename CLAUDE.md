# d2p-frontend — project instructions

## Ground-truth verification after every plan task

**After each GSD plan task is committed, run the `Evidence Collector` agent in live-verification mode against the affected route(s) before claiming the task is complete.** Type-check passes and unit-test green are necessary but not sufficient; the live DOM is the ground truth.

This rule exists because Phase 2 shipped a sequence of regressions that all passed `tsc --noEmit` + `vitest run` but produced HTTP 500 / 404 on the deployed site:

- Turbopack ignored `webpack:` config → `.velite/*.json` was missing from the lambda bundle
- After fixing the bundle, `s.coerce.date()` fields round-tripped through JSON as strings → `analysis_date.toISOString is not a function` at runtime
- The shim-level Date coercion didn't survive Turbopack's re-export bindings → callers needed defensive `new Date(...)` at each site

Each layer was invisible to typecheck and unit tests. Only a real browser hitting the deployed route caught them.

### How to invoke

After a plan task is committed (the `feat(NN-MM):` / `fix(NN-MM):` commit lands), launch:

```
Agent(
  subagent_type="Evidence Collector",
  description="Live verify task NN-MM",
  prompt="""
    Working dir: /home/jmsbpp/apps/d2p/frontend
    Target: https://www.d2pfinance.xyz (fall back to local `pnpm start` on port 3040 if the deployed route 4xx/5xx)
    Use the mcp__plugin_playwright_playwright__* tools.

    Task just completed: NN-MM — <short description>
    Routes affected: <list>
    Plan claims to verify: <copy from the plan's <success_criteria> or SUMMARY>

    For each affected route:
      1. browser_navigate
      2. browser_snapshot — assert each claim against the DOM
      3. browser_console_messages — surface runtime errors
      4. browser_take_screenshot — save as /tmp/d2p-verify/{task}-{slug}.png
      5. browser_evaluate for visual invariants (bounding-box equality, computed colors, etc.)

    Default to skepticism. If the plan claims a tile, see the tile. If the plan claims a status pill icon, read the icon node's aria-label. Screenshots are required, not optional.

    Output: append a section to .planning/phases/NN-<slug>/NN-LIVE-VERIFICATION.md with verdicts per claim (✓/⚠/✗/⊘) and screenshot paths. Return short text summary.
  """
)
```

### What counts as a pass

| Verdict | Meaning |
|---------|---------|
| ✓ PASS | Claim observed in DOM with screenshot evidence |
| ⚠ PARTIAL | Claim observed but with caveat (e.g. text matches but contrast fails) |
| ✗ FAIL | Claim does not hold; bug must be filed and fixed before next task |
| ⊘ UNREACHABLE | Route 4xx/5xx; cannot verify until resolved |

A task is **not complete** until every plan claim is ✓ or has an explicit waiver recorded in the LIVE-VERIFICATION.md.

### When to skip

- Pure config tasks that produce no user-visible route (e.g., `pnpm-lock.yaml` updates, token-only CSS changes, type-only refactors) — skip the live agent, but say so in the task SUMMARY.
- Hooks, MCP tools, or background workflows that have no rendered surface — verify with `curl` or `browser_network_request` against the relevant endpoint instead of `browser_snapshot`.

### Authorial notes

- Use the production URL when it's reachable. It's the ground truth users will see. Fall back to `pnpm start` only if the production build hasn't propagated yet.
- The Evidence Collector agent is configured to default to "needs work" / "find ≥ 3 issues" — that bias is intentional. Don't override it with optimistic prompts.
- Screenshots live under `/tmp/d2p-verify/`; they are intentionally outside the repo (transient) but referenced by path in the verification report so reviewers can replay.

## Other project rules

- Locked design tokens: see `/home/jmsbpp/.claude/projects/-home-jmsbpp-apps-d2p-frontend/memory/visual_design_reference.md`. Muted ochre `oklch(0.6 0.08 70)` is the single accent. IBM Plex Sans + Plex Mono only — no Inter / Geist / Mona Sans / Plus Jakarta.
- Anti-fishing discipline (CROSS-09 + LAB-05): FAIL and PASS iteration pages must render at identical visual weight. No `<details>` collapse on `DispositionMemo`. Status pills always encode color + icon + text, never color alone.
- All copy is authored in es-CO first, en second. No machine translation. Native-reviewer sign-off goes in `docs/copy-review.md`.
- Velite output (`.velite/*.json`) is gitignored but required at build time. `pnpm run build` auto-runs `velite build` via the `prebuild` script. Static JSON imports in `lib/velite-shim.ts` are how the data reaches the lambda bundle.
- Pre-commit hooks gate every commit on biome + tsc; do not bypass with `--no-verify`.
