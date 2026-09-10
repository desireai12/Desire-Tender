'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  TrendingUp, 
  Sparkles, 
  Percent, 
  BarChart3, 
  RefreshCw, 
  FileSpreadsheet, 
  Search, 
  CheckCircle2, 
  SlidersHorizontal, 
  Layers, 
  Users, 
  Truck, 
  FileText, 
  Download, 
  Upload,
  Building, 
  Check, 
  Zap, 
  ArrowRight,
  Database,
  Sliders,
  DollarSign,
  Briefcase,
  ExternalLink,
  ShieldCheck,
  CheckCircle
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import vapiTenderData from '@/data/vapi_karvad_real_tender.json';
import vapiDocManifest from '@/data/vapi_tender_documents_manifest.json';
import banasTenderData from '@/data/banaskantha_kankrej_real_tender.json';
import banasDocManifest from '@/data/banaskantha_tender_documents_manifest.json';
import masterRateDatabase from '@/lib/service_price_database.json';
import { matchItemRate, autoFillBoqItems } from '@/lib/itemRateMatcher';

// Modes
type ViewMode = 'auto_filler' | 'live_tender' | 'custom_builder';
type TenderTab = 'summary' | 'boq' | 'vendors' | 'pivot' | 'om' | 'machinery' | 'strategy' | 'compliance';
type ActiveTenderKey = 'banaskantha' | 'vapi';

interface BOQItem {
  id: string;
  row_index: number;
  schedule: string;
  sr_no: string;
  item_description: string;
  qty: number;
  red_qty?: number;
  unit: string;
  sor_rate: number;
  sor_total: number;
  work_type: string;
  purchase_price: number;
  service_price: number;
  service_guj?: number;
  total_price: number;
  total_price_red?: number;
  raj_infra_rate?: number;
  grishva_infra_rate?: number;
  match_confidence?: number;
  match_source?: string;
  vendor_quotes: { [vendor: string]: number };
}

interface CustomCostItem {
  id: string;
  category: string;
  item_name: string;
  sub_description?: string;
  unit: string;
  purchase_cost: number;
  service_cost: number;
  unit_cost: number;
  quantity: number;
  markup_percentage: number;
  tax_percentage: number;
  rate_source: string;
  region: string;
}

const COLORS = ['#0284c7', '#0d9488', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#84cc16'];

export const CostingEstimatorView: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('live_tender');
  const [activeTenderKey, setActiveTenderKey] = useState<ActiveTenderKey>('banaskantha');
  const [tenderTab, setTenderTab] = useState<TenderTab>('summary');

  // ==========================================
  // MODE 1: INTELLIGENT BOQ AUTO-FILLER STATE
  // ==========================================
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [pastedBoqText, setPastedBoqText] = useState<string>('');
  const [autoFilledItems, setAutoFilledItems] = useState<BOQItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadMarkup, setUploadMarkup] = useState<number>(18);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load sample blank BOQ for demonstration
  const handleLoadSampleBlankBoq = () => {
    const sampleItems = [
      { sr_no: '1', item_description: 'Manufacture, supply & delivery of submerged arc spiral welded MS Pipe 508 mm Dia Thk 5 mm with 3LPE coating', qty: 10843, unit: 'Rmt', sor_rate: 7152.89 },
      { sr_no: '2', item_description: 'Manufacture, supply & delivery of submerged arc spiral welded MS Pipe 1014 mm Dia Thk 7.6 mm with 3LPE coating', qty: 23657, unit: 'Rmt', sor_rate: 19143.20 },
      { sr_no: '3', item_description: 'Providing & supplying ISI mark HDPE (PN-6kg/cm2) PE-100 pipe 315 mm Dia with trenching and jointing', qty: 31045, unit: 'Rmt', sor_rate: 2573.89 },
      { sr_no: '4', item_description: 'Providing & supplying ISI mark HDPE (PN-6kg/cm2) PE-100 pipe 450 mm Dia with trenching and jointing', qty: 6070, unit: 'Rmt', sor_rate: 4902.65 },
      { sr_no: '5', item_description: 'Construction of cast in situ M20 RCC Flowmeter/BF Valve/Air Valve chambers 2.0m x 2.0m x 3.5m', qty: 5, unit: 'No', sor_rate: 148178.81 },
      { sr_no: '6', item_description: 'Providing & erecting Ductile Iron D/F Butterfly valves IS 13095 900 mm Dia', qty: 3, unit: 'No', sor_rate: 574790.00 },
      { sr_no: '7', item_description: 'Providing and fixing in position Kinetic Air Valve PN 1.0 rating 200 mm Dia', qty: 79, unit: 'No', sor_rate: 68011.71 },
      { sr_no: '8', item_description: 'Construction of M20 RCC Thrust Blocks on MS & HDPE pipelines', qty: 339.54, unit: 'Cmt', sor_rate: 12215.47 },
      { sr_no: '9', item_description: 'Railway / Highway / Canal Crossing by Jack Pushing method with MS Casing pipe 1200 mm', qty: 70, unit: 'Rmt', sor_rate: 48829.10 },
      { sr_no: '10', item_description: 'Comprehensive Operation and Maintenance of Kankrej Pipeline system for 3 Years', qty: 1, unit: 'Job', sor_rate: 6909053.26 }
    ];

    setIsProcessing(true);
    setTimeout(() => {
      const filled = autoFillBoqItems(sampleItems);
      setAutoFilledItems(filled);
      setUploadedFileName('Banaskantha_Kankrej_Sample_BOQ.xlsx');
      setIsProcessing(false);
    }, 400);
  };

  // Parse CSV or pasted text
  const handleParsePastedBoq = () => {
    if (!pastedBoqText.trim()) return;
    setIsProcessing(true);

    try {
      const lines = pastedBoqText.trim().split('\n');
      const parsed = lines.map((line, idx) => {
        const parts = line.split(/[,\t|]/).map(p => p.trim());
        if (parts.length >= 3) {
          return {
            sr_no: parts[0] || `${idx + 1}`,
            item_description: parts[1] || `Item ${idx + 1}`,
            qty: parseFloat(parts[2]) || 1,
            unit: parts[3] || 'Nos',
            sor_rate: parseFloat(parts[4]) || 0
          };
        }
        return {
          sr_no: `${idx + 1}`,
          item_description: line.trim(),
          qty: 1,
          unit: 'Nos',
          sor_rate: 0
        };
      });

      const filled = autoFillBoqItems(parsed);
      setAutoFilledItems(filled);
      setUploadedFileName('Pasted_BOQ_Input.csv');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle local CSV/Excel upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        const parsed = lines.slice(1).map((line, idx) => {
          const parts = line.split(/[,\t]/).map(p => p.replace(/^"|"$/g, '').trim());
          return {
            sr_no: parts[0] || `${idx + 1}`,
            item_description: parts[1] || `Item ${idx + 1}`,
            qty: parseFloat(parts[2]) || 1,
            unit: parts[3] || 'Nos',
            sor_rate: parseFloat(parts[4]) || 0
          };
        });

        const filled = autoFillBoqItems(parsed);
        setAutoFilledItems(filled);
      }
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  // Auto-filled totals
  const autoFilledTotalCost = useMemo(() => {
    return autoFilledItems.reduce((sum, item) => {
      const unitCost = Number(item.purchase_price || 0) + Number(item.service_price || 0);
      return sum + (unitCost * Number(item.qty || 0));
    }, 0);
  }, [autoFilledItems]);

  const autoFilledTotalSor = useMemo(() => {
    return autoFilledItems.reduce((sum, item) => sum + (Number(item.sor_rate || 0) * Number(item.qty || 0)), 0);
  }, [autoFilledItems]);

  const autoFilledQuotedTotal = autoFilledTotalCost * (1 + uploadMarkup / 100);
  const autoFilledQuoteBelowAbovePct = autoFilledTotalSor > 0 ? ((autoFilledQuotedTotal / autoFilledTotalSor) - 1) * 100 : 0;

  // Download filled BOQ
  const handleDownloadFilledBoq = () => {
    const csvRows: string[] = [];
    csvRows.push(`"FILLED BOQ ESTIMATE (AUTO-RECOGNIZED FROM MASTER RATE LIBRARY)"`);
    csvRows.push(`"Total Estimated SOR: Rs. ${autoFilledTotalSor.toLocaleString('en-IN')}"`);
    csvRows.push(`"Total Material + Service Cost: Rs. ${autoFilledTotalCost.toLocaleString('en-IN')}"`);
    csvRows.push(`"Quoted Price (${uploadMarkup}% Markup): Rs. ${autoFilledQuotedTotal.toLocaleString('en-IN')}"`);
    csvRows.push(`"Quote Rate vs SOR: ${autoFilledQuoteBelowAbovePct.toFixed(2)}% ${autoFilledQuoteBelowAbovePct < 0 ? 'Below SOR' : 'Above SOR'}"`);
    csvRows.push(``);
    csvRows.push(`"Sr No","Description","Quantity","Unit","SOR Rate","SOR Total","Work Category","Purchase Rate (Rs)","Service Rate (Rs)","Total Unit Cost (Rs)","Total Execution Cost (Rs)","Match Confidence","Price Source"`);

    autoFilledItems.forEach(item => {
      const unitCost = Number(item.purchase_price || 0) + Number(item.service_price || 0);
      const lineCost = unitCost * Number(item.qty || 0);
      csvRows.push(`"${item.sr_no}","${item.item_description.replace(/"/g, '""')}","${item.qty}","${item.unit}","${item.sor_rate}","${item.sor_total}","${item.work_type}","${item.purchase_price}","${item.service_price}","${unitCost.toFixed(2)}","${lineCost.toFixed(2)}","${item.match_confidence || 0}%","${(item.match_source || '').replace(/"/g, '""')}"`);
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Filled_BOQ_${uploadedFileName.replace(/\.[^/.]+$/, "") || 'Estimate'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==========================================
  // MODE 2: LIVE REAL TENDER COSTING STATE
  // ==========================================
  const activeTenderData = activeTenderKey === 'banaskantha' ? banasTenderData : vapiTenderData;
  const activeDocManifest = activeTenderKey === 'banaskantha' ? banasDocManifest : vapiDocManifest;

  const [boqItems, setBoqItems] = useState<BOQItem[]>(banasTenderData.boq_items as unknown as BOQItem[]);
  const [selectedSchedule, setSelectedSchedule] = useState<string>('All');
  const [selectedWorkType, setSelectedWorkType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [conversionMarkup, setConversionMarkup] = useState<number>(17.95);
  const [jvOverheadPct, setJvOverheadPct] = useState<number>(1.0);
  const [oh1Pct, setOh1Pct] = useState<number>(0.5);
  const [labourCessPct, setLabourCessPct] = useState<number>(1.0);
  const [oh2Pct, setOh2Pct] = useState<number>(2.0);
  const [interestCostPct, setInterestCostPct] = useState<number>(0.5);
  const [generalOverheadPct, setGeneralOverheadPct] = useState<number>(2.0);

  const [omStaff, setOmStaff] = useState<any[]>(banasTenderData.monthly_om_staff as any[]);
  const [omExpenses, setOmExpenses] = useState<any[]>((banasTenderData as any).monthly_om_expenses || []);
  const [machineryList, setMachineryList] = useState<any[]>(banasTenderData.machinery_items as any[]);

  // Synchronize when switching tender preset
  useEffect(() => {
    if (activeTenderKey === 'banaskantha') {
      setBoqItems(banasTenderData.boq_items as unknown as BOQItem[]);
      setOmStaff(banasTenderData.monthly_om_staff as any[]);
      setOmExpenses((banasTenderData as any).monthly_om_expenses || []);
      setMachineryList(banasTenderData.machinery_items as any[]);
      setConversionMarkup(17.95);
      setSelectedSchedule('All');
      setSelectedWorkType('All');
    } else {
      setBoqItems(vapiTenderData.boq_items as unknown as BOQItem[]);
      setOmStaff(vapiTenderData.monthly_om_staff as any[]);
      setOmExpenses(vapiTenderData.monthly_om_expenses as any[]);
      setMachineryList(vapiTenderData.machinery_items as any[]);
      setConversionMarkup(25.0);
      setSelectedSchedule('All');
      setSelectedWorkType('All');
    }
  }, [activeTenderKey]);

  const scheduleList = useMemo(() => ['All', ...Array.from(new Set(boqItems.map(item => item.schedule)))], [boqItems]);
  const workTypeList = useMemo(() => ['All', ...Array.from(new Set(boqItems.map(item => item.work_type).filter(Boolean)))], [boqItems]);

  const baseBomTotal = useMemo(() => {
    return boqItems.reduce((sum, item) => {
      const lineCost = (Number(item.purchase_price || 0) + Number(item.service_price || 0) + Number(item.service_guj || 0)) * Number(item.qty || 0);
      return sum + (lineCost > 0 ? lineCost : (item.total_price || 0));
    }, 0);
  }, [boqItems]);

  const totalSorValue = useMemo(() => {
    return boqItems.reduce((sum, item) => sum + Number(item.sor_total || 0), 0);
  }, [boqItems]);

  const quotedPriceAfterMargin = baseBomTotal * (1 + conversionMarkup / 100);
  const jvOverheadAmt = (quotedPriceAfterMargin * jvOverheadPct) / 100;
  const oh1Amt = (quotedPriceAfterMargin * oh1Pct) / 100;
  const labourCessAmt = (quotedPriceAfterMargin * labourCessPct) / 100;
  const oh2Amt = ((quotedPriceAfterMargin - labourCessAmt) * oh2Pct) / 100;
  const interestCostAmt = (baseBomTotal * interestCostPct) / 100;
  const generalOverheadAmt = (quotedPriceAfterMargin * generalOverheadPct) / 100;

  const totalDeductions = jvOverheadAmt + oh1Amt + labourCessAmt + oh2Amt + interestCostAmt + generalOverheadAmt;
  const netInHand = quotedPriceAfterMargin - totalDeductions;
  const netProfitAmt = netInHand - baseBomTotal;
  const profitPct = quotedPriceAfterMargin > 0 ? (netProfitAmt / quotedPriceAfterMargin) * 100 : 0;
  const aboveBelowSorPct = totalSorValue > 0 ? ((quotedPriceAfterMargin / totalSorValue) - 1) * 100 : 0;

  const displayedBOQ = useMemo(() => {
    return boqItems.filter(item => {
      const matchSched = selectedSchedule === 'All' || item.schedule === selectedSchedule;
      const matchType = selectedWorkType === 'All' || item.work_type === selectedWorkType;
      const matchSearch = !searchQuery || 
        item.item_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sr_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.work_type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSched && matchType && matchSearch;
    });
  }, [boqItems, selectedSchedule, selectedWorkType, searchQuery]);

  const dynamicPivotData = useMemo(() => {
    const map: { [key: string]: { work_type: string; sor_amount: number; actual_cost: number } } = {};
    boqItems.forEach(item => {
      const wt = item.work_type || 'Other';
      if (!map[wt]) map[wt] = { work_type: wt, sor_amount: 0, actual_cost: 0 };
      map[wt].sor_amount += Number(item.sor_total || 0);
      const lineCost = (Number(item.purchase_price || 0) + Number(item.service_price || 0) + Number(item.service_guj || 0)) * Number(item.qty || 0);
      map[wt].actual_cost += (lineCost > 0 ? lineCost : (item.total_price || 0));
    });

    return Object.values(map)
      .map(cat => ({
        ...cat,
        scope_percent: totalSorValue > 0 ? (cat.sor_amount / totalSorValue) * 100 : 0,
        sor_vs_cost_ratio: cat.sor_amount > 0 ? (cat.actual_cost / cat.sor_amount) : 0
      }))
      .sort((a, b) => b.sor_amount - a.sor_amount);
  }, [boqItems, totalSorValue]);

  // ==========================================
  // MODE 3: CLASSIC / CUSTOM ESTIMATOR STATE
  // ==========================================
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [customItems, setCustomItems] = useState<CustomCostItem[]>([
    {
      id: 'item-1',
      category: 'Piping & Distribution',
      item_name: 'MS Spiral Welded Pipe 1014 mm Dia (7.6mm thk, 3LPE & Epoxy)',
      sub_description: 'Banaskantha Kankrej Rising Main',
      unit: 'Rmt',
      purchase_cost: 16241.45,
      service_cost: 1285.0,
      unit_cost: 17526.45,
      quantity: 23657,
      markup_percentage: 17.95,
      tax_percentage: 18,
      rate_source: 'Banaskantha Kankrej Schedule (2026)',
      region: 'Gujarat'
    },
    {
      id: 'item-2',
      category: 'Piping & Distribution',
      item_name: 'HDPE Pipe PE-100 PN-6 315 mm Dia',
      sub_description: 'Village Feeder Network',
      unit: 'Rmt',
      purchase_cost: 1539.85,
      service_cost: 185.0,
      unit_cost: 1724.85,
      quantity: 31045,
      markup_percentage: 17.95,
      tax_percentage: 18,
      rate_source: 'Banaskantha Kankrej Schedule (2026)',
      region: 'Gujarat'
    }
  ]);

  const availableDatabaseRates = useMemo(() => {
    return (masterRateDatabase as any[]).filter(r => {
      const matchReg = selectedRegion === 'All' || r.state?.toLowerCase().includes(selectedRegion.toLowerCase());
      const matchSearch = !searchFilter || 
        r.item_description?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        r.sub_description?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        r.project?.toLowerCase().includes(searchFilter.toLowerCase());
      return matchReg && matchSearch;
    });
  }, [selectedRegion, searchFilter]);

  const addRateFromDatabase = (rateObj: any) => {
    const newItem: CustomCostItem = {
      id: `custom-item-${Date.now()}-${Math.random().toString().slice(-4)}`,
      category: rateObj.category || 'Civil & Pipeline',
      item_name: rateObj.item_description,
      sub_description: rateObj.sub_description,
      unit: rateObj.unit || 'Nos',
      purchase_cost: rateObj.purchase_cost || 0,
      service_cost: rateObj.service_cost || 0,
      unit_cost: rateObj.total_unit_rate || (rateObj.purchase_cost + rateObj.service_cost) || 0,
      quantity: 100,
      markup_percentage: 15,
      tax_percentage: 18,
      rate_source: `${rateObj.city || ''} (${rateObj.state || 'Master'})`,
      region: rateObj.state || 'Gujarat'
    };
    setCustomItems([...customItems, newItem]);
  };

  const customTotalBaseCost = customItems.reduce((acc, it) => acc + (it.unit_cost * it.quantity), 0);
  const customTotalQuotedCost = customItems.reduce((acc, it) => {
    const base = it.unit_cost * it.quantity;
    const withMarkup = base * (1 + it.markup_percentage / 100);
    return acc + (withMarkup * (1 + it.tax_percentage / 100));
  }, 0);

  return (
    <div className="space-y-6">
      {/* Top Main Mode Switcher */}
      <div className="bg-white dark:bg-slate-800 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setViewMode('live_tender')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'live_tender'
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 text-white shadow-md'
                : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Building className="w-4 h-4 text-amber-300" />
            <span>🏛️ Live EPC Tender Costing Suite</span>
          </button>

          <button
            onClick={() => setViewMode('auto_filler')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'auto_filler'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md'
                : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Zap className="w-4 h-4 text-teal-400" />
            <span>⚡ Intelligent BOQ Auto-Filler</span>
          </button>

          <button
            onClick={() => setViewMode('custom_builder')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'custom_builder'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Database className="w-4 h-4 text-purple-300" />
            <span>Master Rate Library ({masterRateDatabase.length} Rates)</span>
          </button>
        </div>

        <div className="text-xs px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 font-semibold border border-teal-200 dark:border-teal-800 flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5" />
          <span>Active Rate Library: <strong>{masterRateDatabase.length}</strong> Item Rates</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODE 2: LIVE REAL TENDER EPC COSTING SUITE */}
      {/* ========================================================= */}
      {viewMode === 'live_tender' && (
        <div className="space-y-6">
          {/* Project Switcher Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-700 shadow-md">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono text-slate-400 font-medium">Active EPC Tender Model:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveTenderKey('banaskantha')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
                  activeTenderKey === 'banaskantha'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 border border-emerald-400'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${activeTenderKey === 'banaskantha' ? 'text-white' : 'text-slate-500'}`} />
                <span>Banaskantha Kankrej Pipeline (₹69.78 Cr) — NEW</span>
              </button>

              <button
                onClick={() => setActiveTenderKey('vapi')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all ${
                  activeTenderKey === 'vapi'
                    ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/40 border border-sky-400'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${activeTenderKey === 'vapi' ? 'text-white' : 'text-slate-500'}`} />
                <span>Vapi Karvad Water Supply (₹31.80 Cr)</span>
              </button>
            </div>
          </div>

          {/* Top Banner */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950 border border-teal-500/30 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1.5 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    LIVE EPC TENDER COSTING ENGINE
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    {activeTenderKey === 'banaskantha' ? 'Govt of Gujarat (WRD Palanpur / Sujalam Sufalam)' : 'Vapi Municipal Corporation (Valsad)'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    {activeTenderKey === 'banaskantha' ? 'JV Consortium: Desire Energy (51%) + Vinod H Patel (49%)' : 'Desire Energy Standalone / JV'}
                  </span>
                </div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  <Calculator className="w-6 h-6 text-teal-400 shrink-0" />
                  <span>{activeTenderData.tender_metadata.short_title || activeTenderData.tender_metadata.tender_name}</span>
                </h1>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeTenderKey === 'banaskantha' 
                    ? 'EPC Contract for Tapping Branch Pipeline from Changa MPS (Ch. 375.100 km) to fill 27 Ponds in 20 Villages of Kankrej Taluka | 34.5 km MS (1014/508mm) + 40.36 km HDPE (315-450mm) + 3-Yr Comprehensive O&M'
                    : 'EPC Model for Survey, DI Distribution & Rising Main, Pumping Machineries, Headworks, 8,085 House Connections, SCADA & 5 Years O&M'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    const csvRows = [`"Sr No","Description","Qty","Unit","SOR Rate","SOR Total","Purchase Price","Service Price","Total Price"`];
                    boqItems.forEach(i => csvRows.push(`"${i.sr_no}","${i.item_description.replace(/"/g, '""')}","${i.qty}","${i.unit}","${i.sor_rate}","${i.sor_total}","${i.purchase_price}","${i.service_price}","${i.total_price}"`));
                    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${activeTenderKey === 'banaskantha' ? 'Banaskantha_Kankrej_EPC_69.78Cr' : 'Vapi_Karvad_EPC_31.80Cr'}_Costing.csv`;
                    link.click();
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center space-x-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Costing (CSV)</span>
                </button>
              </div>
            </div>

            {/* Quick KPI Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-700/60 text-xs">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <div className="text-slate-400 font-medium">Estimated Value</div>
                <div className="text-base font-bold text-teal-300 mt-0.5">₹{(totalSorValue / 10000000).toFixed(2)} Cr</div>
                <div className="text-[11px] text-slate-400">{activeTenderKey === 'banaskantha' ? 'Schedule A+C Dept SOR' : 'SOR Schedule-B'}</div>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <div className="text-slate-400 font-medium">Base BOM Cost</div>
                <div className="text-base font-bold text-amber-300 mt-0.5">₹{(baseBomTotal / 10000000).toFixed(2)} Cr</div>
                <div className="text-[11px] text-slate-400">Material + Gujarat Service</div>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <div className="text-slate-400 font-medium">Quoted Price ({conversionMarkup}%)</div>
                <div className="text-base font-bold text-sky-300 mt-0.5">₹{(quotedPriceAfterMargin / 10000000).toFixed(2)} Cr</div>
                <div className="text-[11px] text-emerald-400 font-medium">{aboveBelowSorPct.toFixed(2)}% vs SOR</div>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <div className="text-slate-400 font-medium">Net In Hand</div>
                <div className="text-base font-bold text-indigo-300 mt-0.5">₹{(netInHand / 10000000).toFixed(2)} Cr</div>
                <div className="text-[11px] text-slate-400">After Deductions</div>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <div className="text-slate-400 font-medium">Net Profit</div>
                <div className="text-base font-bold text-emerald-400 mt-0.5">₹{(netProfitAmt / 10000000).toFixed(2)} Cr</div>
                <div className="text-[11px] text-emerald-300 font-medium">{profitPct.toFixed(2)}% Net Margin</div>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <div className="text-slate-400 font-medium">EMD & Solvency</div>
                <div className="text-base font-bold text-purple-300 mt-0.5">
                  {activeTenderKey === 'banaskantha' ? '₹69.79 L / ₹13.96 Cr' : '₹31.80 L / ₹6.40 Cr'}
                </div>
                <div className="text-[11px] text-slate-400">{activeTenderKey === 'banaskantha' ? '120d + 45d Validity' : '180d + 28d'}</div>
              </div>
            </div>
          </div>

          {/* Tender Sub-Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            {[
              { id: 'summary', label: 'Executive Summary', icon: FileSpreadsheet },
              { id: 'boq', label: `Interactive BOQ (${boqItems.length} Items)`, icon: Layers },
              { id: 'vendors', label: 'Vendor Comparative Matrix', icon: Building },
              { id: 'pivot', label: 'Work-Type Category Pivot', icon: BarChart3 },
              { id: 'om', label: `${activeTenderKey === 'banaskantha' ? '3-Year' : '5-Year'} O&M Calculator`, icon: Users },
              { id: 'machinery', label: 'Machinery & Fleet', icon: Truck },
              { id: 'strategy', label: 'Bid Strategy & Deductions', icon: SlidersHorizontal },
              { id: 'compliance', label: `Document Pack (${activeDocManifest.total_files || (activeDocManifest.categories?.length || 0)} Files)`, icon: FileText }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = tenderTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTenderTab(tab.id as TenderTab)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Summary */}
          {tenderTab === 'summary' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>{activeTenderKey === 'banaskantha' ? 'Schedule Summary Breakdown (Banaskantha 69.78 Cr)' : 'Schedule-B Summary Breakdown (Vapi Karvad 31.8 Cr)'}</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold font-mono">
                  {boqItems.length} BOQ Line Items
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-b text-slate-600 font-semibold uppercase">
                      <th className="py-3 px-4">Schedule</th>
                      <th className="py-3 px-4">Scope Description</th>
                      <th className="py-3 px-4 text-center">Items Count</th>
                      <th className="py-3 px-4 text-right">SOR Amount (₹)</th>
                      <th className="py-3 px-4 text-right">Our Base Cost (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-mono">
                    {activeTenderData.schedules_summary.map((s: any, idx: number) => {
                      const amount = s.amount || (s.estimated_sor_cr ? s.estimated_sor_cr * 10000000 : 0);
                      const cost = s.our_cost_cr ? s.our_cost_cr * 10000000 : 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="py-3 px-4 font-semibold text-emerald-600">{s.schedule_id || s.schedule_code || `Sched-${idx+1}`}</td>
                          <td className="py-3 px-4 font-sans text-slate-800 dark:text-slate-200">{s.name}</td>
                          <td className="py-3 px-4 text-center text-slate-500 font-sans">{s.items_count || '-'}</td>
                          <td className="py-3 px-4 text-right font-bold text-slate-800 dark:text-slate-200">
                            ₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-teal-600">
                            {cost > 0 ? `₹${cost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-100 dark:bg-slate-900 font-bold border-t-2">
                      <td colSpan={3} className="py-3.5 px-4 font-sans text-right">TOTAL AMOUNT PUT TO TENDER:</td>
                      <td className="py-3.5 px-4 text-right text-emerald-600 text-sm">
                        ₹{totalSorValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right text-teal-600 text-sm">
                        ₹{baseBomTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: BOQ */}
          {tenderTab === 'boq' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filter keyword / dia..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <select
                    value={selectedSchedule}
                    onChange={e => setSelectedSchedule(e.target.value)}
                    className="text-xs py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  >
                    {scheduleList.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select
                    value={selectedWorkType}
                    onChange={e => setSelectedWorkType(e.target.value)}
                    className="text-xs py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  >
                    {workTypeList.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div className="text-xs text-slate-500 font-mono">Showing {displayedBOQ.length} of {boqItems.length} items</div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto max-h-[550px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 border-b z-10 font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Item</th>
                      <th className="py-2.5 px-3 min-w-[240px]">Description</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-2 text-center">Unit</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">SOR Rate</th>
                      <th className="py-2.5 px-3 text-right bg-teal-50/50 dark:bg-teal-950/30">Purchase</th>
                      <th className="py-2.5 px-3 text-right bg-sky-50/50 dark:bg-sky-950/30">Service</th>
                      <th className="py-2.5 px-3 text-right bg-amber-50/50 dark:bg-amber-950/30">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-mono">
                    {displayedBOQ.map(item => {
                      const unitCost = Number(item.purchase_price || 0) + Number(item.service_price || 0) + Number(item.service_guj || 0);
                      const lineTotal = unitCost > 0 ? (unitCost * Number(item.qty || 0)) : (item.total_price || 0);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="py-2 px-3 text-slate-500 font-sans">{item.sr_no}</td>
                          <td className="py-2 px-3 font-sans text-slate-800 dark:text-slate-200 line-clamp-2 max-w-md" title={item.item_description}>
                            {item.item_description}
                          </td>
                          <td className="py-2 px-3 text-right">{item.qty.toLocaleString('en-IN')}</td>
                          <td className="py-2 px-2 text-center text-slate-500 font-sans">{item.unit}</td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400 font-sans text-[11px]">{item.work_type}</td>
                          <td className="py-2 px-3 text-right text-slate-500">₹{item.sor_rate.toLocaleString('en-IN')}</td>
                          <td className="py-2 px-3 text-right bg-teal-50/20 text-teal-700 dark:text-teal-400 font-bold">
                            {item.purchase_price > 0 ? `₹${item.purchase_price.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="py-2 px-3 text-right bg-sky-50/20 text-sky-700 dark:text-sky-400 font-semibold">
                            {item.service_price > 0 ? `₹${item.service_price.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-bold bg-amber-50/20 text-slate-900 dark:text-slate-100">
                            ₹{lineTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Vendors */}
          {tenderTab === 'vendors' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {activeTenderKey === 'banaskantha' ? 'Pipe Procurement & Localized Service Comparison (Raj Infra vs Grishva Infra)' : 'DI Pipe Vendor Quotes (IS 8329-2000)'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeTenderKey === 'banaskantha' 
                    ? 'Comparing manufacturer supply benchmarks against Raj Infra and Grishva Infra installation/laying quotes.'
                    : 'Manufacturer quotation matrix across Electrosteel, Rashmi Metalicks, Jindal Saw, and Welspun.'}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b text-slate-600 uppercase font-semibold">
                      <th className="py-3 px-4">Item / Size</th>
                      <th className="py-3 px-3 text-right">Qty</th>
                      <th className="py-3 px-3 text-center">Unit</th>
                      <th className="py-3 px-3 text-right">Dept SOR Rate</th>
                      {activeTenderKey === 'banaskantha' ? (
                        <>
                          <th className="py-3 px-3 text-right text-teal-600">Base Purchase</th>
                          <th className="py-3 px-3 text-right text-emerald-600">Our Service</th>
                          <th className="py-3 px-3 text-right text-blue-600">Raj Infra Rate</th>
                          <th className="py-3 px-3 text-right text-indigo-600">Grishva Infra</th>
                        </>
                      ) : (
                        <>
                          <th className="py-3 px-3 text-right text-teal-600">Electrosteel</th>
                          <th className="py-3 px-3 text-right text-blue-600">Rashmi Metalicks</th>
                          <th className="py-3 px-3 text-right text-indigo-600">Jindal Saw</th>
                          <th className="py-3 px-3 text-right text-purple-600">Welspun</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-mono">
                    {boqItems
                      .filter(item => item.qty > 0 && (item.purchase_price > 0 || Object.keys(item.vendor_quotes).length > 0))
                      .slice(0, 15)
                      .map(item => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="py-2.5 px-4 font-sans font-bold text-slate-800 dark:text-slate-200">
                            {item.item_description.slice(0, 50)}...
                          </td>
                          <td className="py-2.5 px-3 text-right">{item.qty.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 text-center font-sans text-slate-500">{item.unit}</td>
                          <td className="py-2.5 px-3 text-right text-slate-500">₹{item.sor_rate.toLocaleString('en-IN')}</td>
                          {activeTenderKey === 'banaskantha' ? (
                            <>
                              <td className="py-2.5 px-3 text-right font-bold text-teal-600">₹{item.purchase_price?.toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-emerald-600">₹{item.service_price?.toLocaleString('en-IN')}</td>
                              <td className="py-2.5 px-3 text-right text-blue-600">{item.raj_infra_rate ? `₹${item.raj_infra_rate.toLocaleString('en-IN')}` : '-'}</td>
                              <td className="py-2.5 px-3 text-right text-indigo-600">{item.grishva_infra_rate ? `₹${item.grishva_infra_rate.toLocaleString('en-IN')}` : '-'}</td>
                            </>
                          ) : (
                            <>
                              <td className="py-2.5 px-3 text-right">{item.vendor_quotes['Electrosteel'] ? `₹${item.vendor_quotes['Electrosteel']}` : '-'}</td>
                              <td className="py-2.5 px-3 text-right">{item.vendor_quotes['Rashmi Metalicks'] ? `₹${item.vendor_quotes['Rashmi Metalicks']}` : '-'}</td>
                              <td className="py-2.5 px-3 text-right">{item.vendor_quotes['Jindal Saw Limited'] ? `₹${item.vendor_quotes['Jindal Saw Limited']}` : '-'}</td>
                              <td className="py-2.5 px-3 text-right">{item.vendor_quotes['Welspun'] ? `₹${item.vendor_quotes['Welspun']}` : '-'}</td>
                            </>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 4: Pivot */}
          {tenderTab === 'pivot' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Work Type Scope & Price Realization Index</h3>
                  <p className="text-xs text-slate-500">Categorical breakdown of tender estimate vs actual budgeted execution costs.</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b text-slate-600 font-semibold uppercase">
                      <th className="py-2.5 px-4">Type of Work</th>
                      <th className="py-2.5 px-4 text-right">SOR Total (₹)</th>
                      <th className="py-2.5 px-4 text-right">Actual Cost (₹)</th>
                      <th className="py-2.5 px-4 text-right">% Scope</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-mono">
                    {dynamicPivotData.map(cat => (
                      <tr key={cat.work_type} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="py-2 px-4 font-sans font-semibold text-slate-800 dark:text-slate-200">{cat.work_type}</td>
                        <td className="py-2 px-4 text-right">₹{cat.sor_amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                        <td className="py-2 px-4 text-right font-bold text-teal-600">₹{cat.actual_cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                        <td className="py-2 px-4 text-right font-bold text-slate-700 dark:text-slate-300">{cat.scope_percent.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 5: O&M */}
          {tenderTab === 'om' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {activeTenderKey === 'banaskantha' ? '3-Year Key Technical Personnel Deployment' : '5-Year O&M Staffing & Monthly Expenses'}
                  </h3>
                  <p className="text-xs text-slate-500">Statutory engineering manpower requirements as per Clause 4.5.4 of ITB.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase mb-2">Key Technical Staff Deployment</div>
                  <div className="border rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-900 border-b text-slate-600 font-semibold">
                        <tr>
                          <th className="py-2 px-3 text-left">Designation</th>
                          <th className="py-2 px-3 text-left">Qualification / Exp</th>
                          <th className="py-2 px-3 text-center">Nos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {omStaff.map((s: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">{s.role || s.designation}</td>
                            <td className="py-2 px-3 text-slate-500">{s.qualification || s.experience}</td>
                            <td className="py-2 px-3 text-center font-bold text-teal-600">{s.count || s.qty || 1}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 space-y-2">
                    <h4 className="text-xs font-bold text-teal-900 dark:text-teal-200">Site Vehicle & Facility Compliance</h4>
                    <p className="text-xs text-teal-800 dark:text-teal-300">
                      • 1 Four-wheeler SUV (7-seater model post-2026) + 2 Two-wheelers deployed 365 days/year.<br/>
                      • Full on-site Testing Laboratory building with humidity control & certified equipment.<br/>
                      • Pumping Station Site Office with high-speed internet & CAD computing facilities.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 6: Machinery */}
          {tenderTab === 'machinery' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Key Plant & Equipment Schedule (Clause 4.5.5)</h3>
                <p className="text-xs text-slate-500">Minimum required machinery to be deployed on contract work.</p>
              </div>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b bg-slate-50 dark:bg-slate-900 text-slate-600 uppercase font-sans font-semibold">
                      <th className="py-2 px-3 text-left">Plant / Machinery Name</th>
                      <th className="py-2 px-3 text-center">Required Min Nos</th>
                      <th className="py-2 px-3 text-left">Ownership / Deployment Proposal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {machineryList.map((m: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="py-2.5 px-3 font-sans font-bold text-slate-800 dark:text-slate-200">{m.equipment || m.equipment_name}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-teal-600">{m.suggested_nos || m.qty_required}</td>
                        <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-300">{m.owned_proposed || 'Owned & Ready for Deployment'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 7: Strategy */}
          {tenderTab === 'strategy' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Commercial Margin & Deductions Breakdown</h3>
                <p className="text-xs text-slate-500">Competitive price model and statutory deduction forecast.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
                <div className="space-y-2">
                  <div className="flex justify-between py-1.5 border-b">
                    <span className="text-slate-500 font-sans">Conversion Markup:</span>
                    <span className="font-bold text-teal-600">{conversionMarkup}%</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b">
                    <span className="text-slate-500 font-sans">JV Overhead (1%):</span>
                    <span>₹{jvOverheadAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b">
                    <span className="text-slate-500 font-sans">Labour Cess (1%):</span>
                    <span>₹{labourCessAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b">
                    <span className="text-slate-500 font-sans">Corporate Overheads:</span>
                    <span>₹{(oh1Amt + oh2Amt).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b">
                    <span className="text-slate-500 font-sans">Interest Cost (0.5%):</span>
                    <span>₹{interestCostAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>

                <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Quoted Price:</span>
                    <span className="font-bold text-sky-400">₹{quotedPriceAfterMargin.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Quote vs Dept SOR:</span>
                    <span className="font-bold text-emerald-400">{aboveBelowSorPct.toFixed(2)}% ({aboveBelowSorPct < 0 ? 'Below SOR' : 'Above SOR'})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Net In-Hand Realization:</span>
                    <span className="font-bold text-indigo-300">₹{netInHand.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-emerald-400 pt-2 border-t border-slate-700">
                    <span className="font-sans">Expected Net Profit:</span>
                    <span>₹{netProfitAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({profitPct.toFixed(2)}%)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 8: Compliance */}
          {tenderTab === 'compliance' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {activeTenderKey === 'banaskantha' ? 'Banaskantha Bidding Document Package (22 Stages & 127 Verified Files)' : 'Vapi Karvad Bidding Document Checklist (Form 0 to 27)'}
                  </h3>
                  <p className="text-xs text-slate-500">Complete tender submission repository verified from Desire Energy & Vinod H. Patel credentials.</p>
                </div>
                <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold border border-emerald-300">
                  100% Submission Ready
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {activeDocManifest.categories.map((cat: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 hover:border-emerald-400 transition-all">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-start gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{cat.category_name || cat.folder_name}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                      <span>{cat.stage || 'Submission Stage'}</span>
                      <span className="font-bold text-emerald-600">{cat.documents_count || cat.files_count} file(s)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 1: INTELLIGENT BOQ AUTO-FILLER */}
      {/* ========================================================= */}
      {viewMode === 'auto_filler' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 p-6 rounded-2xl border border-teal-500/30 text-white shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/40">
                  AI MASTER RATE MATCHER
                </span>
                <h2 className="text-xl font-bold mt-1">Upload Blank Tender BOQ & Generate Live Estimate</h2>
                <p className="text-xs text-slate-300">
                  Matches every line item with 560+ live Gujarat & Rajasthan SOR rates, vendor purchase prices, and service contracts.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleLoadSampleBlankBoq}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-teal-500/40 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Load Banaskantha Sample BOQ</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-teal-500/40 hover:border-teal-400 rounded-xl bg-slate-800/40 cursor-pointer">
                <Upload className="w-6 h-6 text-teal-400 mb-1" />
                <span className="text-xs font-bold">{uploadedFileName || 'Click to Upload Excel / CSV BOQ'}</span>
                <span className="text-[10px] text-slate-400">Supports .xlsx, .csv</span>
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFileUpload} />
              </label>

              <div className="space-y-2">
                <textarea
                  placeholder="Or paste CSV items: SrNo, Description, Quantity, Unit, SOR Rate..."
                  value={pastedBoqText}
                  onChange={e => setPastedBoqText(e.target.value)}
                  className="w-full h-20 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-white placeholder-slate-400"
                />
                <button
                  onClick={handleParsePastedBoq}
                  className="w-full py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Auto-Fill Pasted BOQ Items
                </button>
              </div>
            </div>
          </div>

          {/* Auto-filled Items Output */}
          {autoFilledItems.length > 0 && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Auto-Filled BOQ ({autoFilledItems.length} Items Evaluated)
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-xs font-mono font-bold text-emerald-600">
                    Total Quoted: ₹{autoFilledQuotedTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                  <button
                    onClick={handleDownloadFilledBoq}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Filled BOQ (CSV)</span>
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto max-h-[500px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 border-b font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Sr</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Qty</th>
                      <th className="py-2.5 px-2 text-center">Unit</th>
                      <th className="py-2.5 px-3 text-right">SOR Rate</th>
                      <th className="py-2.5 px-3 text-right bg-teal-50/50">Purchase</th>
                      <th className="py-2.5 px-3 text-right bg-sky-50/50">Service</th>
                      <th className="py-2.5 px-3 text-right bg-amber-50/50">Total</th>
                      <th className="py-2.5 px-3 text-center">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-mono">
                    {autoFilledItems.map((item, idx) => {
                      const unitCost = Number(item.purchase_price || 0) + Number(item.service_price || 0);
                      const lineTotal = unitCost * Number(item.qty || 0);
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                          <td className="py-2 px-3 text-slate-500">{item.sr_no}</td>
                          <td className="py-2 px-3 font-sans text-slate-800 dark:text-slate-200">{item.item_description}</td>
                          <td className="py-2 px-3 text-right">{item.qty}</td>
                          <td className="py-2 px-2 text-center font-sans text-slate-500">{item.unit}</td>
                          <td className="py-2 px-3 text-right text-slate-500">₹{item.sor_rate?.toLocaleString('en-IN')}</td>
                          <td className="py-2 px-3 text-right bg-teal-50/20 text-teal-700 font-bold">₹{item.purchase_price}</td>
                          <td className="py-2 px-3 text-right bg-sky-50/20 text-sky-700 font-semibold">₹{item.service_price}</td>
                          <td className="py-2 px-3 text-right font-bold bg-amber-50/20">₹{lineTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                          <td className="py-2 px-3 text-center font-sans">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                              {item.match_confidence || 95}% Match
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 3: CUSTOM / MASTER RATE BUILDER */}
      {/* ========================================================= */}
      {viewMode === 'custom_builder' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Database className="w-4 h-4 text-purple-600" />
                  <span>Master Item Rate Library & Custom Estimator</span>
                </h3>
                <p className="text-xs text-slate-500">Browse across 560+ live item rates from Banaskantha, Vapi, and Rajasthan schedules.</p>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={selectedRegion}
                  onChange={e => setSelectedRegion(e.target.value)}
                  className="text-xs py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border"
                >
                  <option value="All">All Regions ({masterRateDatabase.length} Rates)</option>
                  <option value="Gujarat">Gujarat (Banaskantha / Vapi)</option>
                  <option value="Rajasthan">Rajasthan (Jaipur / Balotra)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                placeholder="Search rates (e.g. MS Pipe 1014 mm, HDPE 315 mm, Butterfly Valve, Thrust Block)..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border"
              />
              <div className="max-h-48 overflow-y-auto divide-y border rounded-xl bg-slate-50 dark:bg-slate-900/40 text-xs">
                {availableDatabaseRates.slice(0, 15).map((r: any) => (
                  <div key={r.id} className="p-2.5 flex items-center justify-between hover:bg-teal-50/40">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{r.item_description} {r.sub_description ? `— ${r.sub_description}` : ''}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{r.city || r.state} | Unit: {r.unit} | Unit Rate: ₹{r.total_unit_rate?.toLocaleString('en-IN')}</div>
                    </div>
                    <button
                      onClick={() => addRateFromDatabase(r)}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add to Estimate</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
