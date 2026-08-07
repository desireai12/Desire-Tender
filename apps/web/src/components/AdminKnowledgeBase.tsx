'use client';

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { 
  Upload, 
  FileText, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  Database, 
  Tag, 
  Layers, 
  AlertCircle,
  Plus,
  ShieldAlert
} from 'lucide-react';

import { DepartmentRole, KnowledgeModuleType } from '@/lib/types';

interface AdminKnowledgeBaseProps {
  activeRole: DepartmentRole;
}

export const AdminKnowledgeBase: React.FC<AdminKnowledgeBaseProps> = ({ activeRole }) => {
  const [activeModule, setActiveModule] = useState<KnowledgeModuleType>('company');

  if (activeRole !== 'Admin') {
    return (
      <div className="glass-card p-12 rounded-2xl text-center space-y-4 border-2 border-rose-500/40">
        <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto animate-bounce" />
        <h3 className="text-xl font-display font-bold text-white">ACCESS DENIED — ADMIN BACKEND PORTAL ONLY</h3>
        <p className="text-xs text-slate-300 max-w-md mx-auto">
          Knowledge Base management is restricted exclusively to System Administrators. Normal department accounts cannot directly touch or modify AI training knowledge assets.
        </p>
        <div className="text-xs font-mono text-cyan-400 pt-2">
          Current Role: {activeRole} (Switch role to 'Admin' in the top header to access).
        </div>
      </div>
    );
  }

  const [documents, setDocuments] = useState<Array<{
    id: string;
    module: KnowledgeModuleType;
    title: string;
    filename: string;
    version: string;
    uploaded_by: string;
    uploaded_at: string;
    approval_status: 'Approved' | 'Pending Review' | 'Archived';
    expiry_date?: string;
    chunk_count: number;
    tags: string[];
    summary: string;
  }>>([
    {
      id: 'doc-m1-01',
      module: 'company',
      title: 'Desire Energy Corporate Credentials & SOP 2026',
      filename: 'Desire_Energy_Corporate_Profile_2026.pdf',
      version: 'v2.4',
      uploaded_by: 'MD Office (Gaurav Gupta)',
      uploaded_at: '2026-08-01 10:00:00',
      approval_status: 'Approved',
      chunk_count: 8,
      tags: ['Corporate Profile', 'Turnover', 'JJM 100k Villages'],
      summary: 'Company profile, 1,00,000+ village operations, AquaLogix IoT/AI telemetry, and executive leadership roster.'
    },
    {
      id: 'doc-m2-01',
      module: 'certificates',
      title: 'Class-A PHED Contractor & ISO 9001/14001 Licenses',
      filename: 'Class_A_PHED_and_ISO_Certificates_Combined.pdf',
      version: 'v3.1',
      uploaded_by: 'Compliance (Mohit Modi)',
      uploaded_at: '2026-08-02 11:30:00',
      approval_status: 'Approved',
      expiry_date: '2028-12-31',
      chunk_count: 6,
      tags: ['Class-A License', 'ISO 9001:2015', 'ISO 14001:2015'],
      summary: 'Public Health Engineering Dept Class-A registration and active ISO quality & safety certs.'
    },
    {
      id: 'doc-m3-01',
      module: 'competitor',
      title: 'Indian Water & Solar Competitor Bidding Intel 2025-2026',
      filename: 'L&T_Wabag_Shakti_Competitor_Analysis.pdf',
      version: 'v1.8',
      uploaded_by: 'BD Team (Ankit Purohit)',
      uploaded_at: '2026-08-03 14:15:00',
      approval_status: 'Approved',
      chunk_count: 12,
      tags: ['Competitor Intel', 'L&T', 'Wabag', 'Shakti Pumps'],
      summary: 'Historical win rates, discount margins, vulnerabilities, and counter-strategies for rivals.'
    },
    {
      id: 'doc-m4-01',
      module: 'historical_boq',
      title: 'Historical BOQ Unit Rates & Cost Estimation Database',
      filename: 'JJM_Solar_Pumping_Historical_BOQ_Rates.xlsx',
      version: 'v4.0',
      uploaded_by: 'Estimation (Deepak Khandelwal)',
      uploaded_at: '2026-08-04 09:45:00',
      approval_status: 'Approved',
      chunk_count: 15,
      tags: ['BOQ Rates', 'Unit Pricing', 'HDPE Pipe Cost'],
      summary: 'Itemized BOQ historical rates for HDPE pipelines, solar pump controllers, and SCADA sensors.'
    }
  ]);

  const handleDelete = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 rounded-2xl border border-cyan-500/20">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-mono mb-1">
            <Database className="w-4 h-4" />
            <span>ADMIN COMPANY RECORDS PORTAL</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-white">
            Company Records Repository & Asset Versioning
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage company credentials, certificate registries, competitor intelligence, and historical BOQ repositories.
          </p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs text-center shrink-0">
          Total Chunks: {documents.reduce((acc, d) => acc + d.chunk_count, 0)}
        </div>
      </div>

      {/* 5 Backend Knowledge Module Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { id: 'company' as KnowledgeModuleType, title: 'Module 1: Company', desc: 'Profiles, SOPs & Staff' },
          { id: 'certificates' as KnowledgeModuleType, title: 'Module 2: Certificates', desc: 'ISO, GST, Expiry Dates' },
          { id: 'competitor' as KnowledgeModuleType, title: 'Module 3: Competitors', desc: 'Prices & Win/Loss' },
          { id: 'historical_boq' as KnowledgeModuleType, title: 'Module 4: Past BOQs', desc: 'Unit Rates & Anomaly' },
          { id: 'versioning' as KnowledgeModuleType, title: 'Module 5: Versioning', desc: 'Audit & Approval Logs' },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setActiveModule(m.id)}
            className={`p-4 rounded-xl border text-left transition-all ${
              activeModule === m.id
                ? 'bg-gradient-to-br from-cyan-950 to-teal-900 border-cyan-400 shadow-lg shadow-cyan-500/15'
                : 'bg-aqua-950/40 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="font-display font-bold text-xs text-white">{m.title}</div>
            <div className="text-[11px] text-slate-400 truncate mt-0.5">{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Active Module Asset List */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-display font-semibold text-white">
              {activeModule.toUpperCase()} Knowledge Repository Assets
            </h3>
            <p className="text-xs text-slate-400">
              Only latest approved versions are queried by the RAG evaluation engine.
            </p>
          </div>
          <button
            onClick={() => alert(`Upload dialog for ${activeModule} module opened.`)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-cyan-400 text-aqua-950 font-bold text-xs hover:bg-cyan-300 transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add {activeModule} Asset</span>
          </button>
        </div>

        <div className="space-y-3">
          {documents
            .filter((d) => activeModule === 'versioning' || d.module === activeModule)
            .map((doc) => (
              <div key={doc.id} className="p-4 rounded-xl bg-aqua-950/60 border border-white/5 space-y-2 hover:border-cyan-500/30 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <FileText className="w-5 h-5 text-cyan-400 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm text-white">{doc.title}</h4>
                      <p className="text-[11px] text-slate-400">{doc.filename} • Version <span className="text-cyan-300 font-mono">{doc.version}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {doc.approval_status}
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      {doc.chunk_count} Vector Chunks
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 pl-7">{doc.summary}</p>

                <div className="flex items-center justify-between pt-2 pl-7 text-[11px] text-slate-400 font-mono border-t border-white/5">
                  <span>Uploaded By: {doc.uploaded_by} on {doc.uploaded_at}</span>
                  {doc.expiry_date && <span className="text-amber-300">Expires: {doc.expiry_date}</span>}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
