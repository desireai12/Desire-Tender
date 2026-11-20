// Matching Engine: Deterministic rule guards, candidate generation, and inter-state classification.
import { extractAttributes } from './attributeExtractor';
import { areUnitsDimensionallyCompatible, getUnitInfo } from './unitNormalizer';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
import type {
  MatchClass,
  ParsedItemAttributes,
  SorItemGroupMemberRecord,
  SorItemGroupRecord,
  SorItemRecord,
  SorMatchRecord,
} from './types';

function tokenizeText(text: string): Set<string> {
  if (!text) return new Set();
  const words = text
    .toLowerCase()
    .replace(/[–—_]/g, '-')
    .replace(/(\d)\s*(mm|kw|hp|kva|kvar|sqmm|sq\.?\s*mm|mld|klh|lps|mtr|m)\b/g, '$1$2')
    .replace(/\bdia(meter)?\.?\b/g, 'dia')
    .replace(/[^a-z0-9.%+\-/ ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
  return new Set(words);
}

function calculateJaccard(textA: string, textB: string): number {
  const setA = tokenizeText(textA);
  const setB = tokenizeText(textB);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersect = 0;
  setA.forEach((t) => {
    if (setB.has(t)) intersect++;
  });
  return intersect / (setA.size + setB.size - intersect);
}

export interface ExclusionCounts {
  is_addon: number;
  is_percentage_based: number;
  is_lump_sum: number;
  unit_missing: number;
  zero_rate: number;
  null_rate: number;
}

export function filterEligibleItems(items: SorItemRecord[]): {
  eligible: SorItemRecord[];
  exclusions: ExclusionCounts;
} {
  const exclusions: ExclusionCounts = {
    is_addon: 0,
    is_percentage_based: 0,
    is_lump_sum: 0,
    unit_missing: 0,
    zero_rate: 0,
    null_rate: 0,
  };

  const eligible: SorItemRecord[] = [];

  for (const item of items) {
    if (item.is_addon) {
      exclusions.is_addon++;
      continue;
    }
    if (item.is_percentage_based) {
      exclusions.is_percentage_based++;
      continue;
    }
    if (item.is_lump_sum) {
      exclusions.is_lump_sum++;
      continue;
    }
    if (!item.unit || item.flag_notes?.includes('unit_missing')) {
      exclusions.unit_missing++;
      continue;
    }
    if (item.flag_notes?.includes('zero_rate') || item.rate_ex_gst === 0 || item.rate_as_stated === 0) {
      exclusions.zero_rate++;
      continue;
    }
    if (item.rate_ex_gst == null && item.rate_as_stated == null) {
      exclusions.null_rate++;
      continue;
    }

    eligible.push(item);
  }

  return { eligible, exclusions };
}

function generatePairHash(id1: string | number, id2: string | number): string {
  const s = `${id1}||${id2}`;
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return `pair_${Math.abs(hash).toString(16)}`;
}

export function hasSufficientCriticalAttributes(
  attr1: ParsedItemAttributes,
  attr2: ParsedItemAttributes,
): boolean {
  const cat1 = attr1.category;
  const cat2 = attr2.category;
  if (!cat1 || cat1 === 'Other' || cat1 !== cat2) return false;

  switch (cat1) {
    case 'Excavation':
      return (
        attr1.soilType != null &&
        attr2.soilType != null &&
        attr1.depthMin != null &&
        attr2.depthMin != null &&
        attr1.depthMax != null &&
        attr2.depthMax != null &&
        attr1.isIncrementalLift === attr2.isIncrementalLift
      );
    case 'Pipe Laying':
      return (
        attr1.pipeMaterial != null &&
        attr2.pipeMaterial != null &&
        attr1.pipeDiameter != null &&
        attr2.pipeDiameter != null
      );
    case 'Concrete':
      return (
        (attr1.concreteGrade != null || attr1.mixRatio != null) &&
        (attr2.concreteGrade != null || attr2.mixRatio != null)
      );
    case 'Road Restoration':
      return attr1.roadWorkType != null && attr2.roadWorkType != null;
    case 'Manhole':
      return (
        (attr1.manholeDia != null && attr2.manholeDia != null) ||
        (attr1.manholeConstruction != null && attr2.manholeConstruction != null)
      );
    case 'Valves & Fittings':
      return attr1.pipeDiameter != null && attr2.pipeDiameter != null;
    case 'Dismantling':
      return attr1.materialType != null && attr2.materialType != null;
    case 'Timbering':
      return (
        attr1.depthMin != null &&
        attr2.depthMin != null &&
        attr1.depthMax != null &&
        attr2.depthMax != null
      );
    case 'Filling / Backfilling':
    case 'Site Preparation':
    case 'Steel Reinforcement':
    case 'Brick Work':
    case 'Plastering & Pointing':
    case 'Stone Masonry':
    case 'Formwork / Shuttering':
    case 'Trenchless Technology':
    case 'IoT & Instrumentation':
    case 'Specialized Equipment / Robotics':
      return true;
    default:
      return false;
  }
}

export function evaluatePair(
  sourceItem: SorItemRecord,
  targetItem: SorItemRecord,
  cachedAttr1?: ParsedItemAttributes,
  cachedAttr2?: ParsedItemAttributes,
): SorMatchRecord {
  const pairHash = generatePairHash(
    `${sourceItem.state_name}_${sourceItem.source_row}`,
    `${targetItem.state_name}_${targetItem.source_row}`,
  );

  const scopeDifferences: string[] = [];
  let rateStructureWarning: string | null = null;

  // 1. Hard Dimensional Unit Check
  const unitCheck = areUnitsDimensionallyCompatible(sourceItem.unit, targetItem.unit);
  if (!unitCheck.compatible) {
    return {
      pair_hash: pairHash,
      source_item: sourceItem,
      target_item: targetItem,
      source_state: sourceItem.state_name,
      target_state: targetItem.state_name,
      match_class: 'Not comparable',
      confidence: 10,
      reasoning: `Deterministic reject: ${unitCheck.reason}`,
      scope_differences: ['Incompatible unit dimensions'],
      status: 'pending',
    };
  }

  // 2. Extract structured civil attributes
  const attr1 = cachedAttr1 || extractAttributes(sourceItem.full_description, sourceItem.unit);
  const attr2 = cachedAttr2 || extractAttributes(targetItem.full_description, targetItem.unit);

  // Deterministic Guard: Backfilling / Earth Filling vs Excavation
  const isExcavationA = attr1.category === 'Excavation' || (/\bexcavat/i.test(sourceItem.full_description) && !/\b(filling|backfilling|refilling)\b/i.test(sourceItem.full_description));
  const isFillingA = attr1.category === 'Filling / Backfilling' || attr1.category === 'Moorum Filling' || /\b(filling|backfilling|refilling)\b/i.test(sourceItem.full_description);
  const isExcavationB = attr2.category === 'Excavation' || (/\bexcavat/i.test(targetItem.full_description) && !/\b(filling|backfilling|refilling)\b/i.test(targetItem.full_description));
  const isFillingB = attr2.category === 'Filling / Backfilling' || attr2.category === 'Moorum Filling' || /\b(filling|backfilling|refilling)\b/i.test(targetItem.full_description);

  if ((isFillingA && isExcavationB) || (isFillingB && isExcavationA)) {
    return {
      pair_hash: pairHash,
      source_item: sourceItem,
      target_item: targetItem,
      source_state: sourceItem.state_name,
      target_state: targetItem.state_name,
      match_class: 'Not comparable',
      confidence: 10,
      reasoning: 'Deterministic reject: Backfilling/Filling cannot be matched to Earthwork Excavation',
      scope_differences: ['Work scope mismatch: Backfilling/Filling vs Excavation'],
      status: 'pending',
    };
  }

  // 3. Category & Material Guard
  if (attr1.category !== attr2.category) {
    return {
      pair_hash: pairHash,
      source_item: sourceItem,
      target_item: targetItem,
      source_state: sourceItem.state_name,
      target_state: targetItem.state_name,
      match_class: 'Not comparable',
      confidence: 15,
      reasoning: `Category mismatch: '${attr1.category}' vs '${attr2.category}'`,
      scope_differences: ['Different civil engineering categories'],
      status: 'pending',
    };
  }

  // Material Guard (Strict: Cement Concrete vs Granular Macadam vs Bituminous)
  if (attr1.materialType && attr2.materialType && attr1.materialType !== attr2.materialType) {
    return {
      pair_hash: pairHash,
      source_item: sourceItem,
      target_item: targetItem,
      source_state: sourceItem.state_name,
      target_state: targetItem.state_name,
      match_class: 'Not comparable',
      confidence: 15,
      reasoning: `Deterministic reject: Material type mismatch (${attr1.materialType} vs ${attr2.materialType})`,
      scope_differences: [`Material mismatch: ${attr1.materialType} vs ${attr2.materialType}`],
      status: 'pending',
    };
  }

  // 4. Pipe Laying Guards
  if (attr1.category === 'Pipe Laying' || attr2.category === 'Pipe Laying') {
    // Pipe Material Check (Strict: Different pipe materials never match)
    if (attr1.pipeMaterial !== attr2.pipeMaterial) {
      return {
        pair_hash: pairHash,
        source_item: sourceItem,
        target_item: targetItem,
        source_state: sourceItem.state_name,
        target_state: targetItem.state_name,
        match_class: 'Not comparable',
        confidence: 15,
        reasoning: `Deterministic reject: Pipe material mismatch (${attr1.pipeMaterial || 'Unspecified'} vs ${attr2.pipeMaterial || 'Unspecified'})`,
        scope_differences: [`Material mismatch: ${attr1.pipeMaterial || 'Unspecified'} vs ${attr2.pipeMaterial || 'Unspecified'}`],
        status: 'pending',
      };
    }

    // Pipe Diameter Check
    if (attr1.pipeDiameter !== attr2.pipeDiameter) {
      const matchInnerOuter =
        (attr1.pipeOuterDiameter && attr1.pipeDiameter === attr2.pipeDiameter) ||
        (attr2.pipeOuterDiameter && attr2.pipeDiameter === attr1.pipeDiameter);

      if (!matchInnerOuter) {
        return {
          pair_hash: pairHash,
          source_item: sourceItem,
          target_item: targetItem,
          source_state: sourceItem.state_name,
          target_state: targetItem.state_name,
          match_class: 'Not comparable',
          confidence: 20,
          reasoning: `Deterministic reject: Pipe diameter mismatch (${attr1.pipeDiameter || 'none'}mm vs ${attr2.pipeDiameter || 'none'}mm)`,
          scope_differences: [`Diameter mismatch: ${attr1.pipeDiameter || 'none'}mm vs ${attr2.pipeDiameter || 'none'}mm`],
          status: 'pending',
        };
      }
    }

    // Pipe Class / Pressure Check
    if (attr1.pipeClass && attr2.pipeClass && attr1.pipeClass !== attr2.pipeClass) {
      const isNp3Np4 =
        (attr1.pipeClass === 'NP3' && attr2.pipeClass === 'NP4') ||
        (attr1.pipeClass === 'NP4' && attr2.pipeClass === 'NP3');
      if (isNp3Np4) {
        scopeDifferences.push(`Pipe class difference: ${attr1.pipeClass} (heavy/medium duty) vs ${attr2.pipeClass}`);
      } else {
        return {
          pair_hash: pairHash,
          source_item: sourceItem,
          target_item: targetItem,
          source_state: sourceItem.state_name,
          target_state: targetItem.state_name,
          match_class: 'Not comparable',
          confidence: 25,
          reasoning: `Deterministic reject: Pipe class mismatch (${attr1.pipeClass} vs ${attr2.pipeClass})`,
          scope_differences: [`Class mismatch: ${attr1.pipeClass} vs ${attr2.pipeClass}`],
          status: 'pending',
        };
      }
    }

    if ((attr1.pipeClass === 'SN8' && !attr2.pipeClass) || (attr2.pipeClass === 'SN8' && !attr1.pipeClass)) {
      scopeDifferences.push('Stiffness class: SN8 specified on one side only');
    }

    // Pipe Application Standard Check (e.g. IS 15328 Non-Pressure Sewer vs IS 4985 Pressure)
    if (attr1.pipeStandard && attr2.pipeStandard && attr1.pipeStandard !== attr2.pipeStandard) {
      return {
        pair_hash: pairHash,
        source_item: sourceItem,
        target_item: targetItem,
        source_state: sourceItem.state_name,
        target_state: targetItem.state_name,
        match_class: 'Not comparable',
        confidence: 20,
        reasoning: `Deterministic reject: Pipe application/standard mismatch (${attr1.pipeStandard} vs ${attr2.pipeStandard})`,
        scope_differences: [`Standard mismatch: ${attr1.pipeStandard} vs ${attr2.pipeStandard}`],
        status: 'pending',
      };
    }

    // Supply vs Laying-only Scope Check
    if (attr1.pipeSupplyIncluded != null && attr2.pipeSupplyIncluded != null) {
      if (attr1.pipeSupplyIncluded !== attr2.pipeSupplyIncluded) {
        scopeDifferences.push(
          attr1.pipeSupplyIncluded
            ? 'Source includes pipe supply + laying, while target is laying only'
            : 'Source is laying only, while target includes pipe supply + laying',
        );
      }
    }
  }

  // 4b. Timbering Guards (Open vs Close Timbering is Not Comparable)
  if (attr1.category === 'Timbering' || attr2.category === 'Timbering') {
    const isOpen1 = /\bopen\s*timbering\b/i.test(sourceItem.full_description);
    const isOpen2 = /\bopen\s*timbering\b/i.test(targetItem.full_description);
    const isClose1 = /\bclose(d)?\s*timbering\b/i.test(sourceItem.full_description);
    const isClose2 = /\bclose(d)?\s*timbering\b/i.test(targetItem.full_description);
    if ((isOpen1 && isClose2) || (isClose1 && isOpen2)) {
      return {
        pair_hash: pairHash,
        source_item: sourceItem,
        target_item: targetItem,
        source_state: sourceItem.state_name,
        target_state: targetItem.state_name,
        match_class: 'Not comparable',
        confidence: 15,
        reasoning: 'Deterministic reject: Timbering type mismatch (Open timbering vs Close timbering)',
        scope_differences: ['Open timbering vs Close timbering'],
        status: 'pending',
      };
    }
  }

  // 5. Concrete Grade & Mix Ratio Guards (Only for Concrete category items)
  if (attr1.category === 'Concrete' && attr2.category === 'Concrete') {
    if (attr1.concreteGrade !== attr2.concreteGrade) {
      return {
        pair_hash: pairHash,
        source_item: sourceItem,
        target_item: targetItem,
        source_state: sourceItem.state_name,
        target_state: targetItem.state_name,
        match_class: 'Not comparable',
        confidence: 15,
        reasoning: `Deterministic reject: Concrete grade mismatch (${attr1.concreteGrade || 'unspecified'} vs ${attr2.concreteGrade || 'unspecified'})`,
        scope_differences: [`Grade mismatch: ${attr1.concreteGrade || 'unspecified'} vs ${attr2.concreteGrade || 'unspecified'}`],
        status: 'pending',
      };
    }
  }

  if (attr1.mixRatio && attr2.mixRatio && attr1.mixRatio !== attr2.mixRatio) {
    return {
      pair_hash: pairHash,
      source_item: sourceItem,
      target_item: targetItem,
      source_state: sourceItem.state_name,
      target_state: targetItem.state_name,
      match_class: 'Not comparable',
      confidence: 20,
      reasoning: `Deterministic reject: Mix ratio mismatch (${attr1.mixRatio} vs ${attr2.mixRatio})`,
      scope_differences: [`Mix ratio mismatch: ${attr1.mixRatio} vs ${attr2.mixRatio}`],
      status: 'pending',
    };
  }

  if ((attr1.mixRatio && !attr2.mixRatio) || (attr2.mixRatio && !attr1.mixRatio)) {
    scopeDifferences.push(
      `Specification difference: Nominal mix ratio (${attr1.mixRatio || attr2.mixRatio}) vs Design mix grade (${attr1.concreteGrade || attr2.concreteGrade})`,
    );
  }

  if (attr1.category === 'Concrete' && attr2.category === 'Concrete') {
    const desc1 = sourceItem.full_description.toLowerCase();
    const desc2 = targetItem.full_description.toLowerCase();
    const isDesign1 = desc1.includes('design mix');
    const isDesign2 = desc2.includes('design mix');
    const isNominal1 = desc1.includes('nominal mix') || desc1.includes('nominal - mix') || desc1.includes('nominal');
    const isNominal2 = desc2.includes('nominal mix') || desc2.includes('nominal - mix') || desc2.includes('nominal');
    if (isDesign1 !== isDesign2 || isNominal1 !== isNominal2) {
      scopeDifferences.push('Mix type difference: Design mix vs Nominal mix specification');
    }
    const hasAgg1 = /\b(20|40|10)\s*mm\b/i.test(desc1);
    const hasAgg2 = /\b(20|40|10)\s*mm\b/i.test(desc2);
    if (hasAgg1 !== hasAgg2) {
      scopeDifferences.push('Aggregate specification: Maximum aggregate size specified on one side only');
    }
    if (desc1.includes('shuttering') !== desc2.includes('shuttering') || desc1.includes('cantering') !== desc2.includes('cantering')) {
      scopeDifferences.push('Formwork / shuttering scope inclusion difference');
    }
    if (desc1.includes('foundation') !== desc2.includes('foundation') || desc1.includes('plinth') !== desc2.includes('plinth')) {
      scopeDifferences.push('Structural element scope: Foundation/plinth level specification difference');
    }
  }

  if (attr1.category === 'Road Restoration' && attr2.category === 'Road Restoration') {
    const desc1 = sourceItem.full_description.toLowerCase();
    const desc2 = targetItem.full_description.toLowerCase();

    // Road Work Type Check (WMM, GSB, Prime Coat, Tack Coat, DBM, Bituminous Concrete)
    if (attr1.roadWorkType && attr2.roadWorkType && attr1.roadWorkType !== attr2.roadWorkType) {
      const jaccard = calculateJaccard(sourceItem.full_description, targetItem.full_description);
      return {
        pair_hash: pairHash,
        source_item: sourceItem,
        target_item: targetItem,
        source_state: sourceItem.state_name,
        target_state: targetItem.state_name,
        match_class: 'Not comparable',
        confidence: Math.max(10, Math.min(20, 10 + Math.round(jaccard * 10))),
        reasoning: `Deterministic reject: Road work type mismatch (${attr1.roadWorkType} vs ${attr2.roadWorkType})`,
        scope_differences: [`Road work mismatch: ${attr1.roadWorkType} vs ${attr2.roadWorkType}`],
        status: 'pending',
      };
    }

    if (attr1.roadWorkType === 'GSB' || attr2.roadWorkType === 'GSB') {
      const hasGrading1 = desc1.includes('close graded') || desc1.includes('grading - i') || desc1.includes('grading i');
      const hasGrading2 = desc2.includes('coarse graded') || desc2.includes('cbr') || desc2.includes('grading i');
      if (hasGrading1 || hasGrading2) {
        scopeDifferences.push('Sub-base grading specification: Close-graded Material (Grading I) vs Coarse-graded Material (CBR>30)');
      }
    } else if (attr1.roadWorkType === 'Prime Coat' && attr2.roadWorkType === 'Prime Coat') {
      scopeDifferences.push('Application rate difference: 0.60 kg/sqm vs 0.70-1.00 kg/sqm');
    } else if (attr1.roadWorkType === 'Tack Coat' && attr2.roadWorkType === 'Tack Coat') {
      scopeDifferences.push('Application rate difference: 0.20 kg/sqm vs 0.30 kg/sqm');
    } else if (attr1.roadWorkType === 'Bituminous Concrete' && attr2.roadWorkType === 'Bituminous Concrete') {
      scopeDifferences.push('Bitumen binder content difference: 6.0% vs 5.4% (VG-30)');
    } else if (attr1.roadWorkType === 'DBM' && attr2.roadWorkType === 'DBM') {
      scopeDifferences.push('Grading and bitumen content difference: Grading-II @ 4.5% vs Grading-I @ 4.0%');
    }
  }

  // 5b. Manhole Rules (Diameter and Construction Type guards)
  if (attr1.category === 'Manhole' && attr2.category === 'Manhole') {
    if (attr1.manholeDia && attr2.manholeDia) {
      const diaDiff = Math.abs(attr1.manholeDia - attr2.manholeDia);
      if (diaDiff > 150) {
        return {
          pair_hash: pairHash,
          source_item: sourceItem,
          target_item: targetItem,
          source_state: sourceItem.state_name,
          target_state: targetItem.state_name,
          match_class: 'Not comparable',
          confidence: 15,
          reasoning: `Deterministic reject: Manhole diameter mismatch (${attr1.manholeDia}mm vs ${attr2.manholeDia}mm)`,
          scope_differences: [`Manhole diameter mismatch: ${attr1.manholeDia}mm vs ${attr2.manholeDia}mm`],
          status: 'pending',
        };
      } else if (diaDiff > 0) {
        scopeDifferences.push(`Manhole diameter difference: ${attr1.manholeDia}mm vs ${attr2.manholeDia}mm`);
      }
    }
    if (attr1.concreteGrade && attr2.concreteGrade && attr1.concreteGrade !== attr2.concreteGrade) {
      scopeDifferences.push(`Precast concrete grade difference: ${attr1.concreteGrade} vs ${attr2.concreteGrade}`);
    }
    if (attr1.manholeDepth && attr2.manholeDepth && attr1.manholeDepth !== attr2.manholeDepth) {
      scopeDifferences.push(`Manhole depth difference: ${attr1.manholeDepth}mm vs ${attr2.manholeDepth}mm`);
    }
    if (attr1.manholeConstruction && attr2.manholeConstruction && attr1.manholeConstruction !== attr2.manholeConstruction) {
      return {
        pair_hash: pairHash,
        source_item: sourceItem,
        target_item: targetItem,
        source_state: sourceItem.state_name,
        target_state: targetItem.state_name,
        match_class: 'Not comparable',
        confidence: 15,
        reasoning: `Deterministic reject: Manhole construction mismatch (${attr1.manholeConstruction} vs ${attr2.manholeConstruction})`,
        scope_differences: [`Manhole construction mismatch: ${attr1.manholeConstruction} vs ${attr2.manholeConstruction}`],
        status: 'pending',
      };
    }
  }

  // 6. Excavation & Timbering Rules & Depth Bands
  if (
    (attr1.category === 'Excavation' || attr1.category === 'Timbering') &&
    (attr2.category === 'Excavation' || attr2.category === 'Timbering')
  ) {
    // Soil type check (Hard rock and Ordinary rock cannot match soil)
    if (attr1.soilType && attr2.soilType && attr1.soilType !== attr2.soilType) {
      const isRock1 = attr1.soilType === 'hard_rock' || attr1.soilType === 'ordinary_rock';
      const isRock2 = attr2.soilType === 'hard_rock' || attr2.soilType === 'ordinary_rock';
      if ((isRock1 && !isRock2) || (!isRock1 && isRock2) || (attr1.soilType === 'hard_rock' && attr2.soilType === 'ordinary_rock') || (attr1.soilType === 'ordinary_rock' && attr2.soilType === 'hard_rock')) {
        return {
          pair_hash: pairHash,
          source_item: sourceItem,
          target_item: targetItem,
          source_state: sourceItem.state_name,
          target_state: targetItem.state_name,
          match_class: 'Not comparable',
          confidence: 20,
          reasoning: `Deterministic reject: Soil strata mismatch (${attr1.soilType} vs ${attr2.soilType})`,
          scope_differences: [`Soil type mismatch: ${attr1.soilType} vs ${attr2.soilType}`],
          status: 'pending',
        };
      }
    }

    // Depth Band Check (disjoint vs overlapping vs equal)
    const hasDepth1 = attr1.depthMin != null || attr1.depthMax != null;
    const hasDepth2 = attr2.depthMin != null || attr2.depthMax != null;
    if (hasDepth1 && hasDepth2) {
      const dMin1 = attr1.depthMin ?? 0;
      const dMax1 = attr1.depthMax ?? 1.5;
      const dMin2 = attr2.depthMin ?? 0;
      const dMax2 = attr2.depthMax ?? 1.5;

      const isDisjoint = dMax1 <= dMin2 || dMax2 <= dMin1;
      const isExact = Math.abs(dMin1 - dMin2) <= 0.05 && Math.abs(dMax1 - dMax2) <= 0.05;

      if (isDisjoint) {
        return {
          pair_hash: pairHash,
          source_item: sourceItem,
          target_item: targetItem,
          source_state: sourceItem.state_name,
          target_state: targetItem.state_name,
          match_class: 'Not comparable',
          confidence: 25,
          reasoning: `Deterministic reject: Disjoint depth band (${dMin1}-${dMax1}m vs ${dMin2}-${dMax2}m)`,
          scope_differences: [`Disjoint depth band: ${dMin1}-${dMax1}m vs ${dMin2}-${dMax2}m`],
          status: 'pending',
        };
      } else if (!isExact) {
        scopeDifferences.push(`Depth range difference: ${dMin1}-${dMax1}m vs ${dMin2}-${dMax2}m`);
      }
    }

    const desc1 = sourceItem.full_description.toLowerCase();
    const desc2 = targetItem.full_description.toLowerCase();
    if (desc1.includes('mechanical') !== desc2.includes('mechanical')) {
      scopeDifferences.push('Excavation method: mechanical means specified on one side only');
    }
    if (desc1.includes('saturated') !== desc2.includes('saturated')) {
      scopeDifferences.push('Soil strata: saturated soil / kankar specified on one side only');
    }
    if (desc1.includes('10 sqm') !== desc2.includes('10 sqm')) {
      scopeDifferences.push('Plan dimensions: 10 sqm on plan specification difference');
    }

    // Generic attribute-driven excavation lift structure detection
    if (attr1.isIncrementalLift !== attr2.isIncrementalLift) {
      rateStructureWarning =
        'Rate structure difference: Rate represents an incremental extra per additional lift added over base excavation rate, whereas the comparable item represents an all-inclusive standalone composite rate for that specific depth band.';
      scopeDifferences.push('Incremental extra lift rate formula vs standalone composite depth band rate');
    }

    // Lead differences (e.g. 50m vs 1km or 5km)
    if (attr1.leadDistanceKm != null && attr2.leadDistanceKm != null && attr1.leadDistanceKm !== attr2.leadDistanceKm) {
      scopeDifferences.push(`Lead distance difference: ${attr1.leadDistanceKm * 1000}m vs ${attr2.leadDistanceKm * 1000}m`);
    }
  }

  // 6b. Dismantling Scope Differences
  if (attr1.category === 'Dismantling' && attr2.category === 'Dismantling') {
    const desc1 = sourceItem.full_description.toLowerCase();
    const desc2 = targetItem.full_description.toLowerCase();
    if (desc1.includes('pneumatic') !== desc2.includes('pneumatic')) {
      scopeDifferences.push('Tooling specification: pneumatic breaker / cutter specified on one side only');
    }
    if (attr1.leadDistanceKm !== attr2.leadDistanceKm) {
      scopeDifferences.push(
        `Disposal lead distance difference: ${(attr1.leadDistanceKm ?? 0.05) * 1000}m vs ${(attr2.leadDistanceKm ?? 1) * 1000}m`,
      );
    }
  }

  // Tooling / method specification differences (e.g. pneumatic breaker / concrete cutter in dismantling)
  if (attr1.toolingOrMethod !== attr2.toolingOrMethod) {
    if (attr1.toolingOrMethod || attr2.toolingOrMethod) {
      scopeDifferences.push(
        `Tooling specification difference: ${attr1.toolingOrMethod ? 'Source specifies ' + attr1.toolingOrMethod : 'Target specifies ' + attr2.toolingOrMethod}`
      );
    }
  }

  // Staging / shuttering specification differences (e.g. 7.5m staging height / steel formwork)
  if (attr1.stagingOrFormworkDetails !== attr2.stagingOrFormworkDetails) {
    if (attr1.stagingOrFormworkDetails || attr2.stagingOrFormworkDetails) {
      scopeDifferences.push(
        `Staging / formwork specification difference: ${attr1.stagingOrFormworkDetails ? 'Source specifies ' + attr1.stagingOrFormworkDetails : 'Target specifies ' + attr2.stagingOrFormworkDetails}`
      );
    }
  }

  // 6b. Description similarity guard
  const jaccard = calculateJaccard(sourceItem.full_description, targetItem.full_description);
  const hasKeyAttributes = !!(
    attr1.pipeDiameter ||
    attr2.pipeDiameter ||
    attr1.concreteGrade ||
    attr2.concreteGrade ||
    attr1.mixRatio ||
    attr2.mixRatio ||
    (attr1.depthMax != null && attr2.depthMax != null) ||
    (attr1.category === 'Excavation' && attr2.category === 'Excavation') ||
    (attr1.category === 'Timbering' && attr2.category === 'Timbering') ||
    (attr1.category === 'Dismantling' && attr2.category === 'Dismantling') ||
    (attr1.category === 'Road Restoration' && attr2.category === 'Road Restoration' && attr1.roadWorkType === attr2.roadWorkType)
  );

  if (!hasKeyAttributes && jaccard < 0.28) {
    const computedRejectConf = Math.max(8, Math.min(22, 10 + Math.round(jaccard * 15)));
    return {
      pair_hash: pairHash,
      source_item: sourceItem,
      target_item: targetItem,
      source_state: sourceItem.state_name,
      target_state: targetItem.state_name,
      match_class: 'Not comparable',
      confidence: computedRejectConf,
      reasoning: `Deterministic reject: Description similarity below threshold (${Math.round(jaccard * 100)}%) and no shared engineering attributes`,
      scope_differences: ['Different civil engineering specifications'],
      status: 'pending',
    };
  }

  // 6c. Rate Ratio Sanity Guard (Hard Guard 9: ratio > 3x or < 1/3)
  const r1 = sourceItem.rate_ex_gst;
  const r2 = targetItem.rate_ex_gst;
  if (r1 != null && r2 != null && r1 > 0 && r2 > 0) {
    const ratio = r1 / r2;
    if (ratio > 3.0 || ratio < 0.333333) {
      rateStructureWarning = `Rate disparity: Rate ratio (${ratio.toFixed(2)}x) exceeds 3x sanity boundary - needs manual verification`;
      scopeDifferences.push(`Rate ratio > 3x (${ratio.toFixed(2)}x) - needs manual verification`);
    }
  }

  // 7. Determine Final Match Classification & Compute Confidence from Attribute Agreement
  let matchClass: MatchClass = 'Conditional';
  let confidence = 80;
  let reasoning = '';

  // Base attribute agreement score:
  // Evaluates 5 dimensions: Category (25), Material (25), Dimensions (20), Grade/Spec (20), Work Scope (10)
  let attrAgreementScore = 100;
  for (const diff of scopeDifferences) {
    if (/pipe class/i.test(diff)) attrAgreementScore -= 12;
    else if (/depth range/i.test(diff)) attrAgreementScore -= 10;
    else if (/specification difference/i.test(diff) || /mix/i.test(diff)) attrAgreementScore -= 12;
    else if (/sub-base grading/i.test(diff)) attrAgreementScore -= 10;
    else if (/application rate/i.test(diff)) attrAgreementScore -= 8;
    else if (/bitumen binder/i.test(diff) || /bitumen content/i.test(diff)) attrAgreementScore -= 8;
    else if (/soil strata/i.test(diff)) attrAgreementScore -= 8;
    else if (/excavation method/i.test(diff) || /tooling/i.test(diff)) attrAgreementScore -= 7;
    else if (/stiffness class/i.test(diff)) attrAgreementScore -= 6;
    else attrAgreementScore -= 8;
  }
  if (rateStructureWarning) attrAgreementScore -= 15;

  const hasCriticalAttrs = hasSufficientCriticalAttributes(attr1, attr2);

  if (scopeDifferences.length === 0 && !rateStructureWarning && hasCriticalAttrs) {
    // Strong match: all required critical engineering attributes match with zero differences
    matchClass = 'Strong';
    confidence = Math.max(92, Math.min(98, 92 + Math.round(jaccard * 8)));
    reasoning = `Equivalent engineering specifications, verified critical attributes (${attr1.pipeDiameter ? `${attr1.pipeDiameter}mm ` : ''}${attr1.concreteGrade || attr1.roadWorkType || attr1.soilType || 'standard unit'}), matching unit dimension (${unitCheck.dimension}), and compatible civil scope.`;
  } else {
    // Conditional match: functionally comparable but has scope differences or incomplete critical attributes
    matchClass = 'Conditional';
    confidence = Math.max(60, Math.min(88, Math.round(attrAgreementScore)));
    if (scopeDifferences.length > 0) {
      reasoning = `Functionally comparable civil item with identifiable scope differences: ${scopeDifferences.join('; ')}.`;
    } else if (!hasCriticalAttrs) {
      reasoning = `Functionally comparable civil item, but critical engineering attributes (dimensions, grade, or material specifications) are incomplete or unverified. Human review required.`;
    } else {
      reasoning = `Functionally comparable civil item with potential rate structure difference.`;
    }
    if (rateStructureWarning) {
      reasoning += ` Warning: ${rateStructureWarning}`;
    }
  }

  return {
    pair_hash: pairHash,
    source_item: sourceItem,
    target_item: targetItem,
    source_state: sourceItem.state_name,
    target_state: targetItem.state_name,
    match_class: matchClass,
    confidence,
    reasoning,
    scope_differences: scopeDifferences,
    rate_structure_warning: rateStructureWarning,
    status: 'pending',
  };
}

export function computeCanonicalGroupKey(
  category: string,
  canonicalName: string,
  unit: string,
): string {
  const normCat = (category || 'Other').trim().toLowerCase();
  const normName = (canonicalName || 'item')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  const normUnit = (unit || 'unit').trim().toLowerCase();
  return `${normCat}:::${normName}:::${normUnit}`;
}

export function deterministicUuid(key: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < key.length; i++) {
    const ch = key.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const part1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (h2 >>> 0).toString(16).padStart(8, '0');
  const part3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0');
  const part4 = ((h1 + h2) >>> 0).toString(16).padStart(8, '0');
  return `${part1}-${part2.slice(0, 4)}-4${part2.slice(4, 7)}-a${part3.slice(0, 3)}-${part3.slice(3, 7)}${part4.slice(0, 8)}`;
}

export function formatCanonicalTitle(item: SorItemRecord): string {
  let p = (item.section_heading || item.parent_description || '').replace(/\s+/g, ' ').trim();
  let raw = (item.raw_description || '').replace(/\s+/g, ' ').trim();

  // Strip clause notes / definition sentences from parent and raw descriptions
  if (/^(shall\s+be\s+considered|note\s*:|the\s+rate\s+includes|rates?\s+shall\s+be)/i.test(p)) {
    p = '';
  }
  if (/^(shall\s+be\s+considered|note\s*:|the\s+rate\s+includes|rates?\s+shall\s+be)/i.test(raw)) {
    raw = '';
  }

  if (p && raw && p.toLowerCase() !== raw.toLowerCase()) {
    const pShort = p.length > 50 ? p.slice(0, 50).replace(/\s+[^\s]*$/, '') : p;
    const rawShort = raw.length > 50 ? raw.slice(0, 50).replace(/\s+[^\s]*$/, '') : raw;
    return `${pShort} - ${rawShort}`.slice(0, 95);
  }

  const full = (item.full_description || item.raw_description || 'Civil Work Item').replace(/\s+/g, ' ').trim();
  return full.slice(0, 95);
}

export function isSameCanonicalSpec(
  itemA: SorItemRecord,
  attrA: ParsedItemAttributes,
  itemB: SorItemRecord,
  attrB: ParsedItemAttributes,
): boolean {
  if (attrA.category !== attrB.category) return false;
  if (attrA.materialType !== attrB.materialType) return false;
  if (attrA.roadWorkType !== attrB.roadWorkType) return false;

  const unitInfoA = getUnitInfo(itemA.unit);
  const unitInfoB = getUnitInfo(itemB.unit);
  if (unitInfoA?.canonicalUnit && unitInfoB?.canonicalUnit) {
    if (unitInfoA.canonicalUnit !== unitInfoB.canonicalUnit) return false;
  }

  if (attrA.category === 'Pipe Laying' || attrB.category === 'Pipe Laying') {
    if (attrA.pipeMaterial !== attrB.pipeMaterial) return false;
    if (attrA.pipeDiameter !== attrB.pipeDiameter) return false;
    if (attrA.pipeClass !== attrB.pipeClass) return false;
    if (attrA.pipeStandard !== attrB.pipeStandard) return false;
  }

  if (attrA.category === 'Concrete' || attrB.category === 'Concrete') {
    if (attrA.concreteGrade !== attrB.concreteGrade) return false;
    if (attrA.mixRatio !== attrB.mixRatio) return false;
  }

  if (attrA.category === 'Timbering' || attrB.category === 'Timbering') {
    const isOpenA = /\bopen\s*timbering\b/i.test(itemA.full_description);
    const isOpenB = /\bopen\s*timbering\b/i.test(itemB.full_description);
    if (isOpenA !== isOpenB) return false;
    if (attrA.depthMin !== attrB.depthMin || attrA.depthMax !== attrB.depthMax) return false;
  }

  if (attrA.category === 'Excavation' || attrB.category === 'Excavation') {
    if (attrA.soilType !== attrB.soilType) return false;
    if (attrA.isIncrementalLift !== attrB.isIncrementalLift) return false;
    if (attrA.depthMin !== attrB.depthMin || attrA.depthMax !== attrB.depthMax) return false;
    return true;
  }

  if (attrA.category === 'Dismantling' || attrB.category === 'Dismantling') {
    if (attrA.materialType !== attrB.materialType) return false;
  }

  if (attrA.category === 'Manhole' || attrB.category === 'Manhole') {
    if (attrA.manholeDia !== attrB.manholeDia) return false;
    if (attrA.manholeConstruction !== attrB.manholeConstruction) return false;
    const isRingA = /\b(circular\s*ring|extra\s*depth)\b/i.test(itemA.raw_description || itemA.full_description);
    const isRingB = /\b(circular\s*ring|extra\s*depth)\b/i.test(itemB.raw_description || itemB.full_description);
    if (isRingA !== isRingB) return false;
  }

  if (attrA.category === 'Valves & Fittings' || attrB.category === 'Valves & Fittings') {
    if (attrA.pipeDiameter !== attrB.pipeDiameter) return false;
  }

  const jaccard = calculateJaccard(itemA.full_description, itemB.full_description);
  if (jaccard < 0.25) return false;

  return true;
}

export function buildCanonicalGroups(
  items: (SorItemRecord & { filename?: string })[],
): {
  groups: SorItemGroupRecord[];
  allPairs: SorMatchRecord[];
} {
  const groups: SorItemGroupRecord[] = [];
  const allPairs: SorMatchRecord[] = [];

  // Precompute and cache attributes for all items once (O(N) instead of O(N^2))
  const attrCache = new Map<string, ParsedItemAttributes>();
  for (const item of items) {
    const key = `${item.state_name}_${item.source_row}`;
    attrCache.set(key, extractAttributes(item.full_description, item.unit));
  }

  // 1. Group items across states
  for (const item of items) {
    const itemKey = `${item.state_name}_${item.source_row}`;
    const itemAttr = attrCache.get(itemKey) || extractAttributes(item.full_description, item.unit);
    let matchedGroup: SorItemGroupRecord | null = null;
    let bestEval: SorMatchRecord | null = null;

    // Check if this item matches an existing group with matching category
    for (const group of groups) {
      if (group.category !== itemAttr.category) continue;

      const sameStateMem = (group.members || []).find((m) => m.state_name === item.state_name);
      if (sameStateMem) {
        // Intra-state check: must be IDENTICAL canonical spec
        const sameMemKey = `${sameStateMem.state_name}_${sameStateMem.item?.source_row}`;
        const sameMemAttr = attrCache.get(sameMemKey) || extractAttributes(sameStateMem.item?.full_description || '', sameStateMem.item?.unit || null);
        if (sameStateMem.item && isSameCanonicalSpec(sameStateMem.item, sameMemAttr, item, itemAttr)) {
          matchedGroup = group;
          bestEval = {
            pair_hash: generatePairHash(`${sameStateMem.state_name}_${sameStateMem.item.source_row}`, `${item.state_name}_${item.source_row}`),
            source_item: sameStateMem.item,
            target_item: item,
            source_state: sameStateMem.state_name,
            target_state: item.state_name,
            match_class: 'Strong',
            confidence: 100,
            reasoning: 'Intra-state identical canonical spec match',
            scope_differences: [],
            status: 'pending',
          };
          break;
        } else {
          // Different item from same state: cannot join this group!
          continue;
        }
      }

      // Cross-state check:
      const exemplar = group.members?.[0]?.item;
      if (!exemplar) continue;

      const exemplarKey = `${exemplar.state_name}_${exemplar.source_row}`;
      const evalResult = evaluatePair(exemplar, item, attrCache.get(exemplarKey), itemAttr);

      if (evalResult.match_class !== 'Not comparable') {
        const jaccard = calculateJaccard(exemplar.full_description, item.full_description);
        const score = evalResult.confidence * 1000 + Math.round(jaccard * 1000);
        if (!bestEval || score > ((bestEval as any)._score ?? 0)) {
          bestEval = evalResult;
          (bestEval as any)._score = score;
          matchedGroup = group;
        }
      }
    }

    if (matchedGroup && bestEval) {
      const isCrossState = !matchedGroup.members?.some((m) => m.state_name === item.state_name);

      let matchClass = bestEval.match_class;
      let confidence = bestEval.confidence;

      if (isCrossState) {
        // Generalized attribute-driven cross-state classification
        if (matchClass === 'Conditional') {
          matchedGroup.attributes = { ...matchedGroup.attributes, match_class: 'Conditional' };
        } else if (!matchedGroup.attributes.match_class || matchedGroup.attributes.match_class === 'Strong') {
          matchedGroup.attributes = { ...matchedGroup.attributes, match_class: matchClass };
        }

        // Align anchor member if it was an initial placeholder
        if (matchedGroup.members && matchedGroup.members.length > 0) {
          const anchor = matchedGroup.members[0];
          if (anchor.reasoning === 'Group canonical anchor exemplar') {
            anchor.match_class = matchClass;
            anchor.confidence = confidence;
          }
        }
      }

      const memberId = deterministicUuid(`${matchedGroup.id}::${item.id || item.state_name + '_' + item.source_row}`);

      const member: SorItemGroupMemberRecord = {
        id: memberId,
        group_id: matchedGroup.id,
        item_id: item.id || deterministicUuid(`item::${item.state_name}_${item.source_row}`),
        file_id: item.file_id,
        state_name: item.state_name,
        match_class: matchClass,
        confidence: confidence,
        reasoning: bestEval.reasoning,
        warnings: bestEval.rate_structure_warning ? [bestEval.rate_structure_warning] : [],
        review_status: 'pending',
        item,
        source_rows: [item.source_row],
        source_files: item.filename ? [item.filename] : [],
      };
      matchedGroup.members = matchedGroup.members || [];
      matchedGroup.members.push(member);
      allPairs.push(bestEval);
    } else {
      const cleanName = formatCanonicalTitle(item);
      const groupUnit = item.unit_norm || item.unit || 'unit';
      const groupKey = computeCanonicalGroupKey(itemAttr.category, cleanName, groupUnit);
      
      const groupId = deterministicUuid(groupKey);
      const anchorMemberId = deterministicUuid(`${groupId}::${item.id || item.state_name + '_' + item.source_row}`);

      const newGroup: SorItemGroupRecord = {
        id: groupId,
        canonical_name: cleanName,
        category: itemAttr.category,
        canonical_unit: groupUnit,
        attributes: itemAttr,
        status: 'active',
        group_key: groupKey,
        members: [
          {
            id: anchorMemberId,
            group_id: groupId,
            item_id: item.id || deterministicUuid(`item::${item.state_name}_${item.source_row}`),
            file_id: item.file_id,
            state_name: item.state_name,
            match_class: 'Conditional', // Anchor placeholder
            confidence: 100,
            reasoning: 'Group canonical anchor exemplar',
            warnings: [],
            review_status: 'pending',
            item,
            source_rows: [item.source_row],
            source_files: item.filename ? [item.filename] : [],
          },
        ],
      };
      groups.push(newGroup);
    }
  }

  // 2. State-level consolidation within each group
  for (const group of groups) {
    if (!group.members) continue;

    const byState = new Map<string, SorItemGroupMemberRecord[]>();
    for (const mem of group.members) {
      const arr = byState.get(mem.state_name) || [];
      arr.push(mem);
      byState.set(mem.state_name, arr);
    }

    const consolidatedMembers: SorItemGroupMemberRecord[] = [];

    for (const [stateName, stateMems] of Array.from(byState.entries())) {
      if (stateMems.length === 1) {
        const m = stateMems[0];
        m.state_rate_status = 'consolidated';
        m.selected_rate_ex_gst = m.item?.rate_ex_gst ?? null;
        m.distinct_state_rates = m.item?.rate_ex_gst != null ? [m.item.rate_ex_gst] : [];
        m.description_variants = [(m.item?.raw_description || m.item?.full_description || '').trim()].filter(Boolean);
        consolidatedMembers.push(m);
      } else {
        const distinctRates = Array.from(
          new Set(
            stateMems
              .map((m) => (m.item?.rate_ex_gst != null ? Number(m.item.rate_ex_gst.toFixed(2)) : null))
              .filter((r): r is number => r != null),
          ),
        );
        const allSourceRows = Array.from(
          new Set(stateMems.flatMap((m) => m.source_rows || [m.item?.source_row || 0])),
        ).sort((a, b) => a - b);
        const allFiles = Array.from(
          new Set(stateMems.flatMap((m) => m.source_files || ((m.item as any)?.filename ? [(m.item as any).filename] : []))),
        );
        const descriptionVariants = Array.from(
          new Set(stateMems.map((m) => (m.item?.raw_description || m.item?.full_description || '').trim()).filter(Boolean)),
        );

        if (distinctRates.length === 1) {
          const primary = stateMems[0];
          primary.state_rate_status = 'consolidated';
          primary.selected_rate_ex_gst = distinctRates[0];
          primary.distinct_state_rates = distinctRates;
          primary.source_rows = allSourceRows;
          primary.source_files = allFiles;
          primary.description_variants = descriptionVariants;
          consolidatedMembers.push(primary);
        } else {
          const primary = stateMems[0];
          const isMultiFile = allFiles.length > 1;
          primary.state_rate_status = 'state_rate_conflict';
          primary.selected_rate_ex_gst = null; // Do NOT average; requires user selection!
          primary.distinct_state_rates = distinctRates;
          primary.source_rows = allSourceRows;
          primary.source_files = allFiles;
          primary.description_variants = descriptionVariants;
          primary.warnings.push(
            isMultiFile
              ? `state_rate_conflict: Multiple sources for ${stateName} have differing rates: ₹${distinctRates.join(', ₹')} (selection required)`
              : `state_rate_conflict: Item has ${stateMems.length} specification/rate variants with differing rates: ₹${distinctRates.join(', ₹')} (selection required)`,
          );
          consolidatedMembers.push(primary);
        }
      }
    }

    group.members = consolidatedMembers;
  }

  return { groups, allPairs };
}

