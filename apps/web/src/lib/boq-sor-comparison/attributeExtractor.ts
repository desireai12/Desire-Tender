// Attribute Extractor: Extracts structured engineering attributes from full description and unit.
import type { ParsedItemAttributes } from './types';

export function extractAttributes(fullDesc: string, unit: string | null): ParsedItemAttributes {
  const d = (fullDesc || '').toLowerCase().replace(/½/g, '.5');
  const u = (unit || '').toLowerCase();

  // 1. Category Detection (Priority-ordered)
  let category = 'Other';
  if (/\b(robot|robotic|robotic\s*arm|cleaning\s+of\s+manholes?\s+having\s+expandable\s+robotic\s*arm)\b/i.test(d)) {
    category = 'Specialized Equipment / Robotics';
  } else if (/\b(horizontal\s*direction\s*drilling|trenchless(\s*technology)?|hdd)\b/i.test(d)) {
    category = 'Trenchless Technology';
  } else if (/\b(manhole\s*monitoring|iot\s*sensor|manhole\s*level|overflow\s*monitoring)\b/i.test(d)) {
    category = 'IoT & Instrumentation';
  } else if (/\b(dismantl(e|ing|ed)?|demolish(ing|ed)?|break(ing)?\s*up|remov(al|ing|ed)?\s+(?:all\s+type\s+of\s+)?(?:rcc\s+)?pipes?)\b/i.test(d)) {
    category = 'Dismantling';
  } else if (
    /\b(excavat\w*|earth\s*work)\b/i.test(d) &&
    !/\b(carriage|transport)\b/i.test(d) &&
    !/\b(bituminous\s*concrete|dense\s*bituminous|wet\s*mix\s*macadam|granular\s*sub-?base)\b/i.test(d) &&
    !/\b(inspection\s*chamber|manhole)\b/i.test(d)
  ) {
    category = 'Excavation';
  } else if (
    (/\b(soil|strata|moorum)\b/i.test(d) && (/\bdepth\b/i.test(d) || /\bupto\s*\d+/i.test(d) || /\b\d+\s*to\s*\d+/i.test(d) || /\b1\.5\s*m\b/i.test(d)) && !/\b(pipe|manhole|chamber)\b/i.test(d)) ||
    /\bdressed\s+for\s+all\s+kinds\s+of\s+soil\b/i.test(d)
  ) {
    category = 'Excavation';
  } else if (
    /\b(pipe|pipes|pipeline|sewer\s*pipe|casing\s*pipe|non-pressure\s*pipe|np4|np3|np2|pvc-u|u-pvc|hdpe|pe100|dwc|double\s*wall\s*corrugated|di\s*pipe|ductile\s*iron)\b/i.test(d) &&
    !/\b(manhole\s*monitoring|chamber\s*cover|d-?\s*joint|detachable\s*joint|sluice\s*valve)\b/i.test(d) &&
    !/\b(circular\s*manholes?|pre-?cast\s*rcc\s*m-?\d+|constructing\s+of\s+.*manholes?)\b/i.test(d)
  ) {
    category = 'Pipe Laying';
  } else if (
    /\b(manhole|inspection\s*chamber|road\s*side\s*chamber|gully\s*trap|catch\s*pit)\b/i.test(d) &&
    !/\b(robot|robotic)\b/i.test(d)
  ) {
    category = 'Manhole';
  } else if (/\b(thermo-?\s*mechanically\s*treated|tmt|reinforcement\s*for\s*r\.?c\.?c\.?|steel\s*bars\s*for\s*reinforcement)\b/i.test(d)) {
    category = 'Steel Reinforcement';
  } else if (/\b(d-?\s*joint|detachable\s*joint|sluice\s*valve|air\s*valve|non-?return\s*valve|reflux\s*valve|butterfly\s*valve|scour\s*valve|ci\s*specials?|di\s*specials?)\b/i.test(d)) {
    category = 'Valves & Fittings';
  } else if (/\b(surface\s*dressing\s+of\s+(the\s+)?ground|removing\s*vegetation|clearing\s*jungle|uprooting\s*rank\s*vegetation)\b/i.test(d)) {
    category = 'Site Preparation';
  } else if (
    /\b(filling\s+(available\s+)?excavated\s+earth|earth\s*filling|moorum\s*filling|filling\s*around\s*pipe|backfill(ing)?|refill(ing)?|filling\s+(in|of)\s+trench(es)?)\b/i.test(d) ||
    (d.trim().startsWith('filling') && !/\b(well\s*point)\b/i.test(d))
  ) {
    category = 'Filling / Backfilling';
  } else if (/\b(open\s*timbering|close(d)?\s*timbering|timbering\s*in\s*trenches)\b/i.test(d)) {
    category = 'Timbering';
  } else if (/\b(barricad(e|ing)|corrugated\s*sheets?\s*(for\s*restricting)?|retro\s*reflective|safety\s*barrier)\b/i.test(d)) {
    category = 'Barricading / Safety';
  } else if (/\b(drain\s*cover|ferro-?cement\s*cover|grating|gratings|drain\s*channel|gully\s*grating)\b/i.test(d)) {
    category = 'Drain Covers & Gratings';
  } else if (
    /\b(wet\s*mix\s*macadam|wmm|crusher\s*run|granular\s*sub-?base|gsb|bituminous|asphalt|tack\s*coat|prime\s*coat|dense\s*bituminous|seal\s*coat|mastic\s*asphalt|wbm|mix\s*seal)\b/i.test(d) &&
    !/\b(surface\s*dressing\s+of\s+(the\s+)?ground|removing\s*vegetation)\b/i.test(d)
  ) {
    category = 'Road Restoration';
  } else if (/\b(brick\s*masonry|brick\s*work|fps\s*bricks|modular\s*bricks|common\s*burnt\s*clay\s*bricks)\b/i.test(d)) {
    category = 'Brick Work';
  } else if (/\b(plaster(ing)?|pointing|rendering)\b/i.test(d)) {
    category = 'Plastering & Pointing';
  } else if (/\b(stone\s*masonry|random\s*rubble|coursed\s*rubble|ashlar)\b/i.test(d)) {
    category = 'Stone Masonry';
  } else if (/\b(centering\s*and\s*shuttering|formwork|shuttering)\b/i.test(d) && !/\b(pcc|rcc|cement\s*concrete)\b/i.test(d)) {
    category = 'Formwork / Shuttering';
  } else if (
    /\b(cement\s*concrete|pcc|rcc|plain\s*cement\s*concrete|reinforced\s*cement\s*concrete|nominal\s*mix|design\s*mix|m\s*[-–—]?\s*(7\.5|10|15|20|25|30|35|40)|1\s*:\s*[12345]:[234568])\b/i.test(d) &&
    !/\b(pipe|np3|np4|dwc)\b/i.test(d)
  ) {
    category = 'Concrete';
  } else if (/\b(carriage|transport|cartage)\b/i.test(d)) {
    category = 'Carriage';
  }

  // 2. Pipe Attributes
  let pipeMaterial: ParsedItemAttributes['pipeMaterial'] = null;
  if (/\b(dwc|double\s*wall\s*corrugated)\b/i.test(d)) pipeMaterial = 'DWC';
  else if (/\b(rcc|np4|np3|np2)\b/i.test(d)) pipeMaterial = 'RCC';
  else if (/\b(di\s*pipes?|ductile\s*iron)\b/i.test(d) || /\bd\.i\./i.test(d)) pipeMaterial = 'DI';
  else if (/\b(hdpe|pe100|pe80)\b/i.test(d)) pipeMaterial = 'HDPE';
  else if (/\b(pvc-u|u-pvc|upvc|pvc)\b/i.test(d)) pipeMaterial = 'PVC-U';
  else if (/\b(ms\s*pipes?|mild\s*steel|casing\s*pipe)\b/i.test(d)) pipeMaterial = 'MS';
  else if (/\b(ci\s*pipes?|cast\s*iron)\b/i.test(d)) pipeMaterial = 'CI';
  else if (/\b(gi\s*pipes?|galvani[sz]ed\s*iron)\b/i.test(d) || /\bg\.i\./i.test(d)) pipeMaterial = 'GI';
  else if (/\b(ac\s*pipes?|asbestos\s*cement|\bac\b.*pipes?)\b/i.test(d)) pipeMaterial = 'AC';

  // Diameters
  let pipeDiameter: number | null = null;
  let pipeOuterDiameter: number | null = null;

  // Pattern: "200/238 mm" or "295/250 mm" (inner/outer)
  // In engineering practice, the smaller value is the Internal Diameter (ID),
  // and the larger value is the External/Outer Diameter (OD).
  const slashMatch = d.match(/\b(\d{2,4})\s*\/\s*(\d{2,4})\s*mm\b/i);
  if (slashMatch) {
    const n1 = parseInt(slashMatch[1], 10);
    const n2 = parseInt(slashMatch[2], 10);
    pipeDiameter = Math.min(n1, n2);
    pipeOuterDiameter = Math.max(n1, n2);
  } else {
    // Standard diameter: requires dia/diameter/id/od or pipe context
    const diaMatch = d.match(/\b(\d{2,4})\s*(mm|cm|meter|m)\b\s*(?:dia|diameter|id|internal\s*dia|internal\s*diameter|od|outer\s*dia|nb|nominal\s*bore)\b/i) ||
                     (category === 'Pipe Laying' ? d.match(/\b(\d{2,4})\s*mm\b/i) : null);
    if (diaMatch) {
      let val = parseInt(diaMatch[1], 10);
      if (diaMatch[2] === 'cm') val = val * 10;
      if (diaMatch[2] === 'm' || diaMatch[2] === 'meter') val = val * 1000;
      if (val >= 50 && val <= 3000) {
        pipeDiameter = val;
      }
    }
  }

  // Pipe Class / Pressure
  let pipeClass: string | null = null;
  if (/\bnp4\b/i.test(d)) pipeClass = 'NP4';
  else if (/\bnp3\b/i.test(d)) pipeClass = 'NP3';
  else if (/\bclass\s*[-–—]?\s*1\b/i.test(d)) pipeClass = 'Class 1';
  else if (/\bclass\s*[-–—]?\s*2\b/i.test(d)) pipeClass = 'Class 2';
  else if (/\bsn\s*8\b/i.test(d)) pipeClass = 'SN8';
  else if (/\bsn\s*4\b/i.test(d)) pipeClass = 'SN4';
  else if (/\b(6\s*kg\s*\/\s*cm2|6\s*kgf)\b/i.test(d)) pipeClass = '6 kg/cm2';
  else if (/\b(10\s*kg\s*\/\s*cm2|10\s*kgf)\b/i.test(d)) pipeClass = '10 kg/cm2';

  // Pipe Standard & Application (IS 15328 Non-Pressure Sewer vs IS 4985 Pressure)
  let pipeStandard: string | null = null;
  if (/\b(is\s*[-–—]?\s*15328|sn\s*8|sn\s*4|sewer\s*pipe|underground\s*drainage|non-pressure)\b/i.test(d)) {
    pipeStandard = 'IS 15328 (Sewer/Non-pressure)';
  } else if (/\b(is\s*[-–—]?\s*4985|pressure\s*pipe|6\s*kg\s*\/\s*cm2|10\s*kg\s*\/\s*cm2|potable\s*water)\b/i.test(d)) {
    pipeStandard = 'IS 4985 (Pressure)';
  } else if (/\b(is\s*[-–—]?\s*458|np3|np4|np2)\b/i.test(d)) {
    pipeStandard = 'IS 458 (RCC)';
  }

  // Supply vs Lay-only
  let pipeSupplyIncluded: boolean | null = null;
  if (/\b(supplying|providing\s*at\s*site|supply\s*and\s*lay|providing,?\s*laying)\b/i.test(d)) {
    pipeSupplyIncluded = true;
  } else if (/\b(laying\s*only|lowering\s*and\s*laying|labour\s*for\s*laying)\b/i.test(d)) {
    pipeSupplyIncluded = false;
  }

  // Jointing Method
  let jointingMethod: string | null = null;
  if (/\b(rubber\s*gasket|rubber\s*ring|sbr|epdm)\b/i.test(d)) jointingMethod = 'rubber gasket';
  else if (/\b(butt\s*fusion|welded)\b/i.test(d)) jointingMethod = 'butt fusion';
  else if (/\b(push\s*fit|socket\s*and\s*spigot|s\/s)\b/i.test(d)) jointingMethod = 'socket spigot';

  // 3. Concrete & Mix Ratio (with mix-ratio to grade mapping)
  let concreteGrade: string | null = null;
  const gradeMatch = d.match(/\b(m\s*[-–—\s]*\s*(7\.5|10|15|20|25|30|35|40|50))\b/i);
  if (gradeMatch) {
    concreteGrade = `M${gradeMatch[2]}`;
  }

  let mixRatio: string | null = null;
  const mixMatch = d.match(/\b(1\s*:\s*[12345](\.[05])?\s*:\s*[234568])\b/i) || d.match(/\b(1\s*:\s*[123456])\b/i);
  if (mixMatch) {
    mixRatio = mixMatch[1].replace(/\s+/g, '');
    if (!concreteGrade) {
      if (mixRatio === '1:3:6') concreteGrade = 'M10';
      else if (mixRatio === '1:2:4') concreteGrade = 'M15';
      else if (mixRatio === '1:1.5:3') concreteGrade = 'M20';
      else if (mixRatio === '1:1:2') concreteGrade = 'M25';
      else if (mixRatio === '1:4:8') concreteGrade = 'M7.5';
      else if (mixRatio === '1:5:10') concreteGrade = 'M5';
    }
  }

  // Material classification for Road, Structural & Base Course items
  let materialType: ParsedItemAttributes['materialType'] = null;
  let roadWorkType: string | null = null;

  if (category === 'Dismantling') {
    if (/\b(granular\s*courses?|wbm|wmm|scarif(y|ying))\b/i.test(d)) {
      materialType = 'Granular Course';
    } else if (/\b(flexible\s*pavements?|bituminous\s*courses?|bituminous\s*road|bituminous\s*pavements?)\b/i.test(d)) {
      materialType = 'Bituminous Pavement';
    } else if (/\b(cement\s*concrete\s*pavements?|cc\s*pavements?|cc\s*road)\b/i.test(d)) {
      materialType = 'Cement Concrete Pavement';
    } else if (/\b(brick\s*pitching)\b/i.test(d)) {
      materialType = 'Brick Pitching';
    } else if (/\b(brick\s*work)\b/i.test(d)) {
      materialType = 'Brick Work';
    } else if (/\b(stone\s*masonry|rubble)\b/i.test(d)) {
      materialType = 'Stone Masonry';
    } else if (/\b(culvert|bridge|retaining\s*wall|existing\s*structures?)\b/i.test(d)) {
      materialType = 'Existing Structures';
    } else if (/\b(remov.*pipes?|rcc\s*pipes?)\b/i.test(d)) {
      materialType = 'RCC Pipe Removal';
    }
  } else if (/\b(wet\s*mix\s*macadam|wmm|clause\s*[-–]?\s*406)\b/i.test(d)) {
    materialType = 'Wet Mix Macadam';
    roadWorkType = 'WMM';
  } else if (/\b(granular\s*sub-?base|gsb|clause\s*[-–]?\s*401)\b/i.test(d)) {
    materialType = 'Granular Sub-Base';
    roadWorkType = 'GSB';
  } else if (/\b(bituminous\s*concrete|\bbc\b|clause\s*[-–]?\s*509|section\s*509)\b/i.test(d)) {
    materialType = 'Bituminous';
    roadWorkType = 'Bituminous Concrete';
  } else if (/\b(dense\s*bituminous\s*macadam|dbm|clause\s*[-–]?\s*507|section\s*507)\b/i.test(d)) {
    materialType = 'Bituminous';
    roadWorkType = 'DBM';
  } else if (/\b(prime\s*coat|primer\s*coat|clause\s*[-–]?\s*502|section\s*502)\b/i.test(d) && !/\btack\b/i.test(d)) {
    materialType = 'Bituminous';
    roadWorkType = 'Prime Coat';
  } else if (/\b(tack\s*coat|clause\s*[-–]?\s*503|section\s*503)\b/i.test(d) || (/\b0\.[23]\d*\s*kg\b/i.test(d) && /\b(bituminous\s*surfaces|spraying)\b/i.test(d) && !/\b(bituminous\s*concrete|dense\s*bituminous|macadam)\b/i.test(d))) {
    materialType = 'Bituminous';
    roadWorkType = 'Tack Coat';
  } else if (/\b(mix\s*seal)\b/i.test(d)) {
    materialType = 'Bituminous';
    roadWorkType = 'Mix Seal Surfacing';
  } else if (category !== 'Dismantling' && /\b(cement\s*concrete|pcc|rcc|m10|m15|m20|m25|1\s*:\s*[12345]:[234568])\b/i.test(d)) {
    materialType = 'Cement Concrete';
  } else if (/\b(bituminous|asphalt|bitumen)\b/i.test(d)) {
    materialType = 'Bituminous';
  } else if (/\b(macadam|crusher\s*run|granular|screening|soling|aggregate\s*sub-base)\b/i.test(d)) {
    materialType = 'Granular / Macadam';
  }

  // Tooling / method specifications (e.g. pneumatic breaker / concrete cutter in dismantling)
  let toolingOrMethod: string | null = null;
  if (/\b(pneumatic\s*breaker|breaker|concrete\s*cutter|saw\s*cut(ting)?)\b/i.test(d)) {
    toolingOrMethod = 'pneumatic breaker / concrete cutter';
  }

  // Staging / shuttering specifications (e.g. 7.5m staging height / steel formwork)
  let stagingOrFormworkDetails: string | null = null;
  if (/\b(7\.5\s*m|staging\s*(height)?\s*(upto|up\s*to)?\s*7\.5\s*m|plywood|steel\s*(plates|formwork|shuttering))\b/i.test(d)) {
    stagingOrFormworkDetails = '7.5m staging height / steel-plywood shuttering';
  }

  // Generic incremental extra lift detection (without hardcoding state or row numbers)
  const isIncrementalLift =
    /\b(extra\s*for\s*(every|each|additional)?\s*lift|per\s*(additional)?\s*lift|lift\s*above\s*1\.5\s*m\s*extra)\b/i.test(d);

  // Manhole attributes (diameter, construction type, depth)
  let manholeDia: number | null = null;
  let manholeConstruction: 'Precast RCC' | 'Brick Masonry' | null = null;
  let manholeDepth: number | null = null;

  if (category === 'Manhole' || /\b(manhole|chamber)\b/i.test(d)) {
    const mMeterMatch = d.match(/internal\s*dia\.?\s*([0-9.]+)\s*m(?:eter)?\b/i);
    const mMmMatch = d.match(/\b(900|1000|1200|1500)\s*mm\b/i) || d.match(/internal\s*dia\.?\s*(\d{3,4})\s*(?:mm)?/i);
    if (mMeterMatch) {
      manholeDia = Math.round(parseFloat(mMeterMatch[1]) * 1000);
    } else if (mMmMatch) {
      manholeDia = parseInt(mMmMatch[1], 10);
    }
    if (/\b(pre-?cast|rcc\s*m-?\d+|circular\s*manhole.*rcc)\b/i.test(d)) {
      manholeConstruction = 'Precast RCC';
    } else if (/\b(burnt\s*clay|brick\s*masonry|bricks?)\b/i.test(d)) {
      manholeConstruction = 'Brick Masonry';
    }
    const mDepthMatch = d.match(/\bdepth\s*(?:of\s*manhole\s*)?(?:upto|up\s*to)?\s*(\d+)\s*mm\b/i);
    if (mDepthMatch) {
      manholeDepth = parseInt(mDepthMatch[1], 10);
    }
  }

  // 4. Excavation & Depth Bands
  let depthMin: number | null = null;
  let depthMax: number | null = null;

  // Mask out "lead of XX m", "lead upto XX m", "staging height XX m", and "exceeding 30cm in depth" so they don't corrupt depth
  const dWithoutLead = d
    .replace(/\blead\s*(?:of|up\s*to|upto)?\s*\d+(\.\d+)?\s*(m|meter|mtr|km)\b/gi, ' ')
    .replace(/\b(width|staging|diameter|dia)\s*(?:of|up\s*to|upto)?\s*\d+(\.\d+)?\s*(m|meter|mtr|cm|mm)\b/gi, ' ')
    .replace(/\bexceeding\s*30\s*cm(?:\s*in\s*depth)?\b/gi, ' ');

  // Robust depth parser handling "Depth above 1.5 m and upto 3.0 m", "01.50 to 03.00 m", "1.5 to 3 m", "Depth exceeding 1.5 m but not exceeding 3 m"
  const rangeMatch = dWithoutLead.match(
    /(?:depth\s*(?:above|exceeding|from)?\s*)?(\d+(?:\.\d+)?)\s*(?:m|meter|mtr)?\s*(?:to|and\s*(?:upto|up\s*to)|-|but\s*not\s*exceeding)\s*(\d+(?:\.\d+)?)\s*(?:m|meter|mtr)/i,
  );
  if (rangeMatch) {
    const v1 = parseFloat(rangeMatch[1]);
    const v2 = parseFloat(rangeMatch[2]);
    if (v1 <= 15 && v2 <= 20) {
      depthMin = v1;
      depthMax = v2;
    }
  } else {
    const exceedingMatch = dWithoutLead.match(/(?:depth\s*)?(?:more\s*than|exceeding|above|beyond)\s*(\d+(\.\d+)?)\s*(?:m|meter|mtr)?/i);
    if (exceedingMatch) {
      depthMin = parseFloat(exceedingMatch[1]);
      depthMax = 999;
    } else {
      const uptoMatch = dWithoutLead.match(/(?:depth\s*(?:is\s*)?|lift\s*)?(?:upto|up\s*to)\s*(\d+(?:\.\d+)?)\s*(?:m|meter|mtr)?/i);
      if (uptoMatch && parseFloat(uptoMatch[1]) <= 15) {
        depthMin = 0.0;
        depthMax = parseFloat(uptoMatch[1]);
      } else if (
        category === 'Excavation' &&
        (/\b(lift\s*(?:upto|up\s*to)?\s*1\.5|exceeding\s*30\s*cm|all\s*lift|neatly\s*dressed|dressing\s*of\s*sides)\b/i.test(d) ||
         /\b1\.5\s*m\b/i.test(d) ||
         /\bdepth\s*upto\s*1\.5/i.test(d) ||
         /\b(trench(es)?\s*for\s*pipes?|foundation)\b/i.test(d))
      ) {
        // Standard base excavation depth band in Indian SORs is 0 to 1.5 m
        depthMin = 0.0;
        depthMax = 1.5;
      }
    }
  }

  let soilType: string | null = null;
  if (/\b(hard\s*rock)\b/i.test(d)) {
    soilType = 'hard_rock';
  } else if (/\b(ordinary\s*rock|soft\s*rock)\b/i.test(d) && (/\bordinary\s*rock\s*\d+%/i.test(d) || !/\ball\s*(kinds|types)\s*(of)?\s*soils?\b/i.test(d))) {
    soilType = 'ordinary_rock';
  } else if (/\b(saturated|sludge|water\s*table)\b/i.test(d) && !/\ball\s*(kinds|types)\s*(of)?\s*soils?\b/i.test(d)) {
    soilType = 'saturated_soil';
  } else if (
    (/\b(all\s*(kinds|types)\s*(of)?\s*soil|dry\s*soil|moorum|sand|clay)\b/i.test(d) && !/\bordinary\s*rock\s*\d+%/i.test(d)) ||
    category === 'Excavation'
  ) {
    soilType = 'all_soil';
  }

  let leadDistanceKm: number | null = null;
  const leadMatch = d.match(/lead\s*(?:up\s*to|upto|of)?\s*(\d+(?:\.\d+)?)\s*(km|kilometer|k\.?m\.?|m|meter|meters|metre|metres)\b/i);
  if (leadMatch) {
    const unitDist = leadMatch[2].toLowerCase();
    const val = parseFloat(leadMatch[1]);
    leadDistanceKm = unitDist.startsWith('k') ? val : val / 1000;
  }

  let liftMeters: number | null = null;
  const liftMatch = d.match(/lift\s*(?:up\s*to|upto)?\s*(\d+(\.\d+)?)\s*(m|meter)\b/i);
  if (liftMatch) {
    liftMeters = parseFloat(liftMatch[1]);
  }

  const disposalIncluded = /\b(disposal|disposed\s*earth|dressing|levell?ed)\b/i.test(d);
  const dewateringIncluded = /\b(dewatering|pumping|bailing)\b/i.test(d);
  const timberingIncluded = /\b(timbering|shoring|strutting|planking)\b/i.test(d);

  return {
    category,
    pipeMaterial,
    pipeDiameter,
    pipeOuterDiameter,
    pipeClass,
    pipeStandard,
    pipeSupplyIncluded,
    jointingMethod,
    concreteGrade,
    mixRatio,
    materialType,
    roadWorkType,
    toolingOrMethod,
    stagingOrFormworkDetails,
    isIncrementalLift,
    manholeDia,
    manholeConstruction,
    manholeDepth,
    depthMin,
    depthMax,
    soilType,
    leadDistanceKm,
    liftMeters,
    disposalIncluded,
    dewateringIncluded,
    timberingIncluded,
  };
}
