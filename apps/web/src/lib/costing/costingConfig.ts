// Configuration parameters, thresholds, and master feature flags for the Costing Engine.

export const COSTING_CONFIG = {
  // Master AI switch: G5 switchable with COSTING_AI=on|off.
  // Defaults to "on" if env is unset or set to 'on'. If 'off', engine behaves deterministically.
  costingAiEnabled: (process.env.COSTING_AI ?? 'on').toLowerCase() === 'on',

  // Models and prompt versions
  aiModel: 'gemini-2.5-flash',
  extractorPromptVersion: 'v1.0.0',
  judgePromptVersion: 'v1.0.0',

  // H6 Guard: Leaf item text similarity must be >= 0.90
  leafSimilarityMin: 0.90,

  // H6 Guard: Parent similarity threshold
  parentSimilarityMin: 0.70,

  // H8 Guard: No-evidence rule: token overlap of significant words >= 60%
  noEvidenceOverlapMin: 0.60,

  // Candidates with similarity >= 0.80 considered for fuzzy/judge
  fuzzyCandidateMin: 0.80,

  // AI Extractor high confidence promotion threshold
  aiExtractorConfHigh: 0.85,

  // Maximum candidate database items passed to AI judge
  maxJudgeCandidates: 5,
} as const;

