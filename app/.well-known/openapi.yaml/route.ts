export const dynamic = 'force-static'

export function GET() {
  const body = `openapi: 3.1.0
info:
  title: d2p Finance Public API
  version: 0.1.0
  description: |
    Public REST surface for d2p Finance / DS2P Labs.
    Phase 1 ships only /api/health. Phase 3 adds /api/dashboard and /api/econometrics.
servers:
  - url: https://wvs.finance
    description: Production
paths:
  /api/health:
    get:
      summary: Health check
      responses:
        '200':
          description: Service is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:    { type: string, example: ok }
                  build:     { type: string }
                  runtime:   { type: string, example: node }
                  timestamp: { type: string, format: date-time }
`
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/yaml; charset=utf-8' },
  })
}
