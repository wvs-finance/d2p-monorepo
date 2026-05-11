# impeccable CLI flag situation (Phase 1 verification)

**Verified:** 2026-05-11
**CLI version:** `2.1.8`

## Help output summary

```
Usage: impeccable detect [options] [file-or-dir-or-url...]

Scan files or URLs for UI anti-patterns and design quality issues.

Options:
  --fast    Regex-only mode (skip jsdom, faster but misses linked stylesheets)
  --json    Output results as JSON
  --help    Show this help message
```

No `--fail-on-error`, `--fail-on-issues`, or `--ci` flag exists in version 2.1.8.
The only flags are `--fast`, `--json`, and `--help`.

## Strategy decision

Base CI step uses exit-code-only (CLI exits non-zero on violations). No flag needed.

The impeccable binary exits non-zero when it detects anti-pattern violations. The CI
job `npx --yes impeccable detect app/` relies on this behavior. No flag substitution
is required or possible — no strengthening flag was found in `--help`.

## Sanity check

Ran against the planted fixtures at `tests/unit/fixtures/anti-patterns.html`:
- Exit code on fixtures with violations: non-zero (1)
- Exit code on clean source (`app/`): 0

Both confirmed via local execution on 2026-05-11.
