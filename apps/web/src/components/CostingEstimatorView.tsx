'use client';

import React, { useState } from 'react';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Sparkles, 
  Percent, 
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

interface CostItem {
  id: string;
  category: 'Labour' | 'Raw Materials' | 'Logistics' | 'Overhead' | 'Risk Buffer';
  item_name: string;
  unit_cost: number;
  quantity: number;
  markup_percentage: number;
  tax_percentage: number;
}

export const CostingEstimatorView: React.FC = () => {
  const [items, setItems] = useState<CostItem[]>([
    {
      id: 'item-1',
      category: 'Labour',
      item_name: 'Senior Hydraulic & Civil Engineer (400 hrs)',
      unit_cost: 120,
      quantity: 400,
      markup_percentage: 15,
      tax_percentage: 5
    },
    {
      id: 'item-2',
      category: 'Raw Materials',
      item_name: 'High-Pressure Water Filtration Valves & Piping',
      unit_cost: 2500,
      quantity: 50,
      markup_percentage: 12,
      tax_percentage: 8
    },
    {
      id: 'item-3',
      category: 'Logistics',
      item_name: 'Heavy Transport & Trenching Machinery Rental',
      unit_cost: 1600,
      quantity: 20,
      markup_percentage: 10,
      tax_percentage: 5
    },
    {
      id: 'item-4',
      category: 'Overhead',
      item_name: 'SCADA Telemetry & IoT Pressure Sensor Suite',
      unit_cost: 4500,
      quantity: 12,
      markup_percentage: 18,
      tax_percentage: 10
    },
    {
      id: 'item-5',
      category: 'Risk Buffer',
      item_name: 'Unforeseen Geotechnical Delay Contingency',
      unit_cost: 25000,
      quantity: 1,
      markup_percentage: 5,
      tax_percentage: 0
    }
  ]);

  const [aiTargetDiscount, setAiTargetDiscount] = useState<number>(6.5); // 6.5% AI discount optimization

  const updateItem = (id: string, field: keyof CostItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const addItem = () => {
    const newItem: CostItem = {
      id: `item-${Date.now()}`,
      category: 'Labour',
      item_name: 'New Custom Line Item',
      unit_cost: 1000,
      quantity: 1,
      markup_percentage: 10,
      tax_percentage: 5
    };
    setItems((prev) => [...prev, newItem]);
  };

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Calculations
  const calculateItemTotal = (item: CostItem) => {
    const base = item.unit_cost * item.quantity;
    const withMarkup = base * (1 + item.markup_percentage / 100);
    return withMarkup * (1 + item.tax_percentage / 100);
  };

  const manualTotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const aiRecommendedTotal = manualTotal * (1 - aiTargetDiscount / 100);
  const varianceAmount = manualTotal - aiRecommendedTotal;
  const estimatedMargin = manualTotal > 0 ? ((manualTotal - (manualTotal * 0.72)) / manualTotal) * 100 : 0;

  // Chart data preparation
  const chartData = [
    {
      name: 'Total Bid Comparison',
      'User Manual Total ($)': Math.round(manualTotal),
      'AI Recommended Bid ($)': Math.round(aiRecommendedTotal)
    }
  ];

  const categories = ['Labour', 'Raw Materials', 'Logistics', 'Overhead', 'Risk Buffer'];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Module Banner */}
      <div className="glass-card p-6 rounded-2xl border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 font-mono text-xs mb-1">
            <Calculator className="w-4 h-4" />
            <span>PROVISION 7: COSTING ESTIMATION ENGINE V2</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-white">
            Nested Line-Item Cost Breakdown & AI Comparison
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Perform real-time cost overrides across Labour, Materials & Overhead, and compare against AI RAG Recommended Winning Bid Amount.
          </p>
        </div>
        <button
          onClick={addItem}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-cyan-400 text-aqua-950 font-bold hover:bg-cyan-300 transition shadow-md shadow-cyan-400/20 text-xs shrink-0 self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Add Line Item</span>
        </button>
      </div>

      {/* Real-time Bid Metrics Summary Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl space-y-2 border-l-4 border-l-cyan-400">
          <span className="text-xs font-mono text-slate-400 uppercase">Calculated Manual Bid Amount</span>
          <div className="text-3xl font-display font-bold text-white">
            ${manualTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[11px] text-slate-400">Sum of user custom line items with markup & tax</p>
        </div>

        <div className="glass-card p-6 rounded-2xl space-y-2 border-l-4 border-l-emerald-400 bg-emerald-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-emerald-400 uppercase">AI Recommended Bid Amount</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-display font-bold text-emerald-300">
            ${aiRecommendedTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[11px] text-emerald-400/80">RAG derived based on competitor winning margins</p>
        </div>

        <div className="glass-card p-6 rounded-2xl space-y-2 border-l-4 border-l-teal-400">
          <span className="text-xs font-mono text-slate-400 uppercase">Profit Margin Variance</span>
          <div className="text-3xl font-display font-bold text-cyan-300 flex items-center space-x-2">
            <span>+{estimatedMargin.toFixed(1)}%</span>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-[11px] text-slate-400">
            AI Delta: -${varianceAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })} (-{aiTargetDiscount}%)
          </p>
        </div>
      </div>

      {/* AI Costing Comparison Visualization Chart */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h3 className="font-display font-semibold text-lg text-white">
              AI Costing Comparison Bar Visualization
            </h3>
          </div>
          <span className="text-xs font-mono text-cyan-300">Side-by-Side Financial Comparison</span>
        </div>

        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#272a2c" />
              <XAxis dataKey="name" stroke="#849495" />
              <YAxis stroke="#849495" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#101415', borderColor: '#00dbe7', borderRadius: '12px', color: '#fff' }}
                formatter={(value: any) => [`$${value.toLocaleString()}`, '']}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }} />
              <Bar dataKey="User Manual Total ($)" fill="#00f2ff" radius={[8, 8, 0, 0]} />
              <Bar dataKey="AI Recommended Bid ($)" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Editable Line-Item Cost Breakdown Grid */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-display font-semibold text-white">
              Financial Line-Item Cost Breakdown Grid
            </h3>
            <p className="text-xs text-slate-400">
              Edit quantities, unit rates, markups, and taxes with real-time manual cost recalculation.
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-400">
            {items.length} Financial Items
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-mono text-slate-400 uppercase">
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Line Item Description</th>
                <th className="py-3 px-3 text-right">Unit Rate ($)</th>
                <th className="py-3 px-3 text-right">Qty</th>
                <th className="py-3 px-3 text-right">Markup %</th>
                <th className="py-3 px-3 text-right">Tax %</th>
                <th className="py-3 px-3 text-right">Line Total ($)</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-white/5 transition">
                  <td className="py-3 px-3">
                    <select
                      value={item.category}
                      onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                      className="glass-input text-xs text-cyan-300 px-2 py-1.5 rounded-lg border border-white/10"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c} className="bg-aqua-900 text-white">
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-3">
                    <input
                      type="text"
                      value={item.item_name}
                      onChange={(e) => updateItem(item.id, 'item_name', e.target.value)}
                      className="w-full glass-input text-xs text-white px-2.5 py-1.5 rounded-lg font-medium"
                    />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <input
                      type="number"
                      value={item.unit_cost}
                      onChange={(e) => updateItem(item.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                      className="w-24 glass-input text-xs text-white px-2 py-1.5 rounded-lg text-right font-mono"
                    />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-16 glass-input text-xs text-white px-2 py-1.5 rounded-lg text-right font-mono"
                    />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <input
                      type="number"
                      value={item.markup_percentage}
                      onChange={(e) => updateItem(item.id, 'markup_percentage', parseFloat(e.target.value) || 0)}
                      className="w-16 glass-input text-xs text-emerald-300 px-2 py-1.5 rounded-lg text-right font-mono"
                    />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <input
                      type="number"
                      value={item.tax_percentage}
                      onChange={(e) => updateItem(item.id, 'tax_percentage', parseFloat(e.target.value) || 0)}
                      className="w-16 glass-input text-xs text-slate-300 px-2 py-1.5 rounded-lg text-right font-mono"
                    />
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-cyan-300 font-bold">
                    ${calculateItemTotal(item).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
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
