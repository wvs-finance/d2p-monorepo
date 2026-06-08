# Deferred Items (Plan 01-08 execution)

## Pre-existing test failure: tests/unit/i18n.test.ts

**Discovered during:** Plan 01-08 final vitest run
**Status:** Pre-existing failure before Plan 01-08 changes
**Issue:** Test `loads messages from messages/{locale}/common.json (language_switcher keys present)` 
expects `result.messages.nav.skip_to_content` but the key `skip_to_content` lives in 
`messages/es-CO/common.json` (not under `nav`). The test looks up via `nav` namespace but 
the data is in `common`.
**Impact:** Does not block Plan 01-08 deliverables. The impeccable/CI tests all pass.
**Action:** Should be fixed in a follow-up to Plan 03 i18n infrastructure work.
