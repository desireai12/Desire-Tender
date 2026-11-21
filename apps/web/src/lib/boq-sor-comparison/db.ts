// Database adapter for BOQ SOR Comparison module.
// Connects to PostgreSQL database via connection pool.
import { Pool } from 'pg';
import crypto from 'crypto';
import type {
  AuthorityMapping,
  DashboardMetricSummary,
  GstBasis,
  MatchClass,
  PaginatedResult,
  PaginationParams,
  ParsedItemAttributes,
  ReviewStatus,
  SkippedRowRecord,
  SorFileRecord,
  SorItemGroupMemberRecord,
  SorItemGroupRecord,
  SorItemRecord,
  SorMatchAuditRecord,
} from './types';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres.udwjptggvaavoemuvjbm:desireenergy%401234@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

export function isPersistentDbRequired(): boolean {
  if (process.env.SOR_PERSISTENCE_MODE === 'strict' || process.env.SOR_PERSISTENCE_MODE === 'db') {
    return true;
  }
  if (process.env.SOR_PERSISTENCE_MODE === 'memory' || process.env.SOR_PERSISTENCE_MODE === 'mock') {
    return false;
  }
  if (process.env.NODE_ENV === 'test' && !process.env.TEST_REAL_DB) {
    return false;
  }
  if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV) {
    return true;
  }
  if (process.env.DATABASE_URL && process.env.NODE_ENV !== 'test') {
    return true;
  }
  return false;
}

export function computeMappingHash(fullDesc: string, unit: string | null, stateName: string): string {
  const norm = `${(fullDesc || '').toLowerCase().replace(/[^a-z0-9]/g, '')}|${(unit || '').toLowerCase().trim()}|${(stateName || '').toLowerCase().trim()}`;
  return crypto.createHash('sha256').update(norm).digest('hex').slice(0, 32);
}

// 1. Files & Items Persistence
export async function saveFileRecord(file: SorFileRecord): Promise<SorFileRecord> {
  const db = getDbPool();
  try {
    // Attempt insert with complete versioning and fingerprinting schema
    await db.query(
      `INSERT INTO public.sor_files (
        id, filename, file_size, storage_path, detected_state, detection_confidence,
        state_confirmed, state_name, authority_code, sor_year, gst_basis,
        selected_sheet, header_row, total_rows, extracted_items_count, skipped_rows_count, status,
        content_fingerprint, document_key, version_number, parent_file_id, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      ON CONFLICT (id) DO UPDATE SET
        state_confirmed = EXCLUDED.state_confirmed,
        state_name = EXCLUDED.state_name,
        authority_code = EXCLUDED.authority_code,
        sor_year = EXCLUDED.sor_year,
        gst_basis = EXCLUDED.gst_basis,
        selected_sheet = EXCLUDED.selected_sheet,
        extracted_items_count = EXCLUDED.extracted_items_count,
        skipped_rows_count = EXCLUDED.skipped_rows_count,
        status = EXCLUDED.status,
        content_fingerprint = COALESCE(EXCLUDED.content_fingerprint, sor_files.content_fingerprint),
        document_key = COALESCE(EXCLUDED.document_key, sor_files.document_key),
        version_number = COALESCE(EXCLUDED.version_number, sor_files.version_number),
        parent_file_id = COALESCE(EXCLUDED.parent_file_id, sor_files.parent_file_id),
        is_active = COALESCE(EXCLUDED.is_active, sor_files.is_active);`,
      [
        file.id,
        file.filename,
        file.file_size || 0,
        file.storage_path || null,
        file.detected_state || null,
        file.detection_confidence || 'LOW',
        file.state_confirmed,
        file.state_name || null,
        file.authority_code || null,
        file.sor_year || null,
        file.gst_basis,
        file.selected_sheet || null,
        file.header_row || null,
        file.total_rows || 0,
        file.extracted_items_count,
        file.skipped_rows_count,
        file.status,
        file.content_fingerprint || null,
        file.document_key || null,
        file.version_number || 1,
        file.parent_file_id || null,
        file.is_active !== undefined ? file.is_active : true,
      ],
    );
    return file;
  } catch (err: any) {
    // Graceful recovery for PostgreSQL unique constraint collision (Code 23505)
    // Occurs when another concurrent instance wins the insert race with the identical content_fingerprint
    if (err?.code === '23505') {
      if (file.content_fingerprint) {
        console.warn(`[SOR_DB_RACE_DETECTED] Concurrent upload collision for hash ${file.content_fingerprint}. Fetching existing record.`);
        const existing = await findFileByFingerprint(file.content_fingerprint);
        if (existing) {
          return existing;
        }
      }
    }

    if (err?.code === '42703') {
      // Column does not exist in target database yet; fall back gracefully to legacy schema
      await db.query(
        `INSERT INTO public.sor_files (
          id, filename, file_size, storage_path, detected_state, detection_confidence,
          state_confirmed, state_name, authority_code, sor_year, gst_basis,
          selected_sheet, header_row, total_rows, extracted_items_count, skipped_rows_count, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (id) DO UPDATE SET
          state_confirmed = EXCLUDED.state_confirmed,
          state_name = EXCLUDED.state_name,
          authority_code = EXCLUDED.authority_code,
          sor_year = EXCLUDED.sor_year,
          gst_basis = EXCLUDED.gst_basis,
          selected_sheet = EXCLUDED.selected_sheet,
          extracted_items_count = EXCLUDED.extracted_items_count,
          skipped_rows_count = EXCLUDED.skipped_rows_count,
          status = EXCLUDED.status;`,
        [
          file.id,
          file.filename,
          file.file_size || 0,
          file.storage_path || null,
          file.detected_state || null,
          file.detection_confidence || 'LOW',
          file.state_confirmed,
          file.state_name || null,
          file.authority_code || null,
          file.sor_year || null,
          file.gst_basis,
          file.selected_sheet || null,
          file.header_row || null,
          file.total_rows || 0,
          file.extracted_items_count,
          file.skipped_rows_count,
          file.status,
        ],
      );
      return file;
    } else {
      throw err;
    }
  }
}

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

export async function saveExtractedItems(items: SorItemRecord[]): Promise<void> {
  if (items.length === 0) return;
  const db = getDbPool();

  const chunkSize = 50;
  for (let c = 0; c < items.length; c += chunkSize) {
    const chunk = items.slice(c, c + chunkSize);
    const valuePlaceholders: string[] = [];
    const values: any[] = [];
    let pIdx = 1;

    for (const item of chunk) {
      if (!item.id) {
        item.id = generateUUID();
      }
      const p: string[] = [];
      for (let i = 0; i < 24; i++) {
        p.push(`$${pIdx++}`);
      }
      valuePlaceholders.push(`(${p.join(', ')})`);
      values.push(
        item.id,
        item.file_id,
        item.state_name,
        item.item_no || null,
        item.raw_description,
        item.parent_description || null,
        item.section_heading || null,
        item.full_description,
        item.unit || null,
        item.unit_norm || null,
        item.quantity ?? null,
        item.rate_as_stated ?? null,
        item.rate_ex_gst ?? null,
        item.rate_incl_gst ?? null,
        item.gst_basis,
        item.amount ?? null,
        item.category || null,
        item.is_addon,
        item.is_percentage_based,
        item.is_lump_sum,
        item.rate_derived,
        item.flag_notes || null,
        item.sheet_name,
        item.source_row,
      );
    }

    const query = `INSERT INTO public.sor_items (
      id, file_id, state_name, item_no, raw_description, parent_description,
      section_heading, full_description, unit, unit_norm, quantity,
      rate_as_stated, rate_ex_gst, rate_incl_gst, gst_basis, amount,
      category, is_addon, is_percentage_based, is_lump_sum, rate_derived,
      flag_notes, sheet_name, source_row
    ) VALUES ${valuePlaceholders.join(', ')}
    ON CONFLICT (id) DO UPDATE SET
      rate_as_stated = EXCLUDED.rate_as_stated,
      rate_ex_gst = EXCLUDED.rate_ex_gst,
      rate_incl_gst = EXCLUDED.rate_incl_gst;`;

    await db.query(query, values);
  }
}

// 1B. Atomic File & Extracted Items Persistence (Phase 4.3.8.1 Transaction Protection)
export async function saveFileAndItemsAtomic(
  file: SorFileRecord,
  items: SorItemRecord[],
  siblingVersionsToDeactivate?: string[],
): Promise<SorFileRecord> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert/update the file record within transaction
    await client.query('SAVEPOINT sp_file_insert');
    try {
      await client.query(
        `INSERT INTO public.sor_files (
          id, filename, file_size, storage_path, detected_state, detection_confidence,
          state_confirmed, state_name, authority_code, sor_year, gst_basis,
          selected_sheet, header_row, total_rows, extracted_items_count, skipped_rows_count, status,
          content_fingerprint, document_key, version_number, parent_file_id, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        ON CONFLICT (id) DO UPDATE SET
          state_confirmed = EXCLUDED.state_confirmed,
          state_name = EXCLUDED.state_name,
          authority_code = EXCLUDED.authority_code,
          sor_year = EXCLUDED.sor_year,
          gst_basis = EXCLUDED.gst_basis,
          selected_sheet = EXCLUDED.selected_sheet,
          extracted_items_count = EXCLUDED.extracted_items_count,
          skipped_rows_count = EXCLUDED.skipped_rows_count,
          status = EXCLUDED.status,
          content_fingerprint = COALESCE(EXCLUDED.content_fingerprint, sor_files.content_fingerprint),
          document_key = COALESCE(EXCLUDED.document_key, sor_files.document_key),
          version_number = COALESCE(EXCLUDED.version_number, sor_files.version_number),
          parent_file_id = COALESCE(EXCLUDED.parent_file_id, sor_files.parent_file_id),
          is_active = COALESCE(EXCLUDED.is_active, sor_files.is_active);`,
        [
          file.id,
          file.filename,
          file.file_size || 0,
          file.storage_path || null,
          file.detected_state || null,
          file.detection_confidence || 'LOW',
          file.state_confirmed,
          file.state_name || null,
          file.authority_code || null,
          file.sor_year || null,
          file.gst_basis,
          file.selected_sheet || null,
          file.header_row || null,
          file.total_rows || 0,
          file.extracted_items_count,
          file.skipped_rows_count,
          file.status,
          file.content_fingerprint || null,
          file.document_key || null,
          file.version_number || 1,
          file.parent_file_id || null,
          file.is_active !== undefined ? file.is_active : true,
        ],
      );
      await client.query('RELEASE SAVEPOINT sp_file_insert');
    } catch (insertErr: any) {
      if (insertErr?.code === '23505' && file.content_fingerprint) {
        await client.query('ROLLBACK');
        const existing = await findFileByFingerprint(file.content_fingerprint);
        if (existing) return existing;
        throw insertErr;
      }
      if (insertErr?.code === '42703') {
        // Fallback for missing versioning columns on unmigrated database
        await client.query('ROLLBACK TO SAVEPOINT sp_file_insert');
        await client.query(
          `INSERT INTO public.sor_files (
            id, filename, file_size, storage_path, detected_state, detection_confidence,
            state_confirmed, state_name, authority_code, sor_year, gst_basis,
            selected_sheet, header_row, total_rows, extracted_items_count, skipped_rows_count, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (id) DO UPDATE SET
            state_confirmed = EXCLUDED.state_confirmed,
            state_name = EXCLUDED.state_name,
            authority_code = EXCLUDED.authority_code,
            sor_year = EXCLUDED.sor_year,
            gst_basis = EXCLUDED.gst_basis,
            selected_sheet = EXCLUDED.selected_sheet,
            extracted_items_count = EXCLUDED.extracted_items_count,
            skipped_rows_count = EXCLUDED.skipped_rows_count,
            status = EXCLUDED.status;`,
          [
            file.id,
            file.filename,
            file.file_size || 0,
            file.storage_path || null,
            file.detected_state || null,
            file.detection_confidence || 'LOW',
            file.state_confirmed,
            file.state_name || null,
            file.authority_code || null,
            file.sor_year || null,
            file.gst_basis,
            file.selected_sheet || null,
            file.header_row || null,
            file.total_rows || 0,
            file.extracted_items_count,
            file.skipped_rows_count,
            file.status,
          ],
        );
      } else {
        await client.query('ROLLBACK TO SAVEPOINT sp_file_insert');
        throw insertErr;
      }
    }

    // 2. If deactivating sibling versions (for revision uploads)
    if (siblingVersionsToDeactivate && siblingVersionsToDeactivate.length > 0) {
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      for (const sibId of siblingVersionsToDeactivate) {
        if (!sibId || typeof sibId !== 'string' || !UUID_REGEX.test(sibId)) {
          throw new Error(`Invalid UUID supplied for sibling deactivation: "${sibId}"`);
        }
      }

      await client.query('SAVEPOINT sp_deactivate_siblings');
      try {
        await client.query(
          `UPDATE public.sor_files SET is_active = false WHERE id = ANY($1::uuid[])`,
          [siblingVersionsToDeactivate],
        );
        await client.query('RELEASE SAVEPOINT sp_deactivate_siblings');
      } catch (deactErr: any) {
        await client.query('ROLLBACK TO SAVEPOINT sp_deactivate_siblings');
        if (deactErr?.code !== '42703') {
          throw deactErr;
        }
      }
    }

    // 3. Batch insert items within the same client transaction
    if (items.length > 0) {
      const chunkSize = 50;
      for (let c = 0; c < items.length; c += chunkSize) {
        const chunk = items.slice(c, c + chunkSize);
        const valuePlaceholders: string[] = [];
        const values: any[] = [];
        let pIdx = 1;

        for (const item of chunk) {
          if (!item.id) {
            item.id = generateUUID();
          }
          const p: string[] = [];
          for (let i = 0; i < 24; i++) {
            p.push(`$${pIdx++}`);
          }
          valuePlaceholders.push(`(${p.join(', ')})`);
          values.push(
            item.id,
            item.file_id,
            item.state_name,
            item.item_no || null,
            item.raw_description,
            item.parent_description || null,
            item.section_heading || null,
            item.full_description,
            item.unit || null,
            item.unit_norm || null,
            item.quantity ?? null,
            item.rate_as_stated ?? null,
            item.rate_ex_gst ?? null,
            item.rate_incl_gst ?? null,
            item.gst_basis,
            item.amount ?? null,
            item.category || null,
            item.is_addon,
            item.is_percentage_based,
            item.is_lump_sum,
            item.rate_derived,
            item.flag_notes || null,
            item.sheet_name,
            item.source_row,
          );
        }

        const query = `INSERT INTO public.sor_items (
          id, file_id, state_name, item_no, raw_description, parent_description,
          section_heading, full_description, unit, unit_norm, quantity,
          rate_as_stated, rate_ex_gst, rate_incl_gst, gst_basis, amount,
          category, is_addon, is_percentage_based, is_lump_sum, rate_derived,
          flag_notes, sheet_name, source_row
        ) VALUES ${valuePlaceholders.join(', ')}
        ON CONFLICT (id) DO UPDATE SET
          rate_as_stated = EXCLUDED.rate_as_stated,
          rate_ex_gst = EXCLUDED.rate_ex_gst,
          rate_incl_gst = EXCLUDED.rate_incl_gst;`;

        await client.query(query, values);
      }
    }

    await client.query('COMMIT');
    return file;
  } catch (err: any) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      console.warn('[DB_WARN] ROLLBACK failed in saveFileAndItemsAtomic:', rbErr);
    }
    throw err;
  } finally {
    client.release();
  }
}

// 2. Canonical Item Groups & Members Persistence
export async function saveCanonicalGroup(group: SorItemGroupRecord): Promise<void> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO public.sor_item_groups (id, canonical_name, category, canonical_unit, attributes, status, group_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         canonical_name = EXCLUDED.canonical_name,
         category = EXCLUDED.category,
         canonical_unit = EXCLUDED.canonical_unit,
         attributes = EXCLUDED.attributes,
         status = EXCLUDED.status,
         group_key = COALESCE(EXCLUDED.group_key, sor_item_groups.group_key),
         updated_at = NOW();`,
      [
        group.id,
        group.canonical_name,
        group.category,
        group.canonical_unit,
        JSON.stringify(group.attributes),
        group.status,
        group.group_key || null,
      ],
    );

    if (group.members && group.members.length > 0) {
      for (const member of group.members) {
        await client.query(
          `INSERT INTO public.sor_item_group_members (
            id, group_id, item_id, file_id, state_name, match_class, confidence,
            reasoning, warnings, review_status, reviewer_notes, reviewed_by, reviewed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (group_id, item_id) DO UPDATE SET
            match_class = EXCLUDED.match_class,
            confidence = EXCLUDED.confidence,
            reasoning = EXCLUDED.reasoning,
            warnings = EXCLUDED.warnings,
            review_status = EXCLUDED.review_status,
            reviewer_notes = EXCLUDED.reviewer_notes,
            reviewed_by = EXCLUDED.reviewed_by,
            reviewed_at = EXCLUDED.reviewed_at;`,
          [
            member.id,
            group.id,
            member.item_id,
            member.file_id,
            member.state_name,
            member.match_class,
            member.confidence,
            member.reasoning,
            member.warnings || [],
            member.review_status,
            member.reviewer_notes || null,
            member.reviewed_by || null,
            member.reviewed_at || null,
          ],
        );
      }
    }
    await client.query('COMMIT');
  } catch (err: any) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      console.warn('[DB_WARN] ROLLBACK failed in saveCanonicalGroup:', rbErr);
    }
    throw err;
  } finally {
    client.release();
  }
}

// 3. Approved Mappings Memory (Persisted by hash, reused on re-upload)
export async function persistApprovedMapping(
  fullDesc: string,
  unitNorm: string,
  stateName: string,
  groupId: string,
  canonicalName: string,
  matchClass: string,
  approvalStatus: string = 'approved',
  actor = 'reviewer',
  isTest = false,
): Promise<void> {
  const db = getDbPool();
  const hash = computeMappingHash(fullDesc, unitNorm, stateName);
  await db.query(
    `INSERT INTO public.sor_approved_mappings (
      mapping_hash, canonical_group_id, canonical_name, state_name,
      full_description, unit_norm, match_class, approval_status, approved_by, approved_at, is_test
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10)
    ON CONFLICT (mapping_hash) DO UPDATE SET
      canonical_group_id = EXCLUDED.canonical_group_id,
      canonical_name = EXCLUDED.canonical_name,
      match_class = EXCLUDED.match_class,
      approval_status = EXCLUDED.approval_status,
      approved_by = EXCLUDED.approved_by,
      approved_at = NOW(),
      is_test = EXCLUDED.is_test;`,
    [hash, groupId, canonicalName, stateName, fullDesc, unitNorm, matchClass, approvalStatus, actor, isTest],
  );
}

export async function getApprovedMapping(
  fullDesc: string,
  unitNorm: string,
  stateName: string,
): Promise<{ canonical_group_id: string; canonical_name: string; match_class: string; approval_status: string } | null> {
  const db = getDbPool();
  const hash = computeMappingHash(fullDesc, unitNorm, stateName);
  const res = await db.query(
    `SELECT canonical_group_id, canonical_name, match_class, approval_status
     FROM public.sor_approved_mappings
     WHERE mapping_hash = $1 LIMIT 1;`,
    [hash],
  );
  if (res.rows.length === 0) return null;
  return res.rows[0];
}

export async function getAllApprovedMappings(): Promise<Map<string, { canonical_group_id: string; canonical_name: string; match_class: string; approval_status: string }>> {
  const map = new Map<string, { canonical_group_id: string; canonical_name: string; match_class: string; approval_status: string }>();
  try {
    const db = getDbPool();
    const res = await db.query(
      `SELECT mapping_hash, canonical_group_id, canonical_name, match_class, approval_status
       FROM public.sor_approved_mappings`
    );
    for (const row of res.rows) {
      map.set(row.mapping_hash, row);
    }
  } catch (e) {
    console.error('Failed to get all approved mappings:', e);
  }
  return map;
}

export async function purgeProjectData(options: { testOnly?: boolean; includeApprovedMappings?: boolean } = {}): Promise<void> {
  const db = getDbPool();
  const where = options.testOnly ? 'WHERE is_test = true' : '';
  await db.query(`DELETE FROM public.sor_match_audit;`);
  await db.query(`DELETE FROM public.sor_item_group_members;`);
  await db.query(`DELETE FROM public.sor_item_groups ${where};`);
  if (options.includeApprovedMappings || !options.testOnly) {
    await db.query(`DELETE FROM public.sor_approved_mappings ${where};`);
  }
  await db.query(`DELETE FROM public.sor_items ${where};`);
  await db.query(`DELETE FROM public.sor_files ${where};`);
}

// 4. Audit Log Persistence
export async function logAuditAction(entry: SorMatchAuditRecord): Promise<void> {
  const db = getDbPool();
  const auditId = (entry.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entry.id))
    ? entry.id
    : generateUUID();
  await db.query(
    `INSERT INTO public.sor_match_audit (
      id, group_id, member_id, action, actor, old_value, new_value, notes, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW());`,
    [
      auditId,
      entry.group_id || null,
      entry.member_id || null,
      entry.action,
      entry.actor || 'reviewer',
      entry.old_value ? JSON.stringify(entry.old_value) : null,
      entry.new_value ? JSON.stringify(entry.new_value) : null,
      entry.notes || null,
    ],
  );
}

// 5. Query Audit Logs
export async function getAuditLogs(): Promise<SorMatchAuditRecord[]> {
  const db = getDbPool();
  const res = await db.query(
    `SELECT id, group_id, member_id, action, actor, old_value, new_value, notes, created_at
     FROM public.sor_match_audit
     ORDER BY created_at DESC LIMIT 100;`,
  );
  return res.rows;
}

// 6. Unit Conversion via sor_unit_map
export async function getUnitConversion(fromUnit: string, toUnit: string): Promise<{ factor: number; reason: string } | null> {
  const db = getDbPool();
  const res = await db.query(
    `SELECT conversion_factor, reason
     FROM public.sor_unit_map
     WHERE LOWER(source_unit) = LOWER($1) AND LOWER(canonical_unit) = LOWER($2) AND user_approved = true
     LIMIT 1;`,
    [fromUnit, toUnit],
  );
  if (res.rows.length === 0) return null;
  return {
    factor: res.rows[0].conversion_factor,
    reason: res.rows[0].reason || 'Standard dimensional unit conversion',
  };
}

export async function addUnitConversion(
  sourceUnit: string,
  canonicalUnit: string,
  dimension: string,
  factor: number,
  reason: string,
): Promise<void> {
  const db = getDbPool();
  await db.query(
    `INSERT INTO public.sor_unit_map (source_unit, canonical_unit, dimension, conversion_factor, reason, user_approved)
     VALUES ($1, $2, $3, $4, $5, true)
     ON CONFLICT (source_unit) DO UPDATE SET
       canonical_unit = EXCLUDED.canonical_unit,
       dimension = EXCLUDED.dimension,
       conversion_factor = EXCLUDED.conversion_factor,
       reason = EXCLUDED.reason,
       user_approved = true;`,
    [sourceUnit, canonicalUnit, dimension, factor, reason],
  );
}

// 7. DB Hydration Helpers
export async function loadFilesFromDb(): Promise<SorFileRecord[]> {
  const db = getDbPool();
  const res = await db.query(
    `SELECT * FROM public.sor_files WHERE is_test = false ORDER BY created_at ASC`
  );
  return res.rows.map((r: any) => ({
    id: r.id,
    filename: r.filename,
    file_size: r.file_size,
    storage_path: r.storage_path,
    detected_state: r.detected_state,
    detection_confidence: r.detection_confidence,
    state_confirmed: r.state_confirmed,
    state_name: r.state_name,
    authority_code: r.authority_code,
    sor_year: r.sor_year,
    gst_basis: r.gst_basis,
    selected_sheet: r.selected_sheet,
    header_row: r.header_row,
    total_rows: r.total_rows,
    extracted_items_count: r.extracted_items_count,
    skipped_rows_count: r.skipped_rows_count,
    status: r.status,
    content_fingerprint: r.content_fingerprint || undefined,
    document_key: r.document_key || undefined,
    version_number: r.version_number ? Number(r.version_number) : 1,
    parent_file_id: r.parent_file_id || undefined,
    is_active: r.is_active !== undefined ? Boolean(r.is_active) : true,
    created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
  }));
}

export async function findFileByFingerprint(fingerprint: string): Promise<SorFileRecord | null> {
  const db = getDbPool();
  try {
    const res = await db.query(
      `SELECT * FROM public.sor_files WHERE content_fingerprint = $1 AND is_test = false LIMIT 1`,
      [fingerprint],
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      filename: r.filename,
      file_size: r.file_size,
      storage_path: r.storage_path,
      detected_state: r.detected_state,
      detection_confidence: r.detection_confidence,
      state_confirmed: r.state_confirmed,
      state_name: r.state_name,
      authority_code: r.authority_code,
      sor_year: r.sor_year,
      gst_basis: r.gst_basis,
      selected_sheet: r.selected_sheet,
      header_row: r.header_row,
      total_rows: r.total_rows,
      extracted_items_count: r.extracted_items_count,
      skipped_rows_count: r.skipped_rows_count,
      status: r.status,
      content_fingerprint: r.content_fingerprint || undefined,
      document_key: r.document_key || undefined,
      version_number: r.version_number ? Number(r.version_number) : 1,
      parent_file_id: r.parent_file_id || undefined,
      is_active: r.is_active !== undefined ? Boolean(r.is_active) : true,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    };
  } catch {
    // If column doesn't exist yet, return null gracefully
    return null;
  }
}

export async function setActiveVersionInDb(fileId: string, documentKey: string): Promise<void> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Transaction-scoped PostgreSQL advisory lock using 64-bit hashtextextended
    // Serializes activation requests per document key, even when 0 version rows exist
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [documentKey]);

    // 2. Target File Validation:
    // Verify target file exists, belongs to the requested document_key, and is not a test record
    const targetCheck = await client.query(
      `SELECT id, document_key, is_test 
       FROM public.sor_files 
       WHERE id = $1 AND document_key = $2 AND is_test = false`,
      [fileId, documentKey],
    );

    if (targetCheck.rows.length === 0) {
      throw new Error(
        `Target file "${fileId}" does not exist, is a test record, or does not belong to logical document key "${documentKey}".`
      );
    }

    // 3. Deactivate all existing active versions within this confirmed document key only
    await client.query(
      `UPDATE public.sor_files 
       SET is_active = false 
       WHERE document_key = $1 AND is_test = false`,
      [documentKey],
    );

    // 4. Activate target file asserting id and document_key together
    const updateRes = await client.query(
      `UPDATE public.sor_files 
       SET is_active = true 
       WHERE id = $1 AND document_key = $2 AND is_test = false`,
      [fileId, documentKey],
    );

    if (updateRes.rowCount !== 1) {
      throw new Error(
        `Failed to activate target file "${fileId}": expected exactly 1 updated record, got ${updateRes.rowCount}.`
      );
    }

    await client.query('COMMIT');
  } catch (err: any) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      console.warn('[DB_WARN] ROLLBACK failed:', rbErr);
    }
    // Propagate transaction failures to calling API route
    throw err;
  } finally {
    // Dedicated client must always be released back to the pool
    client.release();
  }
}

// 8. Dynamic Authority Mappings Persistence
export async function saveAuthorityMappingToDb(mapping: AuthorityMapping): Promise<void> {
  const db = getDbPool();
  try {
    await db.query(
      `INSERT INTO public.sor_authority_registry (
        authority_code, authority_name, state_name, department_type,
        keywords, supported_sor_years, is_central_agency, is_custom, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
      ON CONFLICT (authority_code) DO UPDATE SET
        authority_name = EXCLUDED.authority_name,
        state_name = EXCLUDED.state_name,
        department_type = EXCLUDED.department_type,
        keywords = EXCLUDED.keywords,
        supported_sor_years = EXCLUDED.supported_sor_years,
        is_central_agency = EXCLUDED.is_central_agency,
        updated_at = NOW()
      WHERE sor_authority_registry.is_custom = true;`,
      [
        mapping.authority_code.trim().toUpperCase(),
        mapping.authority_name.trim(),
        mapping.state_name.trim(),
        mapping.department_type || 'General',
        mapping.keywords || [mapping.authority_code.toLowerCase()],
        mapping.supported_sor_years || [],
        Boolean(mapping.is_central_agency),
      ],
    );
  } catch (err) {
    // If table does not exist yet, log warning and let in-memory registry handle it
    console.warn('[DB_WARN] saveAuthorityMappingToDb failed (table may not exist yet):', err);
  }
}

export async function loadAuthorityMappingsFromDb(): Promise<AuthorityMapping[]> {
  const db = getDbPool();
  try {
    const res = await db.query(
      `SELECT authority_code, authority_name, state_name, department_type,
              keywords, supported_sor_years, is_central_agency, is_custom
       FROM public.sor_authority_registry
       ORDER BY authority_code ASC`
    );
    return res.rows.map((r: any) => ({
      authority_code: r.authority_code,
      authority_name: r.authority_name,
      state_name: r.state_name,
      department_type: r.department_type,
      keywords: Array.isArray(r.keywords) ? r.keywords : [],
      supported_sor_years: Array.isArray(r.supported_sor_years) ? r.supported_sor_years : [],
      is_central_agency: Boolean(r.is_central_agency),
      is_custom: Boolean(r.is_custom),
    }));
  } catch {
    return [];
  }
}

export async function loadExtractedItemsFromDb(): Promise<SorItemRecord[]> {
  const db = getDbPool();
  const res = await db.query(
    `SELECT * FROM public.sor_items WHERE is_test = false ORDER BY source_row ASC`
  );
  return res.rows.map((r: any) => ({
    id: r.id,
    file_id: r.file_id,
    state_name: r.state_name,
    item_no: r.item_no,
    raw_description: r.raw_description,
    parent_description: r.parent_description,
    section_heading: r.section_heading,
    full_description: r.full_description,
    unit: r.unit,
    unit_norm: r.unit_norm,
    quantity: r.quantity !== null ? Number(r.quantity) : null,
    rate_as_stated: r.rate_as_stated !== null ? Number(r.rate_as_stated) : null,
    rate_ex_gst: r.rate_ex_gst !== null ? Number(r.rate_ex_gst) : null,
    rate_incl_gst: r.rate_incl_gst !== null ? Number(r.rate_incl_gst) : null,
    gst_basis: r.gst_basis,
    amount: r.amount !== null ? Number(r.amount) : null,
    category: r.category,
    is_addon: r.is_addon,
    is_percentage_based: r.is_percentage_based,
    is_lump_sum: r.is_lump_sum,
    rate_derived: r.rate_derived,
    flag_notes: r.flag_notes,
    sheet_name: r.sheet_name,
    source_row: r.source_row,
  }));
}

export async function loadSkippedRowsFromDb(): Promise<(SkippedRowRecord & { filename?: string })[]> {
  const db = getDbPool();
  try {
    const res = await db.query(
      `SELECT s.id, s.file_id, s.sheet_name, s.source_row, s.raw_data, s.skip_reason, f.filename
       FROM public.sor_skipped_rows s
       LEFT JOIN public.sor_files f ON s.file_id = f.id
       ORDER BY s.file_id, s.source_row ASC`
    );
    return res.rows.map((r: any) => ({
      id: r.id,
      file_id: r.file_id,
      filename: r.filename,
      sheet_name: r.sheet_name,
      source_row: r.source_row,
      raw_data: r.raw_data || {},
      skip_reason: r.skip_reason,
    }));
  } catch (e) {
    console.error('Failed to load skipped rows from DB:', e);
    return [];
  }
}

// 9. High-Performance Paginated Queries & Aggregations (Phase 4.3 & 4.3.2)

/**
 * Server-side paginated retrieval of uploaded SOR files with filtering and sorting.
 */
export async function getPaginatedFilesFromDb(params: PaginationParams): Promise<PaginatedResult<SorFileRecord>> {
  const db = getDbPool();
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(params.pageSize) || 25));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = ['f.is_test = false'];
  const values: any[] = [];
  let paramIdx = 1;

  if (params.stateFilter && params.stateFilter !== 'all') {
    conditions.push(`LOWER(f.state_name) = LOWER($${paramIdx++})`);
    values.push(params.stateFilter.trim());
  }
  if (params.search && params.search.trim()) {
    conditions.push(`(f.filename ILIKE $${paramIdx} OR f.document_key ILIKE $${paramIdx} OR f.authority_code ILIKE $${paramIdx})`);
    paramIdx++;
    values.push(`%${params.search.trim()}%`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countRes = await db.query(
    `SELECT count(*)::int as total FROM public.sor_files f ${whereClause}`,
    values,
  );
  const total = countRes.rows[0]?.total || 0;

  const filesQuery = `
    SELECT f.*
    FROM public.sor_files f
    ${whereClause}
    ORDER BY f.created_at DESC, f.id ASC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++}
  `;
  const filesRes = await db.query(filesQuery, [...values, pageSize, offset]);

  const files: SorFileRecord[] = filesRes.rows.map((r: any) => ({
    id: r.id,
    filename: r.filename,
    file_size: r.file_size,
    storage_path: r.storage_path,
    detected_state: r.detected_state,
    detection_confidence: r.detection_confidence,
    state_confirmed: r.state_confirmed,
    state_name: r.state_name,
    authority_code: r.authority_code,
    sor_year: r.sor_year,
    discipline: r.discipline,
    document_title: r.document_title,
    tender_reference: r.tender_reference,
    detected_sor_year_raw: r.detected_sor_year_raw,
    is_revision: r.is_revision,
    revision_confirmed: r.revision_confirmed,
    gst_basis: r.gst_basis,
    selected_sheet: r.selected_sheet,
    header_row: r.header_row,
    total_rows: r.total_rows,
    extracted_items_count: r.extracted_items_count,
    skipped_rows_count: r.skipped_rows_count,
    status: r.status,
    content_fingerprint: r.content_fingerprint || undefined,
    document_key: r.document_key || undefined,
    version_number: r.version_number ? Number(r.version_number) : 1,
    parent_file_id: r.parent_file_id || undefined,
    is_active: r.is_active !== undefined ? Boolean(r.is_active) : true,
    created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
  }));

  const totalPages = Math.ceil(total / pageSize);
  return {
    data: files,
    pagination: {
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Server-side paginated retrieval of BOQ items with indexed filtering and deterministic sorting.
 * Consistently filters for active non-test document versions.
 */
export async function getPaginatedItemsFromDb(params: PaginationParams): Promise<PaginatedResult<SorItemRecord>> {
  const db = getDbPool();
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(params.pageSize) || 25));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = ['i.is_test = false', 'f.is_active = true', 'f.is_test = false'];
  const values: any[] = [];
  let paramIdx = 1;

  if (params.stateFilter && params.stateFilter !== 'all') {
    conditions.push(`LOWER(i.state_name) = LOWER($${paramIdx++})`);
    values.push(params.stateFilter.trim());
  }
  if (params.categoryFilter && params.categoryFilter !== 'all') {
    conditions.push(`LOWER(i.category) = LOWER($${paramIdx++})`);
    values.push(params.categoryFilter.trim());
  }
  if (params.search && params.search.trim()) {
    conditions.push(`(i.raw_description ILIKE $${paramIdx} OR i.full_description ILIKE $${paramIdx} OR i.item_no ILIKE $${paramIdx})`);
    paramIdx++;
    values.push(`%${params.search.trim()}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Allowed sort columns
  const sortMap: Record<string, string> = {
    source_row: 'i.source_row',
    state_name: 'i.state_name',
    rate_ex_gst: 'i.rate_ex_gst',
    item_no: 'i.item_no',
    category: 'i.category',
  };
  const sortCol = sortMap[params.sortBy || 'source_row'] || 'i.source_row';
  const sortDir = params.sortOrder === 'desc' ? 'DESC' : 'ASC';

  // Count total matching
  const countRes = await db.query(
    `SELECT count(*)::int as total 
     FROM public.sor_items i 
     JOIN public.sor_files f ON i.file_id = f.id 
     ${whereClause}`,
    values,
  );
  const total = countRes.rows[0]?.total || 0;

  // Fetch only requested slice with deterministic tie-breaker (id)
  const dataQuery = `
    SELECT i.id, i.file_id, i.state_name, i.item_no, i.raw_description, i.parent_description,
           i.section_heading, i.full_description, i.unit, i.unit_norm, i.quantity,
           i.rate_as_stated, i.rate_ex_gst, i.rate_incl_gst, i.gst_basis, i.amount,
           i.category, i.is_addon, i.is_percentage_based, i.is_lump_sum, i.rate_derived,
           i.flag_notes, i.sheet_name, i.source_row
    FROM public.sor_items i
    JOIN public.sor_files f ON i.file_id = f.id
    ${whereClause}
    ORDER BY ${sortCol} ${sortDir}, i.id ASC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++}
  `;
  const dataValues = [...values, pageSize, offset];
  const dataRes = await db.query(dataQuery, dataValues);

  const items = dataRes.rows.map((r: any) => ({
    id: r.id,
    file_id: r.file_id,
    state_name: r.state_name,
    item_no: r.item_no,
    raw_description: r.raw_description,
    parent_description: r.parent_description,
    section_heading: r.section_heading,
    full_description: r.full_description,
    unit: r.unit,
    unit_norm: r.unit_norm,
    quantity: r.quantity !== null ? Number(r.quantity) : null,
    rate_as_stated: r.rate_as_stated !== null ? Number(r.rate_as_stated) : null,
    rate_ex_gst: r.rate_ex_gst !== null ? Number(r.rate_ex_gst) : null,
    rate_incl_gst: r.rate_incl_gst !== null ? Number(r.rate_incl_gst) : null,
    gst_basis: r.gst_basis,
    amount: r.amount !== null ? Number(r.amount) : null,
    category: r.category,
    is_addon: r.is_addon,
    is_percentage_based: r.is_percentage_based,
    is_lump_sum: r.is_lump_sum,
    rate_derived: r.rate_derived,
    flag_notes: r.flag_notes,
    sheet_name: r.sheet_name,
    source_row: r.source_row,
  }));

  const totalPages = Math.ceil(total / pageSize);
  return {
    data: items,
    pagination: {
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Server-side paginated retrieval of canonical item groups and their members.
 * Supports categoryFilter, classFilter, conflictsOnly, and active file version isolation.
 */
export async function getPaginatedGroupsFromDb(params: PaginationParams): Promise<PaginatedResult<SorItemGroupRecord>> {
  const db = getDbPool();
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(params.pageSize) || 25));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [
    "g.status = 'active'",
    'g.is_test = false',
    `EXISTS (
      SELECT 1 FROM public.sor_item_group_members m 
      JOIN public.sor_files f ON m.file_id = f.id 
      WHERE m.group_id = g.id 
        AND f.is_active = true 
        AND f.is_test = false
    )`,
  ];
  const values: any[] = [];
  let paramIdx = 1;

  if (params.categoryFilter && params.categoryFilter !== 'all') {
    conditions.push(`LOWER(g.category) = LOWER($${paramIdx++})`);
    values.push(params.categoryFilter.trim());
  }
  if (params.search && params.search.trim()) {
    conditions.push(`(g.canonical_name ILIKE $${paramIdx} OR g.group_key ILIKE $${paramIdx})`);
    paramIdx++;
    values.push(`%${params.search.trim()}%`);
  }
  if (params.classFilter && params.classFilter !== 'all') {
    conditions.push(
      `EXISTS (
        SELECT 1 FROM public.sor_item_group_members m 
        JOIN public.sor_files f ON m.file_id = f.id 
        WHERE m.group_id = g.id 
          AND LOWER(m.match_class) = LOWER($${paramIdx++}) 
          AND f.is_active = true 
          AND f.is_test = false
      )`
    );
    values.push(params.classFilter.trim());
  }
  if (params.conflictsOnly) {
    conditions.push(
      `EXISTS (
        SELECT 1 FROM public.sor_item_group_members m 
        JOIN public.sor_files f ON m.file_id = f.id 
        WHERE m.group_id = g.id 
          AND m.state_rate_status = 'state_rate_conflict' 
          AND f.is_active = true 
          AND f.is_test = false
      )`
    );
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countRes = await db.query(
    `SELECT count(*)::int as total FROM public.sor_item_groups g ${whereClause}`,
    values,
  );
  const total = countRes.rows[0]?.total || 0;

  // Retrieve groups
  const groupsQuery = `
    SELECT g.id, g.canonical_name, g.category, g.canonical_unit, g.attributes, g.status, g.group_key, g.created_at
    FROM public.sor_item_groups g
    ${whereClause}
    ORDER BY g.canonical_name ASC, g.id ASC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++}
  `;
  const groupsRes = await db.query(groupsQuery, [...values, pageSize, offset]);

  // Fetch members for these groups in a single batch query, filtering for active file versions only
  const groupIds = groupsRes.rows.map((r: any) => r.id);
  const membersByGroup = new Map<string, SorItemGroupMemberRecord[]>();

  if (groupIds.length > 0) {
    const memRes = await db.query(
      `SELECT m.*, i.raw_description, i.full_description, i.unit_norm, i.unit, i.rate_ex_gst, i.rate_as_stated, i.source_row
       FROM public.sor_item_group_members m
       JOIN public.sor_files f ON m.file_id = f.id
       LEFT JOIN public.sor_items i ON m.item_id = i.id
       WHERE m.group_id = ANY($1) AND f.is_active = true AND f.is_test = false
       ORDER BY m.state_name ASC, m.id ASC`,
      [groupIds],
    );

    for (const row of memRes.rows) {
      const list = membersByGroup.get(row.group_id) || [];
      list.push({
        id: row.id,
        group_id: row.group_id,
        item_id: row.item_id,
        file_id: row.file_id,
        state_name: row.state_name,
        match_class: row.match_class,
        confidence: Number(row.confidence) || 0,
        reasoning: row.reasoning,
        warnings: row.warnings || [],
        review_status: row.review_status,
        reviewer_notes: row.reviewer_notes,
        reviewed_by: row.reviewed_by,
        reviewed_at: row.reviewed_at,
        state_rate_status: row.state_rate_status,
        selected_rate_ex_gst: row.selected_rate_ex_gst !== null ? Number(row.selected_rate_ex_gst) : null,
        item: {
          id: row.item_id,
          file_id: row.file_id,
          state_name: row.state_name,
          item_no: row.item_no || null,
          raw_description: row.raw_description || '',
          parent_description: null,
          section_heading: null,
          full_description: row.full_description || '',
          unit: row.unit || null,
          unit_norm: row.unit_norm || null,
          quantity: null,
          rate_as_stated: row.rate_as_stated !== null ? Number(row.rate_as_stated) : null,
          rate_ex_gst: row.rate_ex_gst !== null ? Number(row.rate_ex_gst) : null,
          rate_incl_gst: null,
          gst_basis: 'ex_gst',
          amount: null,
          category: null,
          is_addon: false,
          is_percentage_based: false,
          is_lump_sum: false,
          rate_derived: false,
          sheet_name: '',
          source_row: row.source_row || 0,
        },
      });
      membersByGroup.set(row.group_id, list);
    }
  }

  const groups: SorItemGroupRecord[] = groupsRes.rows.map((r: any) => ({
    id: r.id,
    canonical_name: r.canonical_name,
    category: r.category,
    canonical_unit: r.canonical_unit,
    attributes: r.attributes || {},
    status: r.status,
    group_key: r.group_key,
    created_at: r.created_at,
    members: membersByGroup.get(r.id) || [],
  }));

  const totalPages = Math.ceil(total / pageSize);
  return {
    data: groups,
    pagination: {
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Server-side high performance aggregation for Dashboard metrics (avoids downloading all rows).
 * Accurately calculates Tier 1 vs Tier 2 according to comparisonEngine cross-state business rules
 * and excludes inactive document versions and test records.
 */
export async function getDashboardMetricsFromDb(): Promise<DashboardMetricSummary> {
  const db = getDbPool();
  try {
    // 1. Total items, files, and state counts (joining active non-test files)
    const stateCountsRes = await db.query(
      `SELECT i.state_name, count(*)::int as count
       FROM public.sor_items i
       JOIN public.sor_files f ON i.file_id = f.id
       WHERE i.is_test = false AND f.is_test = false AND f.is_active = true AND i.state_name IS NOT NULL
       GROUP BY i.state_name
       ORDER BY count DESC`
    );

    const stateCounts: Record<string, number> = {};
    let totalItems = 0;
    const statesList: string[] = [];

    for (const r of stateCountsRes.rows) {
      stateCounts[r.state_name] = r.count;
      totalItems += r.count;
      statesList.push(r.state_name);
    }

    // 2. Active files count
    const filesCountRes = await db.query(
      `SELECT count(*)::int as total FROM public.sor_files WHERE is_test = false AND is_active = true`
    );
    const totalFiles = filesCountRes.rows[0]?.total || 0;

    // 3. Category distribution (joining active non-test files)
    const catRes = await db.query(
      `SELECT i.category, count(*)::int as count
       FROM public.sor_items i
       JOIN public.sor_files f ON i.file_id = f.id
       WHERE i.is_test = false AND f.is_test = false AND f.is_active = true AND i.category IS NOT NULL
       GROUP BY i.category
       ORDER BY count DESC`
    );

    const categoryDistribution = catRes.rows.map((r: any) => ({
      category: r.category,
      count: r.count,
      percentage: totalItems > 0 ? Number(((r.count / totalItems) * 100).toFixed(1)) : 0,
    }));

    // 4. Active Groups count (excludes orphaned groups with only inactive or test file members)
    const groupCountRes = await db.query(
      `SELECT count(*)::int as total 
       FROM public.sor_item_groups g 
       WHERE g.status = 'active' 
         AND g.is_test = false
         AND EXISTS (
           SELECT 1 FROM public.sor_item_group_members m 
           JOIN public.sor_files f ON m.file_id = f.id 
           WHERE m.group_id = g.id 
             AND f.is_active = true 
             AND f.is_test = false
         )`
    );
    const totalGroups = groupCountRes.rows[0]?.total || 0;

    // 5. Tier counts & review states: strictly following comparisonEngine.ts rules
    // Cross-state (>= 2 states) required; Tier 1 requires all approved qualifying states to be Strong;
    // Tier 2 if any approved qualifying state is Conditional.
    const reviewRes = await db.query(
      `WITH active_members AS (
         SELECT m.group_id, m.state_name, m.match_class, m.review_status, m.state_rate_status,
                COALESCE(m.selected_rate_ex_gst, i.rate_ex_gst) as eff_rate
         FROM public.sor_item_group_members m
         JOIN public.sor_files f ON m.file_id = f.id
         LEFT JOIN public.sor_items i ON m.item_id = i.id
         JOIN public.sor_item_groups g ON m.group_id = g.id
         WHERE f.is_active = true AND f.is_test = false AND g.status = 'active' AND g.is_test = false
       ),
       group_eval AS (
         SELECT group_id,
                count(DISTINCT state_name) as proposal_states,
                bool_or(review_status = 'pending') as is_pending,
                bool_or(state_rate_status = 'state_rate_conflict') as is_conflict,
                count(DISTINCT CASE WHEN review_status = 'approved' AND state_rate_status != 'state_rate_conflict' AND eff_rate > 0 AND match_class IN ('Strong', 'Conditional') THEN state_name END) as qualifying_states,
                bool_or(review_status = 'approved' AND state_rate_status != 'state_rate_conflict' AND eff_rate > 0 AND match_class = 'Conditional') as has_conditional
         FROM active_members
         GROUP BY group_id
       )
       SELECT 
         count(CASE WHEN qualifying_states >= 2 AND NOT has_conditional THEN 1 END)::int as tier1,
         count(CASE WHEN qualifying_states >= 2 AND has_conditional THEN 1 END)::int as tier2,
         count(CASE WHEN proposal_states >= 2 AND is_pending THEN 1 END)::int as pending_reviews,
         count(CASE WHEN proposal_states >= 2 AND is_conflict THEN 1 END)::int as conflicts
       FROM group_eval`
    );

    const tier1Count = reviewRes.rows[0]?.tier1 || 0;
    const tier2Count = reviewRes.rows[0]?.tier2 || 0;
    const pendingReviewCount = reviewRes.rows[0]?.pending_reviews || 0;
    const conflictCount = reviewRes.rows[0]?.conflicts || 0;

    return {
      totalItems,
      totalGroups,
      totalStates: statesList.length,
      statesList,
      totalFiles,
      tier1Count,
      tier2Count,
      conflictCount,
      pendingReviewCount,
      stateCounts,
      categoryDistribution,
    };
  } catch (err) {
    console.warn('[DB_METRICS_WARN] Falling back to default empty metrics:', err);
    return {
      totalItems: 0,
      totalGroups: 0,
      totalStates: 0,
      statesList: [],
      totalFiles: 0,
      tier1Count: 0,
      tier2Count: 0,
      conflictCount: 0,
      pendingReviewCount: 0,
      stateCounts: {},
      categoryDistribution: [],
    };
  }
}
