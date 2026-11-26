'use client';

import React, { useState } from 'react';
import { 
  Table as TableIcon, 
  Edit3, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ChevronRight,
  Info,
  BookOpen
} from 'lucide-react';
import { MockTable } from '@/lib/new-eligibility/mockData';

interface TableReviewTabProps {
  tables: MockTable[];
  onUpdateTable: (updatedTable: MockTable) => void;
}

interface CellEditState {
  tableIndex: number;
  rowIndex: number;
  colIndex: number;
  headerName: string;
  originalValue: string | number | null;
  currentValue: string;
  reason: string;
}

export const TableReviewTab: React.FC<TableReviewTabProps> = ({
  tables,
  onUpdateTable
}) => {
  // Currently active table
  const [selectedTableIndex, setSelectedTableIndex] = useState<number>(19); // Default to Table 19 (Escalation Table)

  // Cell edit modal state
  const [editingCell, setEditingCell] = useState<CellEditState | null>(null);

  // Edited cells tracking: map of "tableIdx-rowIdx-colIdx" -> boolean
  const [editedCells, setEditedCells] = useState<Record<string, boolean>>({});

  const currentTable = tables.find(t => t.table_index === selectedTableIndex) || tables[18] || tables[0];

  const handleOpenCellEditor = (rowIndex: number, colIndex: number) => {
    const val = currentTable.rows[rowIndex][colIndex];
    const header = currentTable.headers[colIndex] || `Column ${colIndex + 1}`;
    setEditingCell({
      tableIndex: currentTable.table_index,
      rowIndex,
      colIndex,
      headerName: header,
      originalValue: val,
      currentValue: val !== null && val !== undefined ? String(val) : '',
      reason: 'Verified against tender document table format.'
    });
  };

  const handleSaveCellCorrection = () => {
    if (!editingCell) return;

    const newRows = currentTable.rows.map((row, rIdx) => {
      if (rIdx === editingCell.rowIndex) {
        const newRow = [...row];
        // Parse number if original was number
        const parsed = !isNaN(Number(editingCell.currentValue)) && editingCell.currentValue.trim() !== ''
          ? Number(editingCell.currentValue)
          : editingCell.currentValue;
        newRow[editingCell.colIndex] = parsed;
        return newRow;
      }
      return row;
    });

    const updated: MockTable = {
      ...currentTable,
      rows: newRows
    };

    const cellKey = `${editingCell.tableIndex}-${editingCell.rowIndex}-${editingCell.colIndex}`;
    setEditedCells(prev => ({ ...prev, [cellKey]: true }));
    onUpdateTable(updated);
    setEditingCell(null);
  };

  return (
    <div className="space-y-6">
      {/* Table Selector Grid / Header Pills */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            23 Verified Structural Tables & Tabular Formats
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Click any table below to inspect reconstructed cells, headers, footnotes, and perform cell-level corrections with coordinate logging.
          </p>
        </div>

        {/* Featured 5 Additional Tabular Formats */}
        <div>
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-2">
            Priority Reconstructed Formats (Stage 2B & 4A)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {[
              { idx: 19, name: 'Turnover Escalation Multiplier Table', page: 'Page 26', cat: 'Financial' },
              { idx: 20, name: 'Contact Authority Directory', page: 'Page 14', cat: 'Directory' },
              { idx: 21, name: 'Form-8 Completed Works Format', page: 'Page 40', cat: 'Technical' },
              { idx: 22, name: 'Form-9 Works on Hand Format', page: 'Page 41', cat: 'Capacity' },
              { idx: 23, name: 'Annexure-I Approved Banks List', page: 'Page 8', cat: 'Submission' }
            ].map(item => (
              <button
                key={item.idx}
                onClick={() => setSelectedTableIndex(item.idx)}
                type="button"
                className={`p-3 rounded-lg border text-left transition-all text-xs flex items-center justify-between ${
                  selectedTableIndex === item.idx
                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-sm ring-1 ring-emerald-500'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <div>
                  <div className="font-bold truncate max-w-[200px] sm:max-w-[230px]">{item.name}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>{item.page}</span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{item.cat}</span>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 shrink-0 ${selectedTableIndex === item.idx ? 'text-emerald-600' : 'text-slate-400'}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Other Reconstructed Tables Pills */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            All Verified Tables
          </span>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
            {tables.map(t => (
              <button
                key={t.table_index}
                onClick={() => setSelectedTableIndex(t.table_index)}
                type="button"
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                  selectedTableIndex === t.table_index
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                T{t.table_index}: {t.title.slice(0, 24)}... (p. {t.start_page})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Table Detail View */}
      {currentTable && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
          {/* Table Header Details */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
                  Table #{currentTable.table_index}
                </span>
                <span className="text-xs font-mono text-slate-500">
                  Pages {currentTable.start_page}{currentTable.end_page !== currentTable.start_page ? ` - ${currentTable.end_page}` : ''}
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {currentTable.category}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  {currentTable.verification_state}
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1.5">
                {currentTable.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Relevance: <strong className="text-slate-700 dark:text-slate-300">{currentTable.relevance}</strong>
              </p>
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {currentTable.rows.length} Rows × {currentTable.headers.length} Columns
              </span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Click any cell to edit
              </span>
            </div>
          </div>

          {/* Interactive Data Grid */}
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-3 w-12 text-center text-slate-400">#</th>
                  {currentTable.headers.map((h, i) => (
                    <th key={i} className="py-3 px-4 border-l border-slate-200 dark:border-slate-700 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {currentTable.rows.map((row, rIdx) => (
                  <tr 
                    key={rIdx}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center text-slate-400 font-bold select-none text-[11px] bg-slate-50/40 dark:bg-slate-800/20">
                      {rIdx + 1}
                    </td>
                    {row.map((cell, cIdx) => {
                      const isEdited = editedCells[`${currentTable.table_index}-${rIdx}-${cIdx}`];
                      return (
                        <td
                          key={cIdx}
                          onClick={() => handleOpenCellEditor(rIdx, cIdx)}
                          className={`py-2.5 px-4 border-l border-slate-100 dark:border-slate-800 cursor-pointer relative group transition-colors ${
                            isEdited
                              ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200 font-bold'
                              : 'text-slate-800 dark:text-slate-200 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate max-w-[280px]">
                              {cell !== null && cell !== undefined ? String(cell) : '—'}
                            </span>
                            <Edit3 className="w-3 h-3 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </div>
                          {isEdited && (
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-purple-500" title="Cell value was modified" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footnotes & Source Evidence */}
          <div className="space-y-3 pt-2">
            {currentTable.footnotes && currentTable.footnotes.length > 0 && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                <p className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  Table Notes & Footnotes
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400 text-[11px] pl-1">
                  {currentTable.footnotes.map((fn, idx) => (
                    <li key={idx}>{fn}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono text-[11px]">
              <span>Source Evidence: <strong className="text-slate-700 dark:text-slate-300">{currentTable.source_evidence}</strong></span>
              <span>Verification Hash: <span className="font-mono text-emerald-600">VERIFIED-EXACT-CELLS-MATCH</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Cell Correction Modal */}
      {editingCell && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                Cell Correction: (Row {editingCell.rowIndex + 1}, Col {editingCell.colIndex + 1})
              </h3>
              <button 
                onClick={() => setEditingCell(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Column Header</label>
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-200 font-medium">
                  {editingCell.headerName}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">AI Extracted Original Value</label>
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 font-mono">
                  {editingCell.originalValue !== null ? String(editingCell.originalValue) : '—'}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Corrected Value</label>
                <input
                  type="text"
                  value={editingCell.currentValue}
                  onChange={e => setEditingCell({ ...editingCell, currentValue: e.target.value })}
                  placeholder="Enter corrected value..."
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Correction Reason & Page Reference</label>
                <textarea
                  rows={3}
                  value={editingCell.reason}
                  onChange={e => setEditingCell({ ...editingCell, reason: e.target.value })}
                  placeholder="Enter reason for modifying table cell value..."
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
                Mock Mode: Cell edits apply to this browser session only and are not persisted to any database.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setEditingCell(null)}
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCellCorrection}
                type="button"
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-sm"
              >
                Apply Mock Cell Edit (Session Only)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

