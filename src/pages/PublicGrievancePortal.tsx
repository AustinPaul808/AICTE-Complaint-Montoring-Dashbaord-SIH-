import React, { useState, useEffect } from 'react';
import { getInstitutions, type Institution } from '../services/supabase/institutions';
import { getDepartments, type Department } from '../services/supabase/departments';
import { createComplaint, getComplaintByNumberOrId } from '../services/supabase/complaints';
import type { ComplaintPriority, ComplaintWithRelations } from '../types/database.types';
import {
  CheckCircle2,
  AlertCircle,
  Send,
  Building2,
  User,
  Search,
  ArrowLeft,
  Tag,
  X,
  ShieldCheck,
  GraduationCap,
  Briefcase,
  LogOut,
  AlertTriangle,
  Lock,
  Check,
} from 'lucide-react';

const COMPLAINT_CATEGORIES = [
  'Fee Cap Violation',
  'Non-Refund of Security Deposit',
  'Withholding of Original Certificates',
  'Faculty Deficiency & Non-Payment of Remuneration',
  'Unauthorized Course Operation',
  'Ragging & Student Harassment',
  'Infrastructure & Lab Non-Compliance',
  'Governance & Administrative Malpractice',
  'Admission Irregularity',
];

// Auto-route categories to responsible bureau codes
const CATEGORY_BUREAU_MAP: Record<string, string> = {
  'Fee Cap Violation': 'PGRC',
  'Non-Refund of Security Deposit': 'PGRC',
  'Withholding of Original Certificates': 'PGRC',
  'Faculty Deficiency & Non-Payment of Remuneration': 'RB',
  'Unauthorized Course Operation': 'RB',
  'Ragging & Student Harassment': 'PGRC',
  'Infrastructure & Lab Non-Compliance': 'AB',
  'Governance & Administrative Malpractice': 'PAP',
  'Admission Irregularity': 'RB',
};

export interface InstitutionalSession {
  fullName: string;
  email: string;
  role: 'Student' | 'Institution Staff / Faculty';
  institutionId: string;
  institutionName: string;
  idNumber: string; // Roll number or Employee ID
  phone: string;
}

interface PublicGrievancePortalProps {
  onGoToLogin: () => void;
}

export const PublicGrievancePortal: React.FC<PublicGrievancePortalProps> = ({ onGoToLogin }) => {
  // Reference data
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [institutionSearch, setInstitutionSearch] = useState('');

  // Public Notice Dismissible state
  const [showNotice, setShowNotice] = useState(true);

  // Institutional Authentication State
  const [institutionalUser, setInstitutionalUser] = useState<InstitutionalSession | null>(() => {
    try {
      const saved = sessionStorage.getItem('aicte_inst_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Institutional Login Form State
  const [loginRole, setLoginRole] = useState<'Student' | 'Institution Staff / Faculty'>('Student');
  const [loginFullName, setLoginFullName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginInstitutionId, setLoginInstitutionId] = useState('');
  const [loginIdNumber, setLoginIdNumber] = useState('');
  const [loginInstSearch, setLoginInstSearch] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Complaint Form State
  const [complainantName, setComplainantName] = useState(institutionalUser?.fullName || '');
  const [complainantEmail, setComplainantEmail] = useState(institutionalUser?.email || '');
  const [complainantPhone, setComplainantPhone] = useState(institutionalUser?.phone || '');
  const [complainantType, setComplainantType] = useState(
    institutionalUser?.role === 'Institution Staff / Faculty' ? 'Faculty' : 'Student'
  );
  const [studentRollNo, setStudentRollNo] = useState(institutionalUser?.idNumber || '');
  const [institutionId, setInstitutionId] = useState(institutionalUser?.institutionId || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(COMPLAINT_CATEGORIES[0]);
  const [priority, setPriority] = useState<ComplaintPriority>('Normal');

  // Verification Alert Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Tracking lookup
  const [trackingMode, setTrackingMode] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isSearchingTrack, setIsSearchingTrack] = useState(false);
  const [trackedRecord, setTrackedRecord] = useState<ComplaintWithRelations | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successComplaintNumber, setSuccessComplaintNumber] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [instList, deptList] = await Promise.all([
          getInstitutions(),
          getDepartments(),
        ]);
        setInstitutions(instList);
        setDepartments(deptList);
      } catch (err) {
        console.error('Error loading public portal data:', err);
      }
    }
    loadData();
  }, []);

  // Sync form when institutionalUser session changes
  useEffect(() => {
    if (institutionalUser) {
      setComplainantName(institutionalUser.fullName);
      setComplainantEmail(institutionalUser.email);
      setComplainantPhone(institutionalUser.phone || '');
      setComplainantType(institutionalUser.role === 'Institution Staff / Faculty' ? 'Faculty' : 'Student');
      setStudentRollNo(institutionalUser.idNumber || '');
      if (!institutionId) {
        setInstitutionId(institutionalUser.institutionId);
      }
    }
  }, [institutionalUser]);

  const filteredInstitutions = institutionSearch.trim()
    ? institutions.filter(
        (inst) =>
          inst.institution_name.toLowerCase().includes(institutionSearch.toLowerCase()) ||
          (inst.aicte_permanent_id || '').toLowerCase().includes(institutionSearch.toLowerCase()) ||
          inst.state.toLowerCase().includes(institutionSearch.toLowerCase())
      )
    : institutions;

  const filteredLoginInstitutions = loginInstSearch.trim()
    ? institutions.filter(
        (inst) =>
          inst.institution_name.toLowerCase().includes(loginInstSearch.toLowerCase()) ||
          (inst.aicte_permanent_id || '').toLowerCase().includes(loginInstSearch.toLowerCase()) ||
          inst.state.toLowerCase().includes(loginInstSearch.toLowerCase())
      )
    : institutions;

  // Resolve bureau department ID from category
  const getAssignedDepartmentId = (): string => {
    const bureauCode = CATEGORY_BUREAU_MAP[category] || 'PGRC';
    const dept = departments.find((d) => d.code === bureauCode);
    return dept?.id || departments[0]?.id || '';
  };

  // Handle Institutional User Authentication
  const handleInstitutionalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginEmail.trim() || !loginEmail.includes('@') || !loginEmail.includes('.')) {
      setLoginError('Please provide a valid official institution email address (e.g. name@college.edu.in).');
      return;
    }
    if (!loginFullName.trim()) {
      setLoginError('Please provide your full legal name.');
      return;
    }
    if (!loginInstitutionId) {
      setLoginError('Please select your affiliated technical institution from the list.');
      return;
    }

    const selectedInst = institutions.find((i) => i.id === loginInstitutionId);
    const sessionData: InstitutionalSession = {
      fullName: loginFullName.trim(),
      email: loginEmail.trim().toLowerCase(),
      role: loginRole,
      institutionId: loginInstitutionId,
      institutionName: selectedInst?.institution_name || 'Technical Institution',
      idNumber: loginIdNumber.trim(),
      phone: loginPhone.trim(),
    };

    try {
      sessionStorage.setItem('aicte_inst_user', JSON.stringify(sessionData));
    } catch {
      // ignore
    }

    setInstitutionalUser(sessionData);
    setComplainantName(sessionData.fullName);
    setComplainantEmail(sessionData.email);
    setComplainantPhone(sessionData.phone);
    setComplainantType(sessionData.role === 'Institution Staff / Faculty' ? 'Faculty' : 'Student');
    setStudentRollNo(sessionData.idNumber);
    setInstitutionId(sessionData.institutionId);
  };

  // Quick Demo Institutional Login Autofill
  const handleInstitutionalDemoFill = (role: 'Student' | 'Faculty') => {
    const targetInst = institutions[0] || {
      id: 'mock-inst-id',
      institution_name: 'College of Engineering Pune (COEP)',
    };

    if (role === 'Student') {
      setLoginRole('Student');
      setLoginFullName('Aarav Sharma');
      setLoginEmail('aarav.sharma@coep.ac.in');
      setLoginPhone('+91 98230 11223');
      setLoginInstitutionId(targetInst.id);
      setLoginIdNumber('2023-BTECH-CS-042');
    } else {
      setLoginRole('Institution Staff / Faculty');
      setLoginFullName('Dr. Meenakshi Sundaram');
      setLoginEmail('m.sundaram@coep.ac.in');
      setLoginPhone('+91 94440 55667');
      setLoginInstitutionId(targetInst.id);
      setLoginIdNumber('EMP-COEP-8842');
    }
  };

  const handleInstitutionalLogout = () => {
    try {
      sessionStorage.removeItem('aicte_inst_user');
    } catch {
      // ignore
    }
    setInstitutionalUser(null);
  };

  // Triggered when form Submit button is clicked: validates and displays Verification Alert Modal
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!complainantName.trim()) {
      setErrorMessage('Please provide your full name.');
      return;
    }
    if (!complainantEmail.trim()) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }
    if (!institutionId) {
      setErrorMessage('Please select the institution this complaint relates to.');
      return;
    }
    if (!title.trim() || !description.trim()) {
      setErrorMessage('Grievance title and detailed description are required.');
      return;
    }

    // Open confirmation alert dialog to verify all details
    setShowConfirmModal(true);
  };

  // Triggered from Verification Alert Modal after user confirms
  const handleFinalSubmit = async () => {
    const assignedDeptId = getAssignedDepartmentId();
    if (!assignedDeptId) {
      setErrorMessage('System error: Could not determine responsible bureau. Please try again.');
      setShowConfirmModal(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createComplaint({
        institution_id: institutionId,
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        assigned_department_id: assignedDeptId,
        created_by: null,
        complainant_name: complainantName.trim(),
        complainant_email: complainantEmail.trim(),
        complainant_phone: complainantPhone.trim() || null,
        complainant_type: complainantType,
        student_roll_no: studentRollNo.trim() || null,
      });

      setShowConfirmModal(false);
      setSuccessComplaintNumber(result.complaint_number);
    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error('Public grievance submission error:', err);
      setErrorMessage(
        error?.message || 'Failed to submit grievance. Please ensure Supabase public grievance migration has been applied.'
      );
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrackSearch = async () => {
    if (!trackingNumber.trim()) return;
    setIsSearchingTrack(true);
    setTrackError(null);
    setTrackedRecord(null);

    const cleanInput = trackingNumber.trim().replace(/\s*-\s*/g, '-');

    try {
      const res = await getComplaintByNumberOrId(cleanInput);
      if (res) {
        setTrackedRecord(res);
      } else {
        setTrackError(`No complaint found with Reference ID "${trackingNumber.trim()}". Please verify the number.`);
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setTrackError(error?.message || 'Failed to search complaint.');
    } finally {
      setIsSearchingTrack(false);
    }
  };

  const resetForm = () => {
    setSuccessComplaintNumber(null);
    setTitle('');
    setDescription('');
    setCategory(COMPLAINT_CATEGORIES[0]);
    setPriority('Normal');
    setInstitutionSearch('');
  };

  // Selected target institution name helper
  const selectedTargetInstitution = institutions.find((i) => i.id === institutionId);

  // === SUCCESS SCREEN ===
  if (successComplaintNumber) {
    return (
      <div className="min-h-screen bg-slate-100 font-sans">
        {/* Tricolor Stripe */}
        <div className="h-1 w-full flex">
          <div className="flex-1 bg-[#FF9933]" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-[#138808]" />
        </div>

        <div className="max-w-lg mx-auto px-4 py-16">
          <div className="bg-white border border-slate-200 rounded shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
              Submission Successful
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Grievance Registered Successfully
            </h2>
            <p className="text-xs text-slate-600 mb-5">
              Your grievance has been recorded in the AICTE central repository under your verified institutional account. It is routed to the appropriate Bureau for verification and redressal.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded p-4 font-mono text-sm text-slate-800 font-bold mb-6">
              Official Grievance ID: <span className="text-[#0b3b60]">{successComplaintNumber}</span>
            </div>

            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 mb-6">
              <strong>Important:</strong> Please bookmark or note down this reference ID. You can track grievance updates anytime on this portal.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 bg-[#0b3b60] hover:bg-[#072a45] text-white text-xs font-semibold rounded shadow-sm"
              >
                Submit Another Grievance
              </button>
              <button
                type="button"
                onClick={onGoToLogin}
                className="px-5 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded"
              >
                Officer Login Portal →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === MAIN PORTAL ===
  return (
    <div className="min-h-screen bg-slate-100 font-sans flex flex-col">
      {/* Tricolor Stripe */}
      <div className="h-1 w-full flex">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>

      {/* Header */}
      <header className="bg-[#0b3b60] text-white py-4 shadow-md">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src="/aicte-emblem.png"
              alt="AICTE Official Emblem"
              className="w-10 h-10 object-contain drop-shadow-md shrink-0"
            />
            <div>
              <h1 className="text-sm font-bold tracking-wide">
                AICTE PUBLIC GRIEVANCE INTAKE PORTAL
              </h1>
              <p className="text-xs text-white/70">
                All India Council for Technical Education • Central Vigilance &amp; Redressal Platform
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onGoToLogin}
            className="text-xs text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded transition"
          >
            Officer Login →
          </button>
        </div>
      </header>

      {/* Sub-Header Notice with Dismiss Cross Button */}
      {showNotice && (
        <div className="bg-amber-50 border-b border-amber-200 py-2.5 px-4 transition-all">
          <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Public Notice:</strong> Technical students, parents, faculty, and institutions may register complaints against AICTE-approved institutions directly. Your complaint will be routed to the appropriate Bureau (RB, PGRC, AB, or P&amp;AP) for investigation.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowNotice(false)}
              className="text-amber-700 hover:text-amber-900 ml-3 p-1 rounded hover:bg-amber-100 transition shrink-0"
              title="Dismiss Notice"
              aria-label="Dismiss Notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6 flex-1 w-full">
        {/* Navigation Tabs: Intake vs Track */}
        <div className="flex items-center border-b border-slate-300 mb-6">
          <button
            type="button"
            onClick={() => setTrackingMode(false)}
            className={`px-5 py-2.5 text-xs font-bold border-b-2 transition ${
              !trackingMode
                ? 'border-[#0b3b60] text-[#0b3b60] bg-white rounded-t'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Register Public Grievance
          </button>
          <button
            type="button"
            onClick={() => setTrackingMode(true)}
            className={`px-5 py-2.5 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
              trackingMode
                ? 'border-[#0b3b60] text-[#0b3b60] bg-white rounded-t'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Track Grievance Status</span>
          </button>
        </div>

        {/* MODE 1: TRACKING */}
        {trackingMode ? (
          <div className="bg-white border border-slate-200 rounded shadow-sm p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Grievance Tracking System
              </h3>
              <p className="text-xs text-slate-500">
                Enter your Grievance ID / Case Number to track the status of your complaint across AICTE Bureaus.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleTrackSearch();
              }}
              className="flex gap-2 max-w-lg"
            >
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value.toUpperCase())}
                placeholder="e.g. AICTE-2026-01001"
                className="flex-1 text-xs border border-slate-300 rounded px-3 py-2.5 font-mono uppercase bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
              />
              <button
                type="submit"
                disabled={isSearchingTrack || !trackingNumber.trim()}
                className="px-5 py-2.5 bg-[#0b3b60] hover:bg-[#072a45] text-white text-xs font-semibold rounded shadow-sm disabled:opacity-50 flex items-center space-x-1.5"
              >
                {isSearchingTrack ? (
                  <span className="animate-pulse">Searching...</span>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Search</span>
                  </>
                )}
              </button>
            </form>

            {trackError && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-800 rounded flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{trackError}</span>
              </div>
            )}

            {trackedRecord && (
              <div className="border border-slate-200 rounded p-5 bg-slate-50 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-slate-200 gap-2">
                  <div>
                    <span className="text-xs font-bold text-[#0b3b60] font-mono">
                      {trackedRecord.complaint_number}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                      {trackedRecord.title}
                    </h4>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                      trackedRecord.status === 'Resolved' || trackedRecord.status === 'Closed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : trackedRecord.status === 'In Progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {trackedRecord.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Institution:</span>
                    <span className="font-semibold text-slate-800">
                      {trackedRecord.institution?.institution_name || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Responsible Bureau:</span>
                    <span className="font-semibold text-slate-800">
                      {trackedRecord.department?.name || 'Assigned Bureau'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Category:</span>
                    <span className="font-semibold text-slate-800">
                      {trackedRecord.category}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Filed On:</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(trackedRecord.created_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800 block mb-1">Description:</span>
                  <p className="bg-white p-3 rounded border border-slate-200 text-slate-700 whitespace-pre-wrap">
                    {trackedRecord.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : !institutionalUser ? (
          /* MODE 2: INSTITUTIONAL LOGIN DASHBOARD (GATED ACCESS) */
          <div className="bg-white border border-slate-200 rounded shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-[#0b3b60] to-[#072a45] text-white p-6 sm:p-7">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-white/10 rounded-md">
                  <Lock className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold">
                    Institutional Member Authentication Required
                  </h2>
                  <p className="text-xs text-blue-100">
                    AICTE Verification Desk • Restricted to Registered Students &amp; Institution Personnel
                  </p>
                </div>
              </div>
              <p className="text-xs text-blue-100/90 leading-relaxed mt-2 bg-black/20 p-3 rounded border border-white/10">
                <strong>Access Notice:</strong> Under AICTE compliance guidelines, public grievance registration is restricted to verified students or active employees of AICTE-approved technical institutions using their official institution email. This ensures authentic complaints and prevents spam.
              </p>
            </div>

            {/* Error banner in login */}
            {loginError && (
              <div className="m-6 mb-0 p-3 bg-red-50 border border-red-200 text-xs text-red-800 rounded flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleInstitutionalLogin} className="p-6 space-y-6">
              {/* Step 1: Complainant Category / Affiliation */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
                  1. Select Your Affiliation with the Institution <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLoginRole('Student')}
                    className={`p-4 border rounded-md text-left transition flex items-start space-x-3 ${
                      loginRole === 'Student'
                        ? 'border-[#0b3b60] bg-blue-50/70 ring-1 ring-[#0b3b60]'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-full ${
                        loginRole === 'Student'
                          ? 'bg-[#0b3b60] text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Student of the Institution
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Enrolled in AICTE approved Diploma / UG / PG engineering or management course
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLoginRole('Institution Staff / Faculty')}
                    className={`p-4 border rounded-md text-left transition flex items-start space-x-3 ${
                      loginRole === 'Institution Staff / Faculty'
                        ? 'border-[#0b3b60] bg-blue-50/70 ring-1 ring-[#0b3b60]'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-full ${
                        loginRole === 'Institution Staff / Faculty'
                          ? 'bg-[#0b3b60] text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Working in the Institution
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Teaching faculty, academic staff, or non-teaching administrative personnel
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Step 2: Select Technical Institution */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                  2. Select Your AICTE-Approved Institution <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Search by College Name, AICTE Permanent ID, or State
                </p>
                <input
                  type="text"
                  value={loginInstSearch}
                  onChange={(e) => setLoginInstSearch(e.target.value)}
                  placeholder="Search institution..."
                  className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60] mb-2"
                />
                <select
                  value={loginInstitutionId}
                  onChange={(e) => setLoginInstitutionId(e.target.value)}
                  required
                  size={4}
                  className="w-full text-xs border border-slate-300 rounded px-3 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                >
                  <option value="">-- Choose Your Institution --</option>
                  {filteredLoginInstitutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.institution_name} [{inst.aicte_permanent_id || 'ID Pending'}] — {inst.state}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 3: Identity & Institutional Email */}
              <div className="space-y-4">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                  3. Your Institutional Identity Details
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Legal Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={loginFullName}
                      onChange={(e) => setLoginFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      required
                      className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Official Institutional Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="e.g. rahul.sharma@college.edu.in"
                      required
                      className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                    />
                    <span className="text-[10px] text-slate-500">
                      Must use institution domain (.edu.in, .ac.in, or registered college domain)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {loginRole === 'Student'
                        ? 'Enrollment / Student Roll No. *'
                        : 'Employee ID / Faculty Designation *'}
                    </label>
                    <input
                      type="text"
                      value={loginIdNumber}
                      onChange={(e) => setLoginIdNumber(e.target.value)}
                      placeholder={
                        loginRole === 'Student'
                          ? 'e.g. 2023-CS-042'
                          : 'e.g. Assistant Professor / EMP-9821'
                      }
                      required
                      className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mobile Number (for SMS &amp; Verification)
                    </label>
                    <input
                      type="tel"
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                    />
                  </div>
                </div>
              </div>

              {/* Login Actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>AICTE Bureau Officer Login</span>
                </button>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#0b3b60] hover:bg-[#072a45] text-white text-xs font-bold rounded shadow-sm flex items-center justify-center space-x-2"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Authenticate &amp; Open Grievance Desk</span>
                </button>
              </div>

              {/* Quick Demo Pre-fills for Testing */}
              <div className="pt-4 border-t border-slate-200">
                <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Quick Test Login (Demo Pre-fills):</span>
                  <span className="text-[10px] text-slate-400 font-normal">Click to test instant access</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleInstitutionalDemoFill('Student')}
                    className="px-3 py-1.5 border border-slate-200 hover:border-[#0b3b60] hover:bg-blue-50 rounded text-xs text-slate-700 flex items-center space-x-1.5 transition"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-[#0b3b60]" />
                    <span>Demo Student: Aarav Sharma (COEP Pune)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInstitutionalDemoFill('Faculty')}
                    className="px-3 py-1.5 border border-slate-200 hover:border-[#0b3b60] hover:bg-blue-50 rounded text-xs text-slate-700 flex items-center space-x-1.5 transition"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-[#0b3b60]" />
                    <span>Demo Faculty: Dr. M. Sundaram (COEP Pune)</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          /* MODE 3: AUTHENTICATED GRIEVANCE REGISTRATION FORM */
          <div className="bg-white border border-slate-200 rounded shadow-sm">
            {/* Authenticated Institutional User Header Bar */}
            <div className="bg-emerald-50/80 border-b border-emerald-200 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-900 flex items-center space-x-2">
                    <span>Verified Institutional Complainant: {institutionalUser.fullName}</span>
                    <span className="bg-emerald-200 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      {institutionalUser.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    {institutionalUser.email} • {institutionalUser.institutionName} • ID: {institutionalUser.idNumber || 'N/A'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleInstitutionalLogout}
                className="text-xs text-emerald-800 hover:text-red-700 font-semibold flex items-center space-x-1 shrink-0 px-2 py-1 rounded hover:bg-emerald-100 transition"
                title="Sign out of current institutional session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Switch / Sign Out</span>
              </button>
            </div>

            {errorMessage && (
              <div className="m-6 mb-0 p-3 bg-red-50 border border-red-200 text-xs text-red-800 rounded flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handlePreSubmit} className="p-6 space-y-6">
              {/* Section 1: Locked Complainant Details */}
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5">
                    <User className="w-4 h-4 text-[#0b3b60]" />
                    <span>1. Complainant Verification (Locked to Authenticated Session)</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Complainant Full Name
                    </label>
                    <input
                      type="text"
                      value={complainantName}
                      disabled
                      className="w-full text-xs border border-slate-200 rounded px-3 py-2 bg-slate-50 text-slate-700 font-medium cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Verified Complainant Category
                    </label>
                    <input
                      type="text"
                      value={complainantType === 'Faculty' ? 'Faculty / Institution Staff' : 'Student'}
                      disabled
                      className="w-full text-xs border border-slate-200 rounded px-3 py-2 bg-slate-50 text-slate-700 font-medium cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Verified Institutional Email
                    </label>
                    <input
                      type="email"
                      value={complainantEmail}
                      disabled
                      className="w-full text-xs border border-slate-200 rounded px-3 py-2 bg-slate-50 text-slate-700 font-medium cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mobile Number (for SMS Alerts)
                    </label>
                    <input
                      type="tel"
                      value={complainantPhone}
                      onChange={(e) => setComplainantPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                    />
                  </div>
                </div>

                {studentRollNo && (
                  <div className="max-w-xs">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {complainantType === 'Faculty' ? 'Employee ID' : 'Student Enrollment / Roll No.'}
                    </label>
                    <input
                      type="text"
                      value={studentRollNo}
                      disabled
                      className="w-full text-xs border border-slate-200 rounded px-3 py-2 bg-slate-50 text-slate-700 font-mono cursor-not-allowed"
                    />
                  </div>
                )}
              </div>

              {/* Section 2: Accused Institution */}
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5">
                    <Building2 className="w-4 h-4 text-[#0b3b60]" />
                    <span>2. Institution Subject to Grievance</span>
                  </h3>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Search &amp; Select Technical Institution <span className="text-red-500">*</span>
                    </label>
                    {institutionId === institutionalUser.institutionId && (
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                        Selected: Your Affiliated Institution
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={institutionSearch}
                    onChange={(e) => setInstitutionSearch(e.target.value)}
                    placeholder="Search by Institution Name, AICTE ID, or State..."
                    className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60] mb-2"
                  />
                  <select
                    value={institutionId}
                    onChange={(e) => setInstitutionId(e.target.value)}
                    required
                    size={4}
                    className="w-full text-xs border border-slate-300 rounded px-3 py-1 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                  >
                    <option value="">-- Click an Institution from List --</option>
                    {filteredInstitutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.institution_name} [{inst.aicte_permanent_id || 'ID Pending'}] — {inst.state}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section 3: Grievance Content */}
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5">
                    <Tag className="w-4 h-4 text-[#0b3b60]" />
                    <span>3. Grievance Particulars</span>
                  </h3>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Grievance Subject / Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Concise summary of your grievance (e.g. Demanding illegal capitation fee)"
                    required
                    className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Violation Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                      className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                    >
                      {COMPLAINT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Auto-allocated Bureau: <strong className="text-[#0b3b60]">{CATEGORY_BUREAU_MAP[category] || 'PGRC'}</strong>
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Urgency Level
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
                      className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                    >
                      <option value="Normal">Normal (Routine Review - 30 days)</option>
                      <option value="High">High (Serious Regulatory Issue - 14 days)</option>
                      <option value="Urgent">Urgent (Vigilance / Immediate Action - 7 days)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chronological Details &amp; Facts <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Explain the grievance chronologically with all specific details (dates, names, department, amounts involved, and supporting facts)..."
                    required
                    className="w-full text-xs border border-slate-300 rounded p-3 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                  />
                </div>
              </div>

              {/* Declaration Notice */}
              <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs text-slate-600">
                <strong>Legal Declaration:</strong> I hereby declare that the particulars submitted are true and authentic. The grievance is filed in good faith under AICTE Regulations.
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>AICTE Officer Login</span>
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#0b3b60] hover:bg-[#072a45] text-white text-xs font-semibold rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0b3b60] flex items-center space-x-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Proceed to Verification &amp; Submit</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* VERIFICATION ALERT CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl max-w-xl w-full border border-slate-300 overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="bg-amber-500 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <AlertTriangle className="w-6 h-6 text-white shrink-0" />
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide">
                    Verify Grievance Particulars Before Final Submission
                  </h3>
                  <p className="text-xs text-amber-100">
                    AICTE Central Repository Official Verification Step
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-white/80 hover:text-white p-1 rounded hover:bg-amber-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-amber-900">
                <strong>Attention:</strong> Please review all entered details thoroughly. Once submitted, an official case dossier is generated, time-stamped, and assigned an AICTE tracking reference for statutory inspection.
              </div>

              {/* Review Summary Cards */}
              <div className="border border-slate-200 rounded-md divide-y divide-slate-200 bg-slate-50">
                <div className="p-3 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Complainant Name</span>
                    <span className="font-bold text-slate-900">{complainantName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Affiliation Role</span>
                    <span className="font-semibold text-slate-800">
                      {complainantType === 'Faculty' ? 'Faculty / Staff' : 'Student'}
                    </span>
                  </div>
                </div>

                <div className="p-3 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Institutional Email</span>
                    <span className="font-mono text-slate-800">{complainantEmail}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Roll No / Emp ID</span>
                    <span className="font-mono text-slate-800">{studentRollNo || 'N/A'}</span>
                  </div>
                </div>

                <div className="p-3">
                  <span className="text-slate-500 block text-[11px]">Institution Subject to Grievance</span>
                  <span className="font-bold text-slate-900">
                    {selectedTargetInstitution?.institution_name || 'Selected Institution'}
                  </span>
                  {selectedTargetInstitution?.state && (
                    <span className="text-slate-500 text-[11px] block">
                      State: {selectedTargetInstitution.state} • AICTE ID: {selectedTargetInstitution.aicte_permanent_id || 'N/A'}
                    </span>
                  )}
                </div>

                <div className="p-3 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Category</span>
                    <span className="font-semibold text-slate-800">{category}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Responsible AICTE Bureau</span>
                    <span className="font-bold text-[#0b3b60]">
                      {CATEGORY_BUREAU_MAP[category] || 'PGRC'} Bureau
                    </span>
                  </div>
                </div>

                <div className="p-3">
                  <span className="text-slate-500 block text-[11px]">Urgency / Priority</span>
                  <span className="font-semibold text-slate-800">{priority}</span>
                </div>

                <div className="p-3">
                  <span className="text-slate-500 block text-[11px]">Subject / Title</span>
                  <span className="font-bold text-slate-900">{title}</span>
                </div>

                <div className="p-3">
                  <span className="text-slate-500 block text-[11px] mb-1">Grievance Description Preview</span>
                  <p className="bg-white p-2.5 rounded border border-slate-200 text-slate-700 whitespace-pre-wrap max-h-28 overflow-y-auto font-mono text-[11px]">
                    {description}
                  </p>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 italic">
                By clicking &quot;Confirm &amp; Final Submit&quot;, you certify that these particulars are authentic and complete.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded transition"
              >
                Review &amp; Edit Details
              </button>

              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 bg-[#0b3b60] hover:bg-[#072a45] text-white text-xs font-bold rounded shadow-sm flex items-center space-x-2 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting to AICTE...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Confirm &amp; Final Submit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-4 border-t border-slate-800 mt-auto">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-center sm:text-left space-y-2 sm:space-y-0">
          <div>
            AICTE Cross-Bureau Complaint Coordination Platform • SIH-26264
          </div>
          <div className="text-slate-500">
            Regulation Bureau (RB) • Public Grievance Redressal Cell (PGRC) • Approval Bureau (AB)
          </div>
        </div>
      </footer>
    </div>
  );
};
