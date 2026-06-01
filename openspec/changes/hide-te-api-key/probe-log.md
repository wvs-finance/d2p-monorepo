# TE catalog — live-probe evidence

Probed 2026-06-01 via `node keeper/src/teClient.ts <path>` (key never printed). Base `https://api.tradingeconomics.com`. This is the source-of-truth backing the `TECatalog` (Layer 1) and `routes.json` (Layer 2). **10 data points catalogued** across 3 HTTP calls (`country/colombia`, `markets/currency?cross=USD`, `markets/commodity`); the remaining target — the Economic Calendar — is **blocked (403 — not in this key's plan)**.

## Country indicators — `country/colombia` (array; select by `Category`, read `LatestValue`)

| name | Category (exact) | LatestValue | Unit | decimals | kind | scaled int |
|---|---|---|---|---|---|---|
| co/inflation-rate | `Inflation Rate` | 5.68 | percent | 2 | Uint | 568 |
| co/interest-rate | `Interest Rate` | 11.25 | percent | 2 | Uint | 1125 |
| co/gdp-annual-growth | `GDP Annual Growth Rate` | 2.2 | percent | 1 | Int | 22 |
| co/unemployment-rate | `Unemployment Rate` | 8.8 | percent | 1 | Uint | 88 |
| co/govt-bond-10y | `Government Bond 10Y` | 13.2 | percent | 1 | Uint | 132 |
| co/balance-of-trade | `Balance of Trade` | -0.84 | USD Billion | 2 | Int | -84 |

## FX — `markets/currency?cross=USD` (select `Symbol == "USDCOP:CUR"`, read `Last`)

| name | Symbol | Last | decimals | kind | scaled int |
|---|---|---|---|---|---|
| fx/usdcop | `USDCOP:CUR` | 3568.74 | 2 | Uint | 356874 |

## Commodities — `markets/commodity` (select by `Name`, read `Last`)

| name | Name (exact) | Last | unit | decimals | kind | scaled int |
|---|---|---|---|---|---|---|
| commodity/crude-oil | `Crude Oil` | 93.5676 | USD/Bbl | 3 | Uint | 93568 |
| commodity/natural-gas | `Natural gas` | 3.1739 | USD/MMBtu | 4 | Uint | 31739 |
| commodity/gold | `Gold` | 4474.7 | USD/t.oz | 2 | Uint | 447470 |

## Blocked

- **Economic Calendar** (`/calendar/...`): HTTP **403** on every form, including a control country (Mexico) → authorization/plan limit, not a bad request. Blocks `Actual − Forecast` surprise data until a plan upgrade or alternate source. The `kind=Int` rows (GDP growth, trade balance) are the negative-capable values driving the scaling-determinism requirement.

Scaling: `scaled int = round_half_away_from_zero(LatestValue · 10^decimals)`. The proxy is the single rounding authority; the contract stores the integer verbatim.
