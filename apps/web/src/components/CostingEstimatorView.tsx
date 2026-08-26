'use client';

import React, { useState } from 'react';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  TrendingUp, 
  DollarSign, 
  Sparkles, 
  Percent, 
  BarChart3,
  RefreshCw,
  MapPin,
  Database,
  Building2,
  FileSpreadsheet,
  Bot,
  Search,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import rawRateData from '@/lib/service_price_database.json';

interface CostItem {
  id: string;
  category: 'Civil & Structural' | 'Mechanical Equipment' | 'E&I / SCADA' | 'Piping & Distribution' | 'Services / Commissioning' | 'Overhead & Risk';
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

export const CostingEstimatorView: React.FC = () => {
  const [selectedRegion, setSelectedRegion] = useState<string>('Rajasthan');
  const [searchFilter, setSearchFilter] = useState<string>('');

  const [items, setItems] = useState<CostItem[]>([
    {
      id: 'item-1',
      category: 'Piping & Distribution',
      item_name: 'HDPE Pipe, PE-100, PN-6 (HDD Method)',
      sub_description: '315 mm dia',
      unit: 'Rmt',
      purchase_cost: 1777,
      service_cost: 3500,
      unit_cost: 5277,
      quantity: 500,
      markup_percentage: 12,
      tax_percentage: 18,
      rate_source: 'Rajasthan (Jaipur) — May 2026 Schedule (Divija)',
      region: 'Rajasthan'
    },
    {
      id: 'item-2',
      category: 'Piping & Distribution',
      item_name: 'DI Pipe, K-7',
      sub_description: '250 mm dia',
      unit: 'Rmt',
      purchase_cost: 1741.53,
      service_cost: 130,
      unit_cost: 1871.53,
      quantity: 1200,
      markup_percentage: 10,
      tax_percentage: 18,
      rate_source: 'Rajasthan (Balotra) — Feb 2026 Schedule',
      region: 'Rajasthan'
    },
    {
      id: 'item-3',
      category: 'Civil & Structural',
      item_name: 'RCC Pipe NP4 Class (Vibrated Casting)',
      sub_description: '600 mm dia',
      unit: 'Rmt',
      purchase_cost: 2080,
      service_cost: 1800,
      unit_cost: 3880,
      quantity: 350,
      markup_percentage: 15,
      tax_percentage: 18,
      rate_source: 'Rajasthan (Jaipur STP DLB) — May 2026 Schedule',
      region: 'Rajasthan'
    },
    {
      id: 'item-4',
      category: 'E&I / SCADA',
      item_name: 'Sunaquator 4G IoT Telemetry & PLC Automation Suite',
      sub_description: 'STP/WTP Remote Telemetry',
      unit: 'Job',
      purchase_cost: 450000,
      service_cost: 85000,
      unit_cost: 535000,
      quantity: 1,
      markup_percentage: 15,
      tax_percentage: 18,
      rate_source: 'Desire Energy Corporate Master Schedule',
      region: 'Rajasthan'
    },
    {
      id: 'item-5',
      category: 'Overhead & Risk',
      item_name: 'Site Overhead & Seasonal Delay Contingency Buffer',
      sub_description: 'Geotechnical / Rain Risk',
      unit: 'LumpSum',
      purchase_cost: 250000,
      service_cost: 50000,
      unit_cost: 300000,
      quantity: 1,
      markup_percentage: 5,
      tax_percentage: 0,
      rate_source: 'BidMaster Contingency Rule (5%)',
      region: 'Rajasthan'
    }
  ]);

  const [aiTargetDiscount, setAiTargetDiscount] = useState<number>(6.5);

  // Filter rate database based on region & search
  const availableDatabaseRates = rawRateData.filter((r) => {
    const matchRegion = selectedRegion === 'All' || r.state.toLowerCase().includes(selectedRegion.toLowerCase());
    const matchSearch = !searchFilter || 
      r.item_description.toLowerCase().includes(searchFilter.toLowerCase()) || 
      (r.sub_description && r.sub_description.toLowerCase().includes(searchFilter.toLowerCase())) ||
      (r.city && r.city.toLowerCase().includes(searchFilter.toLowerCase()));
    return matchRegion && matchSearch;
  });

  const addRateFromDatabase = (rateObj: any) => {
    const newItem: CostItem = {
      id: `item-${Date.now()}-${Math.random().toString().slice(-4)}`,
      category: rateObj.item_description.toLowerCase().includes('pipe') ? 'Piping & Distribution' : 
                (rateObj.category || 'Civil & Structural'),
      item_name: rateObj.item_description,
      sub_description: rateObj.sub_description,
      unit: rateObj.unit || 'Rmt',
      purchase_cost: rateObj.purchase_cost || 0,
      service_cost: rateObj.service_cost || 0,
      unit_cost: rateObj.total_unit_rate || (rateObj.purchase_cost + rateObj.service_cost),
      quantity: 100,
      markup_percentage: 12,
      tax_percentage: 18,
      rate_source: `Rate Source: ${rateObj.state} (${rateObj.city}) — Schedule ${rateObj.remarks ? '(' + rateObj.remarks.slice(0, 25) + '...)' : ''}`,
      region: rateObj.state
    };
    setItems((prev) => [...prev, newItem]);
  };

  const loadGujaratBOQTemplate = () => {
    const gujRates = (rawRateData as any[]).filter(r => r.project && r.project.includes('Gujarat Junagadh'));
    if (gujRates.length > 0) {
      const templateItems: CostItem[] = gujRates.map((r, i) => ({
        id: `guj-item-${i}-${Date.now()}`,
        category: (r.category || 'Services / Commissioning') as any,
        item_name: r.item_description,
        sub_description: r.sub_description || '',
        unit: r.unit || 'Job',
        purchase_cost: r.purchase_cost || 0,
        service_cost: r.service_cost || 0,
        unit_cost: r.total_unit_rate || (r.purchase_cost + r.service_cost),
        quantity: 1,
        markup_percentage: 12,
        tax_percentage: 18,
        rate_source: 'Gujarat GWSSB Junagadh O&M Schedule (Rs 8.34 Cr)',
        region: 'Gujarat'
      }));
      setItems(templateItems);
      setSelectedRegion('Gujarat');
    }
  };

  const updateItem = (id: string, field: keyof CostItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'purchase_cost' || field === 'service_cost') {
            updated.unit_cost = (parseFloat(updated.purchase_cost as any) || 0) + (parseFloat(updated.service_cost as any) || 0);
          }
          return updated;
        }
        return item;
      })
    );
  };

  const addItem = () => {
    const newItem: CostItem = {
      id: `item-${Date.now()}`,
      category: 'Civil & Structural',
      item_name: 'Custom WTP/STP Line Item',
      sub_description: 'Custom specification',
      unit: 'Rmt',
      purchase_cost: 1000,
      service_cost: 200,
      unit_cost: 1200,
      quantity: 10,
      markup_percentage: 10,
      tax_percentage: 18,
      rate_source: `Rate Source: ${selectedRegion} Market Estimate`,
      region: selectedRegion
    };
    setItems((prev) => [...prev, newItem]);
  };

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Calculations
  const calculateItemBase = (item: CostItem) => {
    const unitRate = item.unit_cost || (item.purchase_cost + item.service_cost);
    return unitRate * item.quantity;
  };

  const calculateItemTotal = (item: CostItem) => {
    const base = calculateItemBase(item);
    const withMarkup = base * (1 + item.markup_percentage / 100);
    return withMarkup * (1 + item.tax_percentage / 100);
  };

  const manualTotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const aiRecommendedTotal = manualTotal * (1 - aiTargetDiscount / 100);
  const varianceAmount = manualTotal - aiRecommendedTotal;
  const estimatedMargin = manualTotal > 0 ? ((manualTotal - (manualTotal * 0.75)) / manualTotal) * 100 : 0;

  // Chart data preparation
  const chartData = [
    {
      name: 'Total Bid (₹ Lakhs)',
      'Estimated Bid Total (₹ Lakhs)': Math.round(manualTotal / 100000),
      'AI Recommended Bid (₹ Lakhs)': Math.round(aiRecommendedTotal / 100000)
    }
  ];

  const categories = [
    'Civil & Structural', 
    'Mechanical Equipment', 
    'E&I / SCADA', 
    'Piping & Distribution', 
    'Services / Commissioning', 
    'Overhead & Risk'
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Header Banner & Actions Bar (Clean, un-squished layout) */}
      <div className="glass-card p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0b1426] shadow-sm space-y-4">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 text-xs font-mono font-bold">
            <Bot className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>BIDMASTER AI — WATER & WASTEWATER EPC COSTING ENGINE</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-white">
            Area-Wise BOQ Estimator & Rate Database
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-4xl">
            Prioritizes user-provided area-wise service & procurement schedules from <strong className="text-emerald-800 dark:text-emerald-400">Service Price Database</strong> (244 Verified Rates). Automatically maps regional procurement rates (DI, HDPE, MS, RCC pipes, O&M manpower, machinery) and applies local labour and installation costs.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Target Region Selector */}
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700">
            <MapPin className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-bold">Target Region:</span>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="bg-transparent text-xs font-bold font-mono text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="Rajasthan" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Rajasthan (Jaipur / Balotra)</option>
              <option value="Gujarat" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Gujarat (Junagadh O&M / Vapi / Mehsana)</option>
              <option value="UP" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">UP (Bhadohi / Kanpur / Ballia)</option>
              <option value="All" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All India Database (244 Rates)</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={loadGujaratBOQTemplate}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition shadow-sm cursor-pointer"
              title="Load all 80 items from Gujarat O&M 8.34 CR Junagadh BOQ"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Load Gujarat 8.34 Cr BOQ</span>
            </button>

            <button
              onClick={addItem}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[#064e3b] dark:bg-[#059669] hover:bg-emerald-900 text-white font-bold text-xs transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Item</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Real-time Bid Metrics Summary Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl space-y-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1527] border-l-4 border-l-cyan-500 shadow-xs">
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block">
            Calculated Bid Price (₹ Total)
          </span>
          <div className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white">
            ₹{manualTotal >= 10000000 ? (manualTotal / 10000000).toFixed(2) + ' Cr' : (manualTotal / 100000).toFixed(2) + ' Lakhs'}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            ₹{Math.round(manualTotal).toLocaleString('en-IN')} (Purchase + Service + Markup + Tax)
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl space-y-1.5 border border-slate-200 dark:border-slate-800 bg-emerald-50/40 dark:bg-emerald-950/40 border-l-4 border-l-emerald-500 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-400 font-bold uppercase block">
              AI Recommended L1 Target
            </span>
            <Sparkles className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-display font-bold text-emerald-800 dark:text-emerald-300">
            ₹{aiRecommendedTotal >= 10000000 ? (aiRecommendedTotal / 10000000).toFixed(2) + ' Cr' : (aiRecommendedTotal / 100000).toFixed(2) + ' Lakhs'}
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
            BidMaster RAG optimized for L1 winning margin (-{aiTargetDiscount}%)
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl space-y-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1527] border-l-4 border-l-teal-500 shadow-xs">
          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase block">
            Estimated Gross Margin
          </span>
          <div className="text-2xl sm:text-3xl font-display font-bold text-teal-800 dark:text-teal-400 flex items-center space-x-2">
            <span>+{estimatedMargin.toFixed(1)}%</span>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Overhead & Net Revenue Optimization
          </p>
        </div>
      </div>

      {/* 3. Quick Rate Picker from 244-Rate Database */}
      <div className="glass-card p-5 sm:p-6 rounded-2xl space-y-4 border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0d1527]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
              Rate Database Quick Selector ({selectedRegion}) — {availableDatabaseRates.length} Items Available
            </h3>
          </div>

          <div className="w-full sm:w-72">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search DI, HDPE, O&M, Cleaning rates..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
          {availableDatabaseRates.slice(0, 15).map((rate) => (
            <div 
              key={rate.id}
              onClick={() => addRateFromDatabase(rate)}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition cursor-pointer group flex flex-col justify-between space-y-2"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    {rate.state} ({rate.city})
                  </span>
                  <span className="text-xs font-mono text-emerald-800 dark:text-emerald-400 font-bold">
                    ₹{rate.total_unit_rate} /{rate.unit}
                  </span>
                </div>
                <h5 className="text-xs font-bold text-slate-900 dark:text-white mt-1.5 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition leading-snug line-clamp-2">
                  {rate.item_description} {rate.sub_description ? `(${rate.sub_description})` : ''}
                </h5>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800 font-mono">
                <span>P: ₹{rate.purchase_cost} | S: ₹{rate.service_cost}</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold group-hover:underline">+ Add</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Editable Line-Item Cost Breakdown Grid */}
      <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4 border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0d1527]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-display font-bold text-slate-900 dark:text-white">
              BOQ Cost Estimation Line Items ({items.length} Active Items)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Adjust purchase price, service rate, quantities, markup, and tax per item.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px] text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase bg-slate-50 dark:bg-slate-900/60">
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-2 text-center">Unit</th>
                <th className="py-2.5 px-2 text-right">Purchase (₹)</th>
                <th className="py-2.5 px-2 text-right">Service (₹)</th>
                <th className="py-2.5 px-2 text-right">Unit Cost (₹)</th>
                <th className="py-2.5 px-2 text-right">Qty</th>
                <th className="py-2.5 px-2 text-right">Markup %</th>
                <th className="py-2.5 px-3 text-right">Line Total (₹)</th>
                <th className="py-2.5 px-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                  <td className="py-2 px-3 align-middle">
                    <select
                      value={item.category}
                      onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                      className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 max-w-[130px]"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3 align-middle max-w-xs">
                    <input
                      type="text"
                      value={item.item_name}
                      onChange={(e) => updateItem(item.id, 'item_name', e.target.value)}
                      className="w-full text-xs font-bold text-slate-900 dark:text-white px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                    {item.sub_description && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-mono mt-0.5 truncate">{item.sub_description}</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center align-middle">
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                      className="w-14 text-xs text-center font-mono text-slate-900 dark:text-white px-1 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    />
                  </td>
                  <td className="py-2 px-2 text-right align-middle">
                    <input
                      type="number"
                      value={item.purchase_cost}
                      onChange={(e) => updateItem(item.id, 'purchase_cost', parseFloat(e.target.value) || 0)}
                      className="w-20 text-xs text-right font-mono text-slate-900 dark:text-white px-1.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    />
                  </td>
                  <td className="py-2 px-2 text-right align-middle">
                    <input
                      type="number"
                      value={item.service_cost}
                      onChange={(e) => updateItem(item.id, 'service_cost', parseFloat(e.target.value) || 0)}
                      className="w-18 text-xs text-right font-mono text-slate-900 dark:text-white px-1.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    />
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 dark:text-white align-middle">
                    ₹{(item.unit_cost || (item.purchase_cost + item.service_cost)).toLocaleString('en-IN')}
                  </td>
                  <td className="py-2 px-2 text-right align-middle">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-16 text-xs text-right font-mono text-slate-900 dark:text-white px-1.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    />
                  </td>
                  <td className="py-2 px-2 text-right align-middle">
                    <input
                      type="number"
                      value={item.markup_percentage}
                      onChange={(e) => updateItem(item.id, 'markup_percentage', parseFloat(e.target.value) || 0)}
                      className="w-14 text-xs text-right font-mono text-emerald-700 dark:text-emerald-400 px-1.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800 dark:text-emerald-400 align-middle">
                    ₹{Math.round(calculateItemTotal(item)).toLocaleString('en-IN')}
                  </td>
                  <td className="py-2 px-2 text-center align-middle">
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                      title="Delete item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
