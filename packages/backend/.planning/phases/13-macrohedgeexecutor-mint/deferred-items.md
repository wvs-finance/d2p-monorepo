# Phase 13 — Deferred Items

## 13-02 (executor promotion) — out-of-scope discoveries

- **Orphan demo-session src types left untracked.** `contracts/src/types/CalldataReader.sol`,
  `contracts/src/types/OptionType.sol`, `contracts/src/types/Underlying.sol` exist on disk
  (created during the prior demo session) but are NOT imported anywhere in the repo and are NOT
  in the `MacroHedgeExecutor` compile closure (verified: `grep -rln types/{Underlying,OptionType,
  CalldataReader}.sol src/ test/` → no importers). They are pre-existing, not 13-02 artifacts, so
  13-02 did NOT commit them (committing orphan files would be scope creep). Decide in a later
  cleanup pass whether to wire them into the Phase-12 STRAT-01 economic-thesis surface or delete.
- **Modified submodules / unrelated planning-doc edits in the working tree** (`lib/panoptic-helper`,
  `lib/protocol-v3`, `lib/solady` dirty; `09-*` plan edits; `DRAFT.md`) predate 13-02 and are out
  of this plan's scope — left untouched.
