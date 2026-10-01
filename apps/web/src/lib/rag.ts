import { supabase } from './supabase';

export interface TextChunk {
  chunk_index: number;
  content: string;
  start_char: number;
  end_char: number;
}

export interface SimilarityResult {
  chunk_index: number;
  content: string;
  similarity: number;
}

/**
 * Recursive character text splitter equivalent to LangChain's RecursiveCharacterTextSplitter.
 */
export function splitText(
  text: string,
  chunkSize: number = 1000,
  chunkOverlap: number = 200,
  separators: string[] = ["\n\n", "\n", " ", ""]
): TextChunk[] {
  if (!text || text.length === 0) return [];

  const rawChunks: { content: string; start: number; end: number }[] = [];

  function recursiveSplit(textSegment: string, offset: number, sepIdx: number) {
    if (textSegment.length <= chunkSize || sepIdx >= separators.length) {
      if (textSegment.trim().length > 0) {
        rawChunks.push({
          content: textSegment,
          start: offset,
          end: offset + textSegment.length
        });
      }
      return;
    }

    const separator = separators[sepIdx];
    const parts = separator === "" ? textSegment.split("") : textSegment.split(separator);

    let currentSegment = "";
    let currentStart = offset;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const partWithSep = (i < parts.length - 1 && separator !== "") ? part + separator : part;

      if ((currentSegment + partWithSep).length > chunkSize) {
        if (currentSegment.trim().length > 0) {
          rawChunks.push({
            content: currentSegment,
            start: currentStart,
            end: currentStart + currentSegment.length
          });
        }
        const overlapStart = Math.max(0, currentSegment.length - chunkOverlap);
        const overlapText = currentSegment.slice(overlapStart);
        currentStart = currentStart + overlapStart;
        currentSegment = overlapText + partWithSep;
      } else {
        currentSegment += partWithSep;
      }
    }

    if (currentSegment.trim().length > 0) {
      rawChunks.push({
        content: currentSegment,
        start: currentStart,
        end: currentStart + currentSegment.length
      });
    }
  }

  recursiveSplit(text, 0, 0);

  return rawChunks.map((c, i) => ({
    chunk_index: i,
    content: c.content,
    start_char: c.start,
    end_char: c.end
  }));
}

/**
 * Call Gemini Embedding API for text vector generation (768 dimensions)
 */
export async function embedText(text: string, apiKey: string): Promise<number[]> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { parts: [{ text: text.trim().slice(0, 2048) }] },
      outputDimensionality: 768
    })
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Gemini Embedding API Error (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  if (!data?.embedding?.values || !Array.isArray(data.embedding.values)) {
    throw new Error('Gemini Embedding API returned invalid response format.');
  }

  return data.embedding.values;
}

/**
 * Call Gemini Embedding Batch API for efficient multi-chunk vector generation
 */
export async function batchEmbedTexts(texts: string[], apiKey: string): Promise<number[][]> {
  if (texts.length === 0) return [];
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${apiKey}`;
  const requests = texts.map(t => ({
    model: 'models/gemini-embedding-001',
    content: { parts: [{ text: t.trim().slice(0, 2048) }] },
    outputDimensionality: 768
  }));

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests })
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Gemini Batch Embedding API Error (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  if (!data?.embeddings || !Array.isArray(data.embeddings)) {
    throw new Error('Gemini Batch Embedding API returned invalid response format.');
  }

  return data.embeddings.map((item: any) => item.values);
}

/**
 * High-performance vector RAG context retriever for tender documents
 */
export async function retrieveRAGContextForTender(
  tenderId: string,
  fullText: string,
  apiKey: string
): Promise<{ ragContextText: string; chunkCount: number; indexedCount: number }> {
  // 1. Chunk full document
  const chunks = splitText(fullText, 1000, 200);
  if (chunks.length === 0) {
    return { ragContextText: fullText.slice(0, 60000), chunkCount: 0, indexedCount: 0 };
  }

  // 2. High-priority target domain keywords & queries for tender qualification
  const targetDomainKeywords = [
    ["turnover", "financial", "balance sheet", "ca certificate", "revenue"],
    ["work experience", "similar work", "prime contractor", "completed work", "pipeline", "water supply"],
    ["liquid assets", "bank credit", "solvency", "net worth", "credit facility"],
    ["joint venture", "consortium", "lead partner", "financial share", "partner"],
    ["registration", "wrd", "r&b", "class-a", "electrical license", "contractor"],
    ["scada", "solar", "automation", "telemetry", "specialized"],
    ["penalty", "liquidated damages", "delay", "emd", "bank guarantee", "performance security"],
    ["equipment", "machinery", "excavator", "crane", "testing rig"]
  ];

  let selectedChunks: TextChunk[] = [];

  if (chunks.length <= 15) {
    selectedChunks = chunks;
  } else {
    const selectedIndices = new Set<number>();
    // Always include metadata / title page (chunks 0 and 1)
    selectedIndices.add(0);
    if (chunks.length > 1) selectedIndices.add(1);

    // 1. FAST KEYWORD SCANNER PASS
    for (const kwGroup of targetDomainKeywords) {
      let bestIdx = -1;
      let maxScore = 0;

      for (let i = 0; i < chunks.length; i++) {
        const textLower = chunks[i].content.toLowerCase();
        let score = 0;
        for (const kw of kwGroup) {
          if (textLower.includes(kw)) {
            score += 1;
          }
        }
        if (score > maxScore) {
          maxScore = score;
          bestIdx = i;
        }
      }

      if (bestIdx >= 0 && maxScore > 0) {
        selectedIndices.add(bestIdx);
      }
    }

    // 2. PGVECTOR REAL SEMANTIC SIMILARITY PASS
    const semanticDomainQueries = [
      "minimum annual financial turnover requirement and CA balance sheet",
      "similar technical work experience single project value pipeline",
      "technical specialized equipment certification electrical license",
      "remote digital monitoring control system solar automation",
      "penalty and liquidated damages clause bank guarantee EMD"
    ];

    try {
      // Query pgvector RPC for semantic similarity matches across stored chunks
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://udwjptggvaavoemuvjbm.supabase.co';
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

      if (supabaseUrl && supabaseKey) {
        for (const qText of semanticDomainQueries) {
          try {
            const qVec = await embedText(qText, apiKey);
            const rpcUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/match_tender_chunks`;
            const rpcRes = await fetch(rpcUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
              },
              body: JSON.stringify({
                query_embedding: qVec,
                match_tender_id: tenderId,
                match_count: 2
              })
            });

            if (rpcRes.ok) {
              const matches: { chunk_index: number; similarity: number }[] = await rpcRes.json();
              for (const m of matches) {
                if (typeof m.chunk_index === 'number' && m.chunk_index >= 0 && m.chunk_index < chunks.length) {
                  selectedIndices.add(m.chunk_index);
                }
              }
            }
          } catch (semErr) {
            // Fallback gracefully if single query fails
          }
        }
      }
    } catch (vectorErr) {
      console.warn('[RAG_PIPELINE] pgvector semantic retrieval fallback:', vectorErr);
    }

    // Pad with structural stride chunks if needed
    if (selectedIndices.size < 10) {
      const step = Math.floor(chunks.length / 8);
      for (let i = 0; i < chunks.length; i += step) {
        selectedIndices.add(i);
      }
    }

    selectedChunks = Array.from(selectedIndices)
      .sort((a, b) => a - b)
      .map(idx => chunks[idx]);
  }

  const ragContextText = selectedChunks.map(c => `[DOCUMENT CHUNK #${c.chunk_index}]:\n${c.content}`).join("\n\n---\n\n");

  return {
    ragContextText,
    chunkCount: chunks.length,
    indexedCount: selectedChunks.length
  };
}

export interface IngestionStatusRecord {
  tender_id: string;
  total_chunks: number;
  stored_chunks: number;
  status: 'ingesting' | 'completed' | 'failed';
  started_at: number;
  completed_at?: number;
}

export const INGESTION_TRACKER: Record<string, IngestionStatusRecord> = {};

/**
 * Asynchronously embeds and stores document chunks into Supabase pgvector table (public.tender_chunks)
 * in rate-limited background batches without blocking user-facing HTTP response.
 */
export async function ingestDocumentInBackground(
  tenderId: string,
  fullText: string,
  apiKey: string
): Promise<{ success: boolean; count: number }> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://udwjptggvaavoemuvjbm.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey || !apiKey) {
      console.warn('[BACKGROUND_RAG_INGESTION] Missing credentials, skipping background vector indexing.');
      return { success: false, count: 0 };
    }

    // 1. Chunk document
    const chunks = splitText(fullText, 1000, 200);
    if (chunks.length === 0) return { success: true, count: 0 };

    INGESTION_TRACKER[tenderId] = {
      tender_id: tenderId,
      total_chunks: chunks.length,
      stored_chunks: 0,
      status: 'ingesting',
      started_at: Date.now()
    };

    // 2. Check if already ingested
    const checkUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/tender_chunks?select=id&tender_id=eq.${encodeURIComponent(tenderId)}`;
    const checkRes = await fetch(checkUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (checkRes.ok) {
      const existing = await checkRes.json();
      if (Array.isArray(existing) && existing.length >= chunks.length && chunks.length > 0) {
        console.log(`[BACKGROUND_RAG_INGESTION] Tender ${tenderId} is already fully indexed (${existing.length} chunks). Skipping.`);
        INGESTION_TRACKER[tenderId] = {
          tender_id: tenderId,
          total_chunks: chunks.length,
          stored_chunks: existing.length,
          status: 'completed',
          started_at: Date.now(),
          completed_at: Date.now()
        };
        return { success: true, count: existing.length };
      }
    }

    console.log(`[BACKGROUND_RAG_INGESTION] Starting background vector indexing for tender ${tenderId} (${chunks.length} chunks)...`);

    // 3. High-throughput batch embed (50 chunks/batch, 3s delay) -> 500 chunks/min (Safely under 100 RPM API quota)
    const BATCH_SIZE = 50;
    const DELAY_MS = 3000;
    const SERVERLESS_DEADLINE_MS = 250000; // 250s execution budget (Vercel maxDuration limit is 300s)
    const startTime = Date.now();
    let totalStored = 0;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      // Serverless execution deadline guard check
      if (Date.now() - startTime > SERVERLESS_DEADLINE_MS) {
        console.warn(`[BACKGROUND_RAG_INGESTION] Serverless 250s execution safety budget reached for ${tenderId}. Stored ${totalStored}/${chunks.length} chunks. Execution paused gracefully.`);
        break;
      }

      const batch = chunks.slice(i, i + BATCH_SIZE);
      const batchTexts = batch.map(c => c.content);

      try {
        const embeddings = await batchEmbedTexts(batchTexts, apiKey);
        const rows = batch.map((c, idx) => ({
          tender_id: tenderId,
          chunk_index: c.chunk_index,
          content: c.content,
          embedding: JSON.stringify(embeddings[idx])
        }));

        const insertUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/tender_chunks`;
        const insertRes = await fetch(insertUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(rows)
        });

        if (insertRes.ok) {
          totalStored += rows.length;
          if (INGESTION_TRACKER[tenderId]) {
            INGESTION_TRACKER[tenderId].stored_chunks = totalStored;
          }
          console.log(`[BACKGROUND_RAG_INGESTION] Embedded & saved chunks ${i + 1} to ${i + rows.length}/${chunks.length} for ${tenderId} (${(Date.now() - startTime)/1000}s elapsed)`);
        } else {
          const errText = await insertRes.text().catch(() => '');
          console.error(`[BACKGROUND_RAG_INGESTION] Supabase insert failed for batch ${i}: ${errText}`);
        }
      } catch (batchErr) {
        console.error(`[BACKGROUND_RAG_INGESTION] Error embedding batch starting at ${i}:`, batchErr);
      }

      if (i + BATCH_SIZE < chunks.length) {
        await new Promise(res => setTimeout(res, DELAY_MS));
      }
    }

    if (INGESTION_TRACKER[tenderId]) {
      INGESTION_TRACKER[tenderId].stored_chunks = totalStored;
      INGESTION_TRACKER[tenderId].status = 'completed';
      INGESTION_TRACKER[tenderId].completed_at = Date.now();
    }

    console.log(`[BACKGROUND_RAG_INGESTION] Completed background indexing for ${tenderId}: ${totalStored}/${chunks.length} chunks stored in pgvector.`);
    return { success: true, count: totalStored };
  } catch (err) {
    if (INGESTION_TRACKER[tenderId]) {
      INGESTION_TRACKER[tenderId].status = 'failed';
    }
    console.error('[BACKGROUND_RAG_INGESTION] Fatal error during background ingestion:', err);
    return { success: false, count: 0 };
  }
}

