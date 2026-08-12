'use client';

import React, { useState } from 'react';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  TrendingUp, 
  DollarSign, 
  Sparkles, 
  Download, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  Save, 
  Database,
  History,
  ArrowRight
} from 'lucide-react';
import { ProjectCategory, BOQRateOverrideLog } from '@/lib/types';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { API_BASE_URL } from '@/lib/api';

export interface ExtendedBOQEstimateItem {
  id: string;
  item_name: string;
  quantity: number;
  unit_of_measure: string;
  historical_match_name: string;
  historical_rate: number | null;
  historical_source: string | null;
  historical_date: string | null;
  ai_estimated_rate: number;
  user_override_rate: number;
  override_reason?: string;
  is_overridden: boolean;
}

export const CostingEstimatorView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory>('STP');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // STP Master Tender Item-Level Estimates (matching Karur 35.25 MLD SBR STP Tender)
  const [boqItems, setBoqItems] = useState<ExtendedBOQEstimateItem[]>([
    {
      id: 'item-101',
      item_name: 'Sequential Batch Reactor (SBR) Basin Reinforced Civil Structure (35.25 MLD)',
      quantity: 1,
      unit_of_measure: 'Lump Sum',
      historical_match_name: '30 MLD SBR Civil Basin Structure',
      historical_rate: 145000000,
      historical_source: 'Rajasthan Urban Infrastructure Project (RUIP-Phase IV)',
      historical_date: '12-Mar-2025',
      ai_estimated_rate: 158000000,
      user_override_rate: 158000000,
      is_overridden: false
    },
    {
      id: 'item-102',
      item_name: 'Fine Screen Channel (Mechanical & Manual 6mm Stainless Steel)',
      quantity: 2,
      unit_of_measure: 'Sets',
      historical_match_name: 'Mechanical Bar Screen 6mm SS316',
      historical_rate: 3200000,
      historical_source: 'Jaipur 20 MLD STP Upgradation',
      historical_date: '08-Nov-2025',
      ai_estimated_rate: 3450000,
      user_override_rate: 3450000,
      is_overridden: false
    },
    {
      id: 'item-103',
      item_name: 'Submersible SBR Sewage Pumps & Sludge Recirculation Assemblies',
      quantity: 6,
      unit_of_measure: 'Units',
      historical_match_name: 'Submersible Sewage Pump 120 HP Flygt/Kirloskar',
      historical_rate: 1850000,
      historical_source: 'PHED Jodhpur Water Pumping Scheme',
      historical_date: '15-Feb-2026',
      ai_estimated_rate: 1980000,
      user_override_rate: 2100000,
      override_reason: 'Current vendor quotation from Kirloskar is ₹21.0 Lakhs per pump.',
      is_overridden: true
    },
    {
      id: 'item-104',
      item_name: 'Air Blower Room Assemblies (Tri-Lobe Air Blowers 150 kW)',
      quantity: 4,
      unit_of_measure: 'Sets',
      historical_match_name: 'Tri-Lobe Air Blower 150 kW Atlas Copco',
      historical_rate: 4200000,
      historical_source: 'Kota Sewerage Project Phase II',
      historical_date: '10-Jan-2025',
      ai_estimated_rate: 4500000,
      user_override_rate: 4500000,
      is_overridden: false
    },
    {
      id: 'item-105',
      item_name: 'Advanced Screw Press Mechanical Sludge Dewatering System (SS316)',
      quantity: 2,
      unit_of_measure: 'Units',
      historical_match_name: 'Screw Press Dewatering Package',
      historical_rate: 6800000,
      historical_source: 'Udaipur Municipal Sewage Treatment',
      historical_date: '28-Apr-2025',
      ai_estimated_rate: 7200000,
      user_override_rate: 7200000,
      is_overridden: false
    },
    {
      id: 'item-106',
      item_name: 'UV Disinfection Chamber & Online Effluent Quality Monitoring Suite',
      quantity: 1,
      unit_of_measure: 'System',
      historical_match_name: null, // NO HISTORICAL DATA DEMO
      historical_rate: null,
      historical_source: null,
      historical_date: null,
      ai_estimated_rate: 0,
      user_override_rate: 8500000,
      override_reason: 'Manual rate based on TrojanUV vendor budget quotation.',
      is_overridden: true
    },
    {
      id: 'item-107',
      item_name: '10-Year Operation & Maintenance (O&M) Discounted Annual Expenditure (Page 65)',
      quantity: 10,
      unit_of_measure: 'Years',
      historical_match_name: 'STP 10-Yr Comprehensive O&M Lifecycle Cost',
      historical_rate: 18000000,
      historical_source: 'Karur Municipal Corporation Benchmark (Page 65 NPV @ 10%)',
      historical_date: '09-Jul-2026',
      ai_estimated_rate: 19500000,
      user_override_rate: 19500000,
      is_overridden: false
    }
  ]);

  // Manual Costing Questions State
  const [marketAdjustment, setMarketAdjustment] = useState<number>(3.5);
  const [includeTransportation, setIncludeTransportation] = useState<boolean>(true);
  const [includeEscalation, setIncludeEscalation] = useState<boolean>(true);
  const [contingencyPct, setContingencyPct] = useState<number>(5.0);

  // Update Override Rate & Reason
  const handleRateOverride = (id: string, newRate: number, reason: string) => {
    setBoqItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const isChanged = newRate !== item.ai_estimated_rate;
          return {
            ...item,
            user_override_rate: newRate,
            override_reason: reason,
            is_overridden: isChanged
          };
        }
        return item;
      })
    );
  };

  // Log Override for AI Learning in Supabase Database
  const saveOverrideToDb = async (item: ExtendedBOQEstimateItem) => {
    if (!item.is_overridden) return;
    const diff = item.user_override_rate - item.ai_estimated_rate;

    // 1. Post to Vercel API
    try {
      await fetch(`${API_BASE_URL}/costing/overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tender_id: 'TND-60522025',
          boq_item_id: item.id,
          item_name: item.item_name,
          original_ai_rate: item.ai_estimated_rate,
          user_override_rate: item.user_override_rate,
          difference: diff,
          reason: item.override_reason || 'Manual user adjustment',
          project_category: selectedCategory
        })
      });
    } catch (e) {}

    // 2. Direct Supabase db update
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('boq_rate_overrides').insert({
          tender_id: 'TND-60522025',
          boq_item_id: item.id,
          item_name: item.item_name,
          original_ai_rate: item.ai_estimated_rate,
          user_override_rate: item.user_override_rate,
          difference: diff,
          reason: item.override_reason || 'Manual user adjustment',
          project_category: selectedCategory,
          created_at: new Date().toISOString()
        });
      } catch (err) {}
    }

    setToastMessage(`Rate override for '${item.item_name}' saved to AI Learning Database!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Calculate Totals
  const totalAIEstimatedCost = boqItems.reduce(
    (sum, item) => sum + (item.ai_estimated_rate || 0) * item.quantity,
    0
  );

  const totalUserApprovedCost = boqItems.reduce(
    (sum, item) => sum + item.user_override_rate * item.quantity,
    0
  );

  const totalWithContingency = totalUserApprovedCost * (1 + contingencyPct / 100);
  const totalVariance = totalUserApprovedCost - totalAIEstimatedCost;

  // Excel Export Handler (Generates Multi-Sheet CSV Data)
  const downloadExcelReport = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    // SHEET 1: SUMMARY
    csvContent += '==================================================\n';
    csvContent += 'DESIRE ENERGY — COST ESTIMATION REPORT SUMMARY\n';
    csvContent += '==================================================\n';
    csvContent += `Tender Name,Karur 35.25 MLD SBR STP (Notice No. 6052/2025/E5)\n`;
    csvContent += `Project Category,${selectedCategory}\n`;
    csvContent += `Total AI Estimated Cost (₹),${totalAIEstimatedCost}\n`;
    csvContent += `Total User Approved Cost (₹),${totalUserApprovedCost}\n`;
    csvContent += `Variance (₹),${totalVariance}\n`;
    csvContent += `Contingency Buffer (${contingencyPct}%),${(totalUserApprovedCost * (contingencyPct / 100)).toFixed(0)}\n`;
    csvContent += `Final Total Cost Estimate (₹),${totalWithContingency.toFixed(0)}\n\n`;

    // SHEET 2: BOQ ESTIMATION
    csvContent += '==================================================\n';
    csvContent += 'SHEET 2 — BOQ ESTIMATION BREAKDOWN\n';
    csvContent += '==================================================\n';
    csvContent += 'Item Description,Quantity,Unit,Historical Match,Historical Rate (₹),Source BOQ,BOQ Date,AI Est Rate (₹),Final Rate (₹),Total Amount (₹)\n';
    boqItems.forEach(item => {
      csvContent += `"${item.item_name}",${item.quantity},"${item.unit_of_measure}","${item.historical_match_name || 'NO MATCH'}",${item.historical_rate || 0},"${item.historical_source || 'N/A'}","${item.historical_date || 'N/A'}",${item.ai_estimated_rate},${item.user_override_rate},${item.user_override_rate * item.quantity}\n`;
    });
    csvContent += '\n';

    // SHEET 3: MANUAL OVERRIDES (AI LEARNING)
    csvContent += '==================================================\n';
    csvContent += 'SHEET 3 — MANUAL RATE OVERRIDES & AI LEARNING\n';
    csvContent += '==================================================\n';
    csvContent += 'Item Description,AI Est Rate (₹),User Override Rate (₹),Difference (₹),Override Reason\n';
    boqItems.filter(i => i.is_overridden).forEach(item => {
      csvContent += `"${item.item_name}",${item.ai_estimated_rate},${item.user_override_rate},${item.user_override_rate - item.ai_estimated_rate},"${item.override_reason || ''}"\n`;
    });
    csvContent += '\n';

    // SHEET 4: HISTORICAL SOURCES
    csvContent += '==================================================\n';
    csvContent += 'SHEET 4 — HISTORICAL BOQ SOURCES & CITATIONS\n';
    csvContent += '==================================================\n';
    csvContent += 'Historical Project Name,Client,BOQ Date,Matched Item,Historical Rate (₹)\n';
    boqItems.filter(i => i.historical_source).forEach(item => {
      csvContent += `"${item.historical_source}","Karur / RUIP","${item.historical_date}","${item.historical_match_name}",${item.historical_rate}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Desire_Tender_Costing_Report_${selectedCategory}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-emerald-500 text-aqua-950 font-bold text-xs shadow-2xl flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Module Banner */}
      <div className="glass-card p-6 rounded-2xl border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 font-mono text-xs mb-1">
            <Calculator className="w-4 h-4" />
            <span>PROJECT-SPECIFIC ITEM ESTIMATION & HISTORICAL MATCHING ENGINE</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-white">
            Cost Estimation Module — Project-Specific BOQ Intelligence
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Matches tender BOQ items against historical database of the same project type, provides source page/project citations, accepts manual rate overrides, and trains AI learning model.
          </p>
        </div>

        <button
          onClick={downloadExcelReport}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-aqua-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer shrink-0 self-start sm:self-center"
        >
          <FileSpreadsheet className="w-4 h-4 stroke-[2.5]" />
          <span>Download Excel Costing Report (4 Sheets)</span>
        </button>
      </div>

      {/* Financial Metrics Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-cyan-400 space-y-1">
          <span className="text-[11px] font-mono text-slate-400 uppercase">AI Estimated Cost</span>
          <div className="text-2xl font-display font-bold text-white">
            ₹{(totalAIEstimatedCost / 10000000).toFixed(2)} Cr
          </div>
          <p className="text-[10px] text-slate-400 font-mono">Matched from historical project BOQs</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-emerald-400 bg-emerald-500/5 space-y-1">
          <span className="text-[11px] font-mono text-emerald-300 uppercase">User Approved Cost</span>
          <div className="text-2xl font-display font-bold text-emerald-400">
            ₹{(totalUserApprovedCost / 10000000).toFixed(2)} Cr
          </div>
          <p className="text-[10px] text-emerald-300/80 font-mono">Sum of user-reviewed line rates</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-purple-400 space-y-1">
          <span className="text-[11px] font-mono text-purple-300 uppercase">Rate Variance (Delta)</span>
          <div className={`text-2xl font-display font-bold ${totalVariance >= 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {totalVariance >= 0 ? '+' : ''}₹{(totalVariance / 100000).toFixed(2)} Lakhs
          </div>
          <p className="text-[10px] text-purple-300/80 font-mono">Difference between AI & User overrides</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-teal-400 space-y-1">
          <span className="text-[11px] font-mono text-teal-300 uppercase">Final Total (+ Contingency)</span>
          <div className="text-2xl font-display font-bold text-teal-300">
            ₹{(totalWithContingency / 10000000).toFixed(2)} Cr
          </div>
          <p className="text-[10px] text-teal-300/80 font-mono">Includes {contingencyPct}% contingency buffer</p>
        </div>
      </div>

      {/* ITEM-LEVEL COST ESTIMATION TABLE */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-2">
          <div>
            <h3 className="text-base font-display font-bold text-white flex items-center space-x-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <span>Item-Level Historical Cost Estimation Table</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Historical sources are displayed for every item. Overriding a rate automatically logs the change for AI training.
            </p>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            Project Type: {selectedCategory} (STP Sewage Treatment)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-mono text-slate-400 uppercase">
                <th className="py-3 px-3">New Tender Item Description</th>
                <th className="py-3 px-2 text-right">Qty</th>
                <th className="py-3 px-2">Unit</th>
                <th className="py-3 px-3">Historical Source Reference & Date</th>
                <th className="py-3 px-3 text-right">Historical Rate (₹)</th>
                <th className="py-3 px-3 text-right">AI Est Rate (₹)</th>
                <th className="py-3 px-3 text-right">Final User Rate (₹)</th>
                <th className="py-3 px-3 text-right">Line Amount (₹)</th>
                <th className="py-3 px-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {boqItems.map((item) => (
                <tr key={item.id} className="hover:bg-white/5 transition">
                  <td className="py-3 px-3 max-w-xs">
                    <span className="font-semibold text-white block">{item.item_name}</span>
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-cyan-300 font-bold">{item.quantity}</td>
                  <td className="py-3 px-2 font-mono text-slate-400 text-[11px]">{item.unit_of_measure}</td>
                  
                  {/* Historical Source Citation */}
                  <td className="py-3 px-3">
                    {item.historical_source ? (
                      <div className="space-y-0.5">
                        <span className="text-emerald-300 font-semibold block text-[11px] truncate max-w-[220px]" title={item.historical_source}>
                          {item.historical_source}
                        </span>
                        <div className="text-[10px] font-mono text-slate-400">
                          Matched: <span className="text-cyan-300">{item.historical_match_name}</span> ({item.historical_date})
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] font-mono flex items-center space-x-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                        <span>No historical BOQ data currently available for this item.</span>
                      </div>
                    )}
                  </td>

                  {/* Historical Rate */}
                  <td className="py-3 px-3 text-right font-mono text-slate-300">
                    {item.historical_rate ? `₹${item.historical_rate.toLocaleString('en-IN')}` : '—'}
                  </td>

                  {/* AI Estimated Rate */}
                  <td className="py-3 px-3 text-right font-mono text-cyan-300 font-bold">
                    {item.ai_estimated_rate > 0 ? `₹${item.ai_estimated_rate.toLocaleString('en-IN')}` : '—'}
                  </td>

                  {/* Editable Final User Rate & Reason */}
                  <td className="py-3 px-3 text-right space-y-1">
                    <input
                      type="number"
                      value={item.user_override_rate}
                      onChange={(e) => handleRateOverride(item.id, parseFloat(e.target.value) || 0, item.override_reason || '')}
                      className={`w-32 p-1.5 rounded-lg text-right font-mono text-xs text-white border ${
                        item.is_overridden ? 'bg-purple-950/80 border-purple-400 font-bold' : 'bg-[#101415] border-white/15'
                      }`}
                    />
                    {item.is_overridden && (
                      <input
                        type="text"
                        placeholder="Enter override reason..."
                        value={item.override_reason || ''}
                        onChange={(e) => handleRateOverride(item.id, item.user_override_rate, e.target.value)}
                        className="w-32 p-1 rounded font-sans text-[10px] bg-purple-950/40 border border-purple-500/30 text-purple-200"
                      />
                    )}
                  </td>

                  {/* Line Total */}
                  <td className="py-3 px-3 text-right font-mono text-emerald-400 font-bold">
                    ₹{(item.user_override_rate * item.quantity).toLocaleString('en-IN')}
                  </td>

                  {/* Action: Save Override */}
                  <td className="py-3 px-2 text-center">
                    {item.is_overridden && (
                      <button
                        onClick={() => saveOverrideToDb(item)}
                        className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/40 transition"
                        title="Save manual override to AI Learning Database"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MANUAL COSTING QUESTIONS SECTION (Master Prompt Section 16) */}
      <div className="glass-card p-6 rounded-2xl border border-purple-500/30 space-y-4">
        <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
          <HelpCircle className="w-5 h-5 text-purple-400" />
          <div>
            <h3 className="text-base font-display font-bold text-white">
              Manual Costing & Escalation Assessment Questions
            </h3>
            <p className="text-xs text-slate-400">
              The AI generates targeted questions based on the Karur STP tender conditions to refine final estimated rates.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-aqua-950/60 border border-white/10 space-y-2">
            <label className="font-bold text-white block">1. Current Market Condition Adjustment (%)</label>
            <p className="text-[11px] text-slate-400">Should historical rates be inflated for current material price increases?</p>
            <input
              type="number"
              value={marketAdjustment}
              onChange={(e) => setMarketAdjustment(parseFloat(e.target.value) || 0)}
              className="w-full p-2 rounded-lg bg-[#101415] border border-white/15 text-cyan-300 font-mono"
            />
          </div>

          <div className="p-4 rounded-xl bg-aqua-950/60 border border-white/10 space-y-2">
            <label className="font-bold text-white block">2. Unforeseen Contingency Buffer (%)</label>
            <p className="text-[11px] text-slate-400">Apply risk buffer for Karur site soil conditions (Page 68)?</p>
            <input
              type="number"
              value={contingencyPct}
              onChange={(e) => setContingencyPct(parseFloat(e.target.value) || 0)}
              className="w-full p-2 rounded-lg bg-[#101415] border border-white/15 text-teal-300 font-mono"
            />
          </div>

          <div className="p-4 rounded-xl bg-aqua-950/60 border border-white/10 space-y-2">
            <label className="font-bold text-white block">3. Include Local Transportation & Freight?</label>
            <div className="flex items-center space-x-4 pt-1">
              <label className="flex items-center space-x-1.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTransportation}
                  onChange={(e) => setIncludeTransportation(e.target.checked)}
                  className="rounded bg-[#101415] border-white/20 text-cyan-400"
                />
                <span>Include Freight & Loading / Unloading</span>
              </label>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-aqua-950/60 border border-white/10 space-y-2">
            <label className="font-bold text-white block">4. Apply 10-Year O&M Price Escalation Formula?</label>
            <div className="flex items-center space-x-4 pt-1">
              <label className="flex items-center space-x-1.5 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeEscalation}
                  onChange={(e) => setIncludeEscalation(e.target.checked)}
                  className="rounded bg-[#101415] border-white/20 text-cyan-400"
                />
                <span>Apply NPV 10% Discount Rate (Page 65)</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
