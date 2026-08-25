'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  FileText, 
  Phone, 
  Mail, 
  MapPin, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Briefcase, 
  ShieldCheck, 
  TrendingUp, 
  Users, 
  Wrench, 
  X, 
  Loader2,
  ExternalLink
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface CompanyRecord {
  id: string;
  name: string;
  type: 'Desire Energy' | 'JV Partner' | 'Competitor' | 'Other';
  profile: string;
  registered_address: string;
  corporate_address: string;
  contact_details: {
    phone?: string;
    mobile?: string;
    email?: string;
    contact_person?: string;
  };
  cin_registration: string;
  gst_number: string;
  pan_number: string;
  annual_turnover: Record<string, number>;
  average_turnover: number;
  net_worth: number;
  solvency: number;
  solvency_amount?: number;
  technical_experience: string;
  past_projects: string[];
  work_orders: any[];
  client_details: string[];
  sector_experience: string[];
  equipment_machinery: string[];
  manpower_technical_staff: string[];
  certifications: string[];
  statutory_docs: string[];
  uploaded_documents: string[];
}

export const CompanyDetailsView: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('All');
  const [selectedCompany, setSelectedCompany] = useState<CompanyRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form State for Add / Edit
  const [formData, setFormData] = useState<Partial<CompanyRecord>>({
    name: '',
    type: 'JV Partner',
    profile: '',
    registered_address: '',
    corporate_address: '',
    contact_details: { phone: '', mobile: '', email: '', contact_person: '' },
    cin_registration: '',
    gst_number: '',
    pan_number: '',
    average_turnover: 0,
    net_worth: 0,
    solvency: 0,
    technical_experience: '',
    past_projects: [],
    work_orders: [],
    client_details: [],
    sector_experience: [],
    equipment_machinery: [],
    manpower_technical_staff: [],
    certifications: [],
    statutory_docs: [],
    uploaded_documents: []
  });

  // Fetch Companies on Mount
  const fetchCompanies = async () => {
    setLoading(true);
    let loaded: CompanyRecord[] = [];
    try {
      const res = await fetch(`${API_BASE_URL}/companies`);
      if (res.ok) {
        const data = await res.json();
        if (data.companies && Array.isArray(data.companies)) {
          loaded = data.companies;
        }
      }
    } catch (e) {}

    if (loaded.length === 0 && isSupabaseConfigured && supabase) {
      try {
        const { data: dbComps } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
        if (dbComps && dbComps.length > 0) loaded = dbComps as CompanyRecord[];
      } catch (e) {}
    }

    setCompanies(loaded);
    setLoading(false);
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      id: `comp-${Date.now()}`,
      name: '',
      type: 'JV Partner',
      profile: '',
      registered_address: '',
      corporate_address: '',
      contact_details: { phone: '', mobile: '', email: '', contact_person: '' },
      cin_registration: '',
      gst_number: '',
      pan_number: '',
      average_turnover: 0,
      net_worth: 0,
      solvency: 0,
      technical_experience: '',
      past_projects: [],
      work_orders: [],
      client_details: [],
      sector_experience: [],
      equipment_machinery: [],
      manpower_technical_staff: [],
      certifications: [],
      statutory_docs: [],
      uploaded_documents: []
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (comp: CompanyRecord) => {
    setFormData(comp);
    setIsModalOpen(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setIsSaving(true);
    const savePayload = {
      ...formData,
      id: formData.id || `comp-${Date.now()}`
    };

    try {
      await fetch(`${API_BASE_URL}/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savePayload)
      });
    } catch (e) {}

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('companies').upsert(savePayload, { onConflict: 'id' });
      } catch (e) {}
    }

    await fetchCompanies();
    setIsSaving(false);
    setIsModalOpen(false);
  };

  const handleDeleteCompany = async (id: string) => {
    if (!confirm('Are you sure you want to delete this master company record?')) return;
    try {
      await fetch(`${API_BASE_URL}/companies/${id}`, { method: 'DELETE' });
    } catch (e) {}

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('companies').delete().eq('id', id);
      } catch (e) {}
    }
    setCompanies(prev => prev.filter(c => c.id !== id));
  };

  const filteredCompanies = companies.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.profile.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.gst_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedTypeFilter === 'All' || c.type === selectedTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 rounded-2xl border border-slate-200">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-teal-700 border border-teal-200">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">Master Company Database</h1>
              <p className="text-xs text-slate-500">
                Centralized corporate records for Desire Energy, JV Partners, Competitors, and Bidding Consortiums.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-aqua-950 font-bold text-xs hover:brightness-110 shadow-lg shadow-cyan-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Master Company</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-card p-4 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search company name, GST, profile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
          {['All', 'Desire Energy', 'JV Partner', 'Competitor', 'Other'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedTypeFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                selectedTypeFilter === type
                  ? 'bg-cyan-500/20 text-teal-800 border border-teal-300 font-semibold'
                  : 'bg-white/5 text-slate-500 hover:text-white hover:bg-white/10'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 glass-card rounded-2xl border border-slate-200 space-y-3">
          <Loader2 className="w-8 h-8 text-teal-700 animate-spin" />
          <span className="text-xs text-slate-500 font-mono">Loading master companies database...</span>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 glass-card rounded-2xl border border-slate-200 text-center space-y-3">
          <Building2 className="w-10 h-10 text-slate-600" />
          <h3 className="text-sm font-semibold text-white">No Companies Found</h3>
          <p className="text-xs text-slate-500 max-w-md">
            No company profiles match your current search or filter criteria. Click "Add Master Company" to create one.
          </p>
        </div>
      ) : (
        /* Company Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((comp) => (
            <div
              key={comp.id}
              className="glass-card p-5 rounded-2xl border border-slate-200 hover:border-teal-200 transition-all flex flex-col justify-between space-y-4 group"
            >
              {/* Top Meta */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider ${
                        comp.type === 'Desire Energy'
                          ? 'bg-cyan-500/20 text-teal-800 border border-teal-200'
                          : comp.type === 'JV Partner'
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                          : comp.type === 'Competitor'
                          ? 'bg-purple-500/20 text-purple-800 border border-purple-200'
                          : 'bg-slate-500/20 text-slate-600 border border-slate-500/30'
                      }`}
                    >
                      {comp.type}
                    </span>
                    <h3 className="text-sm font-bold text-white group-hover:text-teal-800 transition-colors line-clamp-1">
                      {comp.name}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={() => handleOpenEdit(comp)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-teal-800/20 text-slate-600 hover:text-teal-800 transition-all"
                      title="Edit Company"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {comp.type !== 'Desire Energy' && (
                      <button
                        onClick={() => handleDeleteCompany(comp.id)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-100 text-slate-600 hover:text-rose-700 transition-all"
                        title="Delete Company"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                  {comp.profile || 'No corporate profile summary available.'}
                </p>

                {/* Financial Metrics Summary */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-900/60 border border-slate-200 text-center">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Avg Turnover</span>
                    <span className="text-xs font-bold text-teal-800">₹{comp.average_turnover || 0} Cr</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Net Worth</span>
                    <span className="text-xs font-bold text-teal-300">₹{comp.net_worth || 0} Cr</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Solvency</span>
                    <span className="text-xs font-bold text-amber-800">₹{comp.solvency || 0} Cr</span>
                  </div>
                </div>

                {/* Identifiers & Details */}
                <div className="space-y-1.5 text-xs text-slate-500 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-slate-500">GSTIN:</span>
                    <span className="font-mono text-white text-[11px] font-semibold">{comp.gst_number || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-slate-500">PAN:</span>
                    <span className="font-mono text-white text-[11px] font-semibold">{comp.pan_number || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-slate-500">CIN:</span>
                    <span className="font-mono text-white text-[11px] font-semibold truncate max-w-[160px]">{comp.cin_registration || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => setSelectedCompany(comp)}
                  className="w-full py-2 rounded-xl bg-white/5 hover:bg-teal-50 text-teal-800 hover:text-cyan-200 border border-slate-200 hover:border-teal-200 text-xs font-semibold flex items-center justify-center space-x-2 transition-all"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>View Full Profile & Experience</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Full Profile Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-teal-800 border border-teal-200">
                  {selectedCompany.type}
                </span>
                <h2 className="text-xl font-bold text-white">{selectedCompany.name}</h2>
                <p className="text-xs text-slate-500">{selectedCompany.registered_address}</p>
              </div>
              <button
                onClick={() => setSelectedCompany(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-teal-700 uppercase tracking-wider text-[11px] font-mono">Company Summary</h4>
                  <p className="leading-relaxed text-slate-600 bg-slate-900/50 p-3.5 rounded-xl border border-slate-200">
                    {selectedCompany.profile || 'No corporate summary.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-teal-700 uppercase tracking-wider text-[11px] font-mono">Contact & Representation</h4>
                  <div className="bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-teal-700 shrink-0" />
                      <span>Contact: {selectedCompany.contact_details?.contact_person || 'N/A'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-teal-700 shrink-0" />
                      <span>Phone: {selectedCompany.contact_details?.phone || selectedCompany.contact_details?.mobile || 'N/A'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-teal-700 shrink-0" />
                      <span>Email: {selectedCompany.contact_details?.email || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-teal-700 uppercase tracking-wider text-[11px] font-mono">Financial Standings (Audited)</h4>
                  <div className="bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 space-y-2 font-mono">
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-500">3-Year Average Turnover:</span>
                      <span className="font-bold text-teal-800">₹{selectedCompany.average_turnover} Cr</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-500">Audited Net Worth:</span>
                      <span className="font-bold text-teal-300">₹{selectedCompany.net_worth} Cr</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bank Solvency Limit:</span>
                      <span className="font-bold text-amber-800">₹{selectedCompany.solvency} Cr</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-teal-700 uppercase tracking-wider text-[11px] font-mono">Technical & Work Orders</h4>
                  <p className="bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                    {selectedCompany.technical_experience || 'No technical experience record.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedCompany(null)}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 text-aqua-950 font-bold text-xs hover:brightness-110"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Company Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleSaveCompany} className="glass-card w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-lg font-bold text-white">
                {formData.id ? 'Edit Master Company Profile' : 'Add New Master Company'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-500 font-mono">Company Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-mono">Company Category / Type *</label>
                <select
                  value={formData.type || 'JV Partner'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Desire Energy">Desire Energy</option>
                  <option value="JV Partner">JV Partner</option>
                  <option value="Competitor">Competitor</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-slate-500 font-mono">Company Profile Summary</label>
                <textarea
                  rows={2}
                  value={formData.profile || ''}
                  onChange={(e) => setFormData({ ...formData, profile: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-mono">Registered Address</label>
                <input
                  type="text"
                  value={formData.registered_address || ''}
                  onChange={(e) => setFormData({ ...formData, registered_address: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-mono">Contact Person & Phone</label>
                <input
                  type="text"
                  value={formData.contact_details?.contact_person || ''}
                  onChange={(e) => setFormData({ ...formData, contact_details: { ...formData.contact_details, contact_person: e.target.value } })}
                  placeholder="e.g. Satish Goyal (9829147776)"
                  className="w-full bg-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-mono">GSTIN Number</label>
                <input
                  type="text"
                  value={formData.gst_number || ''}
                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-mono">PAN Number</label>
                <input
                  type="text"
                  value={formData.pan_number || ''}
                  onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-mono">Average Annual Turnover (₹ Cr)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.average_turnover || 0}
                  onChange={(e) => setFormData({ ...formData, average_turnover: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-mono">Audited Net Worth (₹ Cr)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.net_worth || 0}
                  onChange={(e) => setFormData({ ...formData, net_worth: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-slate-500 font-mono">Technical Experience & Key Projects</label>
                <textarea
                  rows={2}
                  value={formData.technical_experience || ''}
                  onChange={(e) => setFormData({ ...formData, technical_experience: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-600 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-aqua-950 font-bold text-xs hover:brightness-110 flex items-center space-x-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Save Company to Database</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
