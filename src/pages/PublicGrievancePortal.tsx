import React, { useState, useEffect } from 'react';
import { getInstitutions, type Institution } from '../services/supabase/institutions';
import { getDepartments, type Department } from '../services/supabase/departments';
import { createComplaint, getComplaintByNumberOrId } from '../services/supabase/complaints';
import type { ComplaintPriority, ComplaintWithRelations } from '../types/database.types';
import {
  Shield,
  CheckCircle2,
  AlertCircle,
  Send,
  Building2,
  User,
  Search,
  ArrowLeft,
  Tag,
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

const COMPLAINANT_TYPES = ['Student', 'Faculty', 'Parent / Guardian', 'Institution', 'Other'];

interface PublicGrievancePortalProps {
  onGoToLogin: () => void;
}

export const PublicGrievancePortal: React.FC<PublicGrievancePortalProps> = ({ onGoToLogin }) => {
  // Reference data
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [institutionSearch, setInstitutionSearch] = useState('');

  // Complainant info
  const [complainantName, setComplainantName] = useState('');
  const [complainantEmail, setComplainantEmail] = useState('');
  const [complainantPhone, setComplainantPhone] = useState('');
  const [complainantType, setComplainantType] = useState('Student');
  const [studentRollNo, setStudentRollNo] = useState('');

  // Complaint info
  const [institutionId, setInstitutionId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(COMPLAINT_CATEGORIES[0]);
  const [priority, setPriority] = useState<ComplaintPriority>('Normal');

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

  const filteredInstitutions = institutionSearch.trim()
    ? institutions.filter(
        (inst) =>
          inst.institution_name.toLowerCase().includes(institutionSearch.toLowerCase()) ||
          (inst.aicte_permanent_id || '').toLowerCase().includes(institutionSearch.toLowerCase()) ||
          inst.state.toLowerCase().includes(institutionSearch.toLowerCase())
      )
    : institutions;

  // Resolve bureau department ID from category
  const getAssignedDepartmentId = (): string => {
    const bureauCode = CATEGORY_BUREAU_MAP[category] || 'PGRC';
    const dept = departments.find((d) => d.code === bureauCode);
    return dept?.id || departments[0]?.id || '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!complainantName.trim()) {
      setErrorMessage('Please provide your full name.');
      return;
    }
    if (!complainantEmail.trim()) {
      setErrorMessage('Please provide a valid email address for correspondence.');
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

    const assignedDeptId = getAssignedDepartmentId();
    if (!assignedDeptId) {
      setErrorMessage('System error: Could not determine responsible bureau. Please try again.');
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

      setSuccessComplaintNumber(result.complaint_number);
    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error('Public grievance submission error:', err);
      setErrorMessage(
        error?.message || 'Failed to submit grievance. Please ensure Supabase public grievance migration has been applied.'
      );
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
    setComplainantName('');
    setComplainantEmail('');
    setComplainantPhone('');
    setComplainantType('Student');
    setStudentRollNo('');
    setInstitutionId('');
    setTitle('');
    setDescription('');
    setCategory(COMPLAINT_CATEGORIES[0]);
    setPriority('Normal');
    setInstitutionSearch('');
  };

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
              Your grievance has been recorded in the AICTE central repository. It is assigned to the appropriate bureau for verification and redressal.
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
            <div className="p-2 bg-white/10 rounded">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide">
                AICTE PUBLIC GRIEVANCE INTAKE PORTAL
              </h1>
              <p className="text-xs text-white/70">
                All India Council for Technical Education • Central Vigilance & Redressal Platform
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

      {/* Sub-Header Notice */}
      <div className="bg-amber-50 border-b border-amber-200 py-2.5 px-4">
        <div className="max-w-4xl mx-auto flex items-center space-x-2 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Public Notice:</strong> Technical students, parents, faculty, and institutions may register complaints against AICTE-approved institutions directly. Your complaint will be routed to the appropriate Bureau (RB, PGRC, AB, or P&amp;AP) for investigation.
          </span>
        </div>
      </div>

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

        {/* MODE: TRACKING */}
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
        ) : (
          /* MODE: REGISTRATION */
          <div className="bg-white border border-slate-200 rounded shadow-sm">
            {errorMessage && (
              <div className="m-6 mb-0 p-3 bg-red-50 border border-red-200 text-xs text-red-800 rounded flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Section 1: Complainant Details */}
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5">
                    <User className="w-4 h-4 text-[#0b3b60]" />
                    <span>1. Complainant Identification</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={complainantName}
                      onChange={(e) => setComplainantName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      required
                      className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Complainant Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={complainantType}
                      onChange={(e) => setComplainantType(e.target.value)}
                      required
                      className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                    >
                      {COMPLAINANT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Official / Correspondence Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={complainantEmail}
                      onChange={(e) => setComplainantEmail(e.target.value)}
                      placeholder="e.g. rahul.sharma@example.com"
                      required
                      className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mobile Number (for SMS notifications)
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

                {complainantType === 'Student' && (
                  <div className="max-w-xs">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Student Roll / Enrollment No.
                    </label>
                    <input
                      type="text"
                      value={studentRollNo}
                      onChange={(e) => setStudentRollNo(e.target.value)}
                      placeholder="e.g. 2023-CS-042"
                      className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                    />
                  </div>
                )}
              </div>

              {/* Section 2: Institution Details */}
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5">
                    <Building2 className="w-4 h-4 text-[#0b3b60]" />
                    <span>2. Institution Subject to Grievance</span>
                  </h3>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Search Institution <span className="text-red-500">*</span>
                  </label>
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
                    placeholder="Concise summary of your grievance"
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
                    placeholder="Explain the grievance chronologically with all specific details (dates, amounts, relevant persons)..."
                    required
                    className="w-full text-xs border border-slate-300 rounded p-3 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                  />
                </div>
              </div>

              {/* Declaration */}
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
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#0b3b60] hover:bg-[#072a45] text-white text-xs font-semibold rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0b3b60] disabled:opacity-50 flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Transmitting Record...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Grievance to AICTE</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

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
