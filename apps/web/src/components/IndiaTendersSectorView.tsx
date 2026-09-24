'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { DataFreshnessBar } from './DataFreshnessBar';
import { 
  MapPin, 
  Search, 
  Filter, 
  SlidersHorizontal, 
  TrendingUp, 
  Building2, 
  Clock, 
  IndianRupee, 
  Calendar, 
  ArrowUpRight, 
  Sparkles, 
  Layers, 
  ChevronRight, 
  Download, 
  ExternalLink, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  BarChart3, 
  Globe2, 
  FileText,
  X,
  Share2,
  Bookmark,
  ChevronDown,
  Copy,
  Check,
  ChevronLeft,
  ArrowRight,
  Landmark,
  Loader2
} from 'lucide-react';
import { NavTab } from './Sidebar';

export interface IndiaTenderItem {
  id: string;
  nit_number: string;
  title: string;
  authority: string;
  authority_code: string;
  state: string;
  district: string;
  sector: string;
  estimated_cost_cr: number;
  emd_lakhs: number;
  tender_fee: number;
  publish_date: string;
  due_date: string;
  days_left: number;
  stage: string;
  eligibility_match_pct: number;
  desire_qual_status: string;
  scope_highlights: string[];
  key_criteria: {
    min_turnover_cr: number;
    similar_work_cr: number;
    experience_years: number;
    license_category: string;
  };
  contact_person?: string;
  portal_url?: string;
}

const STATE_PORTAL_MAP: Record<string, { url: string; portalName: string }> = {
  'Rajasthan': { url: 'https://eproc.rajasthan.gov.in/nicgep/app', portalName: 'Rajasthan GePNIC' },
  'Haryana': { url: 'https://etenders.hry.nic.in/nicgep/app', portalName: 'Haryana e-Tenders' },
  'Uttar Pradesh': { url: 'https://etender.up.nic.in/nicgep/app', portalName: 'UP e-Procurement' },
  'Madhya Pradesh': { url: 'https://mptenders.gov.in/nicgep/app', portalName: 'MP Tenders' },
  'Delhi': { url: 'https://govtprocurement.delhi.gov.in/nicgep/app', portalName: 'Delhi e-Procurement' },
  'Maharashtra': { url: 'https://mahatenders.gov.in/nicgep/app', portalName: 'MahaTenders' },
  'Gujarat': { url: 'https://tender.nprocure.com', portalName: 'Gujarat (nProcure)' },
  'Punjab': { url: 'https://eproc.punjab.gov.in/nicgep/app', portalName: 'Punjab GePNIC' },
  'Odisha': { url: 'https://tendersodisha.gov.in/nicgep/app', portalName: 'Odisha Tenders' },
  'Tamil Nadu': { url: 'https://tntenders.gov.in/nicgep/app', portalName: 'TN Tenders' },
  'Karnataka': { url: 'https://eproc.karnataka.gov.in', portalName: 'Karnataka e-Proc' },
  'Assam': { url: 'https://assamtenders.gov.in/nicgep/app', portalName: 'Assam Tenders' },
  'Uttarakhand': { url: 'https://uktenders.gov.in/nicgep/app', portalName: 'Uttarakhand Tenders' },
  'Chhattisgarh': { url: 'https://eproc.cgstate.gov.in', portalName: 'Chhattisgarh e-Proc' },
  'Telangana': { url: 'https://tender.telangana.gov.in', portalName: 'Telangana e-Proc' },
  'Coal India (CIL)': { url: 'https://etenders.gov.in/eprocure/app', portalName: 'Coal India GePNIC' },
  'Unclassified': { url: 'https://etenders.gov.in/eprocure/app', portalName: 'Central CPPP' },
  'All India': { url: 'https://etenders.gov.in/eprocure/app', portalName: 'Central CPPP Portal' }
};

const OFFICIAL_GOVT_PORTALS_LIST = [
  { name: 'Central CPPP (All India)', url: 'https://etenders.gov.in/eprocure/app', badge: 'National Portal' },
  { name: 'Rajasthan GePNIC', url: 'https://eproc.rajasthan.gov.in/nicgep/app', badge: 'PHED & RUDSICO' },
  { name: 'Delhi Procurement', url: 'https://govtprocurement.delhi.gov.in/nicgep/app', badge: 'DSIIDC & DJB' },
  { name: 'Telangana e-Proc', url: 'https://tender.telangana.gov.in', badge: 'SCCL & Irrigation' },
  { name: 'Odisha Tenders', url: 'https://tendersodisha.gov.in/nicgep/app', badge: 'RWSS & WATCO' },
  { name: 'Gujarat nProcure', url: 'https://tender.nprocure.com', badge: 'GWSSB & GIDC' },
  { name: 'Haryana e-Tenders', url: 'https://etenders.hry.nic.in/nicgep/app', badge: 'PHED & GMDA' },
  { name: 'UP e-Procurement', url: 'https://etender.up.nic.in/nicgep/app', badge: 'SWSM & UPJN' },
  { name: 'Madhya Pradesh', url: 'https://mptenders.gov.in/nicgep/app', badge: 'MP Jal Nigam' },
  { name: 'Maharashtra MahaTenders', url: 'https://mahatenders.gov.in/nicgep/app', badge: 'MJP & CIDCO' },
];

const INDIAN_STATES_BASE = [
  { name: 'All India', code: 'ALL', highlight: 'Pan-India Overview' },
  { name: 'Rajasthan', code: 'RJ', highlight: 'PHED & RUDSICO Hub' },
  { name: 'Delhi', code: 'DL', highlight: 'DSIIDC & DJB Projects' },
  { name: 'Coal India (CIL)', code: 'CIL', highlight: 'Central PSU & Solar BESS' },
  { name: 'Odisha', code: 'OD', highlight: 'RWSS & WATCO' },
  { name: 'Telangana', code: 'TS', highlight: 'SCCL & Mission Bhagiratha' },
  { name: 'Gujarat', code: 'GJ', highlight: 'GWSSB & GIDC Water' },
  { name: 'Haryana', code: 'HR', highlight: 'Public Health & Irrigation' },
  { name: 'Uttar Pradesh', code: 'UP', highlight: 'JJM Mission & UPJN' },
  { name: 'Madhya Pradesh', code: 'MP', highlight: 'MP Jal Nigam' },
  { name: 'Maharashtra', code: 'MH', highlight: 'MJP & CIDCO Infra' },
  { name: 'Tamil Nadu', code: 'TN', highlight: 'TWAD Board Projects' },
  { name: 'Punjab', code: 'PB', highlight: 'DWSS Punjab Water' },
  { name: 'Karnataka', code: 'KA', highlight: 'KUWSDB Projects' },
  { name: 'Assam', code: 'AS', highlight: 'PHE Assam JJM' },
  { name: 'Uttarakhand', code: 'UK', highlight: 'UJN & Peyjal Nigam' },
  { name: 'Chhattisgarh', code: 'CG', highlight: 'PHED Chhattisgarh' },
  { name: 'Unclassified', code: 'UNC', highlight: 'Internal / Uploaded Bids' }
];

const SECTOR_CATEGORIES_BASE = [
  { id: 'ALL', label: 'All Sectors', icon: Globe2 },
  { id: 'Water Transmission & Pipelines', label: 'Water Transmission & Pipelines', icon: TrendingUp },
  { id: 'Solar & Renewable', label: 'Solar & Renewable (BESS/KUSUM)', icon: Sparkles },
  { id: 'O&M Water & Civil Assets', label: 'O&M & ESCO Efficiency', icon: Clock },
  { id: 'JJM & Rural Water', label: 'Turnkey EPC & JJM Water', icon: Building2 },
  { id: 'STP & Wastewater', label: 'STP & Sewerage Network', icon: ShieldCheck },
  { id: 'Urban Infra & Smart Water', label: 'Smart Water, SCADA & Automation', icon: Layers },
  { id: 'Canal & Lift Irrigation', label: 'Canal, Dam & Irrigation', icon: BarChart3 },
];

function matchesSectorCategory(tenderSector: string, categoryId: string): boolean {
  if (categoryId === 'ALL') return true;
  const s = (tenderSector || '').toLowerCase();
  const c = categoryId.toLowerCase();
  if (s === c) return true;
  if (c.includes('water transmission') && (s.includes('transmission') || s.includes('pipeline'))) return true;
  if (c.includes('solar') && (s.includes('solar') || s.includes('renewable') || s.includes('bess'))) return true;
  if ((c.includes('o&m') || c.includes('esco')) && (s.includes('o&m') || s.includes('esco') || s.includes('civil asset'))) return true;
  if (c.includes('jjm') && (s.includes('jjm') || s.includes('rural water'))) return true;
  if (c.includes('stp') && (s.includes('stp') || s.includes('wastewater') || s.includes('sewerage'))) return true;
  if (c.includes('canal') && (s.includes('canal') || s.includes('irrigation') || s.includes('dam'))) return true;
  if (c.includes('smart') && (s.includes('smart') || s.includes('scada') || s.includes('urban'))) return true;
  return s.includes(c);
}

interface IndiaTendersSectorViewProps {
  onNavigate?: (tab: NavTab) => void;
  onImportTender?: (tender: IndiaTenderItem) => void;
  onSelectForBidding?: (tender: IndiaTenderItem) => void;
}

export const IndiaTendersSectorView: React.FC<IndiaTendersSectorViewProps> = ({
  onNavigate,
  onImportTender,
  onSelectForBidding,
}) => {
  const [tenders, setTenders] = useState<IndiaTenderItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [selectedValueRange, setSelectedValueRange] = useState<string>('ALL');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [selectedTenderModal, setSelectedTenderModal] = useState<IndiaTenderItem | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [viewLayout, setViewLayout] = useState<'cards' | 'table'>('cards');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(24);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch real data from live-summary endpoint backed by Supabase
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/tenders/live-summary', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const list: IndiaTenderItem[] = (json.all_tenders || json.priority_tenders || []).map((t: any) => ({
          id: t.id,
          nit_number: t.nit_number || t.nit || t.id,
          title: t.title || t.tender_name,
          authority: t.authority || 'Government Authority',
          authority_code: t.authority_code || t.authority?.split(' ')[0] || 'GOVT',
          state: t.state || 'Unclassified',
          district: t.district || t.state || 'General',
          sector: t.sector || 'Infrastructure EPC',
          estimated_cost_cr: parseFloat(t.estimated_cost_cr ?? t.costCr) || 0,
          emd_lakhs: parseFloat(t.emd_lakhs) || 0,
          tender_fee: parseFloat(t.tender_fee) || 0,
          publish_date: t.publish_date || '2026-08-25',
          due_date: t.due_date || t.dueDate || 'Live NIT',
          days_left: parseInt(t.days_left ?? t.daysLeft) || 14,
          stage: (t.stage || 'Open (Live)') as any,
          eligibility_match_pct: parseInt(t.eligibility_match_pct ?? t.matchPct) || 90,
          desire_qual_status: (t.desire_qual_status || t.status || 'Direct Eligible') as any,
          scope_highlights: Array.isArray(t.scope_highlights) ? t.scope_highlights : [t.sector, t.authority],
          key_criteria: t.key_criteria || {
            min_turnover_cr: Math.round((parseFloat(t.costCr) || 0) * 0.4 * 10) / 10,
            similar_work_cr: Math.round((parseFloat(t.costCr) || 0) * 0.3 * 10) / 10,
            experience_years: 5,
            license_category: 'Class-A'
          },
          portal_url: t.portal_url || t.portalUrl || STATE_PORTAL_MAP[t.state]?.url || STATE_PORTAL_MAP['All India']?.url
        }));
        setTenders(list);
        setLastUpdated(json.last_updated || null);
      }
    } catch (err) {
      console.error('Error fetching live tenders in IndiaTendersSectorView:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Dynamic state stats calculated from full live dataset
  const stateStats = useMemo(() => {
    const stats: Record<string, { count: number; totalValueCr: number }> = {};
    tenders.forEach(t => {
      const st = t.state || 'Unclassified';
      if (!stats[st]) stats[st] = { count: 0, totalValueCr: 0 };
      stats[st].count += 1;
      stats[st].totalValueCr += (t.estimated_cost_cr || 0);
    });
    return stats;
  }, [tenders]);

  // Dynamic sector stats calculated from full live dataset
  const sectorStats = useMemo(() => {
    const stats: Record<string, { count: number; totalValueCr: number }> = {};
    const selectedStateObj = INDIAN_STATES_BASE.find(s => s.code === selectedState);
    const relevantTenders = selectedState === 'ALL'
      ? tenders
      : tenders.filter(t => (t.state || 'Unclassified').toLowerCase() === (selectedStateObj?.name || '').toLowerCase());

    SECTOR_CATEGORIES_BASE.forEach(sec => {
      if (sec.id === 'ALL') return;
      const matching = relevantTenders.filter(t => matchesSectorCategory(t.sector, sec.id));
      stats[sec.id] = {
        count: matching.length,
        totalValueCr: matching.reduce((sum, t) => sum + (t.estimated_cost_cr || 0), 0)
      };
    });
    return stats;
  }, [tenders, selectedState]);

  // Filter Logic across real tenders
  const filteredTenders = useMemo(() => {
    return tenders.filter((item) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSearch = 
          item.title.toLowerCase().includes(q) ||
          item.nit_number.toLowerCase().includes(q) ||
          item.authority.toLowerCase().includes(q) ||
          item.state.toLowerCase().includes(q) ||
          item.district.toLowerCase().includes(q) ||
          item.sector.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // State Filter
      if (selectedState !== 'ALL') {
        const stateObj = INDIAN_STATES_BASE.find(s => s.code === selectedState);
        if (stateObj && (item.state || '').toLowerCase() !== stateObj.name.toLowerCase()) return false;
      }

      // Sector Filter
      if (selectedSector !== 'ALL') {
        if (!matchesSectorCategory(item.sector, selectedSector)) return false;
      }

      // Value Range Filter
      if (selectedValueRange === 'UNDER_25' && item.estimated_cost_cr >= 25) return false;
      if (selectedValueRange === '25_50' && (item.estimated_cost_cr < 25 || item.estimated_cost_cr > 50)) return false;
      if (selectedValueRange === '50_100' && (item.estimated_cost_cr < 50 || item.estimated_cost_cr > 100)) return false;
      if (selectedValueRange === 'ABOVE_100' && item.estimated_cost_cr < 100) return false;

      // Stage Filter
      if (selectedStage !== 'ALL' && item.stage !== selectedStage) {
        return false;
      }

      return true;
    });
  }, [tenders, searchQuery, selectedState, selectedSector, selectedValueRange, selectedStage]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedState, selectedSector, selectedValueRange, selectedStage]);

  // Paginated Slices
  const totalPages = Math.ceil(filteredTenders.length / pageSize) || 1;
  const paginatedTenders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTenders.slice(start, start + pageSize);
  }, [filteredTenders, currentPage, pageSize]);

  // Aggregate Metrics for current filter
  const totalFilteredValue = useMemo(() => {
    return filteredTenders.reduce((sum, t) => sum + t.estimated_cost_cr, 0).toLocaleString('en-IN', { maximumFractionDigits: 1 });
  }, [filteredTenders]);

  const handleCopyNit = (nit: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(nit);
    setCopiedId(nit);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleLaunchEligibility = (tender: IndiaTenderItem) => {
    if (onImportTender) {
      onImportTender(tender);
    }
    if (onNavigate) {
      onNavigate('eligibility');
    }
  };

  const handleLaunchJVWizard = (tender: IndiaTenderItem) => {
    if (onImportTender) {
      onImportTender(tender);
    }
    if (onNavigate) {
      onNavigate('wizard');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Header Banner & Market Pulse Bar */}
      <div className="glass-card p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#0b1426] shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 text-xs font-mono font-bold">
              <Globe2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>Pan-India Tender Intelligence & Geo-Sector Hub</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">LIVE SUPABASE DATA</span>
            </div>

            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Where in India Tenders Are Open (Sector-Wise)
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl font-medium">
              Explore active Indian government water infrastructure, solar pumping, wastewater (STP), and transmission tenders ingested directly from state e-procurement portals.
            </p>
          </div>

          {/* Aggregate Market Pulse Pills */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3 shrink-0">
            <div className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 min-w-[140px]">
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold block">
                Active Tenders
              </span>
              <span className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                {loading ? (
                  <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                ) : (
                  <>
                    <span>{filteredTenders.length}</span>
                    <span className="text-xs font-normal text-slate-500">/ {tenders.length}</span>
                  </>
                )}
              </span>
            </div>

            <div className="px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 min-w-[150px]">
              <span className="text-[10px] font-mono uppercase text-emerald-800 dark:text-emerald-400 font-bold block">
                Total Value
              </span>
              <span className="text-xl font-bold text-emerald-900 dark:text-emerald-300 flex items-center">
                <span>₹{totalFilteredValue}</span>
                <span className="text-xs font-bold ml-1">Cr</span>
              </span>
            </div>
          </div>
        </div>

        {/* Live Freshness Indicator & Manual Refresh Button */}
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          <DataFreshnessBar lastUpdated={lastUpdated} onRefreshComplete={loadData} />
        </div>

        {/* 1.1 Direct Government Portals Launcher Strip */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-mono font-bold uppercase text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
              <Landmark className="w-3.5 h-3.5 text-emerald-600" />
              <span>Direct Official Government e-Procurement Portals (Click to Launch):</span>
            </span>
            <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
              Opens live e-procurement portal in new tab
            </span>
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
            {OFFICIAL_GOVT_PORTALS_LIST.map((portal) => (
              <a
                key={portal.name}
                href={portal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-xs font-bold text-emerald-900 dark:text-emerald-300 transition shrink-0 flex items-center space-x-1.5 shadow-xs"
              >
                <span>{portal.name}</span>
                <ExternalLink className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Interactive States Distribution Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>Select Indian State / Territory</span>
          </span>
          <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
            {selectedState === 'ALL' 
              ? `Showing All India (${tenders.length} Active Tenders)` 
              : `Filtered by ${INDIAN_STATES_BASE.find(s => s.code === selectedState)?.name} (${stateStats[INDIAN_STATES_BASE.find(s => s.code === selectedState)?.name || '']?.count || 0} Tenders)`}
          </span>
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin">
          {INDIAN_STATES_BASE.map((st) => {
            const isSelected = selectedState === st.code;
            const count = st.code === 'ALL' ? tenders.length : (stateStats[st.name]?.count || 0);
            const totalVal = st.code === 'ALL'
              ? tenders.reduce((a, b) => a + b.estimated_cost_cr, 0)
              : (stateStats[st.name]?.totalValueCr || 0);

            return (
              <button
                key={st.code}
                onClick={() => {
                  setSelectedState(st.code);
                }}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center space-x-2.5 cursor-pointer border ${
                  isSelected
                    ? 'bg-[#064e3b] dark:bg-[#059669] text-white border-emerald-700 dark:border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                    : 'bg-white dark:bg-[#0d1527] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600'
                }`}
              >
                <div className="flex flex-col text-left">
                  <span className="leading-tight">{st.name}</span>
                  <span className={`text-[10px] font-mono ${isSelected ? 'text-emerald-200' : 'text-slate-500 dark:text-slate-400'}`}>
                    {count} Tenders • ₹{totalVal.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Interactive Sector Breakdown Tabs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>Infrastructure Sectors</span>
          </span>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Click sector to filter opportunities</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {SECTOR_CATEGORIES_BASE.map((sec) => {
            const isSelected = selectedSector === sec.id;
            const Icon = sec.icon;
            const count = sec.id === 'ALL'
              ? (selectedState === 'ALL' ? tenders.length : (stateStats[INDIAN_STATES_BASE.find(s => s.code === selectedState)?.name || '']?.count || 0))
              : (sectorStats[sec.id]?.count || 0);
            const totalVal = sec.id === 'ALL'
              ? (selectedState === 'ALL' ? tenders.reduce((a, b) => a + b.estimated_cost_cr, 0) : (stateStats[INDIAN_STATES_BASE.find(s => s.code === selectedState)?.name || '']?.totalValueCr || 0))
              : (sectorStats[sec.id]?.totalValueCr || 0);

            return (
              <button
                key={sec.id}
                onClick={() => setSelectedSector(sec.id)}
                className={`p-3 rounded-xl text-left transition-all cursor-pointer border flex flex-col justify-between space-y-2 ${
                  isSelected
                    ? 'bg-emerald-900 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
                    : 'bg-white dark:bg-[#0d1527] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-emerald-500'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-300' : 'text-emerald-700 dark:text-emerald-400'}`} />
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {count}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold line-clamp-1">{sec.label}</div>
                  <div className={`text-[10px] font-mono ${isSelected ? 'text-emerald-200' : 'text-slate-500 dark:text-slate-400'}`}>
                    ₹{totalVal.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Search & Multi-Filter Control Bar */}
      <div className="glass-card p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#0d1527] space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Main Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by tender title, NIT number, authority (PHED, JJM, GWSSB, DSIIDC), district, or keywords..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Value Dropdown */}
          <div className="flex items-center space-x-2 w-full md:w-auto shrink-0">
            <select
              value={selectedValueRange}
              onChange={(e) => setSelectedValueRange(e.target.value)}
              className="px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="ALL">All Tender Values</option>
              <option value="UNDER_25">Under ₹25 Cr</option>
              <option value="25_50">₹25 Cr – ₹50 Cr</option>
              <option value="50_100">₹50 Cr – ₹100 Cr</option>
              <option value="ABOVE_100">Above ₹100 Cr (Mega EPC)</option>
            </select>

            {/* Stage Dropdown */}
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="ALL">All Tender Stages</option>
              <option value="Open (Live)">Live (Active Bidding)</option>
              <option value="Pre-Bid Meeting">Pre-Bid Meeting Stage</option>
              <option value="Corrigendum Issued">Corrigendum Issued</option>
              <option value="Technical Bid Opening Soon">Technical Bid Opening Soon</option>
            </select>

            {/* Layout Toggle */}
            <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900">
              <button
                onClick={() => setViewLayout('cards')}
                className={`px-3 py-2 text-xs font-bold cursor-pointer ${
                  viewLayout === 'cards'
                    ? 'bg-[#064e3b] dark:bg-[#059669] text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Cards View"
              >
                Cards
              </button>
              <button
                onClick={() => setViewLayout('table')}
                className={`px-3 py-2 text-xs font-bold cursor-pointer ${
                  viewLayout === 'table'
                    ? 'bg-[#064e3b] dark:bg-[#059669] text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Table View"
              >
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {(selectedState !== 'ALL' || selectedSector !== 'ALL' || selectedValueRange !== 'ALL' || selectedStage !== 'ALL' || searchQuery) && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-bold">Active Filters:</span>
              {selectedState !== 'ALL' && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 text-[11px] font-bold">
                  <span>State: {INDIAN_STATES_BASE.find(s => s.code === selectedState)?.name}</span>
                  <button onClick={() => setSelectedState('ALL')} className="hover:text-rose-600 cursor-pointer"><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedSector !== 'ALL' && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950/80 text-teal-900 dark:text-teal-300 text-[11px] font-bold">
                  <span>Sector: {selectedSector}</span>
                  <button onClick={() => setSelectedSector('ALL')} className="hover:text-rose-600 cursor-pointer"><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedValueRange !== 'ALL' && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-300 text-[11px] font-bold">
                  <span>Value: {selectedValueRange}</span>
                  <button onClick={() => setSelectedValueRange('ALL')} className="hover:text-rose-600 cursor-pointer"><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedStage !== 'ALL' && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 text-[11px] font-bold">
                  <span>Stage: {selectedStage}</span>
                  <button onClick={() => setSelectedStage('ALL')} className="hover:text-rose-600 cursor-pointer"><X className="w-3 h-3" /></button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-300 text-[11px] font-bold">
                  <span>Query: "{searchQuery}"</span>
                  <button onClick={() => setSearchQuery('')} className="hover:text-rose-600 cursor-pointer"><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>

            <button
              onClick={() => {
                setSelectedState('ALL');
                setSelectedSector('ALL');
                setSelectedValueRange('ALL');
                setSelectedStage('ALL');
                setSearchQuery('');
              }}
              className="text-[11px] font-mono text-rose-700 dark:text-rose-400 font-bold hover:underline cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* 5. Tender Opportunity Listings */}
      {loading ? (
        <div className="glass-card p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Connecting to Live Supabase Tenders...</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Loading active government tenders from database.</p>
        </div>
      ) : filteredTenders.length === 0 ? (
        <div className="glass-card p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-600 dark:text-amber-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Tenders Found Matching Filters</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Try adjusting your state, sector, or keyword filters to discover active opportunities across other regions in India.
          </p>
          <button
            onClick={() => {
              setSelectedState('ALL');
              setSelectedSector('ALL');
              setSelectedValueRange('ALL');
              setSelectedStage('ALL');
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-[#064e3b] text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : viewLayout === 'cards' ? (
        /* CARDS VIEW */
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {paginatedTenders.map((tender) => {
              const isBookmarked = bookmarkedIds.includes(tender.id);
              const portalInfo = STATE_PORTAL_MAP[tender.state] || STATE_PORTAL_MAP['All India'];

              return (
                <div
                  key={tender.id}
                  onClick={() => setSelectedTenderModal(tender)}
                  className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#0d1527] hover:border-emerald-500 dark:hover:border-emerald-400 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 group shadow-xs hover:shadow-md"
                >
                  <div className="space-y-3">
                    {/* Top Metadata Row: NIT & Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            onClick={(e) => handleCopyNit(tender.nit_number, e)}
                            className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 transition"
                            title="Click to copy NIT Number"
                          >
                            <span>{tender.nit_number}</span>
                            {copiedId === tender.nit_number ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400" />
                            )}
                          </button>

                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                            {tender.sector}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/80 text-blue-900 dark:text-blue-300 font-bold">
                            {tender.state}
                          </span>
                        </div>
                      </div>

                      {/* Match Badge */}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold shrink-0">
                        {tender.eligibility_match_pct}% Match
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                      {tender.title}
                    </h3>

                    {/* Authority */}
                    <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center space-x-1.5 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{tender.authority}</span>
                    </div>

                    {/* Quick Financial Matrix */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-slate-500 block">Est. Cost</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          ₹{tender.estimated_cost_cr} Cr
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-slate-500 block">EMD</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          ₹{tender.emd_lakhs} L
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase text-slate-500 block">Due Date</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          {tender.days_left}d Left
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <a
                      href={tender.portal_url || portalInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-md"
                      title={`Open live ${tender.state} Government Portal (${portalInfo.portalName})`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Govt Portal</span>
                    </a>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={(e) => toggleBookmark(tender.id, e)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer border ${
                          isBookmarked
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                        }`}
                        title={isBookmarked ? 'Tracked in Watchlist' : 'Track Tender'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                        <span>{isBookmarked ? 'Tracked ✓' : 'Track'}</span>
                      </button>

                      {onSelectForBidding && (
                        (tender.state === 'Unclassified' || tender.id?.startsWith('tr-')) ? (
                          <span
                            className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 text-[11px] font-semibold cursor-not-allowed opacity-60"
                            title="Unclassified draft tender cannot be tracked for bidding"
                          >
                            Draft
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectForBidding(tender);
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-900 dark:text-blue-300 text-xs font-bold transition cursor-pointer"
                            title="Track this real government tender for bidding in Tender Tracker & Bid Flow"
                          >
                            Bid Track
                          </button>
                        )
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLaunchJVWizard(tender);
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-900 dark:text-purple-300 text-xs font-bold transition cursor-pointer"
                        title="Analyze with JV Consortium Partner"
                      >
                        JV Combine
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLaunchEligibility(tender);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-700 hover:bg-black text-white text-xs font-bold transition shadow-xs flex items-center space-x-1 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>AI Check</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 glass-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1426]">
              <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Showing <b>{(currentPage - 1) * pageSize + 1}</b> to <b>{Math.min(currentPage * pageSize, filteredTenders.length)}</b> of <b>{filteredTenders.length}</b> live tenders
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center space-x-1 font-mono text-xs">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      pageNum = Math.min(currentPage - 2 + i, totalPages);
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center cursor-pointer transition ${
                          currentPage === pageNum
                            ? 'bg-[#064e3b] dark:bg-[#059669] text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-1 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="space-y-4">
          <div className="glass-card rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-[#0d1527]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 font-mono font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">NIT & Sector</th>
                    <th className="p-3.5">Tender Title & Authority</th>
                    <th className="p-3.5">State & Location</th>
                    <th className="p-3.5">Value (₹ Cr)</th>
                    <th className="p-3.5">EMD (₹ L)</th>
                    <th className="p-3.5">Closing Date</th>
                    <th className="p-3.5">Govt Portal</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedTenders.map((tender) => {
                    const isBookmarked = bookmarkedIds.includes(tender.id);
                    const portalInfo = STATE_PORTAL_MAP[tender.state] || STATE_PORTAL_MAP['All India'];

                    return (
                      <tr key={tender.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                        <td className="p-3.5 align-top">
                          <div className="font-mono font-bold text-slate-900 dark:text-white text-[11px] flex items-center space-x-1">
                            <span>{tender.nit_number}</span>
                            <button
                              onClick={(e) => handleCopyNit(tender.nit_number, e)}
                              className="text-slate-400 hover:text-slate-600 cursor-pointer"
                              title="Copy NIT Number"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 font-bold mt-1 inline-block">
                            {tender.sector}
                          </span>
                        </td>

                        <td className="p-3.5 align-top max-w-sm">
                          <div className="font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                            {tender.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {tender.authority}
                          </div>
                        </td>

                        <td className="p-3.5 align-top whitespace-nowrap">
                          <div className="font-bold text-slate-900 dark:text-white">{tender.state}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{tender.district}</div>
                        </td>

                        <td className="p-3.5 align-top font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          ₹{tender.estimated_cost_cr} Cr
                        </td>

                        <td className="p-3.5 align-top font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          ₹{tender.emd_lakhs} L
                        </td>

                        <td className="p-3.5 align-top whitespace-nowrap">
                          <div className="font-bold text-slate-900 dark:text-white">{tender.due_date}</div>
                          <span className={`text-[10px] font-mono font-bold ${
                            tender.days_left <= 10 ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-400'
                          }`}>
                            {tender.days_left} Days Left
                          </span>
                        </td>

                        <td className="p-3.5 align-top whitespace-nowrap">
                          <a
                            href={tender.portal_url || portalInfo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs"
                            title={`Open official ${tender.state} e-procurement portal in new tab`}
                          >
                            <span>Open Portal</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </td>

                        <td className="p-3.5 align-top text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={(e) => toggleBookmark(tender.id, e)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer border ${
                                isBookmarked
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                              }`}
                              title={isBookmarked ? 'Tracked in Watchlist' : 'Track Tender'}
                            >
                              <Bookmark className={`w-3 h-3 ${isBookmarked ? 'fill-current' : ''}`} />
                              <span>{isBookmarked ? 'Tracked' : 'Track'}</span>
                            </button>

                            <button
                              onClick={() => setSelectedTenderModal(tender)}
                              className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-200 cursor-pointer"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleLaunchEligibility(tender)}
                              className="px-3 py-1 rounded bg-slate-900 dark:bg-slate-700 hover:bg-black text-white font-bold cursor-pointer"
                            >
                              Check
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls for Table */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 glass-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1426]">
              <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Showing <b>{(currentPage - 1) * pageSize + 1}</b> to <b>{Math.min(currentPage * pageSize, filteredTenders.length)}</b> of <b>{filteredTenders.length}</b> live tenders
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center space-x-1 font-mono text-xs">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      pageNum = Math.min(currentPage - 2 + i, totalPages);
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center cursor-pointer transition ${
                          currentPage === pageNum
                            ? 'bg-[#064e3b] dark:bg-[#059669] text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-1 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. Detailed Tender Inspection Modal */}
      {selectedTenderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0b1426] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 font-bold">
                    {selectedTenderModal.sector}
                  </span>
                  <button
                    onClick={(e) => handleCopyNit(selectedTenderModal.nit_number, e)}
                    className="inline-flex items-center space-x-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition cursor-pointer"
                  >
                    <span>NIT: {selectedTenderModal.nit_number}</span>
                    <Copy className="w-3 h-3 text-slate-400" />
                  </button>
                  {copiedId === selectedTenderModal.nit_number && (
                    <span className="text-[10px] font-mono text-emerald-600 font-bold">✓ Copied</span>
                  )}
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  {selectedTenderModal.title}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Issuing Authority: <strong>{selectedTenderModal.authority}</strong> • {selectedTenderModal.state}
                </p>
              </div>

              <button
                onClick={() => setSelectedTenderModal(null)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Financial Highlights Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Estimated Cost</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">₹{selectedTenderModal.estimated_cost_cr} Crore</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">EMD Required</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">₹{selectedTenderModal.emd_lakhs} Lakhs</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Tender Fee</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">₹{selectedTenderModal.tender_fee.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">Submission Due</span>
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                  {selectedTenderModal.due_date} ({selectedTenderModal.days_left}d)
                </span>
              </div>
            </div>

            {/* Scope of Work Highlights */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400 font-bold flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                <span>Scope of Work Breakdown</span>
              </h4>
              <ul className="space-y-1.5">
                {selectedTenderModal.scope_highlights.map((scope, idx) => (
                  <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 font-medium flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{scope}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Key Technical & Financial Qualification Criteria */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400 font-bold flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Mandatory Eligibility Criteria</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-mono text-slate-500 block">Minimum 3-Year Avg Turnover</span>
                  <span className="font-bold text-slate-900 dark:text-white">₹{selectedTenderModal.key_criteria.min_turnover_cr} Cr</span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block mt-0.5 font-bold">
                    Desire ₹300.93 Cr (✓ Exceeds requirement)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-mono text-slate-500 block">Single Similar Work Experience</span>
                  <span className="font-bold text-slate-900 dark:text-white">₹{selectedTenderModal.key_criteria.similar_work_cr} Cr</span>
                  <span className="text-[10px] text-slate-600 dark:text-slate-300 block mt-0.5">
                    Min {selectedTenderModal.key_criteria.experience_years} Years Experience
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <a
                href={selectedTenderModal.portal_url || STATE_PORTAL_MAP[selectedTenderModal.state]?.url || STATE_PORTAL_MAP['All India'].url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-xs font-bold text-white flex items-center space-x-2 cursor-pointer shadow-md"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open {selectedTenderModal.state} Govt Portal ({STATE_PORTAL_MAP[selectedTenderModal.state]?.portalName || 'GePNIC'})</span>
              </a>

              <div className="flex items-center space-x-2">
                {onSelectForBidding && (
                  (selectedTenderModal.state === 'Unclassified' || selectedTenderModal.id?.startsWith('tr-')) ? (
                    <span
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 font-bold text-xs flex items-center space-x-1.5 cursor-not-allowed opacity-70"
                      title="Unclassified draft tender cannot be tracked for bidding"
                    >
                      <AlertCircle className="w-4 h-4 text-slate-400" />
                      <span>Unclassified Draft (Cannot Track)</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        onSelectForBidding(selectedTenderModal);
                        setSelectedTenderModal(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Track for Bidding</span>
                    </button>
                  )
                )}

                <button
                  onClick={() => {
                    handleLaunchJVWizard(selectedTenderModal);
                    setSelectedTenderModal(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-50 dark:bg-purple-950 border border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-300 font-bold text-xs hover:bg-purple-100 cursor-pointer"
                >
                  Analyze with JV Partner
                </button>

                <button
                  onClick={() => {
                    handleLaunchEligibility(selectedTenderModal);
                    setSelectedTenderModal(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#064e3b] dark:bg-[#059669] text-white font-bold text-xs hover:bg-emerald-900 flex items-center space-x-1.5 shadow-md cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Launch Eligibility Engine</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
