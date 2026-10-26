import React, { useState, useEffect } from 'react';
import { getInstitutions, type Institution } from '../services/supabase/institutions';
import {
  ingestExternalComplaint,
  getComplaints,
  getExternalStreamHistory,
  type ExternalStreamItem,
} from '../services/supabase/complaints';
import { detectOverlaps, type OverlapAlert } from '../features/overlap-engine/overlapDetector';
import type { ComplaintPriority } from '../types/database.types';
import {
  Send,
  Building2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Search,
  Sparkles,
  ArrowLeft,
  FileText,
  Clock,
  Printer,
  ChevronRight,
  ShieldCheck,
  User,
  Phone,
  Mail,
  RefreshCw,
  Globe,
  Radio,
} from 'lucide-react';

interface ExternalIntakePortalsProps {
  onNavigateToDashboard?: () => void;
  onNavigateToCase?: (id: string) => void;
  onNavigateToOverlap?: () => void;
  onGoBack?: () => void;
}

export const ExternalIntakePortals: React.FC<ExternalIntakePortalsProps> = ({
  onNavigateToDashboard,
  onNavigateToCase,
  onNavigateToOverlap,
  onGoBack,
}) => {
  // Navigation between CPGRAMS, CSS, and Ingested Stream
  const [activePortal, setActivePortal] = useState<'cpgrams' | 'css' | 'stream'>('cpgrams');

  // Institution List
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(true);

  // Form Fields - CPGRAMS
  const [selectedInstId, setSelectedInstId] = useState('');
  const [instSearch, setInstSearch] = useState('');
  const [category, setCategory] = useState('Fee Cap Violation');
  const [priority, setPriority] = useState<ComplaintPriority>('High');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [complainantName, setComplainantName] = useState('Rahul M. Sharma');
  const [complainantEmail, setComplainantEmail] = useState('rahul.sharma@gmail.com');
  const [complainantPhone, setComplainantPhone] = useState('+91 98112 33445');
  const [complainantType, setComplainantType] = useState('Student');
  const [studentRollNo, setStudentRollNo] = useState('2024-BTECH-098');
  const [stateName, setStateName] = useState('Delhi');

  // OTP simulation state
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    portalSource: 'CPGRAMS' | 'CSS';
    externalRefId: string;
    internalComplaintNumber: string;
    complaintId: string;
    institutionName: string;
    overlapDetected: boolean;
    matchingAlert?: OverlapAlert;
  } | null>(null);

  // Stream History
  const [streamHistory, setStreamHistory] = useState<ExternalStreamItem[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const instList = await getInstitutions();
        setInstitutions(instList);
        setStreamHistory(getExternalStreamHistory());
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setIsLoadingInstitutions(false);
      }
    }
    loadData();
  }, []);

  const filteredInstitutions = instSearch.trim()
    ? institutions.filter(
        (inst) =>
          inst.institution_name.toLowerCase().includes(instSearch.toLowerCase()) ||
          (inst.aicte_permanent_id || '').toLowerCase().includes(instSearch.toLowerCase()) ||
          inst.state.toLowerCase().includes(instSearch.toLowerCase())
      )
    : institutions;

  // Selected Institution
  const selectedInstitution = institutions.find((i) => i.id === selectedInstId);

  // Quick Scenario Fill for Live Demo
  const handleQuickPreset = (presetKey: 'delhi_fee' | 'vidyapeeth_faculty' | 'coep_docs') => {
    if (presetKey === 'delhi_fee') {
      const delhi = institutions.find((i) => i.id === 'a0000000-0000-0000-0000-000000000001') || institutions[0];
      if (delhi) setSelectedInstId(delhi.id);
      setCategory('Fee Cap Violation');
      setPriority('Urgent');
      setSubject('Unauthorized mandatory lab & development fee extortion under threat of semester debarment');
      setDescription(
        'Aggrieved student from B.Tech 3rd Semester. The college administration has issued an arbitrary circular demanding ₹45,000 cash per student as "Special Development Charge", withholding hall tickets for end-semester exams if unpaid. This is in direct violation of AICTE Fee Regulatory Committee guidelines and Supreme Court directives.'
      );
      setComplainantName('Karan Malhotra');
      setComplainantEmail('karan.malhotra@gmail.com');
      setComplainantPhone('+91 98114 77889');
      setComplainantType('Student');
      setStudentRollNo('DEL-2023-CS-071');
      setStateName('Delhi');
    } else if (presetKey === 'vidyapeeth_faculty') {
      const vidya = institutions.find((i) => i.id === 'a0000000-0000-0000-0000-000000000005') || institutions[4];
      if (vidya) setSelectedInstId(vidya.id);
      setCategory('Faculty Deficiency & Non-Payment of Remuneration');
      setPriority('High');
      setSubject('Withholding of 6 months faculty remuneration and statutory PF contributions');
      setDescription(
        'Assistant Professor representation on behalf of 24 teaching faculty members. Remuneration has not been credited since April 2026. The institution continues to collect full student tuition while defaulting on AICTE 7th Central Pay Commission recommendations and EPF deposits.'
      );
      setComplainantName('Dr. Suniti Verma');
      setComplainantEmail('suniti.verma@outlook.com');
      setComplainantPhone('+91 94250 88991');
      setComplainantType('Faculty');
      setStudentRollNo('FAC-VIST-042');
      setStateName('Madhya Pradesh');
    } else {
      const coep = institutions.find((i) => i.id === 'a0000000-0000-0000-0000-000000000002') || institutions[1];
      if (coep) setSelectedInstId(coep.id);
      setCategory('Withholding of Original Certificates');
      setPriority('High');
      setSubject('Non-return of original 10th and 12th marksheets after course completion');
      setDescription(
        'Student grievance regarding withholding of original educational certificates. Despite completing all academic credits and clearing all dues with official no-dues receipt, the student section refuses to return the original certificates.'
      );
      setComplainantName('Aarav Deshmukh');
      setComplainantEmail('aarav.d@gmail.com');
      setComplainantPhone('+91 98220 55441');
      setComplainantType('Student');
      setStudentRollNo('COEP-2022-ME-112');
      setStateName('Maharashtra');
    }
  };

  // Submit Complaint to CPGRAMS or CSS
  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstId) {
      alert('Please select the technical institution subject to this grievance.');
      return;
    }
    if (!subject.trim() || !description.trim()) {
      alert('Please provide grievance subject and detailed description.');
      return;
    }

    setIsSubmitting(true);
    try {
      const isCpgrams = activePortal === 'cpgrams';
      const source: 'CPGRAMS' | 'CSS' = isCpgrams ? 'CPGRAMS' : 'CSS';

      // Generate realistic External Reference ID
      // CPGRAMS format: DARPG/E/2026/0XXXX
      // CSS format: CSS-AICTE-2026-0XXXX
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const externalRefId = isCpgrams
        ? `DARPG/E/2026/0${randomSuffix}`
        : `CSS-AICTE-2026-0${randomSuffix}`;

      // Ingest into AICTE Central Registry (automatically assigned to PGRC)
      const createdComplaint = await ingestExternalComplaint({
        source,
        externalReferenceId: externalRefId,
        institutionId: selectedInstId,
        title: subject.trim(),
        description: description.trim(),
        category,
        priority,
        complainantName: complainantName.trim(),
        complainantEmail: complainantEmail.trim(),
        complainantPhone: complainantPhone.trim(),
        complainantType,
        studentRollNo: studentRollNo.trim() || undefined,
      });

      // Run real-time Overlap Detection against all complaints
      const { data: allComplaints } = await getComplaints({ pageSize: 500 });
      const detectionResult = detectOverlaps(allComplaints);

      // Check if this newly ingested complaint triggered an overlap alert
      const matchingAlert = detectionResult.alerts.find(
        (a) =>
          a.case_a_id === createdComplaint.complaint_number ||
          a.case_b_id === createdComplaint.complaint_number ||
          a.institution_id === selectedInstId
      );

      setSubmissionSuccess({
        portalSource: source,
        externalRefId,
        internalComplaintNumber: createdComplaint.complaint_number,
        complaintId: createdComplaint.id,
        institutionName: selectedInstitution?.institution_name || 'Technical Institution',
        overlapDetected: Boolean(matchingAlert),
        matchingAlert,
      });

      setStreamHistory(getExternalStreamHistory());
    } catch (err) {
      console.error('Error submitting external complaint:', err);
      alert('Failed to submit grievance. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmissionSuccess(null);
    setSubject('');
    setDescription('');
    setOtpSent(false);
    setOtpValue('');
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col font-sans">

      {/* Top Global Inter-Portal Bar */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1">
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[11px]">
              AICTE Data Interoperability Connector Active
            </span>
            <span className="text-slate-400 hidden sm:inline">•</span>
            <span className="text-slate-400 hidden sm:inline">
              External Intake Ingestion &amp; Cross-Bureau Overlap Engine (SIH-26264)
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {onNavigateToDashboard && (
              <button
                type="button"
                onClick={onNavigateToDashboard}
                className="text-xs text-amber-300 hover:text-amber-200 font-semibold flex items-center space-x-1"
              >
                <span>AICTE Integrated Dashboard</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
            {onGoBack && (
              <button
                type="button"
                onClick={onGoBack}
                className="text-xs text-slate-400 hover:text-white flex items-center space-x-1 pl-2 border-l border-slate-700"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Exit Simulator</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Portal Switcher Tabs */}
      <div className="bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex space-x-2 sm:space-x-4">
            <button
              type="button"
              onClick={() => {
                setActivePortal('cpgrams');
                setSubmissionSuccess(null);
              }}
              className={`py-3.5 px-3 sm:px-5 text-xs font-bold flex items-center space-x-2 border-b-2 transition ${
                activePortal === 'cpgrams'
                  ? 'border-[#e67e22] text-[#0b3b60] bg-orange-50/40'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span className="text-base">🇮🇳</span>
              <span>CPGRAMS Portal (Govt of India - pgportal.gov.in)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActivePortal('css');
                setSubmissionSuccess(null);
              }}
              className={`py-3.5 px-3 sm:px-5 text-xs font-bold flex items-center space-x-2 border-b-2 transition ${
                activePortal === 'css'
                  ? 'border-[#0b3b60] text-[#0b3b60] bg-blue-50/40'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Building2 className="w-4 h-4 text-[#0b3b60]" />
              <span>AICTE CSS Portal (Centralized Support System)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActivePortal('stream');
                setSubmissionSuccess(null);
                setStreamHistory(getExternalStreamHistory());
              }}
              className={`py-3.5 px-3 sm:px-5 text-xs font-bold flex items-center space-x-2 border-b-2 transition ${
                activePortal === 'stream'
                  ? 'border-purple-600 text-purple-900 bg-purple-50/40'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Radio className="w-4 h-4 text-purple-600" />
              <span>Live Ingested Feed ({streamHistory.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="w-full mx-auto flex-1">

        {/* SUCCESS ACKNOWLEDGEMENT RECEIPT */}
        {submissionSuccess && (
          <div className="max-w-6xl mx-auto px-4 pt-6">
            <div className="bg-white border border-slate-300 rounded-lg shadow-lg overflow-hidden mb-6 animate-in fade-in zoom-in-95 duration-200">
              {/* Header of Receipt */}
              <div
                className={`p-6 text-white ${
                  submissionSuccess.portalSource === 'CPGRAMS'
                    ? 'bg-gradient-to-r from-[#993300] to-[#c2410c]'
                    : 'bg-gradient-to-r from-[#0b3b60] to-[#072a45]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-white/10 rounded-full">
                      <CheckCircle2 className="w-7 h-7 text-emerald-300" />
                    </div>
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-amber-200 font-bold block">
                        Official Registration Acknowledgement (पावती)
                      </span>
                      <h2 className="text-xl font-bold">
                        Grievance Successfully Registered on {submissionSuccess.portalSource}
                      </h2>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-[11px] text-white/80">Official Tracking Reference:</div>
                    <div className="text-base font-bold text-amber-200">
                      {submissionSuccess.externalRefId}
                    </div>
                  </div>
                </div>
              </div>

              {/* REAL-TIME OVERLAP ALERT BANNER (The Core SIH Innovation!) */}
              {submissionSuccess.overlapDetected && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-100 border-b-2 border-amber-400 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-amber-500 text-white rounded shrink-0 mt-0.5">
                      <Sparkles className="w-5 h-5 text-amber-100" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-amber-950">
                          🚨 Real-Time Cross-Bureau Overlap Engine Triggered!
                        </span>
                        <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                          Coordination Required
                        </span>
                      </div>
                      <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                        <strong>AICTE-Samadhan Overlap Engine:</strong> This grievance concerns{' '}
                        <strong>{submissionSuccess.institutionName}</strong>, which already has active regulatory scrutiny
                        in the <strong>Regulation Bureau (RB)</strong>. The system has automatically mapped both cases for joint bureau monitoring.
                      </p>
                    </div>
                  </div>

                  {onNavigateToOverlap && (
                    <button
                      type="button"
                      onClick={onNavigateToOverlap}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded shadow-sm shrink-0 flex items-center space-x-1.5 transition"
                    >
                      <span>View Overlap Pair</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Receipt Particulars Body */}
              <div className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded">
                  <div>
                    <span className="text-slate-500 block text-[11px]">External Portal Reference:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {submissionSuccess.externalRefId}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Source: {submissionSuccess.portalSource} Portal
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">AICTE Master Docket Generated:</span>
                    <span className="font-mono font-bold text-[#0b3b60] text-sm">
                      {submissionSuccess.internalComplaintNumber}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold block">
                      Reflected in Real-Time
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Forwarded AICTE Bureau:</span>
                    <span className="font-bold text-slate-900">
                      Public Grievance Redressal Cell (PGRC)
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Under Process • SCSC Scrutiny Pool
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-blue-50/60 border border-blue-200 rounded text-blue-950 leading-relaxed">
                  <strong>Data Synchronization Confirmation:</strong> This grievance has been written to the authoritative AICTE complaint repository. Bureau officers in both PGRC and Regulation Bureau can now see this case on their master dashboard without any manual re-entry.
                </div>

                {/* Action Buttons */}
                <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold"
                  >
                    &larr; Lodge Another Grievance
                  </button>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold flex items-center space-x-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Slip</span>
                    </button>

                    {onNavigateToDashboard && (
                      <button
                        type="button"
                        onClick={onNavigateToDashboard}
                        className="px-5 py-2 bg-[#0b3b60] hover:bg-[#072a45] text-white text-xs font-bold rounded shadow-sm flex items-center space-x-1.5 transition"
                      >
                        <span>Open AICTE Integrated Dashboard</span>
                        <ChevronRight className="w-4 h-4 text-amber-300" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            CPGRAMS PORTAL — Faithful pgportal.gov.in Replica
            ============================================================ */}
        {activePortal === 'cpgrams' && (
          <div className="bg-[#f5f5f5]">

            {/* A. Top Utility Bar */}
            <div className="bg-[#1a1a2e] text-white py-1 px-3">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center space-x-3 text-[11px] text-gray-300">
                  <a href="#main-content" className="hover:underline text-gray-300">Skip to main content</a>
                  <span className="text-gray-500">|</span>
                  <a href="#" className="hover:underline text-gray-300">Screen Reader</a>
                  <span className="text-gray-500">|</span>
                  <span className="text-gray-400">Text Size:</span>
                  <button className="text-gray-300 hover:text-white font-bold text-[10px] border border-gray-600 px-1 rounded">A-</button>
                  <button className="text-gray-300 hover:text-white font-bold text-[11px] border border-gray-600 px-1 rounded">A</button>
                  <button className="text-gray-300 hover:text-white font-bold text-[13px] border border-gray-600 px-1 rounded">A+</button>
                </div>
                <div className="flex items-center text-[11px]">
                  <button className="px-2 py-0.5 bg-[#f47920] text-white rounded-l text-[10px] font-semibold">English</button>
                  <button className="px-2 py-0.5 bg-[#2a2a4a] text-gray-300 border border-gray-600 rounded-r text-[10px] hover:bg-[#f47920] hover:text-white transition">हिन्दी</button>
                </div>
              </div>
            </div>

            {/* B. Main CPGRAMS Header */}
            <div className="bg-[#003366]">
              <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                {/* Left: Emblem + Text */}
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shrink-0 shadow border border-blue-200">
                    <span className="text-2xl">🦁</span>
                  </div>
                  <div>
                    <div className="text-[#f5a623] text-xs font-semibold">भारत सरकार</div>
                    <div className="text-white font-bold text-lg leading-tight">Government of India</div>
                    <div className="text-blue-200 text-[11px]">Ministry of Personnel, Public Grievances &amp; Pensions</div>
                  </div>
                </div>

                {/* Center/Right: CPGRAMS Logo */}
                <div className="flex-1 flex flex-col items-center justify-center px-4 hidden sm:flex">
                  <div className="text-white font-extrabold text-3xl tracking-widest">CPGRAMS</div>
                  <div className="text-blue-200 text-[11px] text-center mt-0.5">
                    Centralised Public Grievance Redress And Monitoring System
                  </div>
                </div>

                {/* Far Right: pgportal.gov.in box */}
                <div className="hidden md:flex flex-col items-end space-y-1">
                  <div className="border border-blue-300 rounded px-3 py-1.5 text-white text-xs font-mono bg-blue-900/40">
                    pgportal.gov.in
                  </div>
                  <div className="text-blue-300 text-[10px]">Official Government Portal</div>
                </div>
              </div>

              {/* Orange saffron divider stripe */}
              <div className="h-1.5 bg-[#f47920] w-full"></div>
            </div>

            {/* C. Navigation Bar */}
            <div className="bg-white border-b border-gray-300 shadow-sm">
              <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between">
                  <nav className="flex items-center space-x-0 text-[13px]">
                    {['Home', 'Lodge Grievance', 'View Status', 'Send Reminder', 'Feedback', 'Contact Us'].map((link) => (
                      <a
                        key={link}
                        href="#"
                        className={`px-4 py-3 border-b-2 font-medium transition ${
                          link === 'Lodge Grievance'
                            ? 'border-[#f47920] text-[#003366] bg-orange-50 font-bold'
                            : 'border-transparent text-gray-700 hover:text-[#003366] hover:border-[#f47920] hover:bg-orange-50'
                        }`}
                        onClick={(e) => e.preventDefault()}
                      >
                        {link}
                      </a>
                    ))}
                  </nav>
                  <button className="ml-4 px-4 py-1.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold rounded border border-blue-800 transition">
                    Login / Register
                  </button>
                </div>
              </div>
            </div>

            {/* D. Breadcrumb */}
            <div className="bg-gray-100 border-b border-gray-200 py-2 px-4">
              <div className="max-w-7xl mx-auto text-xs text-gray-600 flex items-center space-x-1">
                <a href="#" className="text-[#003366] hover:underline" onClick={(e) => e.preventDefault()}>Home</a>
                <ChevronRight className="w-3 h-3 text-gray-400" />
                <a href="#" className="text-[#003366] hover:underline" onClick={(e) => e.preventDefault()}>Lodge Grievance</a>
                <ChevronRight className="w-3 h-3 text-gray-400" />
                <span className="text-gray-700 font-medium">Grievance Form</span>
              </div>
            </div>

            {/* E. Two-Column Layout */}
            <div id="main-content" className="max-w-7xl mx-auto px-4 py-5">
              <div className="flex flex-col lg:flex-row gap-5">

                {/* Left Sidebar (~30%) */}
                <aside className="lg:w-[30%] space-y-4">
                  {/* Important Instructions */}
                  <div className="bg-white border border-gray-300 rounded shadow-sm overflow-hidden">
                    <div className="bg-[#003366] text-white py-2.5 px-4">
                      <h3 className="font-bold text-sm">Important Instructions <span className="text-blue-200 font-normal text-xs">(सूचना)</span></h3>
                    </div>
                    <ul className="p-4 space-y-2.5 text-[12px] text-gray-700">
                      <li className="flex items-start space-x-2">
                        <span className="text-[#f47920] mt-0.5 shrink-0">▸</span>
                        <span>Before filing a grievance, check if the matter has already been addressed or is sub-judice.</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-[#f47920] mt-0.5 shrink-0">▸</span>
                        <span>Grievances should pertain to matters within the purview of the Central Government.</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-[#f47920] mt-0.5 shrink-0">▸</span>
                        <span>Upload supporting documents in <strong>PDF format only</strong> (maximum 2MB per file).</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-[#f47920] mt-0.5 shrink-0">▸</span>
                        <span>Note your registration number carefully for future tracking and reminders.</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-[#f47920] mt-0.5 shrink-0">▸</span>
                        <span>Lodge only one grievance per registration to ensure proper redressal.</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-[#f47920] mt-0.5 shrink-0">▸</span>
                        <span>Anonymous or vague grievances without supporting facts may not be entertained.</span>
                      </li>
                    </ul>
                  </div>

                  {/* Contact Information */}
                  <div className="bg-white border border-gray-300 rounded shadow-sm overflow-hidden">
                    <div className="bg-[#003366] text-white py-2.5 px-4">
                      <h3 className="font-bold text-sm">Contact Information</h3>
                    </div>
                    <div className="p-4 text-[12px] text-gray-700 space-y-2">
                      <div className="font-semibold text-gray-900">DARPG – Department of Administrative Reforms &amp; Public Grievances</div>
                      <div>Sardar Patel Bhawan, Sansad Marg, New Delhi – 110 001</div>
                      <div className="flex items-center space-x-1.5 mt-1">
                        <Phone className="w-3 h-3 text-[#003366]" />
                        <span>011-23743100</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Mail className="w-3 h-3 text-[#003366]" />
                        <span>darpg-pgms@nic.in</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-200 text-[11px] text-gray-500">
                        Working Hours: Mon–Fri, 9:00 AM – 5:30 PM
                      </div>
                    </div>
                  </div>

                  {/* Helpline */}
                  <div className="bg-orange-50 border border-orange-200 rounded p-3 text-[12px]">
                    <div className="font-bold text-[#003366] mb-1">📞 CPGRAMS Helpline</div>
                    <div className="text-gray-700">Toll Free: <strong className="text-[#003366]">1800-11-4000</strong></div>
                    <div className="text-gray-600 text-[11px] mt-1">Monday to Saturday (except national holidays) 9 AM – 8 PM</div>
                  </div>
                </aside>

                {/* Right Main Form Area (~70%) */}
                <div className="lg:flex-1">
                  <div className="bg-white border border-gray-300 rounded shadow-sm overflow-hidden">
                    {/* Form Title */}
                    <div className="bg-[#003366] text-white py-3 px-5 flex items-center justify-between">
                      <h2 className="font-bold text-base">Lodge Public Grievance</h2>
                      <span className="text-blue-200 text-[11px]">Fields marked <span className="text-red-300 font-bold">*</span> are mandatory</span>
                    </div>
                    <div className="h-1 bg-[#f47920]"></div>

                    <form onSubmit={handleIntakeSubmit} className="p-5 space-y-6">

                      {/* Section 1 – Personal Details */}
                      <div>
                        <div className="flex items-center space-x-2 mb-4 pb-2 border-b-2 border-[#003366]">
                          <span className="bg-[#003366] text-white text-xs font-bold px-2.5 py-1 rounded">1</span>
                          <h3 className="font-bold text-[#003366] text-sm uppercase tracking-wide">Personal Details</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={complainantName}
                              onChange={(e) => setComplainantName(e.target.value)}
                              required
                              className="w-full border border-gray-400 rounded px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#003366] focus:border-[#003366]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
                            <select className="w-full border border-gray-400 rounded px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]">
                              <option value="M">Male</option>
                              <option value="F">Female</option>
                              <option value="O">Other / Prefer not to say</option>
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Address</label>
                            <textarea
                              rows={2}
                              placeholder="House / Flat No., Street, Area, City"
                              className="w-full border border-gray-400 rounded px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Pin Code</label>
                            <input
                              type="text"
                              placeholder="6-digit PIN"
                              maxLength={6}
                              className="w-full border border-gray-400 rounded px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              State / UT <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={stateName}
                              onChange={(e) => setStateName(e.target.value)}
                              required
                              className="w-full border border-gray-400 rounded px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Mobile Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="tel"
                              value={complainantPhone}
                              onChange={(e) => setComplainantPhone(e.target.value)}
                              required
                              className="w-full border border-gray-400 rounded px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Email ID</label>
                            <input
                              type="email"
                              value={complainantEmail}
                              onChange={(e) => setComplainantEmail(e.target.value)}
                              className="w-full border border-gray-400 rounded px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 2 – Grievance Details */}
                      <div>
                        <div className="flex items-center space-x-2 mb-4 pb-2 border-b-2 border-[#003366]">
                          <span className="bg-[#003366] text-white text-xs font-bold px-2.5 py-1 rounded">2</span>
                          <h3 className="font-bold text-[#003366] text-sm uppercase tracking-wide">Grievance Details</h3>
                        </div>

                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Ministry / Department <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value="Ministry of Education"
                                disabled
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 bg-gray-100 cursor-not-allowed"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Organisation / Sub-organisation <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value="All India Council for Technical Education (AICTE)"
                                disabled
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 bg-gray-100 cursor-not-allowed"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Grievance Category <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={category}
                              onChange={(e) => setCategory(e.target.value)}
                              required
                              className="w-full border border-gray-400 rounded px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
                            >
                              <option value="Fee Cap Violation">Fee Cap Violation</option>
                              <option value="Faculty Issues">Faculty Issues</option>
                              <option value="Admission Irregularities">Admission Irregularities</option>
                              <option value="Withholding of Original Certificates">Withholding of Certificates</option>
                              <option value="Infrastructure Deficiency">Infrastructure Deficiency</option>
                              <option value="Faculty Deficiency & Non-Payment of Remuneration">Faculty Deficiency &amp; Non-Payment of Remuneration</option>
                              <option value="Withholding of Original Certificates">Withholding of Original Certificates</option>
                              <option value="Ragging & Student Harassment">Ragging &amp; Student Harassment</option>
                              <option value="Infrastructure & Lab Non-Compliance">Infrastructure &amp; Lab Non-Compliance</option>
                              <option value="Unauthorized Course Operation">Unauthorized Course Operation</option>
                              <option value="Admission Irregularity">Admission Irregularity</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          {/* Institution Search */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Technical Institution Concerned <span className="text-red-500">*</span>
                            </label>
                            <div className="relative mb-1">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                              <input
                                type="text"
                                value={instSearch}
                                onChange={(e) => setInstSearch(e.target.value)}
                                placeholder="Search institution name, AICTE Permanent ID, or state..."
                                className="w-full border border-gray-400 rounded pl-8 pr-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
                              />
                            </div>
                            <select
                              value={selectedInstId}
                              onChange={(e) => {
                                setSelectedInstId(e.target.value);
                                const sel = institutions.find((i) => i.id === e.target.value);
                                if (sel) {
                                  setInstSearch(sel.institution_name);
                                  setStateName(sel.state);
                                }
                              }}
                              required
                              size={4}
                              className="w-full border border-gray-400 rounded px-3 py-1 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
                            >
                              <option value="">-- Select Technical Institution --</option>
                              {filteredInstitutions.map((inst) => (
                                <option key={inst.id} value={inst.id}>
                                  {inst.institution_name} [{inst.aicte_permanent_id || 'ID Pending'}] — {inst.state}
                                </option>
                              ))}
                            </select>
                            {selectedInstitution && (
                              <div className="mt-1.5 p-2.5 bg-blue-50 border border-blue-200 rounded text-xs flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <span className="font-bold text-gray-900">{selectedInstitution.institution_name}</span>
                                  <span className="text-gray-500 text-[11px] block">
                                    AICTE ID: <strong className="font-mono">{selectedInstitution.aicte_permanent_id || 'N/A'}</strong> • {selectedInstitution.state}
                                  </span>
                                </div>
                                {selectedInstitution.id === 'a0000000-0000-0000-0000-000000000001' && (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded font-bold text-[10px] uppercase">
                                    Active RB Case Recorded
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Grievance Subject <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={subject}
                              onChange={(e) => setSubject(e.target.value)}
                              placeholder="Brief subject of your grievance"
                              required
                              className="w-full border border-gray-400 rounded px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#003366]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                              <span>Grievance Description <span className="text-red-500">*</span></span>
                              <span className="text-[11px] text-gray-400 font-normal">{description.length}/3000</span>
                            </label>
                            <textarea
                              rows={6}
                              value={description}
                              onChange={(e) => setDescription(e.target.value.slice(0, 3000))}
                              placeholder="Please describe your grievance clearly. Include relevant dates, reference numbers, and the relief sought. (Max 3000 characters)"
                              required
                              className="w-full border border-gray-400 rounded px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#003366] resize-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                              Upload Supporting Document <span className="text-gray-400 font-normal">(Optional, PDF only, max 2MB)</span>
                            </label>
                            <input
                              type="file"
                              accept=".pdf"
                              className="w-full border border-gray-400 rounded px-3 py-2 text-sm text-gray-700 bg-white file:mr-3 file:py-1 file:px-3 file:border file:border-gray-300 file:rounded file:text-xs file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 3 – OTP Verification */}
                      <div>
                        <div className="flex items-center space-x-2 mb-4 pb-2 border-b-2 border-[#003366]">
                          <span className="bg-[#003366] text-white text-xs font-bold px-2.5 py-1 rounded">3</span>
                          <h3 className="font-bold text-[#003366] text-sm uppercase tracking-wide">OTP Verification</h3>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded p-4">
                          <p className="text-xs text-gray-700 mb-3">
                            An OTP will be sent to your registered mobile number <strong>{complainantPhone}</strong> for identity verification.
                          </p>
                          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
                            <div className="flex-1">
                              <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Enter OTP <span className="text-gray-400 font-normal">(Demo: any 6 digits)</span>
                              </label>
                              <input
                                type="text"
                                value={otpValue}
                                onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="______"
                                maxLength={6}
                                disabled={!otpSent}
                                className="w-full border border-gray-400 rounded px-3 py-2 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#003366] font-mono tracking-widest text-center disabled:bg-gray-100 disabled:cursor-not-allowed"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => { setOtpSent(true); setOtpValue(''); }}
                              className="px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold rounded transition shrink-0"
                            >
                              {otpSent ? 'Resend OTP' : 'Send OTP'}
                            </button>
                          </div>
                          {otpSent && (
                            <p className="text-[11px] text-green-700 mt-2 font-semibold">✓ OTP sent (Demo mode: enter any 6 digits to proceed)</p>
                          )}
                        </div>
                      </div>

                      {/* Submit + Reset */}
                      <div className="pt-2 border-t-2 border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-[11px] text-gray-500">
                          By submitting, I declare the above information is true and correct to the best of my knowledge.
                        </p>
                        <div className="flex items-center space-x-3">
                          <button
                            type="button"
                            onClick={handleReset}
                            className="px-5 py-2.5 border border-gray-400 hover:bg-gray-100 text-gray-700 text-sm font-semibold rounded transition"
                          >
                            Reset
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-7 py-2.5 bg-[#f47920] hover:bg-[#e06510] text-white text-sm font-bold rounded shadow-md flex items-center space-x-2 transition"
                          >
                            {isSubmitting ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Submitting...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                <span>Submit Grievance</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Section 4 – Demo Scenarios Panel */}
                      <div className="mt-2 border-2 border-dashed border-orange-300 rounded-lg p-4 bg-orange-50/60">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                          <span className="text-xs font-bold text-orange-900 uppercase tracking-wide flex items-center space-x-1.5">
                            <Sparkles className="w-4 h-4 text-[#f47920]" />
                            <span>⚡ Quick Fill — Demo Mode (Hackathon Panel)</span>
                          </span>
                          <span className="text-[11px] text-orange-700">
                            Click to auto-fill realistic complaints that trigger cross-bureau overlap alerts
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuickPreset('delhi_fee')}
                            className="px-3 py-1.5 bg-white border border-orange-300 hover:border-orange-500 hover:bg-orange-100 text-orange-900 rounded text-xs font-semibold transition shadow-sm flex items-center space-x-1"
                          >
                            <span className="text-red-600 font-bold">⚡ Scenario 1:</span>
                            <span>Delhi Engg College — Fee Extortion (Triggers RB Overlap!)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleQuickPreset('vidyapeeth_faculty')}
                            className="px-3 py-1.5 bg-white border border-orange-300 hover:border-orange-500 hover:bg-orange-100 text-orange-900 rounded text-xs font-semibold transition shadow-sm flex items-center space-x-1"
                          >
                            <span className="text-amber-700 font-bold">⚡ Scenario 2:</span>
                            <span>Vidyapeeth — Faculty Salary Withholding (Triggers RB Overlap!)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleQuickPreset('coep_docs')}
                            className="px-3 py-1.5 bg-white border border-orange-300 hover:border-orange-500 hover:bg-orange-100 text-orange-900 rounded text-xs font-semibold transition shadow-sm flex items-center space-x-1"
                          >
                            <span className="text-blue-700 font-bold">⚡ Scenario 3:</span>
                            <span>COEP Pune — Original Marksheet Retention</span>
                          </button>
                        </div>
                      </div>

                    </form>
                  </div>
                </div>
              </div>
            </div>

            {/* F. CPGRAMS Footer */}
            <footer className="bg-[#003366] text-white mt-6">
              <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-[11px]">
                  <div className="text-blue-200 max-w-lg leading-relaxed">
                    Designed, Developed &amp; Hosted by <strong className="text-white">National Informatics Centre (NIC)</strong>,
                    Ministry of Electronics &amp; Information Technology, Government of India
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-blue-300">
                    {['Disclaimer', 'Terms & Conditions', 'Website Policies', 'Accessibility'].map((link) => (
                      <a key={link} href="#" className="hover:text-white hover:underline" onClick={(e) => e.preventDefault()}>
                        {link}
                      </a>
                    ))}
                  </div>
                  <div className="text-blue-300 text-right text-[11px]">
                    <div>Last Updated: 25 Oct 2026</div>
                    <div>Visitors: <strong className="text-white">1,45,23,891</strong></div>
                  </div>
                </div>
                <div className="border-t border-blue-800 mt-3 pt-3 text-[11px] text-blue-300 text-center">
                  Copyright © 2024 Department of Administrative Reforms &amp; Public Grievances. All Rights Reserved.
                </div>
              </div>
            </footer>

          </div>
        )}

        {/* AICTE CSS PORTAL VIEW */}
        {activePortal === 'css' && (
          <div className="max-w-6xl w-full mx-auto px-4 py-6">
            <div className="bg-white border border-slate-300 rounded shadow-md overflow-hidden">
              {/* CSS Header */}
              <div className="bg-[#0b3b60] text-white border-b-4 border-[#e67e22] p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <img
                      src="/aicte-emblem.png"
                      alt="AICTE Official Emblem"
                      className="w-12 h-12 object-contain drop-shadow-md shrink-0"
                    />
                    <div>
                      <div className="text-[11px] tracking-wider uppercase text-amber-200 font-semibold">
                        अखिल भारतीय तकनीकी शिक्षा परिषद | All India Council for Technical Education
                      </div>
                      <h2 className="text-base sm:text-xl font-bold tracking-tight">
                        Centralized Support System (CSS) — Grievance Intake Desk
                      </h2>
                      <div className="text-xs text-slate-200">
                        AICTE Direct Digital Channel for Technical Institutions (complaint@aicte-india.org)
                      </div>
                    </div>
                  </div>

                  <div className="text-right hidden md:block">
                    <span className="px-2.5 py-1 bg-white/10 rounded text-[11px] font-mono border border-white/20">
                      PORTAL: aicte-india.org/css
                    </span>
                    <div className="text-[10px] text-amber-200 mt-1">Single-Window CSS Gateway</div>
                  </div>
                </div>
              </div>

              {/* Quick Demo Scenario Bar */}
              <div className="p-4 bg-blue-50/70 border-b border-blue-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-[#0b3b60] uppercase tracking-wide flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-[#e67e22]" />
                    <span>One-Click AICTE CSS Demo Presets:</span>
                  </span>
                  <span className="text-[11px] text-slate-600">
                    Pre-fill realistic complaints to observe real-time reflection on the dashboard
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('delhi_fee')}
                    className="px-3 py-1.5 bg-white border border-blue-300 hover:border-[#0b3b60] hover:bg-blue-100 text-[#0b3b60] rounded text-xs font-semibold transition shadow-2xs"
                  >
                    Delhi Engg College (Triggers RB Overlap!)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('vidyapeeth_faculty')}
                    className="px-3 py-1.5 bg-white border border-blue-300 hover:border-[#0b3b60] hover:bg-blue-100 text-[#0b3b60] rounded text-xs font-semibold transition shadow-2xs"
                  >
                    Vidyapeeth Institute Faculty Dues
                  </button>
                </div>
              </div>

              {/* CSS Form */}
              <form onSubmit={handleIntakeSubmit} className="p-6 space-y-6">
                {/* Institution */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    AICTE Technical Institution <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedInstId}
                    onChange={(e) => {
                      setSelectedInstId(e.target.value);
                      const sel = institutions.find((i) => i.id === e.target.value);
                      if (sel) setStateName(sel.state);
                    }}
                    required
                    className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                  >
                    <option value="">-- Choose Technical Institution --</option>
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.institution_name} [{inst.aicte_permanent_id || 'ID Pending'}] — {inst.state}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category & Urgency */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Grievance Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                      className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                    >
                      <option value="Fee Cap Violation">Fee Cap Violation &amp; Caution Money</option>
                      <option value="Faculty Deficiency & Non-Payment of Remuneration">Faculty Cadre &amp; Pay Commission</option>
                      <option value="Withholding of Original Certificates">Retention of Original Documents</option>
                      <option value="Infrastructure & Lab Non-Compliance">Infrastructure Deficits</option>
                      <option value="Ragging & Student Harassment">Ragging / Student Welfare</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
                      className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                    >
                      <option value="Normal">Routine (30 Days)</option>
                      <option value="High">High Urgency (14 Days)</option>
                      <option value="Urgent">Immediate Vigilance (7 Days)</option>
                    </select>
                  </div>
                </div>

                {/* Subject & Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subject / Summary <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject of grievance..."
                    required
                    className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Grievance Facts &amp; Particulars <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detailed chronological facts..."
                    required
                    className="w-full text-xs border border-slate-300 rounded p-3 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                  />
                </div>

                {/* Complainant Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Complainant Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={complainantName}
                      onChange={(e) => setComplainantName(e.target.value)}
                      required
                      className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={complainantPhone}
                      onChange={(e) => setComplainantPhone(e.target.value)}
                      required
                      className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={complainantEmail}
                      onChange={(e) => setComplainantEmail(e.target.value)}
                      required
                      className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-3 border-t border-slate-200 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-[#0b3b60] hover:bg-[#072a45] text-white text-xs font-bold rounded shadow-sm flex items-center space-x-2 transition"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Submitting to CSS...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-amber-300" />
                        <span>Submit Grievance to AICTE CSS &rarr;</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* LIVE INGESTED FEED VIEW */}
        {activePortal === 'stream' && (
          <div className="max-w-6xl w-full mx-auto px-4 py-6">
            <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <Radio className="w-4 h-4 text-purple-600 animate-pulse" />
                    <span>External Channel Ingested Feed (CPGRAMS &amp; CSS &rarr; AICTE Registry)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live log of grievances received via external portals and reflected across AICTE Bureaus.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setStreamHistory(getExternalStreamHistory())}
                    className="px-3 py-1.5 border border-slate-300 hover:bg-white text-slate-700 rounded text-xs flex items-center space-x-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh Feed</span>
                  </button>
                </div>
              </div>

              {streamHistory.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No external complaints logged in this session yet.</p>
                  <p className="mt-1">
                    Switch to the <button onClick={() => setActivePortal('cpgrams')} className="text-[#0b3b60] underline font-bold">CPGRAMS Tab</button> or <button onClick={() => setActivePortal('css')} className="text-[#0b3b60] underline font-bold">AICTE CSS Tab</button> to submit a sample grievance!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="p-3">Source Portal</th>
                        <th className="p-3">External Ref ID</th>
                        <th className="p-3">AICTE Internal Case</th>
                        <th className="p-3">Institution Name</th>
                        <th className="p-3">Violation Category</th>
                        <th className="p-3">Assigned Cell</th>
                        <th className="p-3">Ingested At</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {streamHistory.map((item) => (
                        <tr key={item.externalReferenceId} className="hover:bg-slate-50 transition">
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                item.source === 'CPGRAMS'
                                  ? 'bg-orange-100 text-orange-900 border border-orange-200'
                                  : 'bg-blue-100 text-blue-900 border border-blue-200'
                              }`}
                            >
                              {item.source}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-900">
                            {item.externalReferenceId}
                          </td>
                          <td className="p-3 font-mono font-bold text-[#0b3b60]">
                            {item.internalComplaintNumber}
                          </td>
                          <td className="p-3 font-semibold text-slate-800 max-w-xs truncate">
                            {item.institutionName}
                          </td>
                          <td className="p-3 text-slate-600">{item.category}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 bg-slate-100 rounded font-bold text-[10px] text-slate-700">
                              {item.assignedCell}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">
                            {new Date(item.submittedAt).toLocaleTimeString()}
                          </td>
                          <td className="p-3 text-right">
                            {onNavigateToCase && (
                              <button
                                type="button"
                                onClick={() => onNavigateToCase(item.id)}
                                className="px-2.5 py-1 bg-[#0b3b60] hover:bg-[#072a45] text-white rounded text-[11px] font-semibold"
                              >
                                View Dossier
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Footer for non-CPGRAMS views */}
      {activePortal !== 'cpgrams' && (
        <footer className="bg-slate-900 text-slate-400 text-xs py-4 border-t border-slate-800 mt-auto">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-center sm:text-left space-y-2 sm:space-y-0">
            <div>
              AICTE Cross-Bureau Complaint Coordination Platform • SIH-26264
            </div>
            <div className="text-slate-500">
              CPGRAMS (DARPG) • Centralized Support System (CSS) • Public Grievance Redressal Cell (PGRC)
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};
