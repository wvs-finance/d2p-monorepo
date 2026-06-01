## ADDED Requirements

### Requirement: API key is never exposed
The system SHALL keep the Trading Economics `client:secret` off-chain at all times. The key MUST NOT appear in any value returned to a caller, any log line, or any thrown/returned error — in **raw, `encodeURIComponent`, or URLSearchParams wire-form** (the redactor MUST mask the exact wire-form the request serializer emits, since URLSearchParams and encodeURIComponent disagree on chars like space `+`/`%20` and `!` `%21`/`!`).

#### Scenario: Key absent from a successful result
- **WHEN** a caller queries a TE path and the request succeeds
- **THEN** the returned value contains the key in none of its forms (raw, encodeURIComponent, or wire-form), even if the upstream body echoes the request query

#### Scenario: Key redacted from any error including cause and wire-form
- **WHEN** the underlying request fails and the surfaced error detail (message or `cause`) would contain the request URL
- **THEN** the surfaced error has the key redacted in raw, encodeURIComponent, AND URLSearchParams wire-form

#### Scenario: Key never placed on-chain
- **WHEN** an on-chain consumer requests a TE data point through the json-fetch agent
- **THEN** the URL submitted on-chain is a keyless proxy URL and the key is injected only by the off-chain proxy

#### Scenario: Proxy never leaks the key or upstream URL
- **WHEN** the keyless proxy handles a request that errors upstream (timeout, network, non-2xx, or non-JSON body)
- **THEN** its HTTP response and its access/error logs contain neither the key nor the authenticated upstream URL — only a generic error or a normalized `{value,unit,ts}`

### Requirement: Callers query by path or catalog name only
The system SHALL let callers request data by a TE path (off-chain) or a catalog name (on-chain) without ever supplying, holding, or seeing the key.

#### Scenario: Path-only off-chain query
- **WHEN** a caller invokes the query primitive with only a TE path (e.g. `country/colombia`)
- **THEN** the key is loaded server-side, injected into the request, and the parsed data is returned

#### Scenario: Catalog lookup on-chain
- **WHEN** a contract looks up a data point by `keccak256(name)` in the endpoint catalog
- **THEN** it receives an `Endpoint{proxyPath, selector, decimals, kind}` sufficient to build a keyless agent request

### Requirement: Robust key resolution
The system SHALL resolve the key from the environment, falling back to a `.env` file, and MUST handle `export `-prefixed, quoted, and whitespace-padded `.env` lines. It SHALL raise a typed missing-key condition when the key is found nowhere.

#### Scenario: .env fallback across formats
- **WHEN** the env var is unset and `.env` contains the key as plain, quoted, or `export`-prefixed
- **THEN** the exact key value is recovered

#### Scenario: Missing key is typed, not silent
- **WHEN** the key is absent from both the environment and `.env`
- **THEN** the request path returns a typed `missing_key` error rather than throwing or proceeding

### Requirement: Typed request results
The request path SHALL return an explicit result union (`ok` with value, or `error` with a `kind` ∈ {missing_key, http, network, timeout, parse}) rather than throwing, so consumers can branch on failure mode.

#### Scenario: HTTP error is typed
- **WHEN** TE responds with a non-2xx status
- **THEN** the result is `{ ok: false, error: { kind: "http", status } }` with no key in the message

### Requirement: Verified endpoint catalog
The system SHALL provide a catalog of TE data points, each mapping a stable keyless `proxyPath` to its TE endpoint and a deterministic on-chain scale. The off-chain proxy SHALL normalize every catalog endpoint to `{ value, unit, ts }`.

#### Scenario: Normalized scalar from a messy TE array
- **WHEN** the proxy serves a catalog path backed by a TE array response (e.g. `country/colombia` filtered by `Category`)
- **THEN** it returns `{ value, unit, ts }` and the contract's selector is `.value`

#### Scenario: Deterministic on-chain scaling
- **WHEN** a value is delivered on-chain
- **THEN** it equals `nativeValue · 10^decimals` rounded **half-away-from-zero** (NOT JS `Math.round`, which is sign-asymmetric) with the catalog's pinned `decimals`, computed by the proxy as the single rounding authority and stored verbatim by the contract

#### Scenario: Negative value into a Uint endpoint is rejected
- **WHEN** a native value is negative but the endpoint's `kind` is `Uint`
- **THEN** the proxy returns a typed error (no truncation-to-0 or underflow)

#### Scenario: Out-of-range scaled value is rejected
- **WHEN** `round(nativeValue · 10^decimals)` would exceed the target integer width
- **THEN** the proxy returns a typed error (no silent wrap/overflow)

## ADDED Requirements

### Requirement: Proxy enforces an upstream spend ceiling
Because the keyless proxy URL is recorded on-chain the instant the agent uses it, it is publicly callable and offers no real access control (unguessable/rotating paths are void once on-chain). The proxy SHALL therefore cap its own upstream Trading Economics usage so that public abuse cannot exhaust the paid quota; once the ceiling is reached it SHALL serve cached/stale `{value,unit,ts}` rather than new upstream calls. This capability is **demo-only**; the proxy URL's public reachability is an accepted, documented risk.

#### Scenario: Upstream budget cap protects the paid quota
- **WHEN** inbound request volume would exceed the configured upstream TE call budget for the window
- **THEN** the proxy serves the most recent cached value (or a typed `quota_exhausted` error) and makes no further upstream TE calls in that window

#### Scenario: Rate limit by path
- **WHEN** requests for a given `proxyPath` exceed the per-path rate limit within the window
- **THEN** the proxy returns `429` and does not call upstream (per-path, not per-IP, since IPs are trivially rotated)

### Requirement: Secret unreachable from untrusted CI
The CI configuration SHALL ensure the `TRADING_ECONOMICS_API_KEY` is never reachable by an untrusted (fork) pull request and never printed in CI output.

#### Scenario: Fork PR runs keyless
- **WHEN** a pull request (including from a fork) triggers CI
- **THEN** only mocked, keyless tests run; no job in that event has access to the secret

#### Scenario: Live job is gated and isolated
- **WHEN** the secret-bearing live job runs
- **THEN** it is triggered only by `workflow_dispatch` and bound to a protected Environment (required reviewer / branch restriction); no workflow uses `pull_request_target` with a PR-head checkout plus secret access; jobs declare least-privilege `permissions`
