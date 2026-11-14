// AI Classification Extractor & Candidate Judge for the Costing Engine.
// Follows Golden Rules:
// G1. AI model may READ and CLASSIFY text. It may NEVER output, estimate, average, convert or adjust a price.
// G2. If no DB item is the same item, J & K stay BLANK.
// G3. Hard deterministic guards can VETO any AI suggestion; AI can never override a guard.
// G4. Cache all AI results deterministically.
// G5. Switchable with COSTING_AI=on|off.

import { COSTING_CONFIG } from './costingConfig';
import { fullSha1, normText, normUnit } from './normalize';
import type { CostingItemFingerprint } from './itemFingerprint';

// In-memory cache for the process run
const memoryFingerprintCache = new Map<string, CostingItemFingerprint>();
const memoryJudgeCache = new Map<string, JudgeResult>();

export interface JudgeCandidate {
  id: string;
  scope: string | null;
  headers: string[];
  description: string;
  unit: string | null;
}

export interface JudgeResult {
  best_match_id: string | null;
  verdict: 'CONFIRM' | 'REJECT';
  reason: string;
  differing_attributes: string[];
}

/** Compute deterministic cache key for fingerprint extraction (B6) */
export function getFingerprintCacheKey(input: {
  description: string;
  parentChain?: string[];
  unit?: string | null;
  scope?: string | null;
}): string {
  const normDesc = normText(input.description);
  const normParents = (input.parentChain || []).map(normText).join('||');
  const unit = normUnit(input.unit);
  const scope = normText(input.scope || '');
  return fullSha1(
    [
      normDesc,
      normParents,
      unit,
      scope,
      COSTING_CONFIG.extractorPromptVersion,
      COSTING_CONFIG.aiModel,
    ].join('::'),
  );
}

/**
 * AI Extractor (Prompt 1):
 * Classifies an item into structured fingerprint JSON.
 * Sends ONLY text: description, parent chain, unit, scope. NEVER sends quantities or rates.
 */
export async function extractAiFingerprint(
  input: {
    description: string;
    parentChain?: string[];
    unit?: string | null;
    scope?: string | null;
  },
  apiKey?: string,
): Promise<Partial<CostingItemFingerprint> | null> {
  if (!COSTING_CONFIG.costingAiEnabled) return null;
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) return null;

  const cacheKey = getFingerprintCacheKey(input);
  if (memoryFingerprintCache.has(cacheKey)) {
    return memoryFingerprintCache.get(cacheKey)!;
  }

  const prompt = `You are a senior Public Health Engineering (PHE) and Civil Costing Specialist.
Analyze the following BOQ line item along with its hierarchy context.

INPUT:
- Raw Description: ${input.description}
- Parent Chain: ${(input.parentChain || []).join(' > ')}
- Unit: ${input.unit || 'not specified'}
- Explicit Scope Column: ${input.scope || 'not specified'}

TASK:
Classify this item into a structured fingerprint JSON matching the schema:
{
  "work_type": "<canonical PHE/civil work category (e.g. di pipeline, hdpe pipeline, pumps, valve, civil, ohsr, cwr, e&m, etc.)>",
  "item_type": "<specific equipment/noun phrase (e.g. centrifugal_monoblock_pump_set, sluice_valve, k9_pipe)>",
  "operation": "<one of: supply, laying, supply_and_install, install_only, civil_work, dismantling, restoration, testing, other>",
  "material": "<DI, MS, HDPE, MDPE, PVC, PP, CI, GI, uPVC, steel, wooden, plywood, RCC, PCC or null>",
  "size": "<normalized size with unit (e.g. '100 mm') or null>",
  "class_or_grade": "<e.g. K-7, K-9, PN-6, PN-10, PN-16, PE-80, PE-100, M10, M15, M20, M25, Fe500 or null>",
  "capacity": {
    "discharge_lps": [min, max] or null,
    "head_m": [min, max] or null,
    "power_kw": number or null
  },
  "dimensions": "<dimensions string or null>",
  "unit": "<canonical unit: rm, nos, cum, sqm, mt, set, job>",
  "qualifiers": ["<array of distinguishing specifications>"],
  "confidence": <number between 0.0 and 1.0>,
  "evidence": ["<verbatim substrings supporting extraction>"]
}

CRITICAL RULES:
- NEVER guess or hallucinate parameters not evidenced in text.
- NEVER output prices, rates, currency, or cost values.
- Output ONLY valid raw JSON. No markdown backticks or commentary outside JSON.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${COSTING_CONFIG.aiModel}:generateContent?key=${key}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.0,
          responseMimeType: 'application/json',
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    // Golden Rule G1 Guard: Reject if model outputs any price or currency
    if (/\b(inr|rs\.?|rupees|\$|rate|price|purchase_rate|execution_rate)\b/i.test(rawText)) {
      console.warn('[AI_SAFETY_GUARD] AI extractor proposed a rate/price - rejected per G1');
      return null;
    }

    const parsed = JSON.parse(rawText) as Partial<CostingItemFingerprint>;
    if (parsed && typeof parsed === 'object') {
      memoryFingerprintCache.set(cacheKey, parsed as CostingItemFingerprint);
      return parsed;
    }
  } catch (err) {
    // Network, timeout, or parse failure -> safely fall back to rule extractor
  }

  return null;
}

/**
 * AI Judge (Prompt 2):
 * For items that pass guards H1-H8 but lack strict/loose match.
 * Sends BOQ item and up to 5 candidate DB items (TEXT ONLY, NO RATES).
 * Can ONLY CONFIRM or REJECT.
 */
export async function judgeCandidateEquivalence(
  target: {
    desc: string;
    parentChain?: string[];
    unit?: string | null;
    fingerprint?: CostingItemFingerprint | null;
  },
  candidates: JudgeCandidate[],
  apiKey?: string,
): Promise<JudgeResult | null> {
  if (!COSTING_CONFIG.costingAiEnabled || candidates.length === 0) return null;
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) return null;

  const judgeKey = fullSha1(
    [
      normText(target.desc),
      normText((target.parentChain || []).join(' > ')),
      normUnit(target.unit),
      candidates.map((c) => c.id).sort().join(','),
      COSTING_CONFIG.judgePromptVersion,
    ].join('::'),
  );

  if (memoryJudgeCache.has(judgeKey)) {
    return memoryJudgeCache.get(judgeKey)!;
  }

  const prompt = `You are a PHE / Civil engineering verifier. Compare a BOQ item against candidate database items.
Your job is ONLY to confirm whether any candidate is an EXACT engineering equivalent for the same scope of work.

TARGET BOQ ITEM:
- Description: ${target.desc}
- Parent Context: ${(target.parentChain || []).join(' > ')}
- Unit: ${target.unit || 'not specified'}

CANDIDATES FROM RATE DATABASE (UP TO 5):
${JSON.stringify(
  candidates.map((c) => ({
    candidate_id: c.id,
    scope: c.scope,
    parent_headers: c.headers,
    description: c.description,
    unit: c.unit,
  })),
  null,
  2,
)}

TASK:
For each candidate, evaluate whether it represents the IDENTICAL physical work and specification.
Verify:
1. Are the materials identical? (e.g. DI != CI, HDPE != MS)
2. Are the classes/grades identical? (e.g. K-9 != K-7, PN-10 != PN-16, M20 != M25)
3. Are the operations compatible? (Supply != Laying != Supply & Install)
4. Are discharge, head, and capacity identical in value and order?

Output JSON:
{
  "best_match_id": "<one of candidate_id from above or null>",
  "verdict": "CONFIRM" | "REJECT",
  "reason": "<one sentence technical reason>",
  "differing_attributes": ["<list of any mismatches>"]
}

STRICT: NEVER recommend, estimate or output prices. Only compare technical specifications and scope.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${COSTING_CONFIG.aiModel}:generateContent?key=${key}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.0,
          responseMimeType: 'application/json',
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    // Safety check against price injection
    if (/\b(inr|rs\.?|rupees|\$|rate|price)\b/i.test(rawText)) {
      console.warn('[AI_SAFETY_GUARD] AI judge proposed a rate/price - rejected per G1');
      return null;
    }

    const parsed = JSON.parse(rawText) as JudgeResult;
    if (parsed && (parsed.verdict === 'CONFIRM' || parsed.verdict === 'REJECT')) {
      // Validate candidate id belongs to input candidates
      if (parsed.best_match_id && !candidates.some((c) => c.id === parsed.best_match_id)) {
        parsed.best_match_id = null;
        parsed.verdict = 'REJECT';
      }
      memoryJudgeCache.set(judgeKey, parsed);
      return parsed;
    }
  } catch (err) {
    // Graceful fallback
  }

  return null;
}

