export type IterationStatusKey = 'PASS' | 'FAIL' | 'PARKED' | 'IN_PROGRESS'

export interface StatusCounts {
  PASS: number
  FAIL: number
  PARKED: number
  IN_PROGRESS: number
  total: number
}

/**
 * Pure helper — counts iterations by status.
 * Deliberately shows all 4 statuses including 0-count entries
 * to preserve epistemic equality (PITFALL #16: never filter out statuses).
 */
export function countsByStatus(iterations: { status: IterationStatusKey }[]): StatusCounts {
  const acc: StatusCounts = { PASS: 0, FAIL: 0, PARKED: 0, IN_PROGRESS: 0, total: 0 }
  for (const it of iterations) {
    acc[it.status]++
    acc.total++
  }
  return acc
}
