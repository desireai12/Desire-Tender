'use client';

import React, { useState, useMemo } from 'react';
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
  ChevronDown
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
  sector: 'JJM & Rural Water' | 'Solar & Renewable' | 'STP & Wastewater' | 'Water Transmission & Pipelines' | 'Urban Infra & Smart Water' | 'Canal & Lift Irrigation' | 'ESCO & Energy Efficiency';
  estimated_cost_cr: number;
  emd_lakhs: number;
  tender_fee: number;
  publish_date: string;
  due_date: string;
  days_left: number;
  stage: 'Open (Live)' | 'Pre-Bid Meeting' | 'Corrigendum Issued' | 'Technical Bid Opening Soon';
  eligibility_match_pct: number;
  desire_qual_status: 'Direct Eligible' | 'JV Recommended' | 'High Requirement';
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

const INDIAN_STATES = [
  { name: 'All India', code: 'ALL', count: 48, totalValueCr: 4120 },
  { name: 'Rajasthan', code: 'RJ', count: 14, totalValueCr: 1420.5, highlight: 'PHED & RUDSICO Hub' },
  { name: 'Uttar Pradesh', code: 'UP', count: 9, totalValueCr: 980.2, highlight: 'JJM Mission & UPJN' },
  { name: 'Maharashtra', code: 'MH', count: 7, totalValueCr: 650.0, highlight: 'MJP & CIDCO Infra' },
  { name: 'Gujarat', code: 'GJ', count: 6, totalValueCr: 480.0, highlight: 'GWSSB & GIDC Water' },
  { name: 'Madhya Pradesh', code: 'MP', count: 4, totalValueCr: 290.4, highlight: 'MP Jal Nigam' },
  { name: 'Karnataka', code: 'KA', count: 3, totalValueCr: 180.0, highlight: 'KUWSDB Projects' },
  { name: 'Bihar', code: 'BR', count: 3, totalValueCr: 155.0, highlight: 'PHED Bihar JJM' },
  { name: 'Odisha', code: 'OD', count: 2, totalValueCr: 95.0, highlight: 'RWSS Odisha' },
];

const SECTOR_CATEGORIES = [
  { id: 'ALL', label: 'All Sectors', count: 48, totalCr: 4120, icon: Globe2 },
  { id: 'JJM & Rural Water', label: 'JJM & Rural Water', count: 18, totalCr: 1850.5, icon: Layers },
  { id: 'Solar & Renewable', label: 'Solar & Renewable (KUSUM)', count: 10, totalCr: 840.0, icon: Sparkles },
  { id: 'STP & Wastewater', label: 'STP & Wastewater', count: 8, totalCr: 590.2, icon: Building2 },
  { id: 'Water Transmission & Pipelines', label: 'Water Transmission & Pipelines', count: 6, totalCr: 510.0, icon: TrendingUp },
  { id: 'Urban Infra & Smart Water', label: 'Urban Infra & Smart Water', count: 4, totalCr: 240.0, icon: ShieldCheck },
  { id: 'Canal & Lift Irrigation', label: 'Canal & Lift Irrigation', count: 2, totalCr: 89.3, icon: BarChart3 },
];

const SAMPLE_TENDERS: IndiaTenderItem[] = [
  {
    id: 'TND-RJ-2026-001',
    nit_number: 'NIT-PHED-JJM-ALW-44/2026',
    title: 'Work of Solar Powered CWSS Rural Water Supply Scheme under Jal Jeevan Mission for 78 Villages in Alwar District',
    authority: 'Public Health Engineering Department (PHED)',
    authority_code: 'PHED Rajasthan',
    state: 'Rajasthan',
    district: 'Alwar',
    sector: 'JJM & Rural Water',
    estimated_cost_cr: 48.50,
    emd_lakhs: 97.0,
    tender_fee: 10000,
    publish_date: '2026-08-12',
    due_date: '2026-09-08',
    days_left: 13,
    stage: 'Open (Live)',
    eligibility_match_pct: 96,
    desire_qual_status: 'Direct Eligible',
    scope_highlights: [
      'Solar pumping machinery installation across 78 habitations',
      'DI/HDPE pipeline distribution network of 142 KM',
      'Construction of 12 Elevated Storage Reservoirs (ESR) & 8 CWR',
      '10-Year Comprehensive Operation & Maintenance (O&M)'
    ],
    key_criteria: {
      min_turnover_cr: 36.37,
      similar_work_cr: 24.25,
      experience_years: 5,
      license_category: 'Class-AA PHED Rajasthan'
    },
    contact_person: 'Superintending Engineer, PHED Circle Alwar',
    portal_url: 'https://eproc.rajasthan.gov.in'
  },
  {
    id: 'TND-RJ-2026-002',
    nit_number: 'NIT-RUDSICO-AMRUT2-STP-09',
    title: 'Design, Build, Operate & Transfer (DBOT) 25 MLD Sewage Treatment Plant (STP) with SBR Technology & Interception Sewer Line',
    authority: 'Rajasthan Urban Drinking Water Sewerage & Infra Corp (RUDSICO)',
    authority_code: 'RUDSICO Jaipur',
    state: 'Rajasthan',
    district: 'Jaipur',
    sector: 'STP & Wastewater',
    estimated_cost_cr: 36.53,
    emd_lakhs: 73.0,
    tender_fee: 15000,
    publish_date: '2026-08-15',
    due_date: '2026-09-12',
    days_left: 17,
    stage: 'Open (Live)',
    eligibility_match_pct: 92,
    desire_qual_status: 'JV Recommended',
    scope_highlights: [
      '25 MLD Sequential Batch Reactor (SBR) STP plant civil & electromechanical execution',
      'Online SCADA monitoring with effluent quality sensors',
      '15 KM RCC NP4 trunk sewer pipeline with manholes',
      '5-Year O&M including power generation from biogas'
    ],
    key_criteria: {
      min_turnover_cr: 29.22,
      similar_work_cr: 18.26,
      experience_years: 7,
      license_category: 'Class-A RUDSICO / PHED'
    },
    contact_person: 'Executive Director, RUDSICO Jaipur',
    portal_url: 'https://eproc.rajasthan.gov.in'
  },
  {
    id: 'TND-UP-2026-003',
    nit_number: 'SWSM-UP-JJM-PKG-114',
    title: 'Comprehensive Rural Water Supply Pipeline & Solar Feeder Scheme in 112 Gram Panchayats of Mirzapur & Sonbhadra',
    authority: 'State Water & Sanitation Mission (SWSM) UP',
    authority_code: 'SWSM Uttar Pradesh',
    state: 'Uttar Pradesh',
    district: 'Mirzapur',
    sector: 'JJM & Rural Water',
    estimated_cost_cr: 112.40,
    emd_lakhs: 224.8,
    tender_fee: 25000,
    publish_date: '2026-08-18',
    due_date: '2026-09-19',
    days_left: 24,
    stage: 'Pre-Bid Meeting',
    eligibility_match_pct: 88,
    desire_qual_status: 'JV Recommended',
    scope_highlights: [
      'Intake well construction at Son River basin with pump house',
      '220 KM DI K7 & K9 bulk water transmission mains',
      'Water Treatment Plant (WTP) of 45 MLD capacity',
      'Functional Household Tap Connection (FHTC) for 48,000 households'
    ],
    key_criteria: {
      min_turnover_cr: 84.30,
      similar_work_cr: 56.20,
      experience_years: 5,
      license_category: 'Class-A SWSM / Jal Nigam'
    },
    contact_person: 'Executive Engineer, SWSM Mirzapur Unit',
    portal_url: 'https://etender.up.nic.in'
  },
  {
    id: 'TND-MH-2026-004',
    nit_number: 'MJP-PUNE-WSS-2026-88',
    title: 'Regional Bulk Water Supply Scheme with Solar Pump Pumping Stations for 42 Villages in Baramati & Daund Taluka',
    authority: 'Maharashtra Jeevan Pradhikaran (MJP)',
    authority_code: 'MJP Maharashtra',
    state: 'Maharashtra',
    district: 'Pune',
    sector: 'Water Transmission & Pipelines',
    estimated_cost_cr: 64.80,
    emd_lakhs: 64.8,
    tender_fee: 10000,
    publish_date: '2026-08-20',
    due_date: '2026-09-15',
    days_left: 20,
    stage: 'Open (Live)',
    eligibility_match_pct: 94,
    desire_qual_status: 'Direct Eligible',
    scope_highlights: [
      'Supply, laying and jointing of 800mm to 300mm MS/DI pipeline (85 KM)',
      'Submersible solar hybrid pumping system of 350 HP',
      'Chlorination house, chemical dosing unit and laboratory setup',
      'Full SCADA automation and IoT smart flow meters'
    ],
    key_criteria: {
      min_turnover_cr: 48.60,
      similar_work_cr: 32.40,
      experience_years: 5,
      license_category: 'Class-I MJP Maharashtra'
    },
    contact_person: 'Chief Engineer, MJP Pune Region',
    portal_url: 'https://mahatenders.gov.in'
  },
  {
    id: 'TND-GJ-2026-005',
    nit_number: 'GWSSB-SUR-NCMS-2026-12',
    title: 'Turnkey Execution of Solar Submersible Pumps for Agricultural & Drinking Water Supply under PM-KUSUM Component-C',
    authority: 'Gujarat Water Supply & Sewerage Board (GWSSB)',
    authority_code: 'GWSSB Gandhinagar',
    state: 'Gujarat',
    district: 'Surat',
    sector: 'Solar & Renewable',
    estimated_cost_cr: 42.10,
    emd_lakhs: 42.1,
    tender_fee: 12000,
    publish_date: '2026-08-16',
    due_date: '2026-09-05',
    days_left: 10,
    stage: 'Corrigendum Issued',
    eligibility_match_pct: 98,
    desire_qual_status: 'Direct Eligible',
    scope_highlights: [
      'Installation of 1,250 Solar Agri pumps (7.5 HP & 10 HP)',
      'RMS (Remote Monitoring System) gateway integration with state portal',
      '5-Year warranty, insurance and O&M service SLA',
      'Net metering bidirectional grid tie interface'
    ],
    key_criteria: {
      min_turnover_cr: 31.50,
      similar_work_cr: 21.05,
      experience_years: 4,
      license_category: 'GWSSB / GEDA Registered EPC'
    },
    contact_person: 'Superintending Engineer, GWSSB Surat Circle',
    portal_url: 'https://gujarat.nprocure.com'
  },
  {
    id: 'TND-MP-2026-006',
    nit_number: 'MPJN-BHO-MULTI-PKG-08',
    title: 'Multi-Village Piped Water Supply Scheme based on Narmada River for 164 Villages in Hoshangabad & Sehore Districts',
    authority: 'Madhya Pradesh Jal Nigam Maryadit (MPJNM)',
    authority_code: 'MP Jal Nigam',
    state: 'Madhya Pradesh',
    district: 'Narmadapuram',
    sector: 'JJM & Rural Water',
    estimated_cost_cr: 88.30,
    emd_lakhs: 176.6,
    tender_fee: 20000,
    publish_date: '2026-08-10',
    due_date: '2026-09-22',
    days_left: 27,
    stage: 'Open (Live)',
    eligibility_match_pct: 90,
    desire_qual_status: 'JV Recommended',
    scope_highlights: [
      'Floating intake barge on Narmada Reservoir with vertical turbine pumps',
      '60 MLD Rapid Sand Filter Water Treatment Plant',
      '180 KM DI Class K7 transmission pipelines',
      'Distribution network and village level disinfection units'
    ],
    key_criteria: {
      min_turnover_cr: 66.20,
      similar_work_cr: 44.15,
      experience_years: 5,
      license_category: 'Class-A MP PWD / Jal Nigam'
    },
    contact_person: 'General Manager (Tech), MP Jal Nigam Bhopal',
    portal_url: 'https://mptenders.gov.in'
  },
  {
    id: 'TND-RJ-2026-007',
    nit_number: 'NIT-RRECL-KUSUM-B-2026-104',
    title: 'Design, Supply, Installation & Commissioning of 2,400 Standalone Solar PV Water Pumping Systems under PM-KUSUM Component-B across Rajasthan',
    authority: 'Rajasthan Renewable Energy Corporation Ltd (RRECL)',
    authority_code: 'RRECL Jaipur',
    state: 'Rajasthan',
    district: 'Statewide',
    sector: 'Solar & Renewable',
    estimated_cost_cr: 74.20,
    emd_lakhs: 74.2,
    tender_fee: 15000,
    publish_date: '2026-08-22',
    due_date: '2026-09-25',
    days_left: 30,
    stage: 'Open (Live)',
    eligibility_match_pct: 99,
    desire_qual_status: 'Direct Eligible',
    scope_highlights: [
      'Supply and erection of MNRE approved high-efficiency DCR Solar Panels & BLDC solar pumps',
      'Universal solar pump controllers with GPS and 4G IoT telematics',
      '5-Year comprehensive maintenance contract with uptime guarantee',
      'Farmer orientation and doorstep warranty service network'
    ],
    key_criteria: {
      min_turnover_cr: 55.65,
      similar_work_cr: 37.10,
      experience_years: 4,
      license_category: 'Class-A Electrical / RRECL Empanelled'
    },
    contact_person: 'Director (Technical), RRECL Jaipur',
    portal_url: 'https://eproc.rajasthan.gov.in'
  },
  {
    id: 'TND-KA-2026-008',
    nit_number: 'KUWSDB-BLR-STP-2026-03',
    title: 'Construction of 18 MLD Capacity Sewage Treatment Plant (STP) using MBR Membrane Technology with Sewer Network for Hubballi-Dharwad Smart City',
    authority: 'Karnataka Urban Water Supply & Drainage Board (KUWSDB)',
    authority_code: 'KUWSDB Bangalore',
    state: 'Karnataka',
    district: 'Dharwad',
    sector: 'STP & Wastewater',
    estimated_cost_cr: 52.60,
    emd_lakhs: 52.6,
    tender_fee: 15000,
    publish_date: '2026-08-14',
    due_date: '2026-09-18',
    days_left: 23,
    stage: 'Open (Live)',
    eligibility_match_pct: 85,
    desire_qual_status: 'JV Recommended',
    scope_highlights: [
      '18 MLD Membrane Bio-Reactor (MBR) secondary & tertiary wastewater treatment',
      'Treated effluent reuse piping for industrial and gardening applications',
      'SCADA PLC automation with remote central dashboard',
      '7-Year continuous Operation & Maintenance'
    ],
    key_criteria: {
      min_turnover_cr: 39.45,
      similar_work_cr: 26.30,
      experience_years: 6,
      license_category: 'Class-I KUWSDB / PWD Karnataka'
    },
    contact_person: 'Executive Engineer, KUWSDB Hubli Division',
    portal_url: 'https://eproc.karnataka.gov.in'
  }
];

interface IndiaTendersSectorViewProps {
  onNavigate?: (tab: NavTab) => void;
  onImportTender?: (tender: IndiaTenderItem) => void;
  onSelectForBidding?: (tender: IndiaTenderItem) => void;
}

export const IndiaTendersSectorView: React.FC<IndiaTendersSectorViewProps> = ({
  onNavigate,
  onImportTender,
  onSelectForBidding
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [selectedValueRange, setSelectedValueRange] = useState<string>('ALL');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [selectedTenderModal, setSelectedTenderModal] = useState<IndiaTenderItem | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(['TND-RJ-2026-001']);
  const [viewLayout, setViewLayout] = useState<'cards' | 'table'>('cards');

  // Filter Logic
  const filteredTenders = useMemo(() => {
    return SAMPLE_TENDERS.filter((item) => {
      // Search
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

      // State
      if (selectedState !== 'ALL') {
        const stateObj = INDIAN_STATES.find(s => s.code === selectedState);
        if (stateObj && item.state !== stateObj.name) return false;
      }

      // Sector
      if (selectedSector !== 'ALL' && item.sector !== selectedSector) {
        return false;
      }

      // Value Range
      if (selectedValueRange === 'UNDER_25' && item.estimated_cost_cr >= 25) return false;
      if (selectedValueRange === '25_50' && (item.estimated_cost_cr < 25 || item.estimated_cost_cr > 50)) return false;
      if (selectedValueRange === '50_100' && (item.estimated_cost_cr < 50 || item.estimated_cost_cr > 100)) return false;
      if (selectedValueRange === 'ABOVE_100' && item.estimated_cost_cr < 100) return false;

      // Stage
      if (selectedStage !== 'ALL' && item.stage !== selectedStage) {
        return false;
      }

      return true;
    });
  }, [searchQuery, selectedState, selectedSector, selectedValueRange, selectedStage]);

  // Aggregate Metrics for current filter
  const totalFilteredValue = useMemo(() => {
    return filteredTenders.reduce((sum, t) => sum + t.estimated_cost_cr, 0).toFixed(1);
  }, [filteredTenders]);

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
            </div>

            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Where in India Tenders Are Open (Sector-Wise)
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl font-medium">
              Explore live, verified water infrastructure, JJM, solar pumping, wastewater (STP/ETP), and bulk transmission tenders across Indian states. Filter by sector, check Desire Energy eligibility matches, and import directly into analysis engines.
            </p>
          </div>

          {/* Aggregate Market Pulse Pills */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3 shrink-0">
            <div className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 min-w-[130px]">
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold block">
                Live Open Tenders
              </span>
              <span className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-1">
                <span>{filteredTenders.length}</span>
                <span className="text-xs font-normal text-slate-400">/ 48</span>
              </span>
            </div>

            <div className="px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 min-w-[140px]">
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
      </div>

      {/* 2. Interactive States Distribution Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>Select Indian State / Territory</span>
          </span>
          <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
            {selectedState === 'ALL' ? 'Showing All India' : `Filtered by ${INDIAN_STATES.find(s => s.code === selectedState)?.name}`}
          </span>
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin">
          {INDIAN_STATES.map((st) => {
            const isSelected = selectedState === st.code;
            return (
              <button
                key={st.code}
                onClick={() => setSelectedState(st.code)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center space-x-2.5 cursor-pointer border ${
                  isSelected
                    ? 'bg-[#064e3b] dark:bg-[#059669] text-white border-emerald-700 dark:border-emerald-500 shadow-md'
                    : 'bg-white dark:bg-[#0d1527] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600'
                }`}
              >
                <div className="flex flex-col text-left">
                  <span className="leading-tight">{st.name}</span>
                  <span className={`text-[10px] font-mono ${isSelected ? 'text-emerald-200' : 'text-slate-400 dark:text-slate-400'}`}>
                    {st.count} Tenders • ₹{st.totalValueCr} Cr
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Interactive Sector Breakdown Tabs (BidAssist / Infralens Style) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>Infrastructure Sectors</span>
          </span>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Click sector to filter opportunities</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {SECTOR_CATEGORIES.map((sec) => {
            const isSelected = selectedSector === sec.id;
            const Icon = sec.icon;
            return (
              <button
                key={sec.id}
                onClick={() => setSelectedSector(sec.id)}
                className={`p-3 rounded-xl text-left transition-all cursor-pointer border flex flex-col justify-between space-y-2 ${
                  isSelected
                    ? 'bg-emerald-900 text-white border-emerald-600 shadow-md'
                    : 'bg-white dark:bg-[#0d1527] text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-emerald-500'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-300' : 'text-emerald-700 dark:text-emerald-400'}`} />
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {sec.count}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold line-clamp-1">{sec.label}</div>
                  <div className={`text-[10px] font-mono ${isSelected ? 'text-emerald-200' : 'text-slate-500 dark:text-slate-400'}`}>
                    ₹{sec.totalCr} Cr
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
              placeholder="Search by tender title, NIT number, authority (PHED, JJM, RUDSICO), district, or keywords..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs"
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
              className="px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-emerald-600"
            >
              <option value="ALL">All Tender Values</option>
              <option value="UNDER_25">&lt; ₹25 Crore</option>
              <option value="25_50">₹25 Cr - ₹50 Crore</option>
              <option value="50_100">₹50 Cr - ₹100 Crore</option>
              <option value="ABOVE_100">&gt; ₹100 Crore (High Value)</option>
            </select>

            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:border-emerald-600"
            >
              <option value="ALL">All Tender Stages</option>
              <option value="Open (Live)">Live (Active Bidding)</option>
              <option value="Pre-Bid Meeting">Pre-Bid Meeting Stage</option>
              <option value="Corrigendum Issued">Corrigendum Issued</option>
            </select>

            {/* Layout Toggle */}
            <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900">
              <button
                onClick={() => setViewLayout('cards')}
                className={`px-3 py-2 text-xs font-bold ${
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
                className={`px-3 py-2 text-xs font-bold ${
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
        {(selectedState !== 'ALL' || selectedSector !== 'ALL' || selectedValueRange !== 'ALL' || searchQuery) && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-bold">Active Filters:</span>
              {selectedState !== 'ALL' && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 text-[11px] font-bold">
                  <span>State: {INDIAN_STATES.find(s => s.code === selectedState)?.name}</span>
                  <button onClick={() => setSelectedState('ALL')} className="hover:text-rose-600"><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedSector !== 'ALL' && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950/80 text-teal-900 dark:text-teal-300 text-[11px] font-bold">
                  <span>Sector: {selectedSector}</span>
                  <button onClick={() => setSelectedSector('ALL')} className="hover:text-rose-600"><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedValueRange !== 'ALL' && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-300 text-[11px] font-bold">
                  <span>Value: {selectedValueRange}</span>
                  <button onClick={() => setSelectedValueRange('ALL')} className="hover:text-rose-600"><X className="w-3 h-3" /></button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-300 text-[11px] font-bold">
                  <span>Query: "{searchQuery}"</span>
                  <button onClick={() => setSearchQuery('')} className="hover:text-rose-600"><X className="w-3 h-3" /></button>
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
      {filteredTenders.length === 0 ? (
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
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-[#064e3b] text-white rounded-xl text-xs font-bold"
          >
            Clear Filters
          </button>
        </div>
      ) : viewLayout === 'cards' ? (
        /* CARDS VIEW (BidAssist / BidIndia Style) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTenders.map((tender) => {
            const isBookmarked = bookmarkedIds.includes(tender.id);
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
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                          {tender.nit_number}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                          {tender.sector}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/80 text-blue-900 dark:text-blue-300 font-bold">
                          {tender.state} • {tender.district}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => toggleBookmark(tender.id, e)}
                      className={`p-1.5 rounded-lg border transition ${
                        isBookmarked
                          ? 'bg-amber-50 dark:bg-amber-950 text-amber-600 border-amber-300 dark:border-amber-700'
                          : 'text-slate-400 hover:text-slate-700 dark:hover:text-white border-transparent'
                      }`}
                      title={isBookmarked ? 'Saved to Watchlist' : 'Save to Watchlist'}
                    >
                      <Bookmark className="w-4 h-4 fill-current" />
                    </button>
                  </div>

                  {/* Title & Authority */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition leading-snug line-clamp-2">
                      {tender.title}
                    </h3>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-1 flex items-center space-x-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{tender.authority}</span>
                    </p>
                  </div>

                  {/* Financial & Deadline Grid */}
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-left">
                    <div>
                      <span className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold block">
                        Tender Value
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        ₹{tender.estimated_cost_cr} Cr
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold block">
                        EMD Amount
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        ₹{tender.emd_lakhs} L
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold block">
                        Closing In
                      </span>
                      <span className={`text-xs font-bold flex items-center space-x-1 ${
                        tender.days_left <= 10 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'
                      }`}>
                        <Clock className="w-3 h-3" />
                        <span>{tender.days_left} Days</span>
                      </span>
                    </div>
                  </div>

                  {/* Desire Qualification Match Pill */}
                  <div className="flex items-center justify-between text-xs px-1">
                    <div className="flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                        Eligibility Match:
                      </span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                        {tender.eligibility_match_pct}%
                      </span>
                    </div>

                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      tender.desire_qual_status === 'Direct Eligible'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300'
                    }`}>
                      {tender.desire_qual_status}
                    </span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTenderModal(tender);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                  >
                    <span>View Scope</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLaunchJVWizard(tender);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-900 dark:text-purple-300 text-xs font-bold transition cursor-pointer"
                      title="Analyze with JV Consortium Partner"
                    >
                      JV Combine
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectForBidding) {
                          onSelectForBidding(tender);
                        } else if (onNavigate) {
                          onNavigate('tender_tracker');
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center space-x-1 cursor-pointer"
                      title="Select this tender for bidding in Tender Tracker"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Select for Bidding</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLaunchEligibility(tender);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-xs font-bold transition shadow-xs flex items-center space-x-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Check Eligibility</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW (BidIndia / Infralens Matrix Style) */
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
                  <th className="p-3.5">Match %</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTenders.map((tender) => (
                  <tr key={tender.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td className="p-3.5 align-top">
                      <div className="font-mono font-bold text-slate-900 dark:text-white text-[11px]">
                        {tender.nit_number}
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
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {tender.eligibility_match_pct}%
                      </span>
                      <div className="text-[9px] font-mono text-slate-500">
                        {tender.desire_qual_status}
                      </div>
                    </td>

                    <td className="p-3.5 align-top text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setSelectedTenderModal(tender)}
                          className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-200"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleLaunchEligibility(tender)}
                          className="px-3 py-1 rounded bg-[#064e3b] dark:bg-[#059669] text-white font-bold hover:bg-emerald-900"
                        >
                          Check
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Detailed Tender Inspection Modal / Drawer */}
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
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    NIT: {selectedTenderModal.nit_number}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  {selectedTenderModal.title}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Issuing Authority: <strong>{selectedTenderModal.authority}</strong> • {selectedTenderModal.state} ({selectedTenderModal.district})
                </p>
              </div>

              <button
                onClick={() => setSelectedTenderModal(null)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300"
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
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block mt-0.5">
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
                href={selectedTenderModal.portal_url || '#'}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-700 flex items-center space-x-1"
              >
                <span>Open Government e-Proc Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    handleLaunchJVWizard(selectedTenderModal);
                    setSelectedTenderModal(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-50 dark:bg-purple-950 border border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-300 font-bold text-xs hover:bg-purple-100"
                >
                  Analyze with JV Partner
                </button>

                <button
                  onClick={() => {
                    handleLaunchEligibility(selectedTenderModal);
                    setSelectedTenderModal(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#064e3b] dark:bg-[#059669] text-white font-bold text-xs hover:bg-emerald-900 flex items-center space-x-1.5 shadow-md"
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
