import React, { useState, useEffect } from 'react';
import { getInstitutions, type Institution } from '../services/supabase/institutions';
import { getDepartments, type Department } from '../services/supabase/departments';
import { createComplaint, getComplaintByNumberOrId } from '../services/supabase/complaints';
import {
  getActivePublicSession,
  logoutPublicSession,
  recordGrievanceSubmission,
  checkGrievanceEligibility,
  type PublicUserSession,
  type GrievanceEligibility,
} from '../services/publicAuthService';
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
  LogOut,
  AlertTriangle,
  Lock,
  Check,
  Clock,
  UserPlus,
  LogIn,
  Mail,
} from 'lucide-react';
import { ContactModal } from '../components/common/ContactModal';

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

interface PublicGrievancePortalProps {
  onGoToLogin: () => void;
  onGoToRegister?: (tab?: 'register' | 'login') => void;
  onGoToExternalPortals?: () => void;
}

export const PublicGrievancePortal: React.FC<PublicGrievancePortalProps> = ({
  onGoToLogin,
  onGoToRegister,
  onGoToExternalPortals,
}) => {
  // Reference data
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Public Notice Dismissible state
  const [showNotice, setShowNotice] = useState(true);
  const [showContactModal, setShowContactModal] = useState(false);

  // Active Public User Session
  const [publicUser, setPublicUser] = useState<PublicUserSession | null>(() => {
    return getActivePublicSession();
  });

  // 7-Day Restriction Eligibility State (Requirement 6)
  const [eligibility, setEligibility] = useState<GrievanceEligibility | null>(null);
  const [, setIsCheckingEligibility] = useState(false);

  // Complaint Form State
  const [institutionId, setInstitutionId] = useState(publicUser?.institutionId || '');
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

  // Check 7-day restriction whenever publicUser is available
  useEffect(() => {
    async function verifyEligibility() {
      if (!publicUser?.email) return;
      setIsCheckingEligibility(true);
      try {
        const res = await checkGrievanceEligibility(publicUser.email);
        setEligibility(res);
      } catch (err) {
        console.error('Error checking grievance eligibility:', err);
      } finally {
        setIsCheckingEligibility(false);
      }
    }
    verifyEligibility();
  }, [publicUser?.email]);

  // Resolve bureau department ID from category
  const getAssignedDepartmentId = (): string => {
    const bureauCode = CATEGORY_BUREAU_MAP[category] || 'PGRC';
    const dept = departments.find((d) => d.code === bureauCode);
    return dept?.id || departments[0]?.id || '';
  };

  const handleLogout = () => {
    logoutPublicSession();
    setPublicUser(null);
    if (onGoToRegister) {
      onGoToRegister('login');
    }
  };

  // Triggered when form Submit button is clicked
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Requirement 6: Check 7-day restriction rule
    if (eligibility && !eligibility.isEligible) {
      setErrorMessage(
        `Grievance registration restricted: A user cannot register another grievance using the same email ID until 7 days have passed since previous submission. Next eligible date: ${eligibility.eligibleDate?.toLocaleDateString()}`
      );
      return;
    }

    if (!publicUser?.fullName) {
      setErrorMessage('User session missing. Please register or log in first.');
      return;
    }
    if (!institutionId) {
      setErrorMessage('Please select the technical institution this grievance relates to.');
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
    if (!publicUser) return;

    // Double check 7-day restriction rule
    if (eligibility && !eligibility.isEligible) {
      setErrorMessage('Submission blocked: 7-day waiting period active.');
      setShowConfirmModal(false);
      return;
    }

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
        complainant_name: publicUser.fullName,
        complainant_email: publicUser.email, // Permanent email ID
        complainant_phone: publicUser.mobileNumber, // Compulsory mobile
        complainant_type: publicUser.userType === 'Faculty' ? 'Faculty' : 'Student',
        student_roll_no: publicUser.rollNumber, // Compulsory roll number
      });

      // Requirement 6: Record grievance timestamp for 7-day rule
      recordGrievanceSubmission(publicUser.email, result.complaint_number, title.trim());

      // Update eligibility immediately
      const newEligibility = await checkGrievanceEligibility(publicUser.email);
      setEligibility(newEligibility);

      setShowConfirmModal(false);
      setSuccessComplaintNumber(result.complaint_number);
    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error('Public grievance submission error:', err);
      setErrorMessage(
        error?.message || 'Failed to submit grievance. Please try again.'
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
  };

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

        <div className="max-w-xl mx-auto px-4 py-16">
          <div className="bg-white border border-slate-200 rounded shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
              Grievance Registered Successfully
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Official Reference ID Generated
            </h2>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              Your grievance has been permanently logged in the AICTE central repository under verified account{' '}
              <strong className="text-slate-900">{publicUser?.email}</strong>. It has been routed to the{' '}
              <strong className="text-[#0b3b60]">{CATEGORY_BUREAU_MAP[category] || 'PGRC'} Bureau</strong> for statutory inquiry.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded p-4 font-mono text-base text-slate-800 font-bold mb-4">
              AICTE Docket Reference: <span className="text-[#0b3b60]">{successComplaintNumber}</span>
            </div>

            {/* 7-Day Restriction Notice on Success Screen */}
            <div className="bg-amber-50 border border-amber-200 rounded p-3.5 mb-6 text-xs text-amber-900 text-left flex items-start space-x-2.5">
              <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">7-Day Cooling Period Initiated: </span>
                As per AICTE policy, a subsequent grievance under email <strong>{publicUser?.email}</strong> can be registered after 7 days, allowing authorities time to inspect this complaint.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 bg-[#0b3b60] hover:bg-[#072a45] text-white text-xs font-semibold rounded shadow-sm"
              >
                Return to Grievance Desk
              </button>
              <button
                type="button"
                onClick={onGoToLogin}
                className="px-5 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded"
              >
                AICTE Officer Login &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex flex-col justify-between">
      {/* Top Tricolor Stripe */}
      <div className="gov-tricolor-stripe w-full"></div>

      {/* Header */}
      <header className="bg-[#0b3b60] text-white py-4 shadow-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3 text-center sm:text-left">
            <img
              src="/aicte-emblem.png"
              alt="AICTE Official Emblem"
              className="w-11 h-11 object-contain drop-shadow-md shrink-0"
            />
            <div>
              <div className="text-[10px] uppercase text-amber-200 tracking-wider font-medium">
                अखिल भारतीय तकनीकी शिक्षा परिषद | Ministry of Education
              </div>
              <h1 className="text-sm sm:text-base font-bold tracking-wide">
                AICTE Public Grievance Intake &amp; Monitoring Portal
              </h1>
              <p className="text-[11px] text-white/70">
                Centralized Support System (CSS) &amp; Public Grievance Redressal Cell (PGRC)
              </p>
            </div>
          </div>
<<<<<<< HEAD

          <div className="flex items-center space-x-2">
            {onGoToExternalPortals && (
              <button
                type="button"
                onClick={onGoToExternalPortals}
                className="text-xs text-amber-200 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded transition flex items-center space-x-1"
                title="Open simulated CPGRAMS & CSS Portals"
              >
                <span>🇮🇳 CPGRAMS / CSS Simulator</span>
              </button>
            )}
=======
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowContactModal(true)}
              className="text-xs text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded transition flex items-center space-x-1"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Contact Desk</span>
            </button>
>>>>>>> f093d7b (Brevo Setup)
            <button
              type="button"
              onClick={onGoToLogin}
              className="text-xs text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded transition"
            >
<<<<<<< HEAD
              AICTE Officer Portal &rarr;
=======
              Officer Login →
>>>>>>> f093d7b (Brevo Setup)
            </button>
          </div>
        </div>
      </header>

      {/* Sub-Header Notice */}
      {showNotice && (
        <div className="bg-amber-50 border-b border-amber-200 py-2.5 px-4 transition-all">
          <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-amber-900">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Public Notice:</strong> Technical students, faculty, and stakeholders can lodge grievances directly. All complaints are systematically cross-checked against AICTE approval and regulation databases.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowNotice(false)}
              className="text-amber-700 hover:text-amber-900 ml-3 p-1 rounded hover:bg-amber-100 transition shrink-0"
              title="Dismiss Notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full">
        {/* Navigation Tabs: Intake vs Track */}
        <div className="flex items-center border-b border-slate-300 mb-6">
          <button
            type="button"
            onClick={() => setTrackingMode(false)}
            className={`px-5 py-2.5 text-xs font-bold border-b-2 transition ${
              !trackingMode
                ? 'border-[#0b3b60] text-[#0b3b60] bg-white rounded-t shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Lodge Institutional Grievance
          </button>
          <button
            type="button"
            onClick={() => setTrackingMode(true)}
            className={`px-5 py-2.5 text-xs font-bold border-b-2 transition flex items-center space-x-1.5 ${
              trackingMode
                ? 'border-[#0b3b60] text-[#0b3b60] bg-white rounded-t shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Track Case Status by Reference ID</span>
          </button>
        </div>

        {/* MODE 1: TRACKING VIEW */}
        {trackingMode ? (
          <div className="bg-white border border-slate-200 rounded shadow-sm p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Grievance Tracking System
              </h3>
              <p className="text-xs text-slate-500">
                Enter your Grievance Reference ID (e.g. AICTE-2026-01001) to view live bureau review status.
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
                    <span>Search Status</span>
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
                    <span className="text-slate-500 block">Handling AICTE Bureau:</span>
                    <span className="font-semibold text-[#0b3b60]">
                      {trackedRecord.department?.name || 'Assigned Bureau'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Violation Category:</span>
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
                  <span className="font-semibold text-slate-800 block mb-1">Particulars:</span>
                  <p className="bg-white p-3 rounded border border-slate-200 text-slate-700 whitespace-pre-wrap">
                    {trackedRecord.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : !publicUser ? (
          /* MODE 2: USER NOT LOGGED IN PROMPT (Replaced Institutional Member Auth Required page) */
          <div className="bg-white border border-slate-200 rounded shadow-md overflow-hidden p-8 text-center">
            <div className="w-14 h-14 bg-blue-50 text-[#0b3b60] rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-200">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Authentication Required to Lodge a Grievance
            </h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto mt-1.5 leading-relaxed">
              Under AICTE grievance regulations, public grievance registration requires verified student or citizen credentials with compulsory Roll Number and Mobile Number.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onGoToRegister && onGoToRegister('register')}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#0b3b60] hover:bg-[#072a45] text-white text-xs font-bold rounded shadow-sm flex items-center justify-center space-x-2 transition"
              >
                <UserPlus className="w-4 h-4 text-[#e67e22]" />
                <span>New User Registration</span>
              </button>
              <button
                type="button"
                onClick={() => onGoToRegister && onGoToRegister('login')}
                className="w-full sm:w-auto px-6 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded shadow-sm flex items-center justify-center space-x-2 transition"
              >
                <LogIn className="w-4 h-4 text-[#0b3b60]" />
                <span>Already Registered? Proceed to Login</span>
              </button>
            </div>
          </div>
        ) : (
          /* MODE 3: AUTHENTICATED GRIEVANCE SUBMISSION FORM */
          <div className="bg-white border border-slate-200 rounded shadow-sm">
            {/* Authenticated Public User Header Bar */}
            <div className="bg-emerald-50/90 border-b border-emerald-200 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-900 flex items-center space-x-2">
                    <span>Verified Complainant: {publicUser.fullName}</span>
                    <span className="bg-emerald-200 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      {publicUser.userType}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    Permanent Email: <strong>{publicUser.email}</strong> • Roll/ID: <span className="font-mono">{publicUser.rollNumber}</span> • Mobile: {publicUser.mobileNumber}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs text-emerald-800 hover:text-red-700 font-semibold flex items-center space-x-1 shrink-0 px-2 py-1 rounded hover:bg-emerald-100 transition"
                title="Sign out of current account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out / Switch</span>
              </button>
            </div>

            {/* REQUIREMENT 6: 7-DAY RESTRICTION ALERT BANNER */}
            {eligibility && !eligibility.isEligible && (
              <div className="m-6 p-4 sm:p-5 bg-amber-50 border-2 border-amber-400 rounded-lg text-amber-950 shadow-sm animate-in fade-in">
                <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm">
                  <Clock className="w-5 h-5 text-amber-700 shrink-0" />
                  <span>Grievance Registration Restricted — 7-Day Cooling Period Active</span>
                </div>
                <p className="mt-1.5 text-xs text-amber-800 leading-relaxed">
                  Under AICTE grievance regulations, a user cannot register another grievance using the same email ID until <strong>7 days</strong> have passed since their previous grievance registration. This allows the assigned Bureau adequate time to initiate formal inquiry and prevents duplicate dockets.
                </p>

                <div className="mt-3 p-3 bg-white/90 rounded border border-amber-300 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Previous Case Reference:</span>
                    <span className="font-mono font-bold text-[#0b3b60]">
                      {eligibility.lastComplaintNumber || 'Prior AICTE Case'}
                    </span>
                    {eligibility.lastComplaintTitle && (
                      <span className="text-[11px] text-slate-700 block truncate mt-0.5">
                        {eligibility.lastComplaintTitle}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Submitted On:</span>
                    <span className="font-semibold text-slate-800">
                      {eligibility.lastSubmittedAt
                        ? new Date(eligibility.lastSubmittedAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Recently'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Next Eligible Submission:</span>
                    <span className="font-bold text-amber-900">
                      {eligibility.eligibleDate
                        ? eligibility.eligibleDate.toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Pending'}
                      <span className="block text-[11px] text-amber-700 font-normal mt-0.5">
                        ({eligibility.daysRemaining}d {eligibility.hoursRemaining}h {eligibility.minutesRemaining}m remaining)
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="m-6 mb-0 p-3 bg-red-50 border border-red-200 text-xs text-red-800 rounded flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handlePreSubmit} className="p-6 space-y-6">
              {/* Section 1: Locked & Verified Complainant Details */}
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5">
                    <User className="w-4 h-4 text-[#0b3b60]" />
                    <span>1. Verified Complainant Details (Permanent &amp; Compulsory)</span>
                  </h3>
                  <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Locked to Authenticated Session
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Complainant Full Name
                    </label>
                    <input
                      type="text"
                      value={publicUser.fullName}
                      disabled
                      className="w-full text-xs border border-slate-200 rounded px-3 py-2 bg-slate-50 text-slate-700 font-medium cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Complainant Category
                    </label>
                    <input
                      type="text"
                      value={publicUser.userType}
                      disabled
                      className="w-full text-xs border border-slate-200 rounded px-3 py-2 bg-slate-50 text-slate-700 font-medium cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Permanent Email Field with Warning */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Registered Permanent Email ID
                    </label>
                    <input
                      type="email"
                      value={publicUser.email}
                      disabled
                      className="w-full text-xs border border-slate-200 rounded px-3 py-2 bg-slate-50 text-slate-700 font-mono font-medium cursor-not-allowed"
                    />
                    <div className="mt-1.5 p-2 bg-red-50 border border-red-300 rounded text-[11px] text-red-800 flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span>Permanent Email: Cannot be changed. Official notices will be dispatched here.</span>
                    </div>
                  </div>

                  {/* Compulsory Mobile & Roll Number */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Roll / ID Number *
                        </label>
                        <input
                          type="text"
                          value={publicUser.rollNumber}
                          disabled
                          className="w-full text-xs border border-slate-200 rounded px-3 py-2 bg-slate-50 text-slate-700 font-mono cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Mobile Number *
                        </label>
                        <input
                          type="text"
                          value={publicUser.mobileNumber}
                          disabled
                          className="w-full text-xs border border-slate-200 rounded px-3 py-2 bg-slate-50 text-slate-700 font-mono cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      Compulsory fields verified during account registration.
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Accused Technical Institution */}
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5">
                    <Building2 className="w-4 h-4 text-[#0b3b60]" />
                    <span>2. Institution Subject to Grievance <span className="text-red-500">*</span></span>
                  </h3>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Technical Institution <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={institutionId}
                    onChange={(e) => {
                      setInstitutionId(e.target.value);
                    }}
                    required
                    disabled={Boolean(eligibility && !eligibility.isEligible)}
                    className="w-full text-xs border border-slate-300 rounded px-3 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60] disabled:bg-slate-100 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <option value="">-- Choose Technical Institution --</option>
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.institution_name} [{inst.aicte_permanent_id || 'ID Pending'}] — {inst.state}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section 3: Grievance Particulars */}
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5">
                    <Tag className="w-4 h-4 text-[#0b3b60]" />
                    <span>3. Grievance Particulars</span>
                  </h3>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subject / Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Concise summary (e.g. Demanding illegal capitation fee for admission)"
                    required
                    disabled={Boolean(eligibility && !eligibility.isEligible)}
                    className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60] disabled:bg-slate-100 disabled:cursor-not-allowed"
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
                      disabled={Boolean(eligibility && !eligibility.isEligible)}
                      className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60] disabled:bg-slate-100 disabled:cursor-not-allowed"
                    >
                      {COMPLAINT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Auto-allocated Bureau:{' '}
                      <strong className="text-[#0b3b60]">
                        {CATEGORY_BUREAU_MAP[category] || 'PGRC'} Bureau
                      </strong>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Urgency Level
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
                      disabled={Boolean(eligibility && !eligibility.isEligible)}
                      className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60] disabled:bg-slate-100 disabled:cursor-not-allowed"
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
                    placeholder="Explain the grievance chronologically with dates, names, amounts, and supporting facts..."
                    required
                    disabled={Boolean(eligibility && !eligibility.isEligible)}
                    className="w-full text-xs border border-slate-300 rounded p-3 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60] disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Legal Notice */}
              <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs text-slate-600">
                <strong>Legal Affirmation:</strong> I declare that all facts submitted are true and verifiable. Filing fraudulent grievances is an offence under AICTE regulations.
              </div>

              {/* Submit Button Section with 7-Day Restriction Check */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>AICTE Officer Login Portal</span>
                </button>

                {eligibility && !eligibility.isEligible ? (
                  <button
                    type="button"
                    disabled
                    className="w-full sm:w-auto px-6 py-2.5 bg-slate-200 text-slate-500 text-xs font-bold rounded cursor-not-allowed flex items-center justify-center space-x-2 border border-slate-300"
                  >
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>
                      Submission Restricted ({eligibility.daysRemaining}d {eligibility.hoursRemaining}h remaining)
                    </span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-6 py-2.5 bg-[#0b3b60] hover:bg-[#072a45] text-white text-xs font-bold rounded shadow-sm flex items-center justify-center space-x-2 transition"
                  >
                    <Send className="w-4 h-4 text-[#e67e22]" />
                    <span>Proceed to Verification &amp; Submit</span>
                  </button>
                )}
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
                <strong>Attention:</strong> Please review all details thoroughly. Once submitted, an official case dossier is generated, time-stamped, and assigned an AICTE tracking reference.
              </div>

              {/* Review Summary Cards */}
              <div className="border border-slate-200 rounded-md divide-y divide-slate-200 bg-slate-50">
                <div className="p-3 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Complainant Name</span>
                    <span className="font-bold text-slate-900">{publicUser?.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Affiliation Role</span>
                    <span className="font-semibold text-slate-800">{publicUser?.userType}</span>
                  </div>
                </div>

                <div className="p-3 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Permanent Email ID</span>
                    <span className="font-mono text-slate-800">{publicUser?.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Roll No &amp; Mobile</span>
                    <span className="font-mono text-slate-800">
                      {publicUser?.rollNumber} • {publicUser?.mobileNumber}
                    </span>
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

<<<<<<< HEAD
      {/* Official Government Footer */}
=======
      {/* Brevo Contact Modal */}
      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        defaultEmail={currentCitizen?.email}
        defaultName={currentCitizen?.fullName}
      />

      {/* Footer */}
>>>>>>> f093d7b (Brevo Setup)
      <footer className="bg-slate-900 text-slate-400 text-xs py-4 border-t border-slate-800 mt-auto">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-center sm:text-left space-y-2 sm:space-y-0">
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
