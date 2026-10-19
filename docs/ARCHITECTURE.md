# Desire Tender Qualification Engine — System Architecture

This document describes the production architecture and evaluation flow of the Desire Tender Qualification platform, built directly from the codebase.

## 1. High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph Client["Client Upload & Screen"]
        A[PDF Upload / Multipart Form] --> B[POST /api/v1/tender/analyze]
        CONFIG[eligibility.config.ts\nSection Order & Token Budget] -.-> B
    end

    subgraph Ingestion["Document Ingestion & Page Finder"]
        B --> C[pdfTextSelector.ts\nselectQualificationAndNitPages]
        C --> D{Keyword Page Scoring\n12 Weighted Keywords}
        D -->|Top Pages + 2 Context| E[Extract Qualification Pages\nToken Budget <= 38k Chars]
        D -->|Full Text Extraction| F[Full Document Characters]
        E --> G[Log Pages Sent: [p1, p2, ...]]
    end

    subgraph AI["AI Clause Extraction (Gemini)"]
        G --> H[Primary Model:\ngemini-3.6-flash]
        H -.->|Fallback HTTP 503/429| I[Fallback Model:\ngemini-3.5-flash-lite]
        H --> J[Raw Extracted Clauses\nJSON Breakdown]
        I --> J
    end

    subgraph Gate["Coverage Gate & Window Fallback"]
        J --> K{Coverage Check\n>=1 Financial AND\n>=1 Technical?}
        K -->|Yes| L[Proceed to Evaluation]
        K -->|No| M[Sequential Window Scan\n35k Chars with 4k Overlap]
        M --> N{Re-check Coverage\nFound Both?}
        N -->|Yes| L
        N -->|No| O["Verdict: Incomplete extraction\nNames pages read [p1, ...]"]
    end

    subgraph Data["Single Source of Truth"]
        DB[(public.companies\nSupabase & PostgreSQL)] --> P[getCompaniesFromDatabase\nNormalized Database Records]
    end

    subgraph Engine["Deterministic Matching & Provenance Audit"]
        L --> Q[evaluateDeterministicMatching]
        P --> Q
        Q --> R{Turnover Rule Engine\n- N of M Count\n- Peak Single Year\n- Explicit Average}
        Q --> S{Technical Experience\n- Water Supply / O&M Matching}
        Q --> T{Registration & Provenance\n- Must have source_file & page\n- Else: CANNOT BE CHECKED}
    end

    subgraph JVGate["JV & Partner Rules Gate"]
        R --> U{Tender states JV rules\nAND a criterion fails?}
        S --> U
        T --> U
        U -->|No| V[Standalone Desire Only\nDelete JV Audit & Partner Scores]
        U -->|Yes| W[Dynamic Partner Pooling\nFrom public.companies DB]
    end

    subgraph Audit["Programmatic Report Audit"]
        V --> X[runReportAudit]
        W --> X
        X --> Y{Audit Verifications\n- Quotes exist in text\n- Figures exist in database}
        Y -->|Passed| Z[Assemble Final Report]
        Y -->|Failed| ERR[AUDIT_VERIFICATION_FAILED]
    end

    subgraph Response["Pipeline Metrics & Stamping"]
        Z --> S1[Sort Sections:\nFinancial -> Technical -> Others]
        S1 --> S2[Stamp from VERCEL_GIT_COMMIT_SHA\n7 to 40 hex characters]
        S2 --> S3[Attach Pipeline Object:\nfile_sha256, pages, characters_extracted,\npages_sent, characters_sent, model,\ntokens, chunks_indexed, checks_passed]
        S3 --> OUT[Final Response JSON]
    end
```

## 2. Core Architectural Pillars

### Pillar 1: Section Ordering
Per `AGENTS.md` and `eligibility.config.ts`, clauses and report sections are strictly ordered:
1. **Financial** (Turnover, Net Worth, Solvency, Bid Capacity, Financial Criteria)
2. **Technical** (Similar Work, Experience, O&M, Quantities)
3. **Others** (Registration, Certifications, Mandatory Submissions, Contract Terms)

### Pillar 2: Page Finder & Token Budget Guard
- Instead of feeding entire multi-megabyte PDFs or relying on brittle full-text truncation, `selectQualificationAndNitPages` scores each page based on 12 domain keywords:
  `turnover`, `net worth`, `solvency`, `bid capacity`, `similar work`, `experience`, `o&m`, `eligibility`, `qualification`, `registration`, `joint venture`, `blacklist`.
- It selects the top scoring pages plus a 2-page context window on each side (`contextPaddingPages: 2`).
- The prompt is bounded by `maxPromptCharacters: 38000` (~9,500 tokens).
- Pages selected and sent are logged: `[PAGE_FINDER] Selected N pages within budget: [p1, p2, ...]`.

### Pillar 3: Coverage Gate
- A verdict requires **at least one financial criterion** and **at least one technical criterion**.
- If either is absent, the engine scans the document in sequential overlapping windows (35,000 characters with 4,000 overlap).
- If still absent, the engine sets:
  - `verdict`: `"Incomplete extraction"`
  - `verdict_reason`: `"Incomplete extraction: Missing financial/technical criteria across pages [p1, p2, ...]"`

### Pillar 4: Single Source of Truth (`public.companies`)
- Hardcoded mock company objects are eliminated from the server.
- All company facts, audited turnovers, net worth figures, and project records originate from `public.companies` via Supabase / PostgreSQL.
- Any registration or partner fact lacking a source file and page is flagged as `CANNOT BE CHECKED`.

### Pillar 5: Dynamic JV & Consortium Gate
- Static JV rules audits, hardcoded partner scores (98, 85, 72), and static equity suggestions (e.g. 74/26%) are deleted.
- JV and partner evaluation appears **only if the tender explicitly specifies JV rules AND a criterion fails for Desire standalone**.

### Pillar 6: Programmatic Report Audit & Stamping
- Every response runs an in-process audit before returning to the client:
  - Quotes in clauses must exist in the extracted document text.
  - Figures cited must match database values or quotes.
- The report is stamped from `VERCEL_GIT_COMMIT_SHA` (7 to 40 hex characters).
- Every response includes a full `pipeline` telemetry object:
  - `file_sha256`
  - `pages`
  - `characters_extracted`
  - `pages_sent`
  - `characters_sent`
  - `model`
  - `tokens`
  - `chunks_indexed`
  - `checks_passed`
