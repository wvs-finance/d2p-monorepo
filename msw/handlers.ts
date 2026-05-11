import { http, HttpResponse } from 'msw'
// Phase 1: no real handlers required yet. This file is the template for Phase 2-3.
export const handlers = [http.get('/api/health', () => HttpResponse.json({ ok: true }))]
