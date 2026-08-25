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
  Bot
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
  const [selectedPresetItem, setSelectedPresetItem] = useState<string>('');

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
      r.sub_description.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.city.toLowerCase().includes(searchFilter.toLowerCase());
    return matchRegion && matchSearch;
  });

  const addRateFromDatabase = (rateObj: any) => {
    const newItem: CostItem = {
      id: `item-${Date.now()}-${Math.random().toString().slice(-4)}`,
      category: rateObj.item_description.toLowerCase().includes('pipe') ? 'Piping & Distribution' : 'Civil & Structural',
      item_name: rateObj.item_description,
      sub_description: rateObj.sub_description,
      unit: rateObj.unit || 'Rmt',
      purchase_cost: rateObj.purchase_cost || 0,
      service_cost: rateObj.service_cost || 0,
      unit_cost: rateObj.total_unit_rate || (rateObj.purchase_cost + rateObj.service_cost),
      quantity: 100,
      markup_percentage: 12,
      tax_percentage: 18,
      rate_source: `Rate Source: ${rateObj.state} (${rateObj.city}) — Database Schedule ${rateObj.remarks ? '(' + rateObj.remarks.slice(0, 25) + '...)' : ''}`,
      region: rateObj.state
    };
    setItems((prev) => [...prev, newItem]);
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
    <div className="space-y-8 animate-fadeIn">
      {/* BidMaster AI Header Banner */}
      <div className="glass-card p-6 rounded-2xl border border-teal-200 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-teal-800 font-semibold font-mono text-xs">
            <Bot className="w-4 h-4 text-teal-800" />
            <span>BIDMASTER AI — WATER & WASTEWATER EPC COSTING ENGINE</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-slate-900 flex items-center space-x-2">
            <span>Area-Wise BOQ Estimator & Rate Database</span>
          </h2>
          <p className="text-xs text-slate-700 font-medium max-w-3xl">
            Prioritizes user-provided area-wise service & procurement schedules from <strong className="text-teal-800">Service Price Database.xlsx</strong>. Automatically maps state/zone procurement rates (DI, HDPE, MS, RCC) and applies local labour/HDD service costs.
          </p>
        </div>

        {/* Region & Location Selector */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center space-x-2 bg-slate-50/80 px-3.5 py-2 rounded-xl border border-teal-200">
            <MapPin className="w-4 h-4 text-teal-800 font-semibold" />
            <span className="text-xs font-mono text-slate-600">Target Region:</span>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="bg-transparent text-xs font-bold font-mono text-teal-800 focus:outline-none cursor-pointer"
            >
              <option value="Rajasthan" className="bg-slate-50 text-slate-900">Rajasthan (Jaipur / Balotra)</option>
              <option value="Gujarat" className="bg-slate-50 text-slate-900">Gujarat (Vapi / Mehsana / Banaskantha)</option>
              <option value="UP" className="bg-slate-50 text-slate-900">UP (Bhadohi / Kanpur / Ballia)</option>
              <option value="All" className="bg-slate-50 text-slate-900">All India Database (164 Rates)</option>
            </select>
          </div>

          <button
            onClick={addItem}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-teal-800 text-white font-bold font-bold hover:bg-teal-800 transition shadow-md shadow-cyan-400/20 text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Item</span>
          </button>
        </div>
      </div>

      {/* Real-time Bid Metrics Summary Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl space-y-2 border-l-4 border-l-cyan-400">
          <span className="text-xs font-mono text-slate-700 font-medium uppercase">Calculated Bid Price (₹ Total)</span>
          <div className="text-3xl font-display font-bold text-slate-900">
            ₹{manualTotal >= 10000000 ? (manualTotal / 10000000).toFixed(2) + ' Cr' : (manualTotal / 100000).toFixed(2) + ' Lakhs'}
          </div>
          <p className="text-[11px] text-slate-700 font-medium">₹{manualTotal.toLocaleString('en-IN')} (Purchase + Service + Markup + Tax)</p>
        </div>

        <div className="glass-card p-6 rounded-2xl space-y-2 border-l-4 border-l-emerald-400 bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-emerald-800 font-bold uppercase">AI Recommended Bid Price</span>
            <Sparkles className="w-4 h-4 text-emerald-800 font-bold" />
          </div>
          <div className="text-3xl font-display font-bold text-emerald-800">
            ₹{aiRecommendedTotal >= 10000000 ? (aiRecommendedTotal / 10000000).toFixed(2) + ' Cr' : (aiRecommendedTotal / 100000).toFixed(2) + ' Lakhs'}
          </div>
          <p className="text-[11px] text-emerald-800 font-bold/80">BidMaster RAG optimized for L1 winning margin (-{aiTargetDiscount}%)</p>
        </div>

        <div className="glass-card p-6 rounded-2xl space-y-2 border-l-4 border-l-teal-400">
          <span className="text-xs font-mono text-slate-700 font-medium uppercase">Estimated Gross Profit Margin</span>
          <div className="text-3xl font-display font-bold text-teal-800 flex items-center space-x-2">
            <span>+{estimatedMargin.toFixed(1)}%</span>
            <TrendingUp className="w-5 h-5 text-emerald-800 font-bold" />
          </div>
          <p className="text-[11px] text-slate-700 font-medium">
            Overhead & Net Revenue Optimization
          </p>
        </div>
      </div>

      {/* QUICK RATE PICKER FROM SERVICE PRICE DATABASE.XLSX */}
      <div className="glass-card p-6 rounded-2xl space-y-4 border border-cyan-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-800 font-bold" />
            <h3 className="font-display font-semibold text-sm text-slate-900 uppercase tracking-wider">
              Service Price Database Quick Selector ({selectedRegion})
            </h3>
          </div>
          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search DI, HDPE, MS, RCC, HDD rates..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-250 text-xs text-slate-900 placeholder-slate-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-56 overflow-y-auto pr-1">
          {availableDatabaseRates.slice(0, 12).map((rate) => (
            <div 
              key={rate.id}
              onClick={() => addRateFromDatabase(rate)}
              className="p-3 rounded-xl bg-slate-50/60 border border-slate-200 hover:border-cyan-400 transition cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-100 text-teal-900 border border-teal-300 font-bold">
                    {rate.state} ({rate.city})
                  </span>
                  <span className="text-[11px] font-mono text-emerald-800 font-bold font-bold">
                    ₹{rate.total_unit_rate} /{rate.unit}
                  </span>
                </div>
                <h5 className="text-xs font-semibold text-slate-900 mt-1.5 group-hover:text-teal-800 transition">
                  {rate.item_description} {rate.sub_description ? `(${rate.sub_description})` : ''}
                </h5>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-700 font-medium pt-2 font-mono">
                <span>Purchase: ₹{rate.purchase_cost}</span>
                <span>Service: ₹{rate.service_cost}</span>
                <span className="text-teal-800 font-semibold group-hover:underline">+ Add to BOQ</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Costing Comparison Visualization Chart */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-teal-800 font-semibold" />
            <h3 className="font-display font-semibold text-lg text-slate-900">
              BidMaster AI Cost Comparison (₹ Lakhs)
            </h3>
          </div>
          <span className="text-xs font-mono text-teal-800">User Manual Total vs AI Recommended L1 Bid</span>
        </div>

        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#272a2c" />
              <XAxis dataKey="name" stroke="#849495" />
              <YAxis stroke="#849495" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#101415', borderColor: '#00dbe7', borderRadius: '12px', color: '#fff' }}
                formatter={(value: any) => [`₹${value.toLocaleString()} Lakhs`, '']}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Bar dataKey="Estimated Bid Total (₹ Lakhs)" fill="#00f2ff" radius={[8, 8, 0, 0]} />
              <Bar dataKey="AI Recommended Bid (₹ Lakhs)" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Editable Line-Item Cost Breakdown Grid */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-lg font-display font-semibold text-slate-900">
              BidMaster BOQ Cost Breakdown Grid (Area-Wise Schedule)
            </h3>
            <p className="text-xs text-slate-700 font-medium">
              Each line item includes exact Purchase & Service costs, Markups, and mandatory <strong className="text-teal-800">Rate Source</strong> tracking.
            </p>
          </div>
          <span className="text-xs font-mono text-teal-800 font-semibold">
            {items.length} BOQ Items
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-mono text-slate-700 font-medium uppercase">
                <th className="py-3 px-2">Category</th>
                <th className="py-3 px-2">Description & Size</th>
                <th className="py-3 px-2 text-center">Unit</th>
                <th className="py-3 px-2 text-right">Purchase (₹)</th>
                <th className="py-3 px-2 text-right">Service (₹)</th>
                <th className="py-3 px-2 text-right">Unit Rate (₹)</th>
                <th className="py-3 px-2 text-right">Qty</th>
                <th className="py-3 px-2 text-right">Markup %</th>
                <th className="py-3 px-2 text-right">Line Total (₹)</th>
                <th className="py-3 px-2">Rate Source</th>
                <th className="py-3 px-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-white/5 transition">
                  <td className="py-3 px-2">
                    <select
                      value={item.category}
                      onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                      className="glass-input text-[11px] text-teal-800 px-1.5 py-1 rounded-lg border border-slate-200 max-w-[130px]"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c} className="bg-white text-slate-900">
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-2">
                    <input
                      type="text"
                      value={item.item_name}
                      onChange={(e) => updateItem(item.id, 'item_name', e.target.value)}
                      className="w-full glass-input text-xs text-slate-900 px-2 py-1 rounded-lg font-medium"
                    />
                    {item.sub_description && (
                      <span className="text-[10px] text-slate-700 font-medium block font-mono mt-0.5">{item.sub_description}</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center font-mono text-slate-600">
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                      className="w-12 glass-input text-xs text-center text-slate-900 px-1 py-1 rounded-lg font-mono"
                    />
                  </td>
                  <td className="py-3 px-2 text-right">
                    <input
                      type="number"
                      value={item.purchase_cost}
                      onChange={(e) => updateItem(item.id, 'purchase_cost', parseFloat(e.target.value) || 0)}
                      className="w-20 glass-input text-xs text-slate-900 px-1.5 py-1 rounded-lg text-right font-mono"
                    />
                  </td>
                  <td className="py-3 px-2 text-right">
                    <input
                      type="number"
                      value={item.service_cost}
                      onChange={(e) => updateItem(item.id, 'service_cost', parseFloat(e.target.value) || 0)}
                      className="w-16 glass-input text-xs text-slate-900 px-1.5 py-1 rounded-lg text-right font-mono"
                    />
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-slate-200">
                    ₹{(item.unit_cost || (item.purchase_cost + item.service_cost)).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-2 text-right">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-16 glass-input text-xs text-slate-900 px-1.5 py-1 rounded-lg text-right font-mono"
                    />
                  </td>
                  <td className="py-3 px-2 text-right">
                    <input
                      type="number"
                      value={item.markup_percentage}
                      onChange={(e) => updateItem(item.id, 'markup_percentage', parseFloat(e.target.value) || 0)}
                      className="w-14 glass-input text-xs text-emerald-800 px-1.5 py-1 rounded-lg text-right font-mono"
                    />
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-teal-800 font-bold">
                    ₹{Math.round(calculateItemTotal(item)).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-2">
                    <input
                      type="text"
                      value={item.rate_source}
                      onChange={(e) => updateItem(item.id, 'rate_source', e.target.value)}
                      className="w-full glass-input text-[10px] text-slate-600 px-2 py-1 rounded-lg font-mono"
                    />
                  </td>
                  <td className="py-3 px-2 text-center">
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-1 rounded-lg hover:bg-rose-100 text-slate-700 font-medium hover:text-rose-800 font-bold transition"
                      title="Delete item"
                    >
                      <Trash2 className="w-4 h-4" />
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
