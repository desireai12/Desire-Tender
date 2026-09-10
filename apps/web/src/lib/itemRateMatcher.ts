import masterRateDatabase from './service_price_database.json';

export interface RateMatchResult {
  matchedItem: any | null;
  confidenceScore: number; // 0 to 100
  suggestedPurchaseCost: number;
  suggestedServiceCost: number;
  suggestedUnitRate: number;
  suggestedCategory: string;
  matchReason: string;
}

// Extract standard diameter / size in mm or inches
export function extractDiameter(text: string): string | null {
  const diaMatch = text.match(/(\d+)\s*(?:mm|dia|dia\.|NB)/i);
  if (diaMatch) {
    return `${diaMatch[1]} mm`;
  }
  return null;
}

// Normalize text for token matching
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

/**
 * Intelligent Rate Matcher
 * Finds best matching price in the master database based on description, size, material, and unit.
 */
export function matchItemRate(itemDescription: string, unit?: string): RateMatchResult {
  const descLower = itemDescription.toLowerCase();
  const inputTokens = tokenize(itemDescription);
  const inputDia = extractDiameter(itemDescription);
  const inputUnit = unit ? unit.trim().toLowerCase() : '';

  let bestMatch: any = null;
  let highestScore = 0;
  let reason = 'Default estimate';

  for (const entry of masterRateDatabase as any[]) {
    let score = 0;
    const entryDesc = (entry.item_description + ' ' + (entry.sub_description || '')).toLowerCase();
    const entryTokens = tokenize(entryDesc);
    const entryDia = extractDiameter(entryDesc);
    const entryUnit = (entry.unit || '').trim().toLowerCase();

    // 1. Exact or partial diameter match (very high weight)
    if (inputDia && entryDia) {
      if (inputDia === entryDia) {
        score += 35;
      }
    }

    // 2. Unit alignment
    if (inputUnit && entryUnit && (inputUnit === entryUnit || (inputUnit === 'rmt' && entryUnit === 'mtr') || (inputUnit === 'no.' && entryUnit === 'nos'))) {
      score += 15;
    }

    // 3. Keyword / Token overlap
    let matchedTokenCount = 0;
    for (const token of inputTokens) {
      if (entryTokens.includes(token)) {
        matchedTokenCount++;
        // Boost for critical domain words
        if (['di', 'pipe', 'hdpe', 'rcc', 'valve', 'pump', 'excavation', 'scada', 'panel', 'restoration', 'meter', 'k7', 'k9', 'np4'].includes(token)) {
          score += 8;
        } else {
          score += 3;
        }
      }
    }

    // Normalized token match percentage
    const tokenMatchRatio = inputTokens.length > 0 ? (matchedTokenCount / inputTokens.length) * 30 : 0;
    score += tokenMatchRatio;

    if (score > highestScore) {
      highestScore = score;
      bestMatch = entry;
      reason = `${entry.project || entry.city} schedule match (${Math.min(99, Math.round(score))}% confidence)`;
    }
  }

  const confidence = Math.min(99, Math.round(highestScore));

  if (bestMatch && confidence >= 25) {
    return {
      matchedItem: bestMatch,
      confidenceScore: confidence,
      suggestedPurchaseCost: bestMatch.purchase_cost || 0,
      suggestedServiceCost: bestMatch.service_cost || 0,
      suggestedUnitRate: bestMatch.total_unit_rate || (bestMatch.purchase_cost + bestMatch.service_cost) || 0,
      suggestedCategory: bestMatch.category || 'Civil & Structural',
      matchReason: reason
    };
  }

  // Fallback
  return {
    matchedItem: null,
    confidenceScore: 0,
    suggestedPurchaseCost: 0,
    suggestedServiceCost: 0,
    suggestedUnitRate: 0,
    suggestedCategory: 'Civil & Structural',
    matchReason: 'No direct rate match found in knowledge base'
  };
}

/**
 * Bulk auto-filler for an uploaded BOQ list
 */
export function autoFillBoqItems(rawItems: {
  sr_no?: string;
  item_description: string;
  qty: number;
  unit: string;
  sor_rate?: number;
}[]) {
  return rawItems.map((item, idx) => {
    const match = matchItemRate(item.item_description, item.unit);
    const purchase = match.suggestedPurchaseCost;
    const service = match.suggestedServiceCost;
    const totalUnit = match.suggestedUnitRate || (purchase + service);
    const qty = Number(item.qty || 0);

    return {
      id: `boq-item-${Date.now()}-${idx + 1}`,
      row_index: idx + 1,
      sr_no: item.sr_no || `${idx + 1}`,
      item_description: item.item_description,
      qty: qty,
      unit: item.unit || 'Nos',
      sor_rate: Number(item.sor_rate || 0),
      sor_total: Number(item.sor_rate || 0) * qty,
      work_type: match.suggestedCategory,
      purchase_price: purchase,
      service_price: service,
      service_guj: 0,
      total_price: totalUnit * qty,
      match_confidence: match.confidenceScore,
      match_source: match.matchReason,
      vendor_quotes: match.matchedItem?.vendor_quotes || {}
    };
  });
}
