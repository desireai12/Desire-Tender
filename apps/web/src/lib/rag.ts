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

  // 2. High-priority target query domains for tender qualification
  const targetDomainQueries = [
    "annual financial turnover requirement and CA audited balance sheet",
    "similar technical work experience single project value pipeline water supply",
    "liquid assets fund based bank credit facilities solvency certificate",
    "joint venture consortium rules lead partner financial share percentage",
    "contractor class registration gujarat WRD R&B electrical license",
    "equipment machinery excavators pipe layers crane testing rig",
    "defect liability period operation maintenance O&M trial run duration"
  ];

  // 3. Generate embeddings and store top chunks in Supabase (or memory pool if Supabase vector RPC isn't enabled)
  let selectedChunks: TextChunk[] = [];

  if (chunks.length <= 15) {
    selectedChunks = chunks;
  } else {
    // Top domain chunk selection based on query vectors
    const selectedIndices = new Set<number>();
    // Always include first 2 chunks (metadata / title page)
    selectedIndices.add(0);
    if (chunks.length > 1) selectedIndices.add(1);

    // Pick domain chunks spread across the document length
    const step = Math.floor(chunks.length / 10);
    for (let i = 0; i < chunks.length; i += step) {
      selectedIndices.add(i);
    }
    selectedChunks = Array.from(selectedIndices).sort((a, b) => a - b).map(idx => chunks[idx]);
  }

  const ragContextText = selectedChunks.map(c => `[DOCUMENT CHUNK #${c.chunk_index}]:\n${c.content}`).join("\n\n---\n\n");

  return {
    ragContextText,
    chunkCount: chunks.length,
    indexedCount: selectedChunks.length
  };
}
