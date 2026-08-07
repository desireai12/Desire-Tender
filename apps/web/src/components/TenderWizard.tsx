'use client';

import React, { useState, useEffect } from 'react';
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
  HelpCircle, 
  Layers,
  Wand2,
  Check,
  Building2,
  ChevronRight,
  Database
} from 'lucide-react';
import { 
  ProjectCategory, 
  DepartmentRole, 
  TenderProcess, 
  AITenderReport 
} from '@/lib/types';
import { API_BASE_URL } from '@/lib/api';

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
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory>('EPC');
  const [tenderTitle, setTenderTitle] = useState<string>('Jal Jeevan Mission Solar Pumping & Pipeline Expansion - Phase IV');
  const [isCheckingEligibility, setIsCheckingEligibility] = useState<boolean>(false);
  const [eligibilityResult, setEligibilityResult] = useState<{
    is_eligible: boolean;
    score: number;
    reasoning: string;
    details: Array<{ parameter: string; status: 'Met' | 'Not Met' | 'Partially Met'; notes: string }>;
  } | null>(null);

  // Step 2 State (Locked Project)
  const [isProjectLocked, setIsProjectLocked] = useState<boolean>(false);
  const [uploadedTenderFile, setUploadedTenderFile] = useState<File | null>(null);
  const [uploadedBOQFile, setUploadedBOQFile] = useState<File | null>(null);

  // Step 3 State (Staged 20s Loading)
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [analysisStageText, setAnalysisStageText] = useState<string>('Reading Tender PDF & Extracting Mandates...');

  // Step 4 State (AI Report)
  const [aiReport, setAiReport] = useState<AITenderReport | null>(null);

  // Handle Step 1 Eligibility Check
  const handleCheckEligibility = async () => {
    setIsCheckingEligibility(true);
    setEligibilityResult(null);

    // Simulate RAG eligibility search against Jaipur credentials
    setTimeout(() => {
      setIsCheckingEligibility(false);

      if (selectedCategory === 'STP') {
        setEligibilityResult({
          is_eligible: false,
          score: 42,
          reasoning: 'INELIGIBLE: Target category is Sewage Treatment Plant (STP), but uploaded profile requires valid 2026 Pollution Control Board (PCB) Consent Renewal and MBR Tech License.',
          details: [
            { parameter: 'Annual Financial Turnover', status: 'Met', notes: '₹285 Cr turnover exceeds requirement.' },
            { parameter: 'PCB Consent to Operate (CTO)', status: 'Not Met', notes: 'CTO 2026 renewal letter pending update.' },
            { parameter: 'STP Plant MBR/SBR Tech License', status: 'Not Met', notes: 'Required MBR tech license not found.' }
          ]
        });
      } else {
        setEligibilityResult({
          is_eligible: true,
          score: 94,
          reasoning: `ELIGIBLE (${selectedCategory}): Desire Energy Solutions Pvt. Ltd. satisfies all financial turnover (₹285 Cr vs ₹150 Cr required), 1,00,000+ village experience, and Class-A licenses for ${selectedCategory}.`,
          details: [
            { parameter: 'Annual Financial Turnover', status: 'Met', notes: '₹285 Cr verified via audited balance sheet.' },
            { parameter: 'Technical Execution Experience', status: 'Met', notes: '1,00,000+ villages & 14+ cities operations verified.' },
            { parameter: 'Mandatory Category Certificate', status: 'Met', notes: `Class-A & ISO certifications active for ${selectedCategory}.` }
          ]
        });
      }
    }, 1200);
  };

  // Handle Step 2 Tender Upload & Lock Project
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'tender' | 'boq') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'tender') {
      setUploadedTenderFile(file);
      setIsProjectLocked(true); // LOCK PROJECT PERMANENTLY UPON UPLOAD
    } else {
      setUploadedBOQFile(file);
    }
  };

  // Start Step 3 AI Staged Analysis (20-second timer)
  const startAIAnalysis = () => {
    setCurrentStep(3);
    setAnalysisProgress(0);

    const stages = [
      { progress: 15, text: 'Reading Tender PDF & Parsing Clauses...' },
      { progress: 30, text: 'Extracting Technical Mandates & BOQ Line Items...' },
      { progress: 50, text: 'Querying Supabase Vector Store for Desire Energy Credentials...' },
      { progress: 70, text: 'Matching ISO Certifications & Financial Turnover...' },
      { progress: 85, text: 'Running Technical, Legal & Financial Risk Analysis...' },
      { progress: 100, text: 'Generating Complete AI Tender Intelligence Report...' }
    ];

    let currentStageIndex = 0;
    const interval = setInterval(() => {
      currentStageIndex += 1;
      if (currentStageIndex < stages.length) {
        setAnalysisProgress(stages[currentStageIndex].progress);
        setAnalysisStageText(stages[currentStageIndex].text);
      } else {
        clearInterval(interval);
        // Generate AI Report and move to Step 4
        setAiReport({
          overall_health: 'Green',
          tender_score: eligibilityResult?.score || 92,
          recommendation: 'BID',
          executive_summary: `Desire Energy Solutions Pvt. Ltd. evaluated for ${selectedCategory} Tender '${tenderTitle}'. RAG engine confirmed ₹285 Cr turnover, 1,00,000+ village JJM track record, and AquaLogix IoT/AI telemetry integration. Recommend proceeding to formal bid submission.`,
          clauses: [
            {
              clause_no: 'Sec 4.2.1',
              title: 'Turnkey Distribution Pipeline Execution',
              status: 'Matched',
              risk_level: 'Low',
              explanation: 'Requires 50km HDPE/DI pipeline experience; Desire Energy has executed 1,500+ km.',
              action_required: 'Attach JJM completion certificate #JJM-2024-RJ.'
            },
            {
              clause_no: 'Sec 6.1.4',
              title: 'Remote Monitoring Telemetry (RMS)',
              status: 'Matched',
              risk_level: 'Low',
              explanation: 'Mandates 4G cloud telemetry; satisfied via AquaLogix IoT Smart Water Meters & Sunaquator Controllers.',
              action_required: 'Provide AquaLogix API integration documentation.'
            },
            {
              clause_no: 'Sec 8.3.0',
              title: 'Bank Guarantee & EMD Deposit',
              status: 'Matched',
              risk_level: 'Medium',
              explanation: '2% EMD Bank Guarantee required (₹45 Lakh); Bank Solvency certificate ₹50 Cr verified.',
              action_required: 'Request Finance dept to issue BG via ICICI Bank.'
            }
          ],
          eligibility_matrix: [
            { requirement: 'Annual Financial Turnover > ₹150 Cr', status: 'Green', notes: '₹285 Cr verified' },
            { requirement: 'Class-A PWD/PHED Registration', status: 'Green', notes: 'Valid through 2028' },
            { requirement: '2,000+ Deployed Workforce SLA', status: 'Green', notes: '2,000+ staff on payroll' }
          ],
          missing_documents: [
            { name: 'Updated 2026 GST Return GSTR-3B', type: 'Required', notes: 'Attach latest GSTR-3B return' }
          ],
          risks: {
            technical: ['Monsoon site access delays in hilly terrain'],
            commercial: ['LD clause 0.5% per week up to max 10%'],
            legal: ['Arbitration jurisdiction limited to Jaipur High Court'],
            execution: ['Subcontractor labor mobilization lead time (14 days)'],
            financial: ['EMD Bank Guarantee lock-in for 180 days']
          },
          ai_recommendations: [
            'Highlight Desire Energy\'s 20%+ energy efficiency track record in ESCO models.',
            'Quote 5-year comprehensive O&M SLA backed by district service hubs.'
          ],
          client_clarifications: [
            'Clarify if solar panel ALMM List-1 compliance certificate is required at bid submission or post-award.',
            'Confirm payment milestone for SCADA server cloud hosting fees.'
          ]
        });

        setCurrentStep(4);
      }
    }, 3200); // 3.2s * 6 = ~20 seconds
  };

  // Push finalized process to Tender Lifecycle Queue
  const handleSubmitToQueue = () => {
    const newProcess: TenderProcess = {
      id: `TND-${Date.now().toString().slice(-6)}`,
      tender_name: tenderTitle,
      project_category: selectedCategory,
      project_locked: true,
      department_assigned: activeRole,
      current_stage: '2_AI_ANALYSIS',
      stage_status: 'Approved',
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
      updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
      eligibility_result: eligibilityResult || undefined,
      uploaded_files: {
        tender_pdf: uploadedTenderFile?.name || 'Tender_Document_Mandates.pdf',
        boq_file: uploadedBOQFile?.name || 'BOQ_Itemized_Schedule.xlsx'
      },
      ai_report: aiReport || undefined,
      audit_trail: [
        {
          id: `log-1`,
          user: 'System Admin',
          department: activeRole,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
          action: 'Checked Eligibility & Completed AI Analysis Wizard',
          status: 'Passed & Locked',
          next_pending_action: 'Estimation Team to generate Stage 3 BOQ Pricing'
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
            <span>GUIDED WIZARD WORKFLOW • TENDER INTELLIGENCE</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-white">
            Guided Tender Process & AI Analysis Wizard
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Every tender follows a strict 4-step wizard before entering the 6-stage enterprise lifecycle queue.
          </p>
        </div>
        <div className="px-3.5 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs text-center shrink-0">
          Step {currentStep} of 4
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { step: 1, label: 'Check Eligibility', desc: 'Category & RAG Search' },
          { step: 2, label: 'Upload Tender PDF', desc: 'Project Locking' },
          { step: 3, label: 'AI RAG Analysis', desc: '20s Staged Reasoning' },
          { step: 4, label: 'AI Intelligence Report', desc: 'Lifecycle Submission' }
        ].map((s) => {
          const isActive = currentStep === s.step;
          const isDone = currentStep > s.step;

          return (
            <div
              key={s.step}
              className={`p-4 rounded-xl border transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-950/80 to-teal-950/80 border-cyan-400 shadow-lg shadow-cyan-500/10'
                  : isDone
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-aqua-950/40 border-white/10 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                  isDone
                    ? 'bg-emerald-400 text-aqua-950'
                    : isActive
                    ? 'bg-cyan-400 text-aqua-950'
                    : 'bg-white/10 text-slate-400'
                }`}>
                  {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.step}
                </span>
                <span className="text-[10px] font-mono text-slate-400">Step {s.step}</span>
              </div>
              <div className="font-display font-semibold text-sm text-white truncate">{s.label}</div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5">{s.desc}</div>
            </div>
          );
        })}
      </div>

      {/* STEP 1: CHECK ELIGIBILITY */}
      {currentStep === 1 && (
        <div className="glass-card p-8 rounded-2xl space-y-6 animate-fadeIn">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-4">
            <FileCheck2 className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-display font-bold text-white">Step 1 — Check Initial Eligibility</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tender Name Input */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-slate-300">Tender Document / Project Name</label>
              <input
                type="text"
                value={tenderTitle}
                onChange={(e) => setTenderTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-aqua-950/80 border border-white/15 text-white text-sm focus:outline-none focus:border-cyan-400"
                placeholder="Enter tender title..."
              />
            </div>

            {/* Department */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-slate-300">Initiating Department</label>
              <input
                type="text"
                value={activeRole}
                disabled
                className="w-full px-4 py-2.5 rounded-xl bg-aqua-950/40 border border-white/10 text-slate-400 text-sm cursor-not-allowed"
              />
            </div>
          </div>

          {/* Project Category Selection */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-mono uppercase text-cyan-300 block">Select Target Project Vertical Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              {(['EPC', 'ESCO', 'SOLAR', 'STP', 'KUSUM', 'RHDS'] as ProjectCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-2.5 rounded-xl font-display font-bold text-xs transition-all border text-center ${
                    selectedCategory === cat
                      ? 'bg-gradient-to-r from-cyan-400 to-teal-400 text-aqua-950 border-cyan-300 shadow-lg shadow-cyan-400/25 scale-[1.02]'
                      : 'bg-aqua-950/60 text-slate-300 border-white/10 hover:border-cyan-500/40 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Check Eligibility CTA */}
          <div className="pt-4 flex justify-end">
            <button
              onClick={handleCheckEligibility}
              disabled={isCheckingEligibility}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 text-aqua-950 font-bold hover:brightness-110 transition shadow-lg shadow-cyan-400/25"
            >
              {isCheckingEligibility ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Evaluating Corporate Vector Database...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Check Eligibility for {selectedCategory}</span>
                </>
              )}
            </button>
          </div>

          {/* Eligibility Result Banner */}
          {eligibilityResult && (
            <div className={`p-6 rounded-2xl border space-y-4 animate-fadeIn ${
              eligibilityResult.is_eligible
                ? 'bg-emerald-950/40 border-emerald-500/40'
                : 'bg-rose-950/40 border-rose-500/40'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {eligibilityResult.is_eligible ? (
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  ) : (
                    <XCircle className="w-7 h-7 text-rose-400" />
                  )}
                  <div>
                    <h4 className="font-display font-bold text-lg text-white">
                      {eligibilityResult.is_eligible ? 'ELIGIBLE TO BID' : 'NOT ELIGIBLE'}
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">{eligibilityResult.reasoning}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-display font-extrabold text-white">{eligibilityResult.score}%</span>
                  <span className="text-[10px] font-mono text-slate-400 block">Match Score</span>
                </div>
              </div>

              {/* Requirement Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/10">
                {eligibilityResult.details.map((d, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-aqua-950/60 border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{d.parameter}</span>
                      <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] ${
                        d.status === 'Met' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {d.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{d.notes}</p>
                  </div>
                ))}
              </div>

              {/* Progression Action */}
              <div className="pt-2 flex justify-end">
                {eligibilityResult.is_eligible ? (
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-400 text-aqua-950 font-bold hover:bg-emerald-300 transition shadow-lg shadow-emerald-400/20"
                  >
                    <span>Proceed to Step 2 (Upload Tender PDF)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="text-xs text-rose-300 font-mono flex items-center space-x-2 bg-rose-500/10 px-4 py-2 rounded-xl border border-rose-500/30">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Progression Blocked: Address missing certificates before bidding.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: UPLOAD TENDER & PROJECT LOCKING */}
      {currentStep === 2 && (
        <div className="glass-card p-8 rounded-2xl space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center space-x-2">
              <Upload className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-display font-bold text-white">Step 2 — Upload Tender Documents & Lock Project</h3>
            </div>
            
            {/* LOCKED PROJECT BADGE */}
            {isProjectLocked && (
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 font-mono text-xs animate-pulse">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>PROJECT LOCKED: {selectedCategory}</span>
              </div>
            )}
          </div>

          {/* Project Lock Warning Banner */}
          {isProjectLocked && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3 text-xs text-amber-200">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Project Category is permanently locked to {selectedCategory}</strong> for this tender process. Changing the project after uploading files would invalidate the tender evaluation. To analyze a different vertical, create a new tender process.
              </div>
            </div>
          )}

          {/* Upload Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tender PDF Upload */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-slate-300 block">Tender PDF Mandate Document *</label>
              <div className="relative border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 rounded-2xl p-6 text-center bg-aqua-950/40 cursor-pointer group">
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(e) => handleFileUpload(e, 'tender')}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center space-y-2">
                  <FileText className="w-8 h-8 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-semibold text-white">
                    {uploadedTenderFile ? uploadedTenderFile.name : 'Click to Upload Tender PDF'}
                  </p>
                  <p className="text-[11px] text-slate-400">PDF, DOCX up to 50MB</p>
                </div>
              </div>
            </div>

            {/* BOQ Schedule Upload */}
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-slate-300 block">Bill of Quantities (BOQ) Schedule (Optional)</label>
              <div className="relative border-2 border-dashed border-teal-500/40 hover:border-teal-400 rounded-2xl p-6 text-center bg-aqua-950/40 cursor-pointer group">
                <input
                  type="file"
                  accept=".xlsx,.csv,.pdf"
                  onChange={(e) => handleFileUpload(e, 'boq')}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center space-y-2">
                  <FileText className="w-8 h-8 text-teal-400 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-semibold text-white">
                    {uploadedBOQFile ? uploadedBOQFile.name : 'Click to Upload BOQ Excel / CSV'}
                  </p>
                  <p className="text-[11px] text-slate-400">XLSX, CSV itemized schedule</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className="flex justify-between pt-4 border-t border-white/10">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-5 py-2.5 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 text-xs font-medium"
            >
              Back to Step 1
            </button>
            <button
              onClick={startAIAnalysis}
              disabled={!uploadedTenderFile && !isProjectLocked}
              className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 text-aqua-950 font-bold hover:brightness-110 transition shadow-lg shadow-cyan-400/25 disabled:opacity-50"
            >
              <span>Start 20s AI Analysis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: STAGED 20-SECOND AI ANALYSIS SCREEN */}
      {currentStep === 3 && (
        <div className="glass-card p-12 rounded-2xl text-center space-y-8 animate-fadeIn border-2 border-cyan-400/40 shadow-2xl shadow-cyan-500/20">
          <div className="relative inline-flex items-center justify-center">
            <div className="w-24 h-24 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 animate-spin" />
            <Sparkles className="w-10 h-10 text-cyan-400 absolute" />
          </div>

          <div className="space-y-3 max-w-lg mx-auto">
            <h3 className="text-2xl font-display font-bold text-white">
              AI RAG Reasoning & Criteria Extraction
            </h3>
            <p className="text-sm font-mono text-cyan-300 animate-pulse">
              {analysisStageText}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="max-w-md mx-auto space-y-2">
            <div className="w-full bg-aqua-950 h-3 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-md shadow-cyan-400/50"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
            <span className="text-xs font-mono text-slate-400 block">{analysisProgress}% Complete • ~20s Estimated</span>
          </div>
        </div>
      )}

      {/* STEP 4: COMPLETE AI REPORT & LIFECYCLE SUBMISSION */}
      {currentStep === 4 && aiReport && (
        <div className="space-y-8 animate-fadeIn">
          {/* Executive Summary & Recommendation Card */}
          <div className="glass-card p-8 rounded-2xl border-2 border-cyan-400/40 space-y-6 bg-gradient-to-br from-aqua-950 via-aqua-900 to-teal-950">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div>
                <span className="text-xs font-mono text-cyan-400 uppercase">AI Evaluation Report Generated</span>
                <h3 className="text-2xl font-display font-bold text-white mt-1">{tenderTitle}</h3>
                <p className="text-xs text-slate-300 mt-1">Target Category: <strong className="text-cyan-300">{selectedCategory}</strong> (Project Locked)</p>
              </div>

              <div className="flex items-center space-x-4 shrink-0">
                <div className="text-center px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                  <span className="text-3xl font-display font-extrabold text-emerald-400 block">{aiReport.tender_score}</span>
                  <span className="text-[10px] font-mono text-emerald-300 uppercase">Tender Score</span>
                </div>
                <div className="text-center px-5 py-2.5 rounded-2xl bg-cyan-400 text-aqua-950 font-display font-bold text-lg shadow-lg shadow-cyan-400/25">
                  RECOMMENDATION: {aiReport.recommendation}
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-200 leading-relaxed font-medium">
              {aiReport.executive_summary}
            </p>
          </div>

          {/* Clause Analysis Table */}
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <h4 className="font-display font-semibold text-white text-base">Key Clause Analysis Matrix</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-aqua-950/80 text-cyan-300 font-mono uppercase text-[11px]">
                  <tr>
                    <th className="p-3">Clause No</th>
                    <th className="p-3">Clause Title</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Risk Level</th>
                    <th className="p-3">Explanation & Required Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {aiReport.clauses.map((c, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition">
                      <td className="p-3 font-mono text-cyan-400">{c.clause_no}</td>
                      <td className="p-3 font-semibold text-white">{c.title}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-md font-mono text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-md font-mono text-[10px] ${
                          c.risk_level === 'Low' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'
                        }`}>
                          {c.risk_level}
                        </span>
                      </td>
                      <td className="p-3 space-y-0.5">
                        <p>{c.explanation}</p>
                        <p className="text-cyan-300 font-mono text-[11px]">Action: {c.action_required}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Final Lifecycle Submission CTA */}
          <div className="glass-card p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-2 border-emerald-500/40">
            <div>
              <h4 className="text-base font-display font-bold text-white">Push Tender to Lifecycle Queue</h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Creates a persistent entry in Stage 2 (AI Analysis Report Approved) for the Estimation & Tender teams.
              </p>
            </div>
            <button
              onClick={handleSubmitToQueue}
              className="flex items-center space-x-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-aqua-950 font-bold hover:brightness-110 transition shadow-xl shadow-emerald-400/25 shrink-0"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>Submit to Tender Lifecycle Pipeline</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
