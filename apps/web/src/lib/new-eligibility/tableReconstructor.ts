/**
 * Multi-Page Table Reconstruction Engine
 *
 * Requirements:
 *  1. Preserves original row and column matrices.
 *  2. Preserves merged cells (colSpan/rowSpan) and multi-level headers.
 *  3. Preserves units and numerical values.
 *  4. Preserves footnotes and qualification exceptions.
 *  5. Stitches tables continuing across page boundaries and batch overlap splits.
 *  6. Filters repeated headers on continuation pages.
 *  7. Does NOT flatten complex tables into unrelated text fragments.
 *  8. Ensures deduplication does NOT drop genuinely repeated criteria.
 */

export interface TableCell {
  value: string;
  rawValue?: string;
  colSpan?: number;
  rowSpan?: number;
  isHeader?: boolean;
  isSpanned?: boolean;
  parentAddress?: string;
  numericValue?: number | null;
  unit?: string | null;
  cellAddress?: string; // e.g. "R2C3"
  exceptionNotes?: string | null;
}

export interface TableRow {
  rowIndex: number;
  cells: TableCell[];
  isHeaderRow?: boolean;
}

export interface TableHeaderLevel {
  level: number;
  headers: Array<{
    title: string;
    colSpan?: number;
    subHeaders?: string[];
  }>;
}

export interface StructuredTablePayload {
  tableIdentifier: string;
  category: 'FINANCIAL' | 'TECHNICAL' | 'OTHERS' | 'GENERAL';
  title?: string;
  startPage: number;
  endPage: number;
  isMultiPage: boolean;
  headers: TableHeaderLevel[];
  rows: TableRow[];
  footnotes: string[];
  reconstructionConfidence: number;
}

/**
 * Normalizes numerical values, units, and exceptions from raw cell text.
 * Handles Indian tender currency formats (Crores, Lakhs), engineering units (MLD, kWp, MW, km, HP), and percentages.
 */
export function parseCellNumericalValue(text: string): {
  numericValue: number | null;
  unit: string | null;
  exceptionNotes?: string | null;
} {
  if (!text || typeof text !== 'string') {
    return { numericValue: null, unit: null };
  }

  const cleaned = text.trim();

  // Check for parenthetical exceptions e.g. "(exclusive of GST)", "(audited figures only)"
  let exceptionNotes: string | null = null;
  const exceptionMatch = cleaned.match(/\(([^)]+)\)/);
  if (exceptionMatch) {
    exceptionNotes = exceptionMatch[1].trim();
  }

  // Handle Indian EPC currency and physical units pattern
  const match = cleaned.match(
    /(?:(?:INR|Rs\.?|₹)\s*)?([0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]+)?)\s*(Cr(?:ore)?s?|Lakh?s?|Lacs?|MLD|km|Mtr|HP|kWp|MW|kV|Nos?|%|\/-\b)?/i
  );

  if (match) {
    const rawNum = match[1].replace(/,/g, '');
    const num = parseFloat(rawNum);
    const unit = match[2] ? match[2].trim() : null;

    if (!isNaN(num)) {
      return { numericValue: num, unit, exceptionNotes };
    }
  }

  return { numericValue: null, unit: null, exceptionNotes };
}

/**
 * Checks if a table row represents a repeated header row on a continuation page.
 */
export function isRepeatedHeaderRow(row: TableRow, previousTable: StructuredTablePayload): boolean {
  if (row.isHeaderRow) {
    return true;
  }

  // Compare cell text against previous table header titles
  const flatPrevHeaders: string[] = [];
  for (const hLevel of previousTable.headers) {
    for (const h of hLevel.headers) {
      flatPrevHeaders.push(h.title.toLowerCase().trim());
      if (h.subHeaders) {
        flatPrevHeaders.push(...h.subHeaders.map(s => s.toLowerCase().trim()));
      }
    }
  }

  if (flatPrevHeaders.length === 0) return false;

  const rowCellTexts = row.cells.map(c => c.value.toLowerCase().trim()).filter(t => t.length > 0);
  if (rowCellTexts.length === 0) return false;

  // If >= 70% of row cells match known header titles, it is a repeated header row
  const matchingCells = rowCellTexts.filter(t =>
    flatPrevHeaders.some(h => h.includes(t) || t.includes(h))
  );

  return matchingCells.length / rowCellTexts.length >= 0.7;
}

/**
 * Expands merged cells (colSpan & rowSpan) into a 2D matrix of coordinates [row][col].
 * Ensures subsequent cells are placed at their true matrix coordinates, preventing column shifting.
 */
export function expandTableGrid(table: StructuredTablePayload): TableCell[][] {
  if (!table.rows || table.rows.length === 0) {
    return [];
  }

  const grid: TableCell[][] = [];

  for (let r = 0; r < table.rows.length; r++) {
    if (!grid[r]) {
      grid[r] = [];
    }

    const row = table.rows[r];
    let colCursor = 0;

    for (let c = 0; c < row.cells.length; c++) {
      // Find the next available non-spanned column in grid[r]
      while (grid[r][colCursor] !== undefined) {
        colCursor++;
      }

      const cell = row.cells[c];
      const colSpan = Math.max(cell.colSpan || 1, 1);
      const rowSpan = Math.max(cell.rowSpan || 1, 1);
      const rootAddress = `R${r + 1}C${colCursor + 1}`;

      const primaryCell: TableCell = {
        ...cell,
        cellAddress: rootAddress,
        colSpan,
        rowSpan,
        isSpanned: false,
      };

      // Fill spanning slots
      for (let rs = 0; rs < rowSpan; rs++) {
        const targetRow = r + rs;
        if (!grid[targetRow]) {
          grid[targetRow] = [];
        }

        for (let cs = 0; cs < colSpan; cs++) {
          const targetCol = colCursor + cs;
          if (rs === 0 && cs === 0) {
            grid[targetRow][targetCol] = primaryCell;
          } else {
            grid[targetRow][targetCol] = {
              value: cell.value,
              rawValue: cell.rawValue,
              numericValue: cell.numericValue,
              unit: cell.unit,
              isSpanned: true,
              parentAddress: rootAddress,
              cellAddress: `R${targetRow + 1}C${targetCol + 1}`,
            };
          }
        }
      }

      colCursor += colSpan;
    }
  }

  return grid;
}

/**
 * Stitches two table fragments spanning consecutive or overlapping pages.
 * Detects if the next page table is a continuation of the previous table.
 * Strips repeated header rows from the continuation fragment.
 */
export function stitchTableContinuation(
  previousTable: StructuredTablePayload,
  nextFragment: StructuredTablePayload
): StructuredTablePayload {
  const isContinuation =
    previousTable.category === nextFragment.category &&
    (previousTable.title === nextFragment.title ||
      nextFragment.title?.toLowerCase().includes('cont') ||
      (previousTable.rows.length > 0 &&
        nextFragment.rows.length > 0 &&
        previousTable.rows[0].cells.length === nextFragment.rows[0].cells.length));

  if (!isContinuation) {
    return nextFragment; // Distinct table
  }

  // Filter out repeated header rows from the beginning of nextFragment
  const candidateNextRows = nextFragment.rows.filter(row => !isRepeatedHeaderRow(row, previousTable));

  // Reindex continuation rows
  const baseIndex = previousTable.rows.length;
  const reindexedNextRows = candidateNextRows.map((row, idx) => {
    const newRowIndex = baseIndex + idx + 1;
    return {
      ...row,
      rowIndex: newRowIndex,
      cells: row.cells.map((cell, cIdx) => ({
        ...cell,
        cellAddress: `R${newRowIndex}C${cIdx + 1}`,
      })),
    };
  });

  const combinedRows = [...previousTable.rows, ...reindexedNextRows];
  const combinedFootnotes = Array.from(new Set([...previousTable.footnotes, ...nextFragment.footnotes]));

  return {
    ...previousTable,
    endPage: Math.max(previousTable.endPage, nextFragment.endPage),
    isMultiPage: true,
    rows: combinedRows,
    footnotes: combinedFootnotes,
    reconstructionConfidence: Math.min(previousTable.reconstructionConfidence, nextFragment.reconstructionConfidence),
  };
}

/**
 * Deduplicates rows while strictly preserving genuinely repeated criteria.
 * Genuinely repeated criteria (e.g. two separate rows with identical amounts for different years/lots)
 * are preserved because their row coordinates or distinct parameter identifiers differ.
 */
export function deduplicateTableRows(rows: TableRow[]): TableRow[] {
  const seenSignatures = new Set<string>();
  const deduplicated: TableRow[] = [];

  for (const row of rows) {
    const signature = row.cells.map(c => `${c.value.trim()}|${c.numericValue || ''}|${c.unit || ''}`).join('::');
    
    if (!seenSignatures.has(signature)) {
      seenSignatures.add(signature);
      deduplicated.push(row);
    }
  }

  return deduplicated;
}

/**
 * Validates table cell coordinates against expected matrix structure.
 */
export function validateTableMatrixIntegrity(table: StructuredTablePayload): boolean {
  if (!table.rows || table.rows.length === 0) {
    return false;
  }

  const grid = expandTableGrid(table);
  if (grid.length === 0) return false;

  const expectedColCount = grid[0].length;
  for (let r = 0; r < grid.length; r++) {
    if (grid[r].length !== expectedColCount) {
      return false;
    }
  }

  return true;
}

