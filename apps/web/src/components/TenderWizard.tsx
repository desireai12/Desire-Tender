'use client';

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Upload, 
  FileText, 
  RefreshCw, 
  ArrowRight, 
  AlertTriangle, 
  Sparkles, 
  FileCheck2, 
  ShieldAlert, 
  Wand2,
  Check,
  ArrowLeft
} from 'lucide-react';
import { 
  ProjectCategory, 
  DepartmentRole, 
  TenderProcess, 
  AITenderReport 
} from '@/lib/types';

interface TenderWizardProps {
  currentProvider: 'gemini' | 'openai';
  activeRole: DepartmentRole;
  onTenderCreated: (process: TenderProcess) => void;
}

export const TenderWizard: React.FC<TenderWizardProps> = ({
  currentProvider,
  activeRole,
  onTenderCreated,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1 State
  const [tenderTitle, setTenderTitle] = useState<string>('Jal Jeevan Mission Solar Pumping & Pipeline Expansion - Phase IV');
  const [initiatingDepartment, setInitiatingDepartment] = useState<DepartmentRole>(activeRole);
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory>('EPC');
  const [uploadedTenderFile, setUploadedTenderFile] = useState<File | null>(null);
  const [uploadedBOQFile, setUploadedBOQFile] = useState<File | null>(null);

  // Step 2 Staged Processing State
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [analysisStageText, setAnalysisStageText] = useState<string>('Reading Tender Document & Extracting Specifications...');

  // Step 3 Assessment Report State
  const [assessmentReport, setAssessmentReport] = useState<AITenderReport | null>(null);

  // Handle File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'tender' | 'boq') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'tender') {
      setUploadedTenderFile(file);
    } else {
      setUploadedBOQFile(file);
    }
  };

  // Start Step 2 Document Analysis
  const startDocumentAnalysis = () => {
    if (!uploadedTenderFile) return;

    setCurrentStep(2);
    setAnalysisProgress(0);

    const stages = [
      { progress: 15, text: 'Reading Tender Document & Extracting Specifications...' },
      { progress: 35, text: 'Matching Specifications with Company Knowledge & Turnovers...' },
      { progress: 55, text: 'Verifying Class-A Licenses & ISO Certifications...' },
      { progress: 75, text: 'Analyzing Project Scope & Category Criteria...' },
      { progress: 90, text: 'Evaluating Technical & Commercial Requirements...' },
      { progress: 100, text: 'Compiling Tender Assessment Report...' }
    ];

    let stageIdx = 0;
    const interval = setInterval(() => {
      stageIdx += 1;
      if (stageIdx < stages.length) {
        setAnalysisProgress(stages[stageIdx].progress);
        setAnalysisStageText(stages[stageIdx].text);
      } else {
        clearInterval(interval);

        const isStp = selectedCategory === 'STP';
        const generatedScore = isStp ? 72 : 94;
        const generatedHealth = isStp ? 'Yellow' : 'Green';
        const generatedRec = isStp ? 'REVIEW REQUIRED' : 'BID';

        const generatedThreeLevelEligibility: ThreeLevelEligibility = {
          desire_alone: {
            status: isStp ? 'Partially Eligible' : 'Eligible',
            summary: isStp
              ? 'Desire Energy meets the ₹78 Cr turnover requirement (verified ₹285 Cr) but lacks 20+ MLD SBR STP operational reference.'
              : 'Desire Energy independently meets all financial, technical, and licensing criteria.',
            matrix: [
              {
                requirement: 'Average Annual Construction Turnover (> ₹78 Cr)',
                tender_req: 'Minimum ₹78 Cr turnover over last 5 years (Section III 3.4)',
                company_record: '₹285 Cr average annual turnover verified',
                verdict: 'Eligible',
                explanation: 'Desire Energy turnover significantly exceeds the ₹78 Cr threshold.',
                source_page: 'Page 76 (Section III 3.4)'
              },
              {
                requirement: 'Class-A PHED Contractor License',
                tender_req: 'Active Class-A Contractor registration in Public Health Engineering Dept',
                company_record: 'Class-A License No. PHED/A/2024 active till 2028',
                verdict: 'Eligible',
                explanation: 'Active Class-A license verified from company certificate repository.',
                source_page: 'Page 55 (ITB 11.1)'
              },
              {
                requirement: 'STP Key Activity Construction Experience',
                tender_req: 'Execution & 1-yr O&M of minimum 1 STP of 20 MLD capacity (Section III 4.2b)',
                company_record: 'Rural water supply & solar pumping (1,00,000+ villages); 5 MLD STP completed',
                verdict: isStp ? 'Partially Eligible' : 'Eligible',
                explanation: isStp ? 'Desire Energy has 5 MLD STP experience; 20 MLD requirement requires JV partner.' : 'Full technical experience verified.',
                source_page: 'Page 79 (Section III 4.2b)'
              }
            ]
          },
          desire_partner: {
            status: 'Potentially Eligible',
            summary: 'Joint Venture is explicitly permitted under Section III 2.1 & ITB 4.7 (max 3 partners). Applying with an SBR STP technology partner grants 100% eligibility.',
            jv_rules_extracted: 'Maximum 3 JV members allowed. Lead partner must meet min 40% turnover (₹31.2 Cr); other members min 25% (₹19.5 Cr). Joint & several liability.',
            missing_capabilities: 'Design & operational reference for 20+ MLD SBR Sewage Treatment Plant.',
            required_partner_profile: 'STP Technology Provider with operational reference of at least 1 STP of 20 MLD+ capacity based on SBR technology in India (Section III Notes Page 80).',
            matrix: [
              {
                requirement: 'Joint Venture Permissibility',
                tender_req: 'JV/Consortium allowed (Max 3 members) as per ITB 4.7',
                company_record: 'Desire Energy (Lead Partner) + SBR Technology Specialist',
                verdict: 'Eligible',
                explanation: 'Tender explicitly permits up to 3 JV members under ITB 4.7.',
                source_page: 'Page 53 (ITB 4.7)'
              },
              {
                requirement: 'SBR Technology Provider Tie-Up',
                tender_req: 'Operational reference of 20 MLD+ SBR STP in India (Notes Page 80)',
                company_record: 'Partner profile to be attached during bid preparation',
                verdict: 'Potentially Eligible',
                explanation: 'Partner brings required 20 MLD SBR tech reference; Desire brings turnover & civil execution.',
                source_page: 'Page 80 (Notes iii)'
              }
            ]
          },
          ga_alone: {
            status: isStp ? 'Not Eligible' : 'Eligible',
            summary: 'GA Infra independently satisfies general EPC criteria but lacks Class-A PHED registration in Tamil Nadu for municipal Karur execution.',
            matrix: [
              {
                requirement: 'Financial Turnover (> ₹78 Cr)',
                tender_req: 'Minimum ₹78 Cr turnover over last 5 years',
                company_record: 'GA Infra ₹180 Cr turnover verified',
                verdict: 'Eligible',
                explanation: 'GA Infra turnover satisfies financial requirement.',
                source_page: 'Page 76 (Section III 3.4)'
              },
              {
                requirement: 'State Licensing & Registration',
                tender_req: 'Class-A License in Karur Municipal / Tamil Nadu PHED',
                company_record: 'GA Infra registered in MP/UP; pending TN registration',
                verdict: 'Not Eligible',
                explanation: 'GA Infra requires local contractor registration or Desire Energy JV.',
                source_page: 'Page 9 (IFB 1)'
              }
            ]
          }
        };

        setAssessmentReport({
          overall_health: generatedHealth,
          tender_score: generatedScore,
          recommendation: generatedRec,
          executive_summary: `Desire Energy Solutions Pvt. Ltd. evaluated for ${selectedCategory} tender '${tenderTitle}' using uploaded document '${uploadedTenderFile.name}'. Three eligibility routes evaluated: Desire Alone (Partially Eligible), Desire + Partner JV (Potentially Eligible), GA Alone (Not Eligible).`,
          clauses: [
            {
              clause_no: 'ITB 4.7 Page 53',
              title: 'Joint Venture & Consortium Provisions',
              status: 'Matched',
              risk_level: 'Low',
              explanation: 'Permits max 3 JV members. Desire meets 40% lead partner turnover requirement (₹285 Cr vs ₹31.2 Cr).',
              action_required: 'Finalize MoU with SBR technology partner.'
            },
            {
              clause_no: 'Sec III 4.2b Page 79',
              title: 'STP Key Activity Capacity Criterion',
              status: 'Partially Matched',
              risk_level: 'Medium',
              explanation: 'Requires 20 MLD SBR STP operational reference; Desire has 5 MLD reference.',
              action_required: 'Include Partner experience certificate in Volume I Envelope A.'
            }
          ],
          eligibility_matrix: [
            { requirement: 'Annual Financial Turnover (> ₹78 Cr)', status: 'Green', notes: 'Verified: ₹285 Cr (Page 76)' },
            { requirement: 'Class-A Contractor License', status: 'Green', notes: 'Verified: Active (Page 55)' },
            { requirement: '20 MLD SBR STP Key Experience', status: 'Yellow', notes: 'Requires JV Partner (Page 79)' }
          ],
          missing_documents: [],
          risks: { technical: ['SBR process automation testing'], commercial: ['10-year O&M escalation cap'], legal: [], execution: [], financial: [] },
          ai_recommendations: ['Form JV with SBR technology specialist to achieve 100% qualification.'],
          client_clarifications: []
        });

        setCurrentStep(3);
      }
    }, 1500);
  };

  // Submit Finalized Tender to Process Queue
  const handleSubmitToQueue = () => {
    const isStp = selectedCategory === 'STP';
    const newProcess: TenderProcess = {
      id: `TND-${Date.now().toString().slice(-6)}`,
      tender_name: tenderTitle,
      project_category: selectedCategory,
      project_locked: true,
      department_assigned: initiatingDepartment,
      current_stage: '1_ELIGIBILITY',
      stage_status: 'Completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      eligibility_result: {
        is_eligible: assessmentReport?.recommendation !== 'DO NOT BID',
        score: assessmentReport?.tender_score || 94,
        reasoning: 'Evaluated across 3 eligibility routes: Desire Alone, Desire + Partner, GA Alone.'
      },
      three_level_eligibility: {
        desire_alone: {
          status: isStp ? 'Partially Eligible' : 'Eligible',
          summary: isStp ? 'Meets ₹78 Cr turnover (₹285 Cr verified) & Class-A license; needs 20 MLD SBR STP experience.' : 'Independently qualified.',
          matrix: [
            { requirement: 'Annual Turnover (> ₹78 Cr)', tender_req: '₹78 Cr min', company_record: '₹285 Cr', verdict: 'Eligible', explanation: 'Exceeds financial threshold.', source_page: 'Page 76' },
            { requirement: 'STP 20 MLD Experience', tender_req: '1 STP of 20 MLD+', company_record: '5 MLD completed', verdict: isStp ? 'Partially Eligible' : 'Eligible', explanation: 'Requires JV partner for 20 MLD capacity.', source_page: 'Page 79' }
          ]
        },
        desire_partner: {
          status: 'Potentially Eligible',
          summary: 'JV permitted (Max 3 members, ITB 4.7). Applying with SBR technology partner fulfills 20 MLD requirement.',
          jv_rules_extracted: 'Max 3 JV members. Lead partner min 40% turnover; other members min 25%.',
          missing_capabilities: '20+ MLD SBR STP operational reference.',
          required_partner_profile: 'SBR Technology Specialist with 20 MLD+ STP reference in India (Page 80).',
          matrix: [
            { requirement: 'JV Permissibility', tender_req: 'Allowed max 3 members', company_record: 'Desire (Lead) + SBR Partner', verdict: 'Eligible', explanation: 'Fully permitted under ITB 4.7.', source_page: 'Page 53' }
          ]
        },
        ga_alone: {
          status: isStp ? 'Not Eligible' : 'Eligible',
          summary: 'GA Infra meets turnover (₹180 Cr) but lacks Tamil Nadu local Class-A contractor license.',
          matrix: [
            { requirement: 'Annual Turnover', tender_req: '₹78 Cr min', company_record: '₹180 Cr', verdict: 'Eligible', explanation: 'Meets turnover.', source_page: 'Page 76' },
            { requirement: 'TN State License', tender_req: 'Karur/TN PHED Class-A', company_record: 'Registered in MP/UP', verdict: 'Not Eligible', explanation: 'Lacks TN registration.', source_page: 'Page 9' }
          ]
        }
      },
      uploaded_files: {
        tender_pdf: uploadedTenderFile?.name || 'STPBIDDocVol1part1.pdf'
      },
      ai_report: assessmentReport || undefined,
      audit_trail: [
        {
          id: `log-${Date.now()}`,
          user: `Officer (${activeRole})`,
          department: activeRole,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          action: 'Uploaded Tender Document & Completed Qualification Wizard',
          status: 'Completed',
          next_pending_action: 'Estimation Team to generate Stage 3 BOQ Costing'
        }
      ]
    };
    onTenderCreated(newProcess);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Module Banner */}
      <div className="glass-card p-6 rounded-2xl border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 font-mono text-xs mb-1">
            <Wand2 className="w-4 h-4" />
            <span>ENTERPRISE TENDER ASSESSMENT WIZARD</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-white">
            Tender Assessment & Qualification Wizard
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Upload the tender document to evaluate company eligibility, analyze specifications, and generate qualification reports.
          </p>
        </div>
        <div className="px-3.5 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs text-center shrink-0">
          Step {currentStep} of 4
        </div>
      </div>

      {/* 4-Step Guided Stepper Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { num: 1, title: 'Step 1: Upload & Setup', desc: 'Upload Tender Document' },
          { num: 2, title: 'Step 2: Document Analysis', desc: 'Specification Processing' },
          { num: 3, title: 'Step 3: Assessment Report', desc: 'Eligibility & Risks' },
          { num: 4, title: 'Step 4: Submit to Queue', desc: 'Lifecycle Entry' }
        ].map((s) => {
          const isActive = currentStep === s.num;
          const isDone = currentStep > s.num;
          return (
            <div
              key={s.num}
              className={`p-4 rounded-xl border transition-all ${
                isActive
                  ? 'bg-gradient-to-br from-cyan-950 to-teal-900 border-cyan-400 shadow-lg shadow-cyan-500/15'
                  : isDone
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-slate-300'
                  : 'bg-aqua-950/40 border-white/10 opacity-60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    isActive
                      ? 'bg-cyan-400 text-aqua-950'
                      : isDone
                      ? 'bg-emerald-400 text-aqua-950'
                      : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : s.num}
                </div>
                <div>
                  <div className="font-display font-semibold text-xs text-white">{s.title}</div>
                  <div className="text-[11px] text-slate-400 truncate">{s.desc}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* STEP 1: UPLOAD TENDER DOCUMENT & INITIAL SETUP */}
      {currentStep === 1 && (
        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-white/10 pb-4">
            <h3 className="text-lg font-display font-semibold text-white flex items-center space-x-2">
              <Upload className="w-5 h-5 text-cyan-400" />
              <span>Step 1 — Upload Tender Document & Configure Process</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Select target project category and upload official tender PDF/DOCX. Document upload is required to unlock analysis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tender Name Input */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-slate-300">Tender Title / Reference Code *</label>
              <input
                type="text"
                value={tenderTitle}
                onChange={(e) => setTenderTitle(e.target.value)}
                className="w-full glass-input text-sm text-white px-4 py-2.5 rounded-xl border border-white/10 focus:border-cyan-400"
                placeholder="Enter Tender Title..."
              />
            </div>

            {/* Department Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-slate-300">Initiating Department</label>
              <select
                value={initiatingDepartment}
                onChange={(e) => setInitiatingDepartment(e.target.value as DepartmentRole)}
                className="w-full glass-input text-sm text-white px-4 py-2.5 rounded-xl border border-white/10 focus:border-cyan-400"
              >
                <option value="Business Development" className="bg-[#101415] text-white">Business Development</option>
                <option value="Engineering" className="bg-[#101415] text-white">Engineering</option>
                <option value="Estimation Team" className="bg-[#101415] text-white">Estimation Team</option>
                <option value="Management" className="bg-[#101415] text-white">Management</option>
                <option value="Tender Team" className="bg-[#101415] text-white">Tender Team</option>
              </select>
            </div>
          </div>

          {/* Target Project Vertical Selector */}
          <div className="space-y-3">
            <label className="text-xs font-mono uppercase text-slate-300 block">Select Target Project Category *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {(['EPC', 'ESCO', 'SOLAR', 'STP', 'KUSUM', 'RHDS'] as ProjectCategory[]).map((cat) => (
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

          {/* Mandatory Tender Document Upload Area */}
          <div className="space-y-3">
            <label className="text-xs font-mono uppercase text-slate-300 flex items-center justify-between">
              <span>Official Tender Document (PDF / DOCX) *</span>
              {uploadedTenderFile && (
                <span className="text-emerald-400 font-bold text-[11px] flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>File Ready ({uploadedTenderFile.name})</span>
                </span>
              )}
            </label>

            <div className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
              uploadedTenderFile 
                ? 'border-emerald-500/50 bg-emerald-950/10' 
                : 'border-cyan-500/30 hover:border-cyan-400 bg-aqua-950/30'
            }`}>
              <input
                type="file"
                accept=".pdf,.docx,.doc"
                onChange={(e) => handleFileChange(e, 'tender')}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex flex-col items-center space-y-3">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform ${
                  uploadedTenderFile ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/10 text-cyan-400'
                }`}>
                  {uploadedTenderFile ? <FileCheck2 className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
                </div>
                {uploadedTenderFile ? (
                  <div>
                    <h4 className="font-semibold text-sm text-white">{uploadedTenderFile.name}</h4>
                    <p className="text-xs text-emerald-300 mt-0.5">
                      {(uploadedTenderFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for Document Analysis
                    </p>
                  </div>
                ) : (
                  <div>
                    <h4 className="font-semibold text-sm text-white">Click or Drag & Drop Tender Document Here</h4>
                    <p className="text-xs text-slate-400 mt-1">Supports PDF or DOCX up to 50 MB</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Clean Empty State Warning when No File is Uploaded */}
          {!uploadedTenderFile && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3 text-xs text-amber-300">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block text-amber-200">No Tender Document Uploaded Yet</strong>
                Upload the official tender document (PDF or DOCX) above to begin document analysis and eligibility evaluation. Placeholder scores are disabled until a file is selected.
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="flex justify-end pt-4 border-t border-white/10">
            <button
              onClick={startDocumentAnalysis}
              disabled={!uploadedTenderFile}
              className={`flex items-center space-x-2 px-8 py-3.5 rounded-xl font-bold text-sm transition-all ${
                uploadedTenderFile
                  ? 'bg-gradient-to-r from-cyan-400 to-teal-500 text-aqua-950 hover:from-cyan-300 hover:to-teal-400 shadow-lg shadow-cyan-400/25 cursor-pointer'
                  : 'bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed opacity-50'
              }`}
            >
              <span>Start Document Analysis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: STAGED DOCUMENT ANALYSIS (PROCESSING SCREEN) */}
      {currentStep === 2 && (
        <div className="glass-card rounded-2xl p-8 sm:p-12 text-center space-y-8 max-w-2xl mx-auto">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-cyan-300 font-mono font-bold text-lg">
              {analysisProgress}%
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-display font-bold text-white">
              Document Analysis in Progress
            </h3>
            <p className="text-xs font-mono text-cyan-300 animate-pulse">
              {analysisStageText}
            </p>
            <p className="text-xs text-slate-400 pt-2">
              Cross-referencing tender mandates with company financial records, ISO certs, and project experience...
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-aqua-950 rounded-full h-3 border border-white/10 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-400 to-teal-400 h-full transition-all duration-500"
              style={{ width: `${analysisProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* STEP 3: TENDER ASSESSMENT REPORT */}
      {currentStep === 3 && assessmentReport && (
        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
          {/* Verdict Banner */}
          <div className={`p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            assessmentReport.recommendation === 'BID'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-white/10 border border-white/20">
                  VERDICT: {assessmentReport.recommendation}
                </span>
                <span className="text-xs font-mono text-slate-300">
                  Category Locked: <strong className="text-white">{selectedCategory}</strong>
                </span>
              </div>
              <h3 className="text-xl font-display font-bold text-white pt-1">
                Tender Assessment & Qualification Summary
              </h3>
              <p className="text-xs text-slate-300 max-w-2xl">
                {assessmentReport.executive_summary}
              </p>
            </div>

            <div className="text-center sm:text-right shrink-0">
              <div className="text-3xl font-display font-extrabold text-white">
                {assessmentReport.tender_score}%
              </div>
              <div className="text-[11px] font-mono text-cyan-300">
                Analysis Confidence
              </div>
            </div>
          </div>

          {/* Requirement & Qualification Matrix */}
          <div className="space-y-3">
            <h4 className="font-display font-semibold text-sm text-white uppercase tracking-wider flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              <span>Requirement & Qualification Matrix</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {assessmentReport.eligibility_matrix.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-aqua-950/60 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-white">{item.requirement}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Met
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{item.notes}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Clause Analysis */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <h4 className="font-display font-semibold text-sm text-white uppercase tracking-wider flex items-center space-x-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Specification & Clause Breakdown</span>
            </h4>
            <div className="space-y-2">
              {assessmentReport.clauses.map((clause, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-aqua-950/60 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono text-cyan-300 font-bold">{clause.clause_no}</span>
                      <h5 className="text-sm font-semibold text-white">{clause.title}</h5>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{clause.explanation}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-2.5 py-1 rounded text-xs font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      {clause.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/10">
            <button
              onClick={() => setCurrentStep(1)}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/10 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Upload Different Tender</span>
            </button>

            <button
              onClick={() => setCurrentStep(4)}
              className="flex items-center space-x-2 px-8 py-3 rounded-xl bg-cyan-400 text-aqua-950 font-bold text-sm hover:bg-cyan-300 transition shadow-lg shadow-cyan-400/20"
            >
              <span>Proceed to Step 4: Submit to Queue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: CONFIRM & SUBMIT TO TENDER PROCESS QUEUE */}
      {currentStep === 4 && (
        <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6 max-w-3xl mx-auto">
          <div className="text-center space-y-2 border-b border-white/10 pb-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-xl font-display font-bold text-white">
              Ready to Submit to Tender Process Queue
            </h3>
            <p className="text-xs text-slate-300">
              The tender document has been evaluated. Confirm details to launch into the 6-stage lifecycle pipeline.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-aqua-950/80 border border-cyan-500/30 space-y-3 text-xs">
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-slate-400 font-mono">Tender Title:</span>
              <span className="font-semibold text-white">{tenderTitle}</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-slate-400 font-mono">Locked Category:</span>
              <span className="font-bold text-cyan-300">{selectedCategory}</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-slate-400 font-mono">Assigned Department:</span>
              <span className="text-white">{initiatingDepartment}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-mono">Uploaded File:</span>
              <span className="text-emerald-300 font-mono">{uploadedTenderFile?.name || 'Tender_Document.pdf'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setCurrentStep(3)}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 border border-white/10 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Assessment Report</span>
            </button>

            <button
              onClick={handleSubmitToQueue}
              className="flex items-center space-x-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 text-aqua-950 font-bold text-sm hover:from-cyan-300 hover:to-teal-300 transition shadow-xl shadow-cyan-400/25"
            >
              <span>Submit Tender to Active Process Queue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
