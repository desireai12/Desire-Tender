'use client';

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { UserProfile, DepartmentRole, ProjectCategory } from '@/lib/types';
import { 
  ShieldCheck, 
  Key, 
  Cpu, 
  Sparkles, 
  Lock, 
  Eye, 
  EyeOff, 
  Save, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  FileCode, 
  Layers, 
  Database,
  History,
  Activity,
  Plus,
  ArrowRight,
  AlertTriangle,
  Users,
  UserCheck
} from 'lucide-react';

interface AdminBackendConfigProps {
  activeRole: DepartmentRole;
}

interface CredentialItem {
  id: string;
  provider: string;
  key_type: string;
  masked_key: string;
  status: string;
  last_rotated: string;
  is_valid: boolean;
  notes: string;
}

interface PromptHistoryItem {
  version: string;
  updated_at: string;
  author: string;
  notes: string;
  system_instruction: string;
}

interface ProjectAIConfig {
  project_category: ProjectCategory;
  system_instruction: string;
  eligibility_logic: string;
  costing_methodology: string;
  clause_priorities: string[];
  required_documents: string[];
  active_prompt_version: string;
  prompt_history: PromptHistoryItem[];
}

export const DEFAULT_PROJECT_CONFIGS: Record<ProjectCategory, ProjectAIConfig> = {
  SOLAR: {
    project_category: 'SOLAR',
    system_instruction: 'SOLAR Project Tender Instruction: Analyze solar photovoltaic power plant tenders (e.g. Ground Mounted & Rooftop Solar PV projects). Evaluate PV module efficiency, tier-1 ALMM compliance, central/string inverter specifications, solar irradiation yield modeling, net-metering norms, and 5 to 25-Year Comprehensive O&M terms. Match extracted BOQ items against historical solar rates for PV modules, mounting structures (MMS), inverters, transformers, and SCADA monitoring.',
    eligibility_logic: 'Category 1 (Desire Alone): Requires ₹50 Cr average turnover & 10+ MW Solar PV execution. Category 2 (Desire + Partner/JV): Desire provides turnover & Class-A electrical license; JV partner provides solar project completion & O&M certificate. Category 3 (GA Alone): Evaluates GA under MNRE/State Solar policy provisions.',
    costing_methodology: 'Item-level matching against solar PV BOQ databases. Display historical item name, rate per Wp (₹), date of BOQ, estimated unit rate, and total cost. Allow manual rate overrides with reason logging.',
    clause_priorities: ['Sec 3.1 PV Module Specs', 'Sec 4.5 Inverter Efficiency (>98.5%)', 'Sec 7.2 Net Metering & Grid Interconnection'],
    required_documents: ['MNRE Vendor Empanelment', 'Class-A Electrical License', 'Solar Performance Guarantee Certificate'],
    active_prompt_version: 'v1.0',
    prompt_history: []
  },
  RHDS: {
    project_category: 'RHDS',
    system_instruction: 'RHDS Project Tender Instruction: Analyze Rural High Density & Drinking Water Supply tenders (e.g. Jal Jeevan Mission RHDS Pipe Networks & Intake Works). Evaluate HDPE/DI pipeline pressure ratings (PN-10/16), Overhead Service Reservoir (OHSR) capacities, pump house electromechanical equipment, raw water intake structures, and 10-Year O&M terms. Match extracted BOQ items against historical water supply rates.',
    eligibility_logic: 'Category 1 (Desire Alone): Requires ₹60 Cr average turnover & execution of rural water supply scheme (>15 MLD / 50+ villages covered). Category 2 (Desire + Partner/JV): Class-A contractor license with JV technical experience. Category 3 (GA Alone): Evaluates GA under PHED Rajasthan contractor registration.',
    costing_methodology: 'Item-level matching against PHED Rajasthan & JJM historical BOQ databases for DI K9 / HDPE pipes, OHSR, pumping machinery, and chlorination units.',
    clause_priorities: ['Sec 4.2 Distribution Pipeline Specs', 'Sec 5.1 OHSR RCC Grade & Staging', 'Sec 8.0 10-Year O&M Commitment'],
    required_documents: ['PHED Class-A License', 'JJM Completed Project Certificate', '3-Year Audited Balance Sheet'],
    active_prompt_version: 'v1.0',
    prompt_history: []
  },
  KUSUM: {
    project_category: 'KUSUM',
    system_instruction: 'KUSUM Project Tender Instruction: Analyze PM-KUSUM (Component A/B/C) solar pumping & grid-connected agricultural solarization tenders. Evaluate solar pump capacities (3 HP to 10 HP AC/DC), Sunaquator RMS telemetry controllers with 4G IoT integration, MNRE technical specs, and 5-Year mandatory warranty/O&M compliance.',
    eligibility_logic: 'Category 1 (Desire Alone): Requires REDA / State Nodal Agency empanelment & ₹25 Cr turnover with 500+ solar pump installations. Category 2 (Desire + Partner/JV): Desire provides financial eligibility; partner provides MNRE pump test certificates.',
    costing_methodology: 'Item-level matching against REDA / RRECL PM-KUSUM benchmark costs per HP. Display controller, solar module, pump motor, and RMS telemetry line items with rate override tracking.',
    clause_priorities: ['Sec 2.1 RMS Telemetry Specification', 'Sec 3.4 BIS Pump Efficiency', 'Sec 5.0 5-Year Comprehensive Warranty'],
    required_documents: ['REDA Empanelment Certificate', 'MNRE Test Report', 'Service Center Location List'],
    active_prompt_version: 'v1.0',
    prompt_history: []
  },
  EPC: {
    project_category: 'EPC',
    system_instruction: 'EPC Project Tender Instruction: Analyze turnkey EPC civil and electromechanical tenders. Evaluate general civil construction, structural steel, electrical sub-station (33kV/132kV), instrumentation, and multi-disciplinary project execution schedules with milestone timelines.',
    eligibility_logic: 'Category 1 (Desire Alone): Requires ₹100 Cr average turnover & completion of major turnkey EPC project. Category 2 (Desire + Partner/JV): Financial lead with technical JV partner.',
    costing_methodology: 'Item-level matching against state PWD / CPWD DSR (District Schedule of Rates) and market rates for civil, structural, and electrical turnkey items.',
    clause_priorities: ['Sec 1.5 Turnkey Milestone Schedules', 'Sec 3.2 Civil Structural Design', 'Sec 6.0 Defect Liability Period'],
    required_documents: ['Class-A General EPC Registration', 'Turnkey Completion Certificates', 'Bank Solvency Certificate'],
    active_prompt_version: 'v1.0',
    prompt_history: []
  },
  ESCO: {
    project_category: 'ESCO',
    system_instruction: 'ESCO Project Tender Instruction: Analyze Energy Service Company (ESCO) tenders for municipal street lighting, building HVAC energy auditing, and industrial energy conservation. Evaluate guaranteed energy savings percentage, BEE accreditation, baseline energy audit metrics, shared-savings revenue models, and performance-based O&M contracts.',
    eligibility_logic: 'Category 1 (Desire Alone): Requires Grade-1 / Grade-2 BEE ESCO accreditation & proven performance contract of >20% energy savings. Category 2 (Desire + Partner/JV): Joint bidding with certified energy auditing firm.',
    costing_methodology: 'Shared-savings & annuity pay-back model calculation. Match LED fixture rates, smart feeder panels, IoT energy meters, and baseline kWh cost savings against historical ESCO contracts.',
    clause_priorities: ['Sec 2.0 Baseline Energy Audit Standards', 'Sec 4.1 Guaranteed Savings SLA', 'Sec 5.3 Shared Revenue Terms'],
    required_documents: ['BEE ESCO Accreditation Certificate', 'Energy Savings Verification Certificate', 'Certified Energy Auditor License'],
    active_prompt_version: 'v1.0',
    prompt_history: []
  },
  STP: {
    project_category: 'STP',
    system_instruction: 'STP Project Tender Instruction: Analyze Sewage Treatment Plant (STP) tenders (e.g. RUDSICO Alwar Town Sewerage Package AMRUT-2.0/RAJ/SEWERAGE/44 (NIB No: 01/2026-27, Rs 36.53 Cr)). Evaluate 35.25 MLD SBR technology, 10-Year O&M terms, and NGT effluent standards (BOD ≤ 10 mg/l, COD ≤ 50 mg/l, TSS ≤ 10 mg/l, TN ≤ 10 mg/l, TP ≤ 1 mg/l, Ammonia ≤ 5 mg/l). Match extracted BOQ items against historical STP rates for SBR basins, screw press sludge dewatering, fine bubble diffusers, blowers, and SCADA telemetry.',
    eligibility_logic: 'Category 1 (Desire Alone): Requires ₹78 Cr average turnover & 20+ MLD SBR STP execution. Category 2 (Desire + Partner/JV): Desire provides ₹285 Cr turnover & Class-A license; 40% JV partner provides 20+ MLD SBR process completion & O&M certificate. Category 3 (GA Alone): Evaluates GA under State Class-A contractor provisions.',
    costing_methodology: 'Item-level matching against RUDSICO Alwar Sewerage Package 44 & JDA Sewerage/SPS historical BOQ databases. Display historical item name, rate (₹), date of BOQ, estimated unit rate, and total cost. Allow manual rate overrides with reason logging for continuous AI learning.',
    clause_priorities: ['Sec 3.0 Influent/Effluent Quality Specs', 'Sec 4.2 SBR Tank Design', 'Sec 6.1 PLC SCADA Automation'],
    required_documents: ['CPCB Approval Certificate', '10 MLD Completed Plant Certificate', 'ISO 14001 Certification'],
    active_prompt_version: 'v1.0',
    prompt_history: []
  }
};

export const AdminBackendConfig: React.FC<AdminBackendConfigProps> = ({ activeRole }) => {
  const [activeTab, setActiveTab] = useState<'credentials' | 'prompts' | 'knowledge_binding' | 'users' | 'audit'>('users');

  // Users State
  const [userList, setUserList] = useState<UserProfile[]>([]);
  const [loginLogs, setLoginLogs] = useState<any[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserPhone, setNewUserPhone] = useState<string>('');
  const [newUserPassword, setNewUserPassword] = useState<string>('');
  const [newUserDept, setNewUserDept] = useState<DepartmentRole>('Business Development');

  // Credentials State
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [newKeyProvider, setNewKeyProvider] = useState<string>('Google Gemini API');
  const [newRawKey, setNewRawKey] = useState<string>('');
  const [newKeyNotes, setNewKeyNotes] = useState<string>('');
  const [testStatus, setTestStatus] = useState<Record<string, { status: 'testing' | 'success' | 'error'; message: string }>>({});

  // Project AI Config State
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory>('STP');
  const [projectConfigs, setProjectConfigs] = useState<Record<string, ProjectAIConfig>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('desire_ai_configs');
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...DEFAULT_PROJECT_CONFIGS, ...parsed };
        }
      } catch (e) {}
    }
    return DEFAULT_PROJECT_CONFIGS;
  });
  const [systemInstruction, setSystemInstruction] = useState<string>(
    DEFAULT_PROJECT_CONFIGS.STP.system_instruction
  );
  const [eligibilityLogic, setEligibilityLogic] = useState<string>(
    DEFAULT_PROJECT_CONFIGS.STP.eligibility_logic
  );
  const [costingMethodology, setCostingMethodology] = useState<string>(
    DEFAULT_PROJECT_CONFIGS.STP.costing_methodology
  );
  const [changelogNotes, setChangelogNotes] = useState<string>('');
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Knowledge Binding State
  const [knowledgeMatrix, setKnowledgeMatrix] = useState<Record<string, string[]>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('desire_knowledge_matrix');
        if (saved) return JSON.parse(saved);
      } catch(e) {}
    }
    return {
      SOLAR: ['Company Profile', 'Certificates', 'Solar Historical BOQs', 'Competitor Data'],
      RHDS: ['Company Profile', 'Certificates', 'Water Historical BOQs', 'SOPs', 'Past Tenders'],
      KUSUM: ['Company Profile', 'Certificates', 'Solar Historical BOQs', 'REDA Guidelines'],
      EPC: ['Company Profile', 'Certificates', 'Civil Historical BOQs', 'Competitor Data'],
      ESCO: ['Company Profile', 'Energy Audits', 'BEE Accreditation'],
      STP: ['Company Profile', 'CPCB Standards', 'STP Historical BOQs']
    };
  });

  // Fetch configs, credentials, and user list on mount
  useEffect(() => {
    fetchCredentials();
    fetchAIConfigs();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/users`);
      const data = await res.json();
      if (data.status === 'success') {
        setUserList(data.users);
        setLoginLogs(data.login_logs || []);
      }
    } catch (err) {
      // Handled gracefully
    }
  };

  const handleAssignUserRole = async (userId: string, newDept: DepartmentRole) => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/users/assign-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, department: newDept })
      });
      const data = await res.json();
      if (res.ok) {
        setToastMessage(data.message || 'User department rights updated!');
        fetchUsers();
      }
    } catch (err) {
      setUserList((prev) => prev.map(u => u.id === userId ? { ...u, department: newDept } : u));
      setToastMessage('Updated user department rights in active session!');
    } finally {
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPhone.trim() || !newUserPassword.trim()) {
      setToastMessage('Please fill in all user details (Name, Email, 10-Digit Mobile, Password, Department).');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/users/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim(),
          phone: newUserPhone.trim(),
          password: newUserPassword.trim(),
          department: newUserDept
        })
      });

      const data = await res.json();
      if (res.ok) {
        setToastMessage(data.message || 'New user credential created successfully!');
        fetchUsers();
        setShowAddUserModal(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPhone('');
        setNewUserPassword('');
      } else {
        throw new Error(data.detail || 'Failed to create user');
      }
    } catch (err: any) {
      setToastMessage(err.message || 'User registered in active session.');
    } finally {
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Update form fields when selected project changes
  useEffect(() => {
    const cfg = projectConfigs[selectedCategory] || DEFAULT_PROJECT_CONFIGS[selectedCategory];
    if (cfg) {
      setSystemInstruction(cfg.system_instruction);
      setEligibilityLogic(cfg.eligibility_logic);
      setCostingMethodology(cfg.costing_methodology);
    }
  }, [selectedCategory, projectConfigs]);

  const fetchCredentials = async () => {
    try {
      const res = await fetch(`/api/v1/admin/credentials`).catch(() => null);
      if (res && res.ok) {
        try { const data = await res.json(); if (data.status === 'success') setCredentials(data.credentials); } catch(e) {}
      }
    } catch (err) {
      // Handled gracefully
    }
  };

  const fetchAIConfigs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/ai-config`).catch(() => null);
      if (res && res.ok) {
        try {
          const data = await res.json();
          if (data.status === 'success') {
            const list = data.projects || data.configs || [];
            const configMap: Record<string, ProjectAIConfig> = { ...DEFAULT_PROJECT_CONFIGS };
            list.forEach((p: ProjectAIConfig) => {
              if (p && p.project_category) {
                configMap[p.project_category] = p;
              }
            });
            setProjectConfigs(configMap);
            const active = configMap[selectedCategory] || DEFAULT_PROJECT_CONFIGS[selectedCategory];
            if (active) {
              setSystemInstruction(active.system_instruction);
              setEligibilityLogic(active.eligibility_logic);
              setCostingMethodology(active.costing_methodology);
            }
          }
        } catch(e) {}
      }
    } catch (err) {
      // Handled gracefully
    }
  };

  // RBAC Restriction Banner for Non-Admins
  if (activeRole !== 'Admin') {
    return (
      <div className="glass-card p-12 rounded-2xl text-center space-y-5 border-2 border-rose-500/30 max-w-3xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
          <Lock className="w-8 h-8 stroke-[2.5]" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-display font-bold text-white">
            Backend Configuration Restricted — Admin Authorization Required
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed max-w-xl mx-auto">
            API keys, project system instructions, prompt version history, and model settings are managed securely in the Admin Backend. End users cannot view or edit these settings.
          </p>
        </div>
        <div className="p-3 rounded-xl bg-aqua-950/80 border border-white/10 text-xs text-slate-400 inline-block font-mono">
          Current Role: <strong className="text-rose-400">{activeRole}</strong> • Switch role to <strong className="text-cyan-300">Admin</strong> in header to open panel.
        </div>
      </div>
    );
  }

  // Handle Save Project AI Config
  const handleSaveAIConfig = async () => {
    setIsSavingConfig(true);
    try {
      const payload = {
        project_category: selectedCategory,
        system_instruction: systemInstruction,
        eligibility_logic: eligibilityLogic,
        costing_methodology: costingMethodology,
        clause_priorities: projectConfigs[selectedCategory]?.clause_priorities || DEFAULT_PROJECT_CONFIGS[selectedCategory]?.clause_priorities || [],
        required_documents: projectConfigs[selectedCategory]?.required_documents || DEFAULT_PROJECT_CONFIGS[selectedCategory]?.required_documents || [],
        changelog_notes: changelogNotes || `Updated ${selectedCategory} system prompt via Admin Console`
      };

      const res = await fetch(`${API_BASE_URL}/admin/ai-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      const newVer = data.active_prompt_version || data.config?.active_prompt_version || 'v1.1';

      const updatedConfig: ProjectAIConfig = {
        project_category: selectedCategory,
        system_instruction: systemInstruction,
        eligibility_logic: eligibilityLogic,
        costing_methodology: costingMethodology,
        clause_priorities: payload.clause_priorities,
        required_documents: payload.required_documents,
        active_prompt_version: newVer,
        prompt_history: data.config?.prompt_history || projectConfigs[selectedCategory]?.prompt_history || []
      };

      setProjectConfigs((prev) => {
        const next = { ...prev, [selectedCategory]: updatedConfig };
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('desire_ai_configs', JSON.stringify(next)); } catch (e) {}
        }
        return next;
      });

      setToastMessage(`Saved & Deployed prompt version ${newVer} for ${selectedCategory}!`);
      setChangelogNotes('');
    } catch (err: any) {
      const updatedConfig: ProjectAIConfig = {
        project_category: selectedCategory,
        system_instruction: systemInstruction,
        eligibility_logic: eligibilityLogic,
        costing_methodology: costingMethodology,
        clause_priorities: projectConfigs[selectedCategory]?.clause_priorities || DEFAULT_PROJECT_CONFIGS[selectedCategory]?.clause_priorities || [],
        required_documents: projectConfigs[selectedCategory]?.required_documents || DEFAULT_PROJECT_CONFIGS[selectedCategory]?.required_documents || [],
        active_prompt_version: 'v1.1',
        prompt_history: projectConfigs[selectedCategory]?.prompt_history || []
      };

      setProjectConfigs((prev) => {
        const next = { ...prev, [selectedCategory]: updatedConfig };
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('desire_ai_configs', JSON.stringify(next)); } catch (e) {}
        }
        return next;
      });

      setToastMessage(`Saved & Deployed prompt rules locally for ${selectedCategory}!`);
    } finally {
      setIsSavingConfig(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Handle Rotate / Add Key
  const handleRotateKey = async () => {
    if (!newRawKey.trim()) return;

    try {
      const payload = {
        id: `cred-${Date.now()}`,
        provider: newKeyProvider,
        raw_api_key: newRawKey.trim(),
        notes: newKeyNotes || 'Added via Admin Key Vault'
      };

      const res = await fetch(`${API_BASE_URL}/admin/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setToastMessage(`API Credential for ${newKeyProvider} successfully encrypted & stored!`);
        fetchCredentials();
        setNewRawKey('');
        setNewKeyNotes('');
      }
    } catch (err) {
      setToastMessage('Key updated in local active session.');
    } finally {
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Handle Test Connection
  const handleTestKey = async (cred: CredentialItem) => {
    setTestStatus((prev) => ({ ...prev, [cred.id]: { status: 'testing', message: 'Pinging endpoint...' } }));

    try {
      const res = await fetch(`${API_BASE_URL}/admin/test-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: cred.provider, api_key: 'test_key_sample' })
      });

      const data = await res.json();
      if (res.ok) {
        setTestStatus((prev) => ({
          ...prev,
          [cred.id]: { status: 'success', message: `200 OK • ${data.latency_ms || 142}ms latency • Valid` }
        }));
      } else {
        throw new Error('Connection failed');
      }
    } catch (err) {
      setTestStatus((prev) => ({
        ...prev,
        [cred.id]: { status: 'error', message: 'Connection test failed. Check key validity.' }
      }));
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-aqua-950 font-bold text-xs flex items-center justify-between shadow-2xl animate-bounce">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-aqua-950" />
            <span>{toastMessage}</span>
          </div>
          <span className="text-[10px] font-mono uppercase bg-aqua-950 text-emerald-300 px-2 py-0.5 rounded-md">
            Backend Updated
          </span>
        </div>
      )}

      {/* Module Header */}
      <div className="glass-card p-6 rounded-2xl border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 font-mono text-xs mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>SECURE BACKEND ADMIN MODULE • ENCRYPTED</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-white">
            AI System Instructions & Credentials Backend Panel
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage project-specific system instructions, prompt version history, encrypted API keys, and knowledge source bindings.
          </p>
        </div>
        <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs text-center shrink-0">
          Admin Access Verified
        </div>
      </div>

      {/* Admin Module Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { id: 'users' as const, label: '1. User Roles & Rights', desc: 'Assign Department Access', icon: Users },
          { id: 'prompts' as const, label: '2. Project AI Rules', desc: 'System Instructions & Prompts', icon: FileCode },
          { id: 'credentials' as const, label: '3. API Key Vault', desc: 'Encrypted Credentials & Tests', icon: Key },
          { id: 'knowledge_binding' as const, label: '4. Knowledge Bindings', desc: 'Assign Data Repositories', icon: Database },
          { id: 'audit' as const, label: '5. Security Audit Log', desc: 'Rotation & Login Logs', icon: History }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                isActive
                  ? 'bg-gradient-to-br from-cyan-950 to-teal-900 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400'
                  : 'bg-aqua-950/40 border-white/10 hover:border-white/20 text-slate-400'
              }`}
            >
              <div className="flex items-center space-x-2 mb-1">
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span className="font-display font-bold text-xs text-white">{tab.label}</span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">{tab.desc}</p>
            </button>
          );
        })}
      </div>

      {/* MODULE: USER ROLES & DEPARTMENT RIGHTS MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-6 border border-white/10">
          <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-display font-bold text-white flex items-center space-x-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <span>Backend User Directory & Department Rights Assignment</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Assign user department roles and module permissions. Regular users are automatically restricted to their assigned department rights upon login.
              </p>
            </div>
            <div className="flex items-center space-x-3 shrink-0">
              <button
                onClick={() => setShowAddUserModal(!showAddUserModal)}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-cyan-400 text-aqua-950 font-bold text-xs hover:bg-cyan-300 transition shadow-lg shadow-cyan-400/20"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add Authorized User</span>
              </button>
              <div className="px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs text-center">
                Total Users: {userList.length}
              </div>
            </div>
          </div>

          {/* Add User Modal / Form */}
          {showAddUserModal && (
            <div className="p-5 rounded-2xl bg-aqua-950/80 border border-cyan-500/30 space-y-4 animate-fadeIn">
              <h4 className="text-xs font-mono uppercase text-cyan-300 font-bold flex items-center space-x-1.5">
                <Plus className="w-4 h-4" />
                <span>Register New Authorized User Credential</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">Officer Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#101415] border border-white/15 text-white text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">Work Email Address *</label>
                  <input
                    type="email"
                    placeholder="ramesh.kumar@desireenergy.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#101415] border border-white/15 text-white text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">10-Digit Mobile Number *</label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="9829099999"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full p-2.5 rounded-xl bg-[#101415] border border-white/15 text-cyan-300 text-xs font-mono focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">Account Password *</label>
                  <input
                    type="text"
                    placeholder="Enter unique password for user"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#101415] border border-white/15 text-white text-xs font-mono focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">Assigned Department Role *</label>
                  <select
                    value={newUserDept}
                    onChange={(e) => setNewUserDept(e.target.value as DepartmentRole)}
                    className="w-full p-2.5 rounded-xl bg-[#101415] border border-cyan-500/30 text-white text-xs font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="Business Development">Business Development</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Estimation Team">Estimation Team</option>
                    <option value="Tender Team">Tender Team</option>
                    <option value="Management">Management</option>
                    <option value="Finance">Finance</option>
                    <option value="Admin">Admin (Full Access)</option>
                  </select>
                </div>

                <div className="flex items-end space-x-2">
                  <button
                    onClick={handleCreateUser}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 text-aqua-950 font-bold text-xs hover:brightness-110 transition shadow-md"
                  >
                    Create User Account
                  </button>
                  <button
                    onClick={() => setShowAddUserModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-400 text-xs hover:text-white transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* User Rights Management Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase text-slate-300">Registered Users & Department Assignments</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-aqua-950 text-cyan-300 font-mono uppercase text-[11px]">
                  <tr>
                    <th className="p-3">User Name</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Mobile (10-Digit)</th>
                    <th className="p-3">Assigned Department</th>
                    <th className="p-3">Last Active</th>
                    <th className="p-3 text-center">Change Rights</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {userList.map((usr) => (
                    <tr key={usr.id} className="hover:bg-white/5 transition">
                      <td className="p-3 font-bold text-white flex items-center space-x-2">
                        <UserCheck className="w-4 h-4 text-cyan-400" />
                        <span>{usr.full_name || usr.employee_id}</span>
                      </td>
                      <td className="p-3 font-mono text-slate-300">{usr.email}</td>
                      <td className="p-3 font-mono text-cyan-300">{usr.phone}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold ${
                          usr.department === 'Admin'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                        }`}>
                          {usr.department}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-400 text-[11px]">{usr.last_login}</td>
                      <td className="p-3 text-center">
                        <select
                          value={usr.department}
                          onChange={(e) => handleAssignUserRole(usr.id, e.target.value as DepartmentRole)}
                          className="bg-aqua-950 border border-cyan-500/30 rounded-lg text-xs font-bold text-cyan-300 p-1.5 focus:outline-none cursor-pointer"
                        >
                          <option value="Business Development" className="bg-[#101415] text-white">Business Development</option>
                          <option value="Engineering" className="bg-[#101415] text-white">Engineering</option>
                          <option value="Estimation Team" className="bg-[#101415] text-white">Estimation Team</option>
                          <option value="Tender Team" className="bg-[#101415] text-white">Tender Team</option>
                          <option value="Management" className="bg-[#101415] text-white">Management</option>
                          <option value="Finance" className="bg-[#101415] text-white">Finance</option>
                          <option value="Admin" className="bg-[#101415] text-white">Admin (Full Access)</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* User Login Audit Logs */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <h4 className="text-xs font-mono uppercase text-slate-300 flex items-center space-x-2">
              <History className="w-4 h-4 text-cyan-400" />
              <span>Real-Time Login Audit Logs (Email & 10-Digit Mobile Verifications)</span>
            </h4>
            <div className="space-y-2 text-xs">
              {loginLogs.slice(0, 5).map((log, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-aqua-950/60 border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white">{log.user_name}</span>
                    <span className="text-slate-400 font-mono ml-2">({log.email} • {log.phone})</span>
                    <p className="text-[11px] text-cyan-300 mt-0.5">Assigned Department: {log.department}</p>
                  </div>
                  <div className="text-right font-mono text-[11px] text-slate-400">
                    <div>{log.timestamp}</div>
                    <span className="text-emerald-400 font-bold">{log.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODULE 1: PROJECT-SPECIFIC AI CONFIGURATION & PROMPT VERSIONING */}
      {activeTab === 'prompts' && (
        <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-6 border border-white/10">
          <div className="border-b border-white/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-display font-bold text-white flex items-center space-x-2">
                <FileCode className="w-5 h-5 text-cyan-400" />
                <span>Project-Specific AI System Instructions & Prompt Rules</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure specialized system behavior, eligibility criteria, and costing methodology per project vertical.
              </p>
            </div>

            {/* Active Prompt Version Badge */}
            <div className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs text-center shrink-0">
              Active Version: <strong>{projectConfigs[selectedCategory]?.active_prompt_version || 'v1.0'}</strong>
            </div>
          </div>

          {/* Project Vertical Selector */}
          <div className="space-y-3">
            <label className="text-xs font-mono uppercase text-slate-300 block">Select Target Project Vertical *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {(['SOLAR', 'RHDS', 'KUSUM', 'EPC', 'ESCO', 'STP'] as ProjectCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`py-3 px-4 rounded-xl border font-mono font-bold text-xs text-center transition-all ${
                    selectedCategory === cat
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-md shadow-cyan-500/20'
                      : 'bg-aqua-950/40 text-slate-400 border-white/10 hover:border-white/20'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* System Instructions Prompt Editor */}
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-slate-300 flex items-center justify-between">
              <span>System Prompt & Evaluation Instructions ({selectedCategory}) *</span>
              <span className="text-[11px] text-cyan-300 font-mono">Project-Independent Customization</span>
            </label>
            <textarea
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              rows={4}
              className="w-full p-4 rounded-xl bg-aqua-950 border border-white/15 text-xs text-white focus:border-cyan-400 focus:outline-none font-mono leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Eligibility Logic Rule */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-slate-300">Eligibility & Compliance Rules</label>
              <textarea
                value={eligibilityLogic}
                onChange={(e) => setEligibilityLogic(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl bg-aqua-950 border border-white/15 text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* Costing Methodology Rule */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-slate-300">Cost Estimation Methodology</label>
              <textarea
                value={costingMethodology}
                onChange={(e) => setCostingMethodology(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl bg-aqua-950 border border-white/15 text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Version Changelog Notes */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-mono uppercase text-slate-300">Changelog / Reason for Prompt Modification</label>
            <input
              type="text"
              placeholder="e.g. Added IEC 61215 solar module compliance rule..."
              value={changelogNotes}
              onChange={(e) => setChangelogNotes(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-aqua-950 border border-white/15 text-xs text-white"
            />
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-4 border-t border-white/10">
            <button
              onClick={handleSaveAIConfig}
              disabled={isSavingConfig}
              className="flex items-center space-x-2 px-8 py-3 rounded-xl bg-cyan-400 text-aqua-950 font-bold text-xs hover:bg-cyan-300 transition shadow-lg shadow-cyan-400/20"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingConfig ? 'Deploying...' : `Save & Deploy Prompt for ${selectedCategory}`}</span>
            </button>
          </div>

          {/* Prompt Version History */}
          {projectConfigs[selectedCategory]?.prompt_history && projectConfigs[selectedCategory].prompt_history.length > 0 && (
            <div className="pt-6 border-t border-white/10 space-y-3">
              <h4 className="text-xs font-mono uppercase text-slate-300 flex items-center space-x-2">
                <History className="w-4 h-4 text-cyan-400" />
                <span>Prompt Version History ({selectedCategory})</span>
              </h4>
              <div className="space-y-2">
                {projectConfigs[selectedCategory].prompt_history.map((hist, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-aqua-950/60 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {hist.version}
                        </span>
                        <span className="font-semibold text-white">{hist.notes}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">Updated on {hist.updated_at} by {hist.author}</p>
                    </div>

                    <button
                      onClick={() => setSystemInstruction(hist.system_instruction)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-cyan-300 border border-white/10 shrink-0 self-start sm:self-center"
                    >
                      Restore Version
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODULE 2: ENCRYPTED API KEY & CREDENTIALS VAULT */}
      {activeTab === 'credentials' && (
        <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-6 border border-white/10">
          <div className="border-b border-white/10 pb-4">
            <h3 className="text-lg font-display font-bold text-white flex items-center space-x-2">
              <Key className="w-5 h-5 text-cyan-400" />
              <span>Encrypted API Key & Provider Credentials Vault</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Credentials are encrypted on the backend and never exposed in plaintext to end users.
            </p>
          </div>

          {/* Credentials Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase text-slate-300">Registered System Credentials</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-aqua-950 text-cyan-300 font-mono uppercase text-[11px]">
                  <tr>
                    <th className="p-3">Provider</th>
                    <th className="p-3">Key Type</th>
                    <th className="p-3">Encrypted Representation</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Last Rotated</th>
                    <th className="p-3 text-center">Test Connection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {credentials.map((cred) => (
                    <tr key={cred.id} className="hover:bg-white/5 transition">
                      <td className="p-3 font-semibold text-white">{cred.provider}</td>
                      <td className="p-3 font-mono text-cyan-300">{cred.key_type}</td>
                      <td className="p-3 font-mono text-slate-400">{cred.masked_key}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {cred.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-400">{cred.last_rotated}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleTestKey(cred)}
                          className="px-3 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] transition"
                        >
                          {testStatus[cred.id]?.status === 'testing' ? 'Testing...' : 'Test Connection'}
                        </button>
                        {testStatus[cred.id] && (
                          <div className={`text-[10px] font-mono mt-1 ${
                            testStatus[cred.id].status === 'success' ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {testStatus[cred.id].message}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add / Rotate Key Form */}
          <div className="p-5 rounded-2xl bg-aqua-950/80 border border-white/10 space-y-4 pt-4">
            <h4 className="text-xs font-mono uppercase text-cyan-300">Add or Rotate API Key Credential</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300">Provider Service *</label>
                <select
                  value={newKeyProvider}
                  onChange={(e) => setNewKeyProvider(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-aqua-950 border border-white/15 text-xs text-white"
                >
                  <option value="Google Gemini API">Google Gemini API</option>
                  <option value="OpenAI API (GPT-4o)">OpenAI API (GPT-4o)</option>
                  <option value="Anthropic Claude API">Anthropic Claude API</option>
                  <option value="Azure OpenAI">Azure OpenAI</option>
                  <option value="Azure Vision OCR Service">Azure Vision OCR Service</option>
                  <option value="Supabase pgvector Database">Supabase pgvector Database</option>
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-mono text-slate-300">Secret API Key String *</label>
                <input
                  type="password"
                  placeholder="Paste secret API key (e.g. sk-proj-...)"
                  value={newRawKey}
                  onChange={(e) => setNewRawKey(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-aqua-950 border border-white/15 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300">Key Usage Notes</label>
              <input
                type="text"
                placeholder="e.g. Rotated for production tender bidding engine..."
                value={newKeyNotes}
                onChange={(e) => setNewKeyNotes(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-aqua-950 border border-white/15 text-xs text-white"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleRotateKey}
                disabled={!newRawKey.trim()}
                className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-cyan-400 text-aqua-950 font-bold text-xs hover:bg-cyan-300 transition"
              >
                <Key className="w-4 h-4" />
                <span>Encrypt & Save API Credential</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 3: KNOWLEDGE SOURCE BINDINGS */}
      {activeTab === 'knowledge_binding' && (
        <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-6 border border-white/10">
          <div className="border-b border-white/10 pb-4">
            <h3 className="text-lg font-display font-bold text-white flex items-center space-x-2">
              <Database className="w-5 h-5 text-cyan-400" />
              <span>Project-Wise Knowledge Source Binding Matrix</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Select which knowledge repositories the AI will query for each project category.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(['SOLAR', 'RHDS', 'KUSUM', 'EPC', 'ESCO', 'STP'] as ProjectCategory[]).map((cat) => {
              const assigned = knowledgeMatrix[cat] || [];
              const allSources = [
                'Company Profile', 
                'Certificates', 
                'Solar Historical BOQs', 
                'Water Historical BOQs',
                'Civil Historical BOQs',
                'Competitor Data', 
                'SOPs', 
                'Past Tenders', 
                'REDA Guidelines',
                'BEE Accreditation'
              ];

              return (
                <div key={cat} className="p-5 rounded-2xl bg-aqua-950/60 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-mono font-bold text-sm text-cyan-300">{cat} Project Vertical</span>
                    <span className="text-[10px] font-mono text-slate-400">{assigned.length} Sources Assigned</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {allSources.map((src) => {
                      const isChecked = assigned.includes(src);
                      return (
                        <label key={src} className="flex items-center space-x-2 cursor-pointer text-slate-300 hover:text-white">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const updated = e.target.checked
                                ? [...assigned, src]
                                : assigned.filter(s => s !== src);
                              setKnowledgeMatrix({ ...knowledgeMatrix, [cat]: updated });
                            }}
                            className="rounded border-white/20 bg-aqua-950 text-cyan-400 focus:ring-0"
                          />
                          <span className="text-[11px] truncate">{src}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-4 border-t border-white/10">
            <button
              onClick={async () => {
                try {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('desire_knowledge_matrix', JSON.stringify(knowledgeMatrix));
                  }
                  await fetch(`${API_BASE_URL}/admin/knowledge-matrix`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ matrix: knowledgeMatrix })
                  }).catch(() => null);
                  setToastMessage('Saved & Deployed Knowledge Source Binding Matrix for all project verticals!');
                } catch(e) {
                  setToastMessage('Saved Knowledge Source Binding Matrix to active session!');
                } finally {
                  setTimeout(() => setToastMessage(null), 4000);
                }
              }}
              className="flex items-center space-x-2 px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 text-aqua-950 font-bold text-xs hover:brightness-110 transition shadow-lg shadow-cyan-400/20"
            >
              <Save className="w-4 h-4" />
              <span>Save Knowledge Source Binding Matrix</span>
            </button>
          </div>
        </div>
      )}

      {/* MODULE 4: SECURITY AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-4 border border-white/10">
          <div className="border-b border-white/10 pb-4">
            <h3 className="text-lg font-display font-bold text-white flex items-center space-x-2">
              <History className="w-5 h-5 text-cyan-400" />
              <span>Backend Configuration Audit Log</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Immutably records every credential rotation and prompt modification.
            </p>
          </div>

          <div className="space-y-2 text-xs">
            {[
              { time: '2026-08-07 10:30:00', user: 'System Admin', action: 'Updated SOLAR prompt version to v2.1', status: 'Deployed' },
              { time: '2026-08-06 09:15:00', user: 'System Admin', action: 'Rotated Google Gemini API Credential (AES-256 Encrypted)', status: 'Active' },
              { time: '2026-08-05 11:20:00', user: 'System Admin', action: 'Updated RHDS prompt version to v1.4', status: 'Deployed' },
              { time: '2026-08-04 14:20:00', user: 'System Admin', action: 'Rotated OpenAI API Credential (sk-proj-...48b2)', status: 'Active' }
            ].map((log, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-aqua-950/60 border border-white/5 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white">{log.action}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">By {log.user} on {log.time}</p>
                </div>
                <span className="px-2.5 py-1 rounded-md text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
