import { StrictExtractionResult, ExtractedFinancialItem, ExtractedTechnicalItem, ExtractedOtherItem } from './types';
import { verifyQuoteInExtractedText } from './pdfTextSelector';

const MODELS_CHAIN = [
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite'
];

async function callGeminiJson(prompt: string, apiKey: string): Promise<any> {
  let lastError: any = null;

  for (const model of MODELS_CHAIN) {
    try {
      const estimatedTokens = Math.round(prompt.length / 4);
      console.log(`[GEMINI_REQUEST] Model: ${model}, Prompt Chars: ${prompt.length}, Estimated Tokens: ${estimatedTokens}`);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1
          }
        }),
        signal: AbortSignal.timeout(60000)
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.error?.message || `HTTP ${response.status}`;
        console.warn(`[GEMINI_EXTRACTION] Model ${model} returned error (${response.status}): ${errMsg}`);
        lastError = new Error(errMsg);

        if (response.status === 429) {
          await new Promise(r => setTimeout(r, 2000));
        }
        continue;
      }

      const resData = await response.json();
      if (resData.usageMetadata) {
        console.log(`[GEMINI_TOKENS] Model: ${model}, Prompt Tokens: ${resData.usageMetadata.promptTokenCount}, Candidates Tokens: ${resData.usageMetadata.candidatesTokenCount}, Total Tokens: ${resData.usageMetadata.totalTokenCount}`);
      } else {
        console.log(`[GEMINI_TOKENS] Model: ${model}, Tokens: ~${estimatedTokens}`);
      }

      const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        lastError = new Error(`Empty response from ${model}`);
        continue;
      }

      // Parse JSON
      const parsed = JSON.parse(rawText.trim());
      return parsed;
    } catch (err: any) {
      console.warn(`[GEMINI_EXTRACTION] Exception calling ${model}:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini models failed during clause extraction.');
}

/**
 * Extracts clauses from the selected NIT/BDS and qualification pages in strict JSON format.
 * Drops any item whose verbatim quote is not verified inside the extracted document text.
 */
export async function extractEligibilityClausesStrict(
  combinedPagesText: string,
  fullDocumentText: string,
  docFilename: string,
  apiKey: string
): Promise<{ result: StrictExtractionResult; droppedCount: number; droppedItems: any[] }> {
  const prompt = `You are Desire Tender AI, an authoritative Government & Corporate Tender Qualification Auditor.
Your ONLY task is to read the provided qualification section and NIT/BDS summary pages from tender document "${docFilename}" and extract all eligibility clauses in STRICT JSON format into exactly THREE groups: "financial", "technical", and "others".

TENDER DOCUMENT EXTRACTED PAGES:
${combinedPagesText}

=== MANDATORY RULES ===
1. Every extracted item MUST have:
   - "title": clear descriptive title of the clause
   - "page": exact page number (e.g. 1, 4, 19, 63) where the requirement appears
   - "quote": an EXACT, VERBATIM quote copied word-for-word from the text. (Warning: Any item whose quote does not appear verbatim in the document will be automatically dropped!)

2. GROUP "financial":
   - "type": "turnover" | "net_worth" | "solvency" | "bid_capacity" | "other"
   - "amount": numeric value stated in the clause (in ₹ Crores, e.g. 69.78 or 17.45) or null if not numeric
   - "amount_unit": "Cr" | "Lakhs" | null
   - "amount_raw": exact textual statement of amount
   - "year_rule": "average" | "any one year" | "any N of the last M" | "latest year" | "other"
   - "year_range": e.g. "last 3 financial years", "last 5 years", "FY 2024-25"
   - "alternative_group_id": string id if this financial requirement is part of an alternative option (e.g. "alt_fin_1"), or null

3. GROUP "technical":
   - "type": specific work type (e.g. "similar_work", "pipeline_execution", "solar_pumping", "water_supply")
   - "unit": "Cr" | "km" | "MLD" | "HP" | "Nos" | "%" | null
   - "threshold": numeric threshold or target (e.g. 27.91) or null
   - "alternatives": list of alternatives if clause provides options (e.g. ["1 single work of 80% (Rs 27.91 Cr)", "2 works of 50% (Rs 17.45 Cr)", "3 works of 40% (Rs 13.96 Cr)"]), or null
   - "date_window": time period required (e.g. "last 7 years ending 31st March of previous FY", "last 5 years")

4. GROUP "others":
   - "category": EXACTLY one of: "registration" | "licence" | "JV rule" | "blacklisting" | "submission" | "contract term"
   - "details": description of what is required

RETURN VALID JSON ONLY conforming to this schema:
{
  "tender_title": "string — official tender title",
  "tender_reference": "string — NIT/tender reference number",
  "estimated_value_cr": number or null,
  "financial": [
    {
      "title": "Average Annual Financial Turnover",
      "type": "turnover",
      "amount": 69.78,
      "amount_unit": "Cr",
      "amount_raw": "Rs. 69.78 Crores",
      "year_rule": "average",
      "year_range": "last 3 financial years",
      "alternative_group_id": null,
      "page": 63,
      "quote": "Average Annual Financial Turnover of the bidder during the last 3 financial years ending 31st March of previous financial year should be at least Rs. 69.78 Crores."
    }
  ],
  "technical": [
    {
      "title": "Single Work Experience",
      "type": "similar_work",
      "unit": "Cr",
      "threshold": 27.91,
      "alternatives": ["At least one similar EPC pipeline / water supply work of not less than Rs. 27.91 Crores in the last 7 years"],
      "date_window": "last 7 years",
      "page": 63,
      "quote": "The bidder must have successfully executed as prime contractor at least one similar EPC pipeline / water supply work of value not less than Rs. 27.91 Crores in the last 7 years."
    }
  ],
  "others": [
    {
      "title": "Contractor Registration Class",
      "category": "registration",
      "details": "AA Class & Above with Gujarat State WRD or R&B",
      "page": 1,
      "quote": "The bidder must be registered in AA Class & Above with Gujarat State Water Resources Department (WRD) or Roads & Buildings (R&B) Department"
    }
  ]
}`;

  const rawJson = await callGeminiJson(prompt, apiKey);

  const rawFinancial: ExtractedFinancialItem[] = Array.isArray(rawJson.financial) ? rawJson.financial : [];
  const rawTechnical: ExtractedTechnicalItem[] = Array.isArray(rawJson.technical) ? rawJson.technical : [];
  const rawOthers: ExtractedOtherItem[] = Array.isArray(rawJson.others) ? rawJson.others : [];

  const droppedItems: any[] = [];

  // Filter with quote verification against the document text
  const textToVerifyAgainst = fullDocumentText || combinedPagesText;

  const verifiedFinancial = rawFinancial.filter(item => {
    const ok = verifyQuoteInExtractedText(item.quote, textToVerifyAgainst);
    if (!ok) {
      console.warn(`[QUOTE_VERIFY_DROP] Dropped financial item "${item.title}": quote not found in document text.`);
      droppedItems.push({ group: 'financial', item });
    }
    return ok;
  });

  const verifiedTechnical = rawTechnical.filter(item => {
    const ok = verifyQuoteInExtractedText(item.quote, textToVerifyAgainst);
    if (!ok) {
      console.warn(`[QUOTE_VERIFY_DROP] Dropped technical item "${item.title}": quote not found in document text.`);
      droppedItems.push({ group: 'technical', item });
    }
    return ok;
  });

  const verifiedOthers = rawOthers.filter(item => {
    const ok = verifyQuoteInExtractedText(item.quote, textToVerifyAgainst);
    if (!ok) {
      console.warn(`[QUOTE_VERIFY_DROP] Dropped other item "${item.title}": quote not found in document text.`);
      droppedItems.push({ group: 'others', item });
    }
    return ok;
  });

  const cleanedResult: StrictExtractionResult = {
    tender_title: rawJson.tender_title || docFilename.replace(/\.[^/.]+$/, ''),
    tender_reference: rawJson.tender_reference || '',
    estimated_value_cr: typeof rawJson.estimated_value_cr === 'number' ? rawJson.estimated_value_cr : null,
    financial: verifiedFinancial,
    technical: verifiedTechnical,
    others: verifiedOthers
  };

  return {
    result: cleanedResult,
    droppedCount: droppedItems.length,
    droppedItems
  };
}
