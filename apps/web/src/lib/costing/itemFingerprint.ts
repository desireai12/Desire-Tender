// Structured item fingerprinting for Civil and PHE BOQ items.
import {
  convertNumberWords,
  extractSpecWords,
  normText,
  normUnit,
  orderedNumberSig,
} from './normalize';
import { resolveCanonicalScope, type ScopeResolution } from './scopeAliases';

export type OperationType =
  | 'supply'
  | 'laying'
  | 'supply_and_install'
  | 'install_only'
  | 'civil_work'
  | 'dismantling'
  | 'restoration'
  | 'testing'
  | 'other';

export interface ItemCapacity {
  discharge_lps: [number, number] | null;
  head_m: [number, number] | null;
  power_kw: number | null;
}

export interface CostingItemFingerprint {
  work_type: string;
  item_type: string;
  operation: OperationType;
  material: string | null;
  size: string | null;
  class_or_grade: string | null;
  capacity: ItemCapacity | null;
  dimensions: string | null;
  unit: string;
  qualifiers: string[];
  confidence: number;
  evidence: string[];
  conflict_notes?: string[];
}

/**
 * Deterministic Rule Extractor for civil / PHE items.
 */
export function extractRuleFingerprint(input: {
  description: string;
  parentChain?: string[];
  unit?: string | null;
  scope?: string | null;
}): CostingItemFingerprint {
  const fullDesc = input.description;
  const context = [fullDesc, ...(input.parentChain || [])].join(' ');
  const normContext = normText(context);
  const evidence: string[] = [];

  // 1. Resolve work_type
  const scopeRes: ScopeResolution = resolveCanonicalScope(input.scope, fullDesc, input.parentChain);
  const workType = scopeRes.scopeKey;
  if (scopeRes.isKnown) {
    evidence.push(`scope:${scopeRes.source}:${scopeRes.scopeKey}`);
  }

  // 2. Extract Material
  let material: string | null = null;
  const materialRegex = /\b(di|ms|hdpe|mdpe|pvc|pp|ci|gi|upvc|steel|wooden|plywood|rcc|pcc)\b/i;
  const matMatch = normContext.match(materialRegex);
  if (matMatch) {
    material = matMatch[1].toUpperCase();
    evidence.push(`material:${material}`);
  }

  // 3. Extract Class / Grade / Pressure
  let classOrGrade: string | null = null;
  const specWords = extractSpecWords(normContext);
  for (const sw of specWords) {
    if (/^(k-|pn-|pe-|m-|fe-)/.test(sw)) {
      classOrGrade = sw.toUpperCase();
      evidence.push(`grade:${classOrGrade}`);
      break;
    }
  }

  // 4. Extract Size
  let size: string | null = null;
  const sizeMatch = normContext.match(/\b(\d+(?:\.\d+)?)\s*(mm|dia|inch|cum|m)\b/i);
  if (sizeMatch) {
    size = `${sizeMatch[1]} ${sizeMatch[2].toLowerCase()}`;
    evidence.push(`size:${size}`);
  }

  // 5. Extract Capacity (discharge, head, power)
  let capacity: ItemCapacity | null = null;
  let hasCapacity = false;
  let discharge: [number, number] | null = null;
  let head: [number, number] | null = null;
  let powerKw: number | null = null;

  const disMatch = normContext.match(/discharge\s*(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*lps/i);
  if (disMatch) {
    discharge = [parseFloat(disMatch[1]), parseFloat(disMatch[2])];
    hasCapacity = true;
    evidence.push(`discharge:${discharge[0]}-${discharge[1]} LPS`);
  }

  const headMatch = normContext.match(/head\s*(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*m\b/i);
  if (headMatch) {
    head = [parseFloat(headMatch[1]), parseFloat(headMatch[2])];
    hasCapacity = true;
    evidence.push(`head:${head[0]}-${head[1]} M`);
  }

  const kwMatch = normContext.match(/\b(\d+(?:\.\d+)?)\s*kw\b/i);
  if (kwMatch) {
    powerKw = parseFloat(kwMatch[1]);
    hasCapacity = true;
    evidence.push(`power:${powerKw} KW`);
  } else {
    const hpMatch = normContext.match(/\b(\d+(?:\.\d+)?)\s*hp\b/i);
    if (hpMatch) {
      powerKw = parseFloat((parseFloat(hpMatch[1]) * 0.7457).toFixed(1));
      hasCapacity = true;
      evidence.push(`power:${hpMatch[1]} HP`);
    }
  }

  if (hasCapacity) {
    capacity = { discharge_lps: discharge, head_m: head, power_kw: powerKw };
  }

  // 6. Detect Operation
  let operation: OperationType = 'other';
  if (/providing\s*and\s*laying|supply\s*and\s*laying|supply\s*and\s*install|supply\s*&\s*install|supplying\s*and\s*fixing|providing\s*,\s*laying/i.test(normContext)) {
    operation = 'supply_and_install';
  } else if (/laying\s*and\s*jointing|laying\s*jointing|lowering\s*laying|laying\s*only|laying\b/i.test(normContext)) {
    operation = 'laying';
  } else if (/manufacturing\s*and\s*supply|supply\s*of|supplying\s*and\s*delivering|supply\s*only|supplying\b/i.test(normContext)) {
    operation = 'supply';
  } else if (/installation\s*and\s*commissioning|erection\s*and\s*testing|install\s*only/i.test(normContext)) {
    operation = 'install_only';
  } else if (/dismantling|taking\s*down/i.test(normContext)) {
    operation = 'dismantling';
  } else if (/restoration|repairing|refilling/i.test(normContext)) {
    operation = 'restoration';
  } else if (/testing\s*and\s*disinfection|hydraulic\s*testing/i.test(normContext)) {
    operation = 'testing';
  } else if (/excavation|earthwork|concrete|plaster|masonry|shuttering|formwork|reinforcement/i.test(normContext)) {
    operation = 'civil_work';
  }
  evidence.push(`operation:${operation}`);

  // 7. Qualifiers
  const qualifiers: string[] = [];
  if (/single\s*stage/i.test(normContext)) qualifiers.push('single stage');
  if (/multi\s*stage/i.test(normContext)) qualifiers.push('multi stage');
  if (/submersible/i.test(normContext)) qualifiers.push('submersible');
  if (/centrifugal/i.test(normContext)) qualifiers.push('centrifugal');
  if (/monoblock/i.test(normContext)) qualifiers.push('monoblock');
  if (/flanged/i.test(normContext)) qualifiers.push('flanged');
  if (/sluice/i.test(normContext)) qualifiers.push('sluice');
  if (/butterfly/i.test(normContext)) qualifiers.push('butterfly');
  if (/non\s*return|nrv/i.test(normContext)) qualifiers.push('non return');
  if (/air\s*valve/i.test(normContext)) qualifiers.push('air valve');

  // 8. Item Type Noun Phrase
  let itemType = 'general_item';
  if (qualifiers.length) {
    itemType = qualifiers.join('_');
  } else if (material && size) {
    itemType = `${material.toLowerCase()}_${size.replace(/\s+/g, '')}`;
  } else if (workType) {
    itemType = workType.replace(/\s+/g, '_');
  }

  const unit = normUnit(input.unit);
  const confidence = evidence.length >= 3 ? 0.95 : evidence.length >= 1 ? 0.8 : 0.5;

  return {
    work_type: workType || 'unknown',
    item_type: itemType,
    operation,
    material,
    size,
    class_or_grade: classOrGrade,
    capacity,
    dimensions: null,
    unit,
    qualifiers,
    confidence,
    evidence,
  };
}

/**
 * Reconciles Rule Extractor and AI Extractor outputs (B3 Conflict Rule):
 * If AI contradicts Rule on number, unit, grade, or material, RULE wins and note is added.
 */
export function reconcileFingerprints(
  rule: CostingItemFingerprint,
  ai: Partial<CostingItemFingerprint> | null,
): CostingItemFingerprint {
  if (!ai) return rule;

  const conflicts: string[] = [];
  const merged: CostingItemFingerprint = { ...rule };

  // Material check
  if (ai.material && rule.material && ai.material.toUpperCase() !== rule.material.toUpperCase()) {
    conflicts.push(`material (AI=${ai.material}, Rule=${rule.material})`);
  } else if (!rule.material && ai.material) {
    merged.material = ai.material.toUpperCase();
  }

  // Grade check
  if (ai.class_or_grade && rule.class_or_grade && ai.class_or_grade.toUpperCase() !== rule.class_or_grade.toUpperCase()) {
    conflicts.push(`class_or_grade (AI=${ai.class_or_grade}, Rule=${rule.class_or_grade})`);
  } else if (!rule.class_or_grade && ai.class_or_grade) {
    merged.class_or_grade = ai.class_or_grade.toUpperCase();
  }

  // Unit check
  if (ai.unit && rule.unit && normUnit(ai.unit) !== normUnit(rule.unit)) {
    conflicts.push(`unit (AI=${ai.unit}, Rule=${rule.unit})`);
  }

  // Size check
  if (ai.size && rule.size && normText(ai.size) !== normText(rule.size)) {
    conflicts.push(`size (AI=${ai.size}, Rule=${rule.size})`);
  } else if (!rule.size && ai.size) {
    merged.size = ai.size;
  }

  // Capacity check
  if (ai.capacity && rule.capacity) {
    if (
      (ai.capacity.discharge_lps && rule.capacity.discharge_lps &&
        (ai.capacity.discharge_lps[0] !== rule.capacity.discharge_lps[0] || ai.capacity.discharge_lps[1] !== rule.capacity.discharge_lps[1])) ||
      (ai.capacity.head_m && rule.capacity.head_m &&
        (ai.capacity.head_m[0] !== rule.capacity.head_m[0] || ai.capacity.head_m[1] !== rule.capacity.head_m[1]))
    ) {
      conflicts.push(`capacity (discharge/head mismatch)`);
    }
  } else if (!rule.capacity && ai.capacity) {
    merged.capacity = ai.capacity;
  }

  // Operation check
  if (ai.operation && ai.operation !== 'other') {
    if (rule.operation === 'other') {
      merged.operation = ai.operation;
    } else if (rule.operation !== ai.operation) {
      conflicts.push(`operation (AI=${ai.operation}, Rule=${rule.operation})`);
    }
  }

  // Qualifiers merge
  if (ai.qualifiers?.length) {
    const set = new Set([...merged.qualifiers, ...ai.qualifiers]);
    merged.qualifiers = Array.from(set);
  }

  if (conflicts.length > 0) {
    merged.conflict_notes = conflicts.map((c) => `AI/rule conflict: ${c}`);
  }

  return merged;
}

