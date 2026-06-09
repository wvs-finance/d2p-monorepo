// tests/fixtures/test-signer.ts
//
// Centralized well-known test signer key for Phase 11 route tests.
//
// This is the public, well-known Hardhat / Anvil default account #0 private key.
// It is documented in the Hardhat and Foundry repos and funds the canonical local
// dev accounts everywhere. It controls NO real value on any production network and
// is NOT a secret — it is defined ONCE here, with the single gitleaks-allow annotation,
// and every test that needs the key IMPORTS it from this file (never re-inlines the
// literal) so the secret scanner has exactly one place to whitelist.

// gitleaks:allow well-known Hardhat #0, not a secret
export const HARDHAT_PK_0 =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const
