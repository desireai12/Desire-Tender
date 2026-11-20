// API Route Handler for BOQ SOR Comparison Module.
// Self-contained and isolated from existing app routes.
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { enforceApiAuth } from '../auth';
import {
  detectStateAndAuthority,
  addAuthorityMapping,
  getAuthorityMappings,
  resetAuthorityMappings,
  detectSorYear,
  detectSorYearDetailed,
  detectDiscipline,
  computeDocumentKey,
  getAuthoritiesByState,
  loadPersistedAuthorityMappings,
} from '../stateAuthorityRegistry';
import { rankSheets } from '../sheetScorer';
import { detectColumns } from '../headerDetector';
import { extractItemsFromSheet } from '../itemExtractor';
import { consolidateStateItems } from '../stateConsolidator';
import { buildCanonicalGroups, filterEligibleItems } from '../matchingEngine';
import { buildComparisonDataset } from '../comparisonEngine';
import { generateVerifiedInsights } from '../insightsEngine';
import { generateComparisonWorkbookBuffer } from '../excelExporter';
import {
  saveFileRecord,
  saveExtractedItems,
  saveFileAndItemsAtomic,
  isPersistentDbRequired,
  saveCanonicalGroup,
  persistApprovedMapping,
  getApprovedMapping,
  getAllApprovedMappings,
  computeMappingHash,
  logAuditAction,
  getAuditLogs,
  addUnitConversion,
  getUnitConversion,
  purgeProjectData,
  loadFilesFromDb,
  loadExtractedItemsFromDb,
  loadSkippedRowsFromDb,
  findFileByFingerprint,
  setActiveVersionInDb,
  saveAuthorityMappingToDb,
  loadAuthorityMappingsFromDb,
  getPaginatedItemsFromDb,
  getPaginatedGroupsFromDb,
  getPaginatedFilesFromDb,
  getDashboardMetricsFromDb,
} from '../db';
import type {
  DashboardMetricSummary,
  GstBasis,
  MatchClass,
  PaginatedResult,
  PaginationParams,
  ReviewStatus,
  SorFileRecord,
  SorItemRecord,
  SkippedRowRecord,
  SorItemGroupRecord,
  SorItemGroupMemberRecord,
  SorMatchAuditRecord,
} from '../types';

// In-memory fallback stores when Supabase DB is offline/staging
const memoryFiles = new Map<string, SorFileRecord>();
const memoryItems = new Map<string, SorItemRecord[]>();
const memorySkipped = new Map<string, SkippedRowRecord[]>();
const memoryFileBuffers = new Map<string, Buffer>();
const memoryGroups = new Map<string, SorItemGroupRecord>();
const memoryAuditLogs: SorMatchAuditRecord[] = [];

function paginateArray<T>(items: T[], page: number, pageSize: number): PaginatedResult<T> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(10, pageSize));
  const total = items.length;
  const totalPages = Math.ceil(total / safePageSize);
  const offset = (safePage - 1) * safePageSize;
  const data = items.slice(offset, offset + safePageSize);
  return {
    data,
    pagination: {
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    },
  };
}

async function ensureHydrated(): Promise<void> {
  if (memoryFiles.size === 0) {
    try {
      const dbFiles = await loadFilesFromDb();
      for (const f of dbFiles) {
        memoryFiles.set(f.id, f);
      }
      const dbItems = await loadExtractedItemsFromDb();
      for (const it of dbItems) {
        const list = memoryItems.get(it.file_id) || [];
        list.push(it);
        memoryItems.set(it.file_id, list);
      }
      // Load persisted authority mappings from DB
      const dbAuthorities = await loadAuthorityMappingsFromDb();
      if (dbAuthorities.length > 0) {
        loadPersistedAuthorityMappings(dbAuthorities);
      }
      await ensureGroupsHydrated();
    } catch (e) {
      console.error('Failed to hydrate sor_files and sor_items from DB:', e);
    }
  }
}

async function ensureGroupsHydrated(forceRefresh = false): Promise<void> {
  if (memoryGroups.size === 0 || forceRefresh) {
    const allExtractedItems: (SorItemRecord & { filename?: string })[] = [];
    for (const [fileId, items] of Array.from(memoryItems.entries())) {
      const file = memoryFiles.get(fileId);
      if (!file?.state_confirmed || file?.gst_basis === 'unknown' || file?.is_active === false) continue;
      for (const it of items) {
        allExtractedItems.push({ ...it, filename: file?.filename });
      }
    }
    const { eligible } = filterEligibleItems(allExtractedItems);
    const { groups: freshGroups } = buildCanonicalGroups(eligible);
    const approvedMap = await getAllApprovedMappings();
    const restoredHashes = new Set<string>();

    memoryGroups.clear();

    for (const fg of freshGroups) {
      if (fg.members) {
        for (const mem of fg.members) {
          const hash = computeMappingHash(
            mem.item?.full_description || '',
            mem.item?.unit_norm || mem.item?.unit || '',
            mem.state_name,
          );
          const approvedMapping = approvedMap.get(hash);
          if (approvedMapping && !restoredHashes.has(hash)) {
            restoredHashes.add(hash);
            mem.review_status = (approvedMapping.approval_status as ReviewStatus) || 'approved';
            mem.match_class = approvedMapping.match_class as MatchClass;
            mem.reviewer_notes = `Restored from persistent approved memory (${approvedMapping.canonical_name})`;
          }
        }
      }
      memoryGroups.set(fg.id, fg);
    }
  }
}

export async function handleSorComparisonRoute(
  req: Request,
  env: { supabaseUrl: string; serviceKey: string },
): Promise<Response> {
  const url = new URL(req.url);
  const subPath = url.pathname.replace(/^\/api\/v1\/sor-comparison\/?/, '');
  const method = req.method;

  // Enforce session authentication identical to rest of the API
  const { session, errorResponse } = await enforceApiAuth(req);
  if (errorResponse) return errorResponse;

  await ensureHydrated();

  try {
    // 1. Upload & Analyze Workbook
    if (method === 'POST' && (subPath === 'upload' || subPath === '')) {
      const form = await req.formData();
      const file = form.get('file');
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Please upload an Excel file (.xlsx or .xls)' }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const fingerprint = crypto.createHash('sha256').update(buffer).digest('hex');

      // 1A. Check for Exact Duplicate Content via SHA-256 Fingerprint
      let existingFile = Array.from(memoryFiles.values()).find(
        (f) => f.content_fingerprint === fingerprint && f.status !== 'pending_confirmation',
      );
      if (!existingFile) {
        existingFile = (await findFileByFingerprint(fingerprint)) || undefined;
      }

      if (existingFile) {
        // Return existing file record and alert without re-extracting or creating duplicate records
        return NextResponse.json({
          is_duplicate: true,
          fingerprint,
          message: `Identical file content already uploaded as "${existingFile.filename}" on ${new Date(existingFile.created_at).toLocaleDateString()}. Duplicate processing skipped.`,
          existing_file: existingFile,
          file: existingFile,
        });
      }

      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as any);

      // Rank sheets to find recommended data sheet
      const sheetScores = rankSheets(wb);
      const recommendedSheet = sheetScores.find((s) => s.isRecommended)?.sheetName || sheetScores[0]?.sheetName || 'Sheet1';

      // Detect state, authority, SOR year, and engineering discipline
      const allSheetNames = sheetScores.map((s) => s.sheetName).join(' ');
      const detection = detectStateAndAuthority(file.name, allSheetNames);
      const yearDetailed = detectSorYearDetailed(file.name, allSheetNames);
      const detectedDiscipline = detectDiscipline(`${file.name} ${allSheetNames}`);

      // Compute tentative document key with discipline & year (DO NOT group across different disciplines!)
      const docKey = computeDocumentKey({
        state_name: detection.detected_state,
        authority_code: detection.authority_code,
        sor_year: yearDetailed.detected_sor_year,
        discipline: detectedDiscipline,
      });

      // 1B. Check for Candidates for Revision
      // A candidate revision must match confirmed logical key AND require explicit user confirmation
      const candidateRevisions = Array.from(memoryFiles.values()).filter(
        (f) => f.document_key === docKey && f.content_fingerprint !== fingerprint
      );
      const hasCandidateRevision = candidateRevisions.length > 0;

      const fileId = `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const fileRecord: SorFileRecord = {
        id: fileId,
        filename: file.name,
        file_size: file.size,
        storage_path: `sor-uploads/${fileId}-${file.name}`,
        content_fingerprint: fingerprint,
        document_key: docKey,
        version_number: 1, // Default to 1; becomes v2+ ONLY upon explicit revision confirmation
        is_active: true,
        discipline: detectedDiscipline,
        document_title: file.name.replace(/\.[^/.]+$/, ''),
        tender_reference: null,
        detected_sor_year_raw: yearDetailed.raw_year_text,
        is_revision: false, // Default to independent document
        revision_confirmed: false,
        detected_state: detection.detected_state || undefined,
        detection_confidence: detection.confidence,
        state_confirmed: false,
        state_name: null,
        authority_code: detection.authority_code,
        sor_year: yearDetailed.detected_sor_year,
        gst_basis: 'unknown',
        selected_sheet: recommendedSheet,
        header_row: null,
        total_rows: 0,
        extracted_items_count: 0,
        skipped_rows_count: 0,
        status: 'pending_confirmation',
        created_at: new Date().toISOString(),
      };

      memoryFiles.set(fileId, fileRecord);
      memoryFileBuffers.set(fileId, buffer);

      return NextResponse.json({
        file: fileRecord,
        sheets: sheetScores,
        recommendedSheet,
        detection,
        year_detection: yearDetailed,
        detected_discipline: detectedDiscipline,
        is_duplicate: false,
        has_candidate_revision: hasCandidateRevision,
        candidate_revisions: candidateRevisions.map((pv) => ({
          id: pv.id,
          filename: pv.filename,
          version_number: pv.version_number,
          discipline: pv.discipline,
          tender_reference: pv.tender_reference,
          document_key: pv.document_key,
          created_at: pv.created_at,
          is_active: pv.is_active,
        })),
      });
    }

    // 2. Confirm State & Extract Items
    if (method === 'POST' && subPath === 'confirm-and-extract') {
      const body = await req.json();
      const {
        file_id,
        state_name,
        authority_code,
        sor_year,
        discipline,
        document_title,
        tender_reference,
        upload_type, // 'new_document' | 'revision'
        target_revision_doc_key,
        gst_basis,
        selected_sheet,
        set_active,
      } = body;

      if (!file_id || !state_name) {
        return NextResponse.json({ error: 'file_id and state_name are required' }, { status: 400 });
      }

      const fileRecord = memoryFiles.get(file_id);
      const buffer = memoryFileBuffers.get(file_id);
      if (!fileRecord || !buffer) {
        return NextResponse.json({ error: 'File session expired or not found' }, { status: 404 });
      }

      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer as any);

      const sheetName = selected_sheet || fileRecord.selected_sheet || wb.worksheets[0].name;
      const ws = wb.getWorksheet(sheetName);
      if (!ws) {
        return NextResponse.json({ error: `Sheet "${sheetName}" not found in workbook` }, { status: 404 });
      }

      const mapping = detectColumns(ws);
      if (!mapping) {
        return NextResponse.json({ error: `Could not identify header columns in sheet "${sheetName}"` }, { status: 422 });
      }

      const basis: GstBasis = (gst_basis as GstBasis) || fileRecord.gst_basis;
      const extraction = extractItemsFromSheet(ws, mapping, {
        file_id,
        state_name,
        gst_basis: basis,
      });

      const confirmedYear = sor_year || fileRecord.sor_year || detectSorYear(fileRecord.filename);
      const confirmedDiscipline = discipline || fileRecord.discipline || 'Civil';
      const confirmedTenderRef = tender_reference !== undefined ? tender_reference : fileRecord.tender_reference;
      const isRevision = upload_type === 'revision' && Boolean(target_revision_doc_key);

      // Compute confirmed document key
      const confirmedDocKey = isRevision && target_revision_doc_key
        ? target_revision_doc_key
        : computeDocumentKey({
            state_name,
            authority_code: authority_code || fileRecord.authority_code,
            sor_year: confirmedYear,
            discipline: confirmedDiscipline,
            tender_reference: confirmedTenderRef,
          });

      // Update file record metadata
      fileRecord.state_name = state_name;
      fileRecord.state_confirmed = true;
      fileRecord.authority_code = authority_code || fileRecord.authority_code;
      fileRecord.sor_year = confirmedYear;
      fileRecord.discipline = confirmedDiscipline;
      fileRecord.document_title = document_title || fileRecord.document_title || fileRecord.filename;
      fileRecord.tender_reference = confirmedTenderRef;
      fileRecord.document_key = confirmedDocKey;
      fileRecord.gst_basis = basis;
      fileRecord.selected_sheet = sheetName;
      fileRecord.header_row = mapping.headerRow;
      fileRecord.total_rows = ws.rowCount;
      fileRecord.extracted_items_count = extraction.items.length;
      fileRecord.skipped_rows_count = extraction.skippedRows.length;
      fileRecord.status = 'extracted';
      fileRecord.is_revision = isRevision;
      fileRecord.revision_confirmed = isRevision;

      // Sibling versions exist ONLY if user explicitly designated revision OR matches confirmedDocKey
      const siblingVersions = Array.from(memoryFiles.values()).filter(
        (f) => f.id !== file_id && f.document_key === confirmedDocKey
      );

      if (isRevision && siblingVersions.length > 0) {
        const maxVer = Math.max(...siblingVersions.map((v) => v.version_number || 1));
        fileRecord.version_number = Math.max(fileRecord.version_number || 1, maxVer + 1);
        fileRecord.parent_file_id = siblingVersions[0].parent_file_id || siblingVersions[0].id;
      } else {
        fileRecord.version_number = 1;
        fileRecord.parent_file_id = null;
      }

      // Never automatically deactivate other documents unless this is an EXPLICIT revision of them
      const shouldSetActive = set_active !== false;
      fileRecord.is_active = shouldSetActive;

      if (isRevision && shouldSetActive) {
        for (const sib of siblingVersions) {
          sib.is_active = false;
          try {
            await saveFileRecord(sib);
          } catch (e) {
            console.warn('[SOR_DB_WARN] Failed updating sibling is_active:', e);
          }
        }
      }

      memoryItems.set(file_id, extraction.items);
      memorySkipped.set(file_id, extraction.skippedRows);

      // Persist to Supabase DB with PostgreSQL atomic transaction & race condition protection
      let dbPersisted = false;
      const requireDb = isPersistentDbRequired();

      try {
        const siblingIdsToDeactivate =
          isRevision && shouldSetActive && siblingVersions.length > 0
            ? siblingVersions.map((s) => s.id)
            : undefined;

        const saved = await saveFileAndItemsAtomic(fileRecord, extraction.items, siblingIdsToDeactivate);
        if (saved && saved.id !== fileRecord.id) {
          // A concurrent instance already stored this exact content fingerprint
          return NextResponse.json({
            is_duplicate: true,
            fingerprint: fileRecord.content_fingerprint,
            message: `Concurrent upload resolved: identical file content stored under "${saved.filename}".`,
            existing_file: saved,
            file: saved,
          });
        }
        dbPersisted = true;
      } catch (dbErr: any) {
        console.error('[SOR_DB_PERSIST_ERROR]', dbErr);
        if (requireDb) {
          // In deployed / strict persistence mode, a DB write failure MUST return HTTP 503
          // Clean up in-memory cache to prevent phantom files or locked duplicate hashes
          memoryFiles.delete(file_id);
          memoryItems.delete(file_id);
          memorySkipped.delete(file_id);
          memoryFileBuffers.delete(file_id);

          return NextResponse.json(
            {
              error: 'Database persistence failed. The file could not be permanently saved. Please check database connectivity and retry.',
              code: 'DB_PERSISTENCE_FAILED',
              details: dbErr?.code ? `PostgreSQL error [${dbErr.code}]` : undefined,
            },
            { status: 503 },
          );
        } else {
          // Local development / mock test fallback
          console.warn('[SOR_DB_PERSIST_WARN] Development fallback to in-memory store:', dbErr);
        }
      }

      // Refresh canonical groups with active files
      await ensureGroupsHydrated(true);

      return NextResponse.json({
        file: fileRecord,
        mapping,
        persisted: dbPersisted,
        summary: {
          extracted: extraction.items.length,
          skipped: extraction.skippedRows.length,
          sampleSkipped: extraction.skippedRows.slice(0, 5),
          sampleExtracted: extraction.items.slice(0, 5),
        },
      });
    }

    // 2.5 Set Active File Version
    if (method === 'POST' && subPath === 'set-active-version') {
      const body = await req.json();
      const { file_id } = body;
      if (!file_id) {
        return NextResponse.json({ error: 'file_id is required' }, { status: 400 });
      }
      const targetFile = memoryFiles.get(file_id);
      if (!targetFile) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      const docKey =
        targetFile.document_key ||
        computeDocumentKey({
          state_name: targetFile.state_name,
          authority_code: targetFile.authority_code,
          sor_year: targetFile.sor_year,
          discipline: targetFile.discipline,
          tender_reference: targetFile.tender_reference,
        });

      // 1. Await database transaction first - MUST succeed before mutating memory state
      try {
        await setActiveVersionInDb(targetFile.id, docKey);
      } catch (dbErr: any) {
        console.error('[SOR_DB_ERROR] Failed setActiveVersionInDb:', dbErr);
        const errMsg = dbErr?.message || 'Database transaction aborted';
        const isConflict = errMsg.includes('does not belong') || errMsg.includes('not found') || dbErr?.code === '23505';
        return NextResponse.json(
          { error: `Version activation failed: ${errMsg}` },
          { status: isConflict ? 409 : 500 }
        );
      }

      // 2. Database update succeeded: Mutate memory state
      for (const f of Array.from(memoryFiles.values())) {
        if (f.document_key === docKey) {
          f.is_active = f.id === file_id;
        }
      }
      targetFile.is_active = true;

      // 3. Rehydrate canonical groups only after successful activation
      await ensureGroupsHydrated(true);

      // 4. Return updated file metadata only after successful persistence
      return NextResponse.json({
        success: true,
        active_file_id: targetFile.id,
        document_key: docKey,
        files: Array.from(memoryFiles.values()),
      });
    }

    // 2.6 Dynamic State & Authority Registry Endpoints
    if (method === 'GET' && subPath === 'authorities') {
      const stateFilter = url.searchParams.get('state');
      const authorities = stateFilter ? getAuthoritiesByState(stateFilter) : getAuthorityMappings();
      return NextResponse.json({ authorities });
    }

    if (method === 'POST' && subPath === 'authorities') {
      const body = await req.json();
      if (!body.authority_code || !body.authority_name || !body.state_name) {
        return NextResponse.json(
          { error: 'authority_code, authority_name, and state_name are required' },
          { status: 400 }
        );
      }

      const mappingToAdd = {
        authority_code: body.authority_code.trim().toUpperCase(),
        authority_name: body.authority_name.trim(),
        state_name: body.state_name.trim(),
        department_type: body.department_type || 'General',
        keywords: body.keywords || [body.authority_code.toLowerCase(), body.authority_name.toLowerCase()],
        supported_sor_years: body.supported_sor_years || [],
        is_central_agency: Boolean(body.is_central_agency),
        is_custom: true,
      };

      const result = addAuthorityMapping(mappingToAdd);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 409 });
      }

      // Persist to PostgreSQL database
      try {
        await saveAuthorityMappingToDb(mappingToAdd);
      } catch (dbErr: any) {
        console.error('[DB_ERROR] Failed to persist authority mapping to DB:', dbErr);
        if (isPersistentDbRequired()) {
          return NextResponse.json(
            {
              error: 'Failed to persist authority mapping to database.',
              code: 'DB_PERSISTENCE_FAILED',
              details: dbErr?.code ? `PostgreSQL error [${dbErr.code}]` : undefined,
            },
            { status: 503 },
          );
        }
      }

      return NextResponse.json({
        success: true,
        authorities: getAuthorityMappings(),
      });
    }

    // 3. List Files (Supports pagination when requested)
    if (method === 'GET' && subPath === 'files') {
      const isPaginated = url.searchParams.has('page');
      const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
      const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get('pageSize')) || 25));
      const stateFilter = url.searchParams.get('state') || undefined;
      const search = url.searchParams.get('search') || undefined;

      if (isPaginated) {
        try {
          const dbFiles = await getPaginatedFilesFromDb({
            page,
            pageSize,
            stateFilter,
            search,
          });
          if (dbFiles && dbFiles.pagination.total > 0) {
            return NextResponse.json(dbFiles);
          }
        } catch (dbErr) {
          // Fallback to in-memory files
        }

        let filtered = Array.from(memoryFiles.values()).filter((f) => f.is_test !== true);
        if (stateFilter && stateFilter !== 'all') {
          filtered = filtered.filter((f) => f.state_name?.toLowerCase() === stateFilter.toLowerCase());
        }
        if (search) {
          const s = search.toLowerCase();
          filtered = filtered.filter(
            (f) =>
              f.filename.toLowerCase().includes(s) ||
              (f.document_key && f.document_key.toLowerCase().includes(s)) ||
              (f.authority_code && f.authority_code.toLowerCase().includes(s)),
          );
        }
        return NextResponse.json(paginateArray(filtered, page, pageSize));
      }
      return NextResponse.json({
        files: Array.from(memoryFiles.values()).filter((f) => f.is_test !== true),
      });
    }

    // 3A. Server-Side Paginated BOQ Source Items (Phase 4.3)
    if (method === 'GET' && subPath === 'items') {
      const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
      const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get('pageSize')) || 50));
      const sortBy = url.searchParams.get('sortBy') || 'source_row';
      const sortOrder = (url.searchParams.get('sortOrder') === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';
      const stateFilter = url.searchParams.get('state') || undefined;
      const categoryFilter = url.searchParams.get('category') || undefined;
      const search = url.searchParams.get('search') || undefined;
      const fileId = url.searchParams.get('file_id') || undefined;

      try {
        const dbResult = await getPaginatedItemsFromDb({
          page,
          pageSize,
          sortBy,
          sortOrder,
          stateFilter,
          categoryFilter,
          search,
        });
        if (dbResult && dbResult.pagination.total > 0) {
          return NextResponse.json(dbResult);
        }
      } catch (dbErr) {
        // Fallback to in-memory items
      }

      // In-memory fallback
      let allItems: SorItemRecord[] = [];
      for (const [fId, items] of Array.from(memoryItems.entries())) {
        if (fileId && fId !== fileId) continue;
        const file = memoryFiles.get(fId);
        if (file?.is_active === false) continue;
        allItems.push(...items);
      }

      if (stateFilter && stateFilter !== 'all') {
        allItems = allItems.filter((i) => i.state_name?.toLowerCase() === stateFilter.toLowerCase());
      }
      if (categoryFilter && categoryFilter !== 'all') {
        allItems = allItems.filter((i) => i.category?.toLowerCase() === categoryFilter.toLowerCase());
      }
      if (search) {
        const s = search.toLowerCase();
        allItems = allItems.filter(
          (i) =>
            i.raw_description.toLowerCase().includes(s) ||
            i.full_description.toLowerCase().includes(s) ||
            (i.item_no && i.item_no.toLowerCase().includes(s)),
        );
      }

      allItems.sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'rate_ex_gst') {
          cmp = (a.rate_ex_gst || 0) - (b.rate_ex_gst || 0);
        } else if (sortBy === 'state_name') {
          cmp = (a.state_name || '').localeCompare(b.state_name || '');
        } else if (sortBy === 'category') {
          cmp = (a.category || '').localeCompare(b.category || '');
        } else {
          cmp = (a.source_row || 0) - (b.source_row || 0);
        }
        if (cmp === 0) cmp = (a.id || '').localeCompare(b.id || '');
        return sortOrder === 'desc' ? -cmp : cmp;
      });

      return NextResponse.json(paginateArray(allItems, page, pageSize));
    }

    // 4. Skipped Rows
    if (method === 'GET' && subPath === 'skipped-rows') {
      const fileId = url.searchParams.get('file_id');
      if (!fileId) {
        return NextResponse.json({ error: 'file_id required' }, { status: 400 });
      }
      const skipped = memorySkipped.get(fileId) || [];
      return NextResponse.json({
        file_id: fileId,
        count: skipped.length,
        skipped,
      });
    }

    // 5. State Consolidation Summary
    if (method === 'GET' && subPath === 'state-summary') {
      const allExtractedItems: (SorItemRecord & { filename?: string })[] = [];
      for (const [fileId, items] of Array.from(memoryItems.entries())) {
        const file = memoryFiles.get(fileId);
        if (file?.is_active === false) continue;
        for (const it of items) {
          allExtractedItems.push({
            ...it,
            filename: file?.filename,
          });
        }
      }

      const consolidated = consolidateStateItems(allExtractedItems);

      // State groups summary
      const stateGroups = Object.entries(consolidated).map(([state, stateItems]) => {
        const stateFiles = Array.from(memoryFiles.values()).filter((f) => f.state_name === state);
        const distinctRateItems = stateItems.filter((i) => i.rates_differ);
        return {
          state_name: state,
          file_count: stateFiles.length,
          files: stateFiles.map((f) => f.filename),
          total_items: stateItems.length,
          differing_rate_items_count: distinctRateItems.length,
        };
      });

      return NextResponse.json({
        stateGroups,
        consolidated,
      });
    }

    // 6. Canonical Item Groups (Matching across N states with persisted hash-based memory & pagination)
    if (method === 'GET' && subPath === 'groups') {
      const isPaginated = url.searchParams.has('page');
      const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
      const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get('pageSize')) || 25));
      const categoryFilter = url.searchParams.get('category') || undefined;
      const search = url.searchParams.get('search') || undefined;
      const classFilter = url.searchParams.get('match_class') || undefined;
      const conflictsOnly = url.searchParams.get('conflicts_only') === 'true';

      if (isPaginated) {
        try {
          const dbGroups = await getPaginatedGroupsFromDb({
            page,
            pageSize,
            categoryFilter,
            search,
            classFilter,
            conflictsOnly,
          });
          if (dbGroups && dbGroups.pagination.total > 0) {
            return NextResponse.json(dbGroups);
          }
        } catch (dbErr) {
          // Fallback to in-memory groups
        }
      }

      const allExtractedItems: (SorItemRecord & { filename?: string })[] = [];
      for (const [fileId, items] of Array.from(memoryItems.entries())) {
        const file = memoryFiles.get(fileId);
        // Exclude files with unknown GST basis until confirmed, and exclude inactive/historical versions
        if (!file?.state_confirmed || file?.gst_basis === 'unknown' || file?.is_active === false) {
          continue;
        }
        for (const it of items) {
          allExtractedItems.push({
            ...it,
            filename: file?.filename,
          });
        }
      }

      const { eligible, exclusions } = filterEligibleItems(allExtractedItems);
      const { groups: freshGroups, allPairs } = buildCanonicalGroups(eligible);

      // Check persisted approved mappings memory in one single query
      const approvedMap = await getAllApprovedMappings();
      const restoredHashes = new Set<string>();

      memoryGroups.clear();

      for (const fg of freshGroups) {
        if (fg.members) {
          for (const mem of fg.members) {
            const hash = computeMappingHash(
              mem.item?.full_description || '',
              mem.item?.unit_norm || mem.item?.unit || '',
              mem.state_name,
            );
            const approvedMapping = approvedMap.get(hash);
            if (approvedMapping && !restoredHashes.has(hash)) {
              restoredHashes.add(hash);
              // Previously approved mapping exists for this exact normalized specification!
              // Rule 1c: Restores onto at most ONE group
              mem.review_status = (approvedMapping.approval_status as ReviewStatus) || 'approved';
              mem.match_class = approvedMapping.match_class as MatchClass;
              mem.reviewer_notes = `Restored from persistent approved memory (${approvedMapping.canonical_name})`;
            }
          }
        }

        memoryGroups.set(fg.id, fg);
      }

      if (isPaginated) {
        let groupList = Array.from(memoryGroups.values());
        if (categoryFilter && categoryFilter !== 'all') {
          groupList = groupList.filter((g) => g.category?.toLowerCase() === categoryFilter.toLowerCase());
        }
        if (search) {
          const s = search.toLowerCase();
          groupList = groupList.filter(
            (g) =>
              g.canonical_name.toLowerCase().includes(s) ||
              (g.members &&
                g.members.some(
                  (m) =>
                    m.item?.full_description?.toLowerCase().includes(s) ||
                    m.state_name.toLowerCase().includes(s) ||
                    m.item?.item_no?.toLowerCase().includes(s),
                )),
          );
        }
        if (classFilter && classFilter !== 'all') {
          groupList = groupList.filter((g) =>
            g.members?.some((m) => m.match_class?.toLowerCase() === classFilter.toLowerCase()),
          );
        }
        if (conflictsOnly) {
          groupList = groupList.filter((g) =>
            g.members?.some((m) => m.state_rate_status === 'state_rate_conflict'),
          );
        }

        return NextResponse.json(paginateArray(groupList, page, pageSize));
      }

      return NextResponse.json({
        groups: Array.from(memoryGroups.values()),
        totalGroups: memoryGroups.size,
        eligibleCount: eligible.length,
        exclusions,
        pairsCount: allPairs.length,
      });
    }

    // 7. Review Decision on Group Member (Approve, Reject, Promote to Strong, Mark Conditional)
    if (method === 'POST' && subPath === 'groups/decision') {
      const body = await req.json();
      const { group_id, member_id, action, notes, actor } = body;

      if (!group_id || !member_id || !action) {
        return NextResponse.json({ error: 'group_id, member_id, and action are required' }, { status: 400 });
      }

      const validActions = ['approved', 'rejected', 'promoted_strong', 'marked_conditional'];
      if (!validActions.includes(action)) {
        return NextResponse.json(
          { error: `action must be one of: ${validActions.join(', ')}` },
          { status: 400 },
        );
      }

      if (action === 'promoted_strong' && (!notes || !notes.trim())) {
        return NextResponse.json(
          { error: 'A justification note is strictly required when promoting a Conditional match to Strong.' },
          { status: 400 },
        );
      }

      const group = memoryGroups.get(group_id);
      if (!group || !group.members) {
        return NextResponse.json({ error: `Group "${group_id}" not found` }, { status: 404 });
      }

      const member = group.members.find((m) => m.id === member_id);
      if (!member) {
        return NextResponse.json({ error: `Member "${member_id}" not found in group` }, { status: 404 });
      }

      const oldStatus = member.review_status;
      const oldClass = member.match_class;

      if (action === 'marked_conditional') {
        member.match_class = 'Conditional';
        member.review_status = 'pending';
      } else {
        member.review_status = action;
        if (action === 'promoted_strong') {
          member.match_class = 'Strong';
        }
      }

      member.reviewer_notes = notes || null;
      member.reviewed_by = actor || 'reviewer';
      member.reviewed_at = new Date().toISOString();

      // Audit Log
      const auditEntry: SorMatchAuditRecord = {
        id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        group_id,
        member_id,
        action,
        actor: actor || 'reviewer',
        old_value: { review_status: oldStatus, match_class: oldClass },
        new_value: { review_status: member.review_status, match_class: member.match_class },
        notes: notes || null,
        created_at: new Date().toISOString(),
      };
      memoryAuditLogs.push(auditEntry);

      // Persist decision & audit to DB
      try {
        await saveCanonicalGroup(group);
        await logAuditAction(auditEntry);

        // If approved or promoted, persist mapping hash to memory
        if (action === 'approved' || action === 'promoted_strong') {
          await persistApprovedMapping(
            member.item?.full_description || '',
            member.item?.unit_norm || member.item?.unit || '',
            member.state_name,
            group.id,
            group.canonical_name,
            member.match_class,
            action,
            actor || 'reviewer',
          );
        }
      } catch (dbErr: any) {
        console.error('[SOR_DB_PERSIST_ERROR] Review decision persistence failed:', dbErr);
        if (isPersistentDbRequired()) {
          member.review_status = oldStatus;
          member.match_class = oldClass;
          memoryAuditLogs.pop();
          return NextResponse.json(
            {
              error: 'Failed to persist review decision to database.',
              code: 'DB_PERSISTENCE_FAILED',
              details: dbErr?.code ? `PostgreSQL error [${dbErr.code}]` : undefined,
            },
            { status: 503 },
          );
        }
        console.warn('[SOR_DB_PERSIST_WARN] Using memory fallback for review decision:', dbErr);
      }

      return NextResponse.json({
        success: true,
        member,
        audit: auditEntry,
      });
    }

    // 8. Resolve State Rate Conflict (User selects applicable rate or keeps variant)
    if (method === 'POST' && subPath === 'groups/resolve-conflict') {
      const body = await req.json();
      const { group_id, member_id, selected_rate_ex_gst, notes, actor } = body;

      if (!group_id || !member_id || selected_rate_ex_gst == null) {
        return NextResponse.json(
          { error: 'group_id, member_id, and selected_rate_ex_gst are required' },
          { status: 400 },
        );
      }

      const group = memoryGroups.get(group_id);
      if (!group || !group.members) {
        return NextResponse.json({ error: `Group "${group_id}" not found` }, { status: 404 });
      }

      const member = group.members.find((m) => m.id === member_id);
      if (!member) {
        return NextResponse.json({ error: `Member "${member_id}" not found in group` }, { status: 404 });
      }

      const oldRate = member.selected_rate_ex_gst;
      member.selected_rate_ex_gst = Number(selected_rate_ex_gst);
      member.state_rate_status = 'consolidated';

      const auditEntry: SorMatchAuditRecord = {
        id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        group_id,
        member_id,
        action: 'state_rate_selected',
        actor: actor || 'reviewer',
        old_value: { selected_rate_ex_gst: oldRate, status: 'state_rate_conflict' },
        new_value: { selected_rate_ex_gst: member.selected_rate_ex_gst, status: 'consolidated' },
        notes: notes || 'User resolved state rate conflict by selecting applicable rate',
        created_at: new Date().toISOString(),
      };
      memoryAuditLogs.push(auditEntry);

      try {
        await saveCanonicalGroup(group);
        await logAuditAction(auditEntry);
      } catch (dbErr: any) {
        console.error('[SOR_DB_PERSIST_ERROR] Conflict resolution persistence failed:', dbErr);
        if (isPersistentDbRequired()) {
          member.selected_rate_ex_gst = oldRate;
          member.state_rate_status = 'state_rate_conflict';
          memoryAuditLogs.pop();
          return NextResponse.json(
            {
              error: 'Failed to persist conflict resolution to database.',
              code: 'DB_PERSISTENCE_FAILED',
              details: dbErr?.code ? `PostgreSQL error [${dbErr.code}]` : undefined,
            },
            { status: 503 },
          );
        }
        console.warn('[SOR_DB_PERSIST_WARN]', dbErr);
      }

      return NextResponse.json({
        success: true,
        member,
        audit: auditEntry,
      });
    }

    // 9. Attribute Override
    if (method === 'POST' && subPath === 'groups/override-attributes') {
      const body = await req.json();
      const { group_id, attributes, notes, actor } = body;

      if (!group_id || !attributes) {
        return NextResponse.json({ error: 'group_id and attributes are required' }, { status: 400 });
      }

      const group = memoryGroups.get(group_id);
      if (!group) {
        return NextResponse.json({ error: `Group "${group_id}" not found` }, { status: 404 });
      }

      const oldAttrs = { ...group.attributes };
      group.attributes = { ...group.attributes, ...attributes };

      const auditEntry: SorMatchAuditRecord = {
        id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        group_id,
        action: 'modified',
        actor: actor || 'reviewer',
        old_value: oldAttrs,
        new_value: group.attributes,
        notes: notes || 'Attribute override by reviewer',
        created_at: new Date().toISOString(),
      };
      memoryAuditLogs.push(auditEntry);

      try {
        await saveCanonicalGroup(group);
        await logAuditAction(auditEntry);
      } catch (dbErr: any) {
        console.error('[SOR_DB_PERSIST_ERROR] Override attributes persistence failed:', dbErr);
        if (isPersistentDbRequired()) {
          group.attributes = oldAttrs;
          memoryAuditLogs.pop();
          return NextResponse.json(
            {
              error: 'Failed to persist attribute override to database.',
              code: 'DB_PERSISTENCE_FAILED',
              details: dbErr?.code ? `PostgreSQL error [${dbErr.code}]` : undefined,
            },
            { status: 503 },
          );
        }
        console.warn('[SOR_DB_PERSIST_WARN]', dbErr);
      }

      return NextResponse.json({
        success: true,
        group,
        audit: auditEntry,
      });
    }

    // 10. Merge Groups (Combines source_group_id into target_group_id)
    if (method === 'POST' && subPath === 'groups/merge') {
      const body = await req.json();
      const { source_group_id, target_group_id, actor, notes } = body;

      if (!source_group_id || !target_group_id) {
        return NextResponse.json({ error: 'source_group_id and target_group_id are required' }, { status: 400 });
      }

      const srcGroup = memoryGroups.get(source_group_id);
      const tgtGroup = memoryGroups.get(target_group_id);
      if (!srcGroup || !tgtGroup) {
        return NextResponse.json({ error: 'Source or target group not found' }, { status: 404 });
      }

      // Move members
      tgtGroup.members = tgtGroup.members || [];
      for (const m of srcGroup.members || []) {
        m.group_id = tgtGroup.id;
        tgtGroup.members.push(m);
      }

      srcGroup.members = [];
      srcGroup.status = 'merged';

      const auditEntry: SorMatchAuditRecord = {
        id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        group_id: target_group_id,
        action: 'modified',
        actor: actor || 'reviewer',
        old_value: { merged_from: source_group_id },
        new_value: { status: 'merged_into', target_group: target_group_id },
        notes: notes || `Merged group ${source_group_id} into ${target_group_id}`,
        created_at: new Date().toISOString(),
      };
      memoryAuditLogs.push(auditEntry);

      try {
        await saveCanonicalGroup(tgtGroup);
        await saveCanonicalGroup(srcGroup);
        await logAuditAction(auditEntry);
      } catch (dbErr: any) {
        console.error('[SOR_DB_PERSIST_ERROR] Merge groups persistence failed:', dbErr);
        if (isPersistentDbRequired()) {
          memoryAuditLogs.pop();
          return NextResponse.json(
            {
              error: 'Failed to persist group merge to database.',
              code: 'DB_PERSISTENCE_FAILED',
              details: dbErr?.code ? `PostgreSQL error [${dbErr.code}]` : undefined,
            },
            { status: 503 },
          );
        }
        console.warn('[SOR_DB_PERSIST_WARN]', dbErr);
      }

      return NextResponse.json({
        success: true,
        targetGroup: tgtGroup,
        audit: auditEntry,
      });
    }

    // 11. Split Member (Separates member_id from group_id into its own group)
    if (method === 'POST' && subPath === 'groups/split') {
      const body = await req.json();
      const { group_id, member_id, actor, notes } = body;

      if (!group_id || !member_id) {
        return NextResponse.json({ error: 'group_id and member_id are required' }, { status: 400 });
      }

      const group = memoryGroups.get(group_id);
      if (!group || !group.members) {
        return NextResponse.json({ error: `Group "${group_id}" not found` }, { status: 404 });
      }

      const memIndex = group.members.findIndex((m) => m.id === member_id);
      if (memIndex === -1) {
        return NextResponse.json({ error: `Member "${member_id}" not found in group` }, { status: 404 });
      }

      const [member] = group.members.splice(memIndex, 1);
      const newGroupId = `grp_${Date.now()}_split_${Math.random().toString(36).slice(2, 6)}`;
      member.group_id = newGroupId;
      member.match_class = 'Strong';
      member.confidence = 100;
      member.review_status = 'approved';

      const newGroup: SorItemGroupRecord = {
        id: newGroupId,
        canonical_name: (member.item?.raw_description || member.item?.full_description || 'Split Group Item').slice(0, 80),
        category: member.item?.category || group.category,
        canonical_unit: member.item?.unit_norm || group.canonical_unit,
        attributes: { ...group.attributes },
        status: 'active',
        members: [member],
      };

      memoryGroups.set(newGroupId, newGroup);

      const auditEntry: SorMatchAuditRecord = {
        id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        group_id: newGroupId,
        member_id,
        action: 'modified',
        actor: actor || 'reviewer',
        old_value: { split_from_group: group_id },
        new_value: { new_group_id: newGroupId },
        notes: notes || `Split member ${member_id} from group ${group_id} into ${newGroupId}`,
        created_at: new Date().toISOString(),
      };
      memoryAuditLogs.push(auditEntry);

      try {
        await saveCanonicalGroup(group);
        await saveCanonicalGroup(newGroup);
        await logAuditAction(auditEntry);
      } catch (dbErr: any) {
        console.error('[SOR_DB_PERSIST_ERROR] Split member persistence failed:', dbErr);
        if (isPersistentDbRequired()) {
          memoryGroups.delete(newGroupId);
          group.members.splice(memIndex, 0, member);
          member.group_id = group_id;
          memoryAuditLogs.pop();
          return NextResponse.json(
            {
              error: 'Failed to persist split member to database.',
              code: 'DB_PERSISTENCE_FAILED',
              details: dbErr?.code ? `PostgreSQL error [${dbErr.code}]` : undefined,
            },
            { status: 503 },
          );
        }
        console.warn('[SOR_DB_PERSIST_WARN]', dbErr);
      }

      return NextResponse.json({
        success: true,
        newGroup,
        remainingGroup: group,
        audit: auditEntry,
      });
    }

    // 12. Unit Conversion via sor_unit_map
    if (method === 'POST' && subPath === 'unit-conversion') {
      const body = await req.json();
      const { source_unit, canonical_unit, dimension, conversion_factor, reason } = body;

      if (!source_unit || !canonical_unit || conversion_factor == null) {
        return NextResponse.json(
          { error: 'source_unit, canonical_unit, and conversion_factor are required' },
          { status: 400 },
        );
      }

      try {
        await addUnitConversion(
          source_unit,
          canonical_unit,
          dimension || 'unsupported',
          Number(conversion_factor),
          reason || 'User defined unit conversion',
        );
      } catch (dbErr: any) {
        console.error('[SOR_DB_PERSIST_ERROR] Unit conversion persistence failed:', dbErr);
        if (isPersistentDbRequired()) {
          return NextResponse.json(
            {
              error: 'Failed to persist unit conversion to database.',
              code: 'DB_PERSISTENCE_FAILED',
              details: dbErr?.code ? `PostgreSQL error [${dbErr.code}]` : undefined,
            },
            { status: 503 },
          );
        }
        console.warn('[SOR_DB_PERSIST_WARN]', dbErr);
      }

      return NextResponse.json({
        success: true,
        conversion: { source_unit, canonical_unit, factor: conversion_factor, reason },
      });
    }

    // 13. Audit Logs (From live DB or fallback)
    if (method === 'GET' && subPath === 'audit-logs') {
      let logs = memoryAuditLogs;
      try {
        const dbLogs = await getAuditLogs();
        if (dbLogs && dbLogs.length > 0) {
          logs = dbLogs;
        }
      } catch (dbErr) {
        // Fallback to memory
      }

      return NextResponse.json({
        total: logs.length,
        logs,
      });
    }

    // 11. Authorities Management
    if (method === 'GET' && subPath === 'authorities') {
      return NextResponse.json({
        mappings: getAuthorityMappings(),
      });
    }

    if (method === 'POST' && subPath === 'authorities') {
      const body = await req.json();
      const { authority_code, authority_name, state_name, keywords } = body;
      if (!authority_code || !state_name) {
        return NextResponse.json({ error: 'authority_code and state_name are required' }, { status: 400 });
      }

      addAuthorityMapping({
        authority_code,
        authority_name: authority_name || authority_code,
        state_name,
        keywords: keywords || [authority_code],
      });

      return NextResponse.json({
        success: true,
        mappings: getAuthorityMappings(),
      });
    }

    // 13B. Server-Side Dashboard Metrics Aggregation (Phase 4.3)
    if (method === 'GET' && subPath === 'dashboard-metrics') {
      try {
        const metrics = await getDashboardMetricsFromDb();
        if (metrics.totalItems > 0 || metrics.totalFiles > 0) {
          return NextResponse.json(metrics);
        }
      } catch (dbErr) {
        // Fallback to memory calculation
      }

      await ensureGroupsHydrated();
      const files = Array.from(memoryFiles.values()).filter((f) => f.is_active !== false);
      const groups = Array.from(memoryGroups.values());

      let totalItems = 0;
      const stateCounts: Record<string, number> = {};
      const catCounts: Record<string, number> = {};

      for (const [fileId, items] of Array.from(memoryItems.entries())) {
        const file = memoryFiles.get(fileId);
        if (file?.is_active === false) continue;
        for (const it of items) {
          totalItems++;
          if (it.state_name) {
            stateCounts[it.state_name] = (stateCounts[it.state_name] || 0) + 1;
          }
          if (it.category) {
            catCounts[it.category] = (catCounts[it.category] || 0) + 1;
          }
        }
      }

      const statesList = Object.keys(stateCounts);
      const categoryDistribution = Object.entries(catCounts).map(([category, count]) => ({
        category,
        count,
        percentage: totalItems > 0 ? Number(((count / totalItems) * 100).toFixed(1)) : 0,
      }));

      let tier1Count = 0;
      let tier2Count = 0;
      let conflictCount = 0;
      let pendingReviewCount = 0;

      for (const g of groups) {
        if (g.status !== 'active') continue;
        const mems = (g.members || []).filter((m) => {
          const f = m.file_id ? memoryFiles.get(m.file_id) : undefined;
          return f ? f.is_active !== false && f.is_test !== true : true;
        });

        const proposalStates = new Set(mems.map((m) => m.state_name));
        if (proposalStates.size >= 2) {
          if (mems.some((m) => m.review_status === 'pending')) {
            pendingReviewCount++;
          }
          if (mems.some((m) => m.state_rate_status === 'state_rate_conflict')) {
            conflictCount++;
          }
        }

        // Qualifying states for Tier calculation according to comparisonEngine rules:
        // Must be approved, no conflict, valid rate > 0, cross-state (>= 2 distinct states), and match_class IN ('Strong', 'Conditional')
        const approvedMems = mems.filter((m) => {
          const f = m.file_id ? memoryFiles.get(m.file_id) : undefined;
          const gstKnown = !f || f.gst_basis !== 'unknown';
          const rate = m.selected_rate_ex_gst ?? m.item?.rate_ex_gst;
          return (
            m.review_status === 'approved' &&
            m.state_rate_status !== 'state_rate_conflict' &&
            gstKnown &&
            rate != null &&
            rate > 0 &&
            (m.match_class === 'Strong' || m.match_class === 'Conditional')
          );
        });

        const qualifyingStates = new Set(approvedMems.map((m) => m.state_name));
        if (qualifyingStates.size >= 2) {
          const hasConditional = approvedMems.some((m) => m.match_class === 'Conditional');
          if (hasConditional) {
            tier2Count++;
          } else {
            tier1Count++;
          }
        }
      }

      const activeGroups = groups.filter(
        (g) =>
          g.status === 'active' &&
          g.is_test !== true &&
          (g.members || []).some((m) => {
            const f = m.file_id ? memoryFiles.get(m.file_id) : undefined;
            return f ? f.is_active !== false && f.is_test !== true : false;
          }),
      );

      const summary: DashboardMetricSummary = {
        totalItems,
        totalGroups: activeGroups.length,
        totalStates: statesList.length,
        statesList,
        totalFiles: files.length,
        tier1Count,
        tier2Count,
        conflictCount,
        pendingReviewCount,
        stateCounts,
        categoryDistribution,
      };

      return NextResponse.json(summary);
    }

    // 14. Phase 3 Comparison Dashboard Data
    if (method === 'GET' && subPath === 'dashboard') {
      const includeConditional = url.searchParams.get('include_conditional') === 'true';
      const referenceState = url.searchParams.get('reference_state') || undefined;

      await ensureGroupsHydrated();
      const groups = Array.from(memoryGroups.values());
      const files = Array.from(memoryFiles.values());

      const dataset = buildComparisonDataset(groups, files, {
        includeConditional,
        referenceState,
      });

      const insights = generateVerifiedInsights(dataset.rows, dataset.categorySummaries);

      return NextResponse.json({
        ...dataset,
        insights,
      });
    }

    // 15. Phase 3 Excel Export
    if (method === 'GET' && subPath === 'export/excel') {
      const referenceState = url.searchParams.get('reference_state') || undefined;
      await ensureGroupsHydrated();
      const groups = Array.from(memoryGroups.values());
      const files = Array.from(memoryFiles.values());

      const tier1Dataset = buildComparisonDataset(groups, files, {
        includeConditional: false,
        referenceState,
      });
      const tier2Dataset = buildComparisonDataset(groups, files, {
        includeConditional: true,
        referenceState,
      });

      const insights = generateVerifiedInsights(tier2Dataset.rows, tier2Dataset.categorySummaries);

      // Build pending and conflicts list
      const pendingAndConflicts: any[] = [];
      for (const g of groups) {
        const mems = g.members || [];
        const states = Array.from(new Set(mems.map((m) => m.state_name)));
        const isConflict = mems.some((m) => m.state_rate_status === 'state_rate_conflict');
        const isPending = mems.some((m) => m.review_status === 'pending');
        if (isConflict || (isPending && states.length >= 2)) {
          pendingAndConflicts.push({
            group_id: g.id,
            canonical_name: g.canonical_name,
            category: g.category,
            unit: g.canonical_unit,
            states_involved: states.join(', '),
            status: isConflict ? 'State Rate Conflict' : 'Pending Cross-State Review',
            details: mems.flatMap((m) => m.warnings || []).join('; ') || `${mems.length} sources matched across ${states.length} states`,
          });
        }
      }

      // Build real excluded items list (priced items excluded by filter rules)
      const excludedItems: any[] = [];
      for (const [fileId, items] of Array.from(memoryItems.entries())) {
        const f = memoryFiles.get(fileId);
        if (f?.is_active === false) continue;
        for (const it of items) {
          let reason: string | null = null;
          if (it.is_addon) reason = 'Add-on item';
          else if (it.is_percentage_based) reason = 'Percentage-based pricing';
          else if (it.is_lump_sum) reason = 'Lump-sum package';
          else if (!it.unit || it.flag_notes?.includes('unit_missing')) reason = 'Missing unit';
          else if (it.rate_as_stated == null && it.rate_ex_gst == null) reason = 'Unpriced / null rate';
          else if (it.rate_as_stated === 0 || it.rate_ex_gst === 0 || it.flag_notes?.includes('zero_rate')) reason = 'Zero rate';

          if (reason) {
            excludedItems.push({
              file_name: f?.filename || 'Uploaded File',
              sheet_name: it.sheet_name || f?.selected_sheet || 'Sheet1',
              source_row: it.source_row,
              item_no: it.item_no || '—',
              description: it.full_description,
              unit: it.unit || '—',
              rate: it.rate_as_stated,
              reason,
            });
          }
        }
      }

      // Build structural skipped rows list
      const skippedRows: any[] = [];
      if (memorySkipped.size > 0) {
        for (const [fileId, skipped] of Array.from(memorySkipped.entries())) {
          const f = memoryFiles.get(fileId);
          if (f?.is_active === false) continue;
          for (const sk of skipped) {
            skippedRows.push({
              file_name: f?.filename || 'Uploaded File',
              sheet_name: sk.sheet_name || f?.selected_sheet || 'Sheet1',
              source_row: sk.source_row,
              description: (sk.raw_data?.desc as string) || (sk.raw_data?.raw_description as string) || (sk.raw_data as any)?.full_description || 'Non-item structural row',
              skip_reason: sk.skip_reason || 'Structural non-item row',
            });
          }
        }
      } else {
        const dbSkipped = await loadSkippedRowsFromDb();
        for (const sk of dbSkipped) {
          skippedRows.push({
            file_name: sk.filename || 'Uploaded File',
            sheet_name: sk.sheet_name || 'Sheet1',
            source_row: sk.source_row,
            description: (sk.raw_data?.desc as string) || (sk.raw_data?.raw_description as string) || (sk.raw_data as any)?.full_description || 'Non-item structural row',
            skip_reason: sk.skip_reason || 'Structural non-item row',
          });
        }
      }

      // Build Single-State Unmatched Items across ALL uploaded states
      const crossStateRowKeys = new Set<string>(); // file_id + '_' + source_row
      const crossStateItemIds = new Set<string>();

      for (const g of groups) {
        const mems = g.members || [];
        const states = new Set(mems.map((m) => m.state_name));
        if (states.size >= 2) {
          for (const m of mems) {
            if (m.item_id) crossStateItemIds.add(m.item_id);
            if (m.file_id && m.source_rows) {
              for (const r of m.source_rows) {
                crossStateRowKeys.add(`${m.file_id}_${r}`);
              }
            }
            if (m.item?.file_id && m.item?.source_row) {
              crossStateRowKeys.add(`${m.item.file_id}_${m.item.source_row}`);
            }
          }
        }
      }

      const activeConfirmedStates = new Set(
        Array.from(memoryFiles.values())
          .filter((f) => f.state_confirmed && f.state_name)
          .map((f) => f.state_name!)
      );
      const multiStateAvailable = activeConfirmedStates.size >= 2;

      const unmatchedRows: any[] = [];
      for (const [fileId, items] of Array.from(memoryItems.entries())) {
        const f = memoryFiles.get(fileId);
        if (!f?.state_confirmed || !f?.state_name || f?.is_active === false) continue;

        for (const it of items) {
          if (
            it.is_addon ||
            it.is_percentage_based ||
            it.is_lump_sum ||
            !it.unit ||
            it.rate_ex_gst == null ||
            it.rate_ex_gst <= 0 ||
            it.flag_notes?.includes('unit_missing') ||
            it.flag_notes?.includes('zero_rate')
          ) {
            continue; // Handled in exclusions
          }

          const rowKey = `${fileId}_${it.source_row}`;
          const isCrossStateMatched = (it.id && crossStateItemIds.has(it.id)) || crossStateRowKeys.has(rowKey);

          if (!isCrossStateMatched) {
            const reason = multiStateAvailable
              ? 'No comparable canonical item found across other uploaded state schedules'
              : 'Single-state schedule uploaded; no second state available for comparison';

            unmatchedRows.push({
              source_state: f.state_name,
              authority_code: f.authority_code || '—',
              sor_year: f.sor_year || '—',
              file_name: f.filename,
              sheet_name: it.sheet_name || f.selected_sheet || 'Sheet1',
              source_row: it.source_row,
              item_no: it.item_no || '—',
              original_description: it.raw_description || it.full_description,
              normalized_description: it.full_description,
              original_unit: it.unit || '—',
              normalized_unit: it.unit_norm || it.unit || '—',
              original_rate: it.rate_as_stated ?? it.rate_ex_gst,
              category: it.category || 'Other',
              reason,
            });
          }
        }
      }

      unmatchedRows.sort((a, b) => {
        if (a.source_state !== b.source_state) return a.source_state.localeCompare(b.source_state);
        return a.source_row - b.source_row;
      });

      const buffer = await generateComparisonWorkbookBuffer({
        tier1Rows: tier1Dataset.rows,
        tier2Rows: tier2Dataset.rows,
        availableStates: tier1Dataset.availableStates,
        referenceState: tier1Dataset.referenceState,
        categorySummaries: tier1Dataset.categorySummaries,
        insights,
        excludedItems,
        skippedRows,
        pendingAndConflicts,
        unmatchedRows,
      });

      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="State_SOR_Comparison_Report.xlsx"',
        },
      });
    }

    // 16. Admin Data Purge (Cleans live DB and in-memory caches)
    if (method === 'POST' && subPath === 'admin/purge') {
      const body = await req.json().catch(() => ({}));
      const testOnly = !!body.testOnly;
      const includeApprovedMappings = !!body.includeApprovedMappings;

      try {
        await purgeProjectData({ testOnly, includeApprovedMappings });
      } catch (dbErr) {
        console.warn('[SOR_DB_PURGE_WARN]', dbErr);
      }

      if (!testOnly) {
        memoryFiles.clear();
        memoryItems.clear();
        memorySkipped.clear();
        memoryFileBuffers.clear();
        memoryGroups.clear();
        memoryAuditLogs.length = 0;
      }

      return NextResponse.json({
        success: true,
        message: testOnly ? 'Test project data purged successfully' : 'All project data purged successfully',
      });
    }

    return NextResponse.json({ error: `Not found: ${subPath}` }, { status: 404 });
  } catch (err: any) {
    console.error('[SOR_COMPARISON_API_ERROR]', err);
    return NextResponse.json({ error: err.message || 'Internal server error in SOR comparison' }, { status: 500 });
  }
}

