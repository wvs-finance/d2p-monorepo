// presets.ts — Preset id → recordedDecisionId mapping + nearest-preset resolver.
//
// recordedDecisionId is the snapshot decisionId join key (= the size-leg requestId),
// NOT a surrogate. This value is what getDecisionTraceById expects.
//
// maps to nearest preset; never live inference (§0.6 honesty invariant).

// ---------------------------------------------------------------------------
// PRESETS — exactly 2 entries (one per real consensus-verified decision)
// ---------------------------------------------------------------------------

export type Preset = {
  readonly id: string
  readonly recordedDecisionId: string
  readonly labelEsCO: string
  readonly labelEn: string
}

/**
 * The two real recorded consensus-verified Somnia decisions.
 * recordedDecisionId = the snapshot decisionId join key (= size-leg requestId).
 * This is what getDecisionTraceById(id) consumes.
 */
export const PRESETS: readonly Preset[] = [
  {
    id: 'infl-surprise-add',
    // recordedDecisionId is the snapshot decisionId join key (= the size-leg requestId),
    // not a surrogate. Maps to: action=ADD_LONG_GAMMA, sizeBps=6800, consensus=500.
    recordedDecisionId: '4083729',
    labelEsCO: 'La inflación en Colombia sorprendió al alza — ¿cómo me cubro?',
    labelEn: 'Colombian inflation surprised to the upside — how do I hedge?',
  },
  {
    id: 'infl-cooling-reduce',
    // recordedDecisionId is the snapshot decisionId join key (= the size-leg requestId),
    // not a surrogate. Maps to: action=REDUCE, sizeBps=568, consensus=900.
    recordedDecisionId: '4083997',
    labelEsCO: 'La inflación se está moderando — ¿reduzco la cobertura?',
    labelEn: 'Inflation is cooling — should I reduce the hedge?',
  },
] as const

// ---------------------------------------------------------------------------
// resolveNearestPreset — deterministic keyword heuristic
// ---------------------------------------------------------------------------

// Keywords that map to the inflation-surprise / rate-hike preset (infl-surprise-add → 4083729)
const SURPRISE_KEYWORDS = [
  // es-CO
  'alza',
  'sorprendió',
  'sorpresa',
  'sorprende',
  'sube',
  'subida',
  'hike',
  'hawkish',
  'inflación alta',
  // en
  'upside',
  'surprised',
  'surprise',
  'hike',
  'hawkish',
  'shock',
]

// Keywords that map to the cooling / reduction preset (infl-cooling-reduce → 4083997)
const COOLING_KEYWORDS = [
  // es-CO
  'modera',
  'moderando',
  'moderación',
  'enfría',
  'enfriamiento',
  'reduce',
  'reducción',
  'reducir',
  'bajar',
  'baja',
  // en
  'cooling',
  'moderation',
  'moderating',
  'cools',
  'cool',
  'reduce',
  'reduction',
  'dovish',
  'easing',
]

/**
 * resolveNearestPreset(text) — maps free text to the nearest preset id.
 * NEVER returns null (§0.6 — maps to nearest, never live inference).
 * Default (no keywords matched) → infl-surprise-add (first preset, the ADD_LONG_GAMMA case).
 */
export function resolveNearestPreset(text: string): string {
  const lower = text.toLowerCase()

  // Count keyword matches for cooling
  let coolingScore = 0
  for (const kw of COOLING_KEYWORDS) {
    if (lower.includes(kw)) coolingScore++
  }

  // Count keyword matches for surprise/hike
  let surpriseScore = 0
  for (const kw of SURPRISE_KEYWORDS) {
    if (lower.includes(kw)) surpriseScore++
  }

  if (coolingScore > surpriseScore) {
    return 'infl-cooling-reduce'
  }
  // Default to infl-surprise-add (recommended for any tie or unknown text)
  return 'infl-surprise-add'
}

/**
 * getPresetById(id) — looks up a preset by its id.
 * Returns null if not found.
 */
export function getPresetById(id: string): Preset | null {
  return PRESETS.find((p) => p.id === id) ?? null
}
