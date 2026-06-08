import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from '../msw/server'

// Skip @t3-oss/env-nextjs validation in unit test environment — real env
// vars are provided via .env.local in dev/prod builds. Tests exercise
// structural/behavioral assertions, not env var presence.
process.env.SKIP_ENV_VALIDATION = 'true'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
