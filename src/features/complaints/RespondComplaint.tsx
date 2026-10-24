import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
  addComplaintUpdate,
  getComplaintUpdates,
} from '../../services/supabase/complaints';
import type {
  ComplaintWithRelations,
  ComplaintStatus,
  ComplaintUpdateWithAuthor,
} from '../../types/database.types';
import {
  Send,
  Building2,
  User,
  Mail,
  CheckCircle2,
  AlertCircle,
  Search,
  MessageSquare,
  FileCheck,
  Calendar,
  Clock,
  ArrowRight,
  Shield,
} from 'lucide-react';

interface RespondComplaintProps {
  initialComplaintId?: string | null;
  onViewCaseDossier?: (id: string) => void;
}

const DISPATCH_TYPES = [
  'Official Redressal Decision & Relief Order',
  'Notice for Hearing & Tripartite Meeting',
  'Clarification & Evidentiary Document Request',
  'Interim Bureau Inspection Finding',
  'Final Closure & Compliance Report',
];

const COMPLAINT_STATUS_OPTIONS: ComplaintStatus[] = [
  'Under Review',
  'In Progress',
  'On Hold',
  'Resolved',
  'Closed',
];

export const RespondComplaint: React.FC<RespondComplaintProps> = ({
  initialComplaintId,
  onViewCaseDossier,
}) => {
  const { user, profile } = useAuth();

  // Complaints list & selection
  const [complaints, setComplaints] = useState<ComplaintWithRelations[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintWithRelations | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);

  // Response inputs
  const [dispatchType, setDispatchType] = useState(DISPATCH_TYPES[0]);
  const [responseRemarks, setResponseRemarks] = useState('');
  const [targetStatus, setTargetStatus] = useState<ComplaintStatus>('In Progress');
  const [officialRefNo, setOfficialRefNo] = useState('');
  const [hearingDate, setHearingDate] = useState('');

  // Updates history
  const [caseUpdates, setCaseUpdates] = useState<ComplaintUpdateWithAuthor[]>([]);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dispatchSuccess, setDispatchSuccess] = useState<{
    recipientName: string;
    recipientEmail: string;
    complaintNumber: string;
    status: string;
    timestamp: string;
  } | null>(null);

  // Load complaints list
  useEffect(() => {
    async function loadData() {
      setIsLoadingList(true);
      try {
        const { data } = await getComplaints({ pageSize: 50 });
        setComplaints(data);

        // Pre-select if initial ID passed
        if (initialComplaintId) {
          const match = data.find((c) => c.id === initialComplaintId);
          if (match) {
            handleSelectComplaint(match);
          } else {
            const single = await getComplaintById(initialComplaintId);
            if (single) handleSelectComplaint(single);
          }
        } else if (data.length > 0) {
          handleSelectComplaint(data[0]);
        }
      } catch (err) {
        console.error('Error fetching complaints for response desk:', err);
      } finally {
        setIsLoadingList(false);
      }
    }
    loadData();
  }, [initialComplaintId]);

  const handleSelectComplaint = async (complaint: ComplaintWithRelations) => {
    setSelectedComplaint(complaint);
    setTargetStatus(complaint.status === 'Received' ? 'Under Review' : complaint.status);
    setDispatchSuccess(null);
    setErrorMessage(null);
    setOfficialRefNo(
      `AICTE/${complaint.department?.code || 'PGRC'}/ORD/${new Date().getFullYear()}/${complaint.complaint_number.slice(-5)}`
    );

    // Load past updates
    try {
      const updates = await getComplaintUpdates(complaint.id);
      setCaseUpdates(updates);
    } catch {
      setCaseUpdates([]);
    }
  };

  const handleDispatchResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    if (!responseRemarks.trim()) {
      setErrorMessage('Please type the official action remarks or redressal response.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const recipientName =
      selectedComplaint.complainant_name ||
      `${selectedComplaint.institution?.institution_name || 'Institution'} Authority`;
    const recipientEmail =
      selectedComplaint.complainant_email ||
      `nodal.officer@${(selectedComplaint.institution?.institution_name || 'institution')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')}.edu.in`;

    try {
      const authorId = user?.id || 'b0000000-0000-0000-0000-000000000001';
      const formattedUpdate = `[${dispatchType.toUpperCase()}] Ref: ${officialRefNo}
${responseRemarks.trim()}
${hearingDate ? `Scheduled Date: ${hearingDate}` : ''}
Dispatched by: ${profile?.full_name || 'Bureau Officer'} (${profile?.designation || 'AICTE Desk'})
Recipient: ${recipientName} <${recipientEmail}>`;

      // 1. Record update in case dossier
      await addComplaintUpdate(selectedComplaint.id, authorId, formattedUpdate);

      // 2. Update status if changed
      if (targetStatus !== selectedComplaint.status) {
        await updateComplaintStatus(selectedComplaint.id, targetStatus);
        setSelectedComplaint((prev) => (prev ? { ...prev, status: targetStatus } : null));
      }

      // 3. Refresh updates
      const updatedList = await getComplaintUpdates(selectedComplaint.id);
      setCaseUpdates(updatedList);

      // 4. Show simulated email dispatch confirmation
      setDispatchSuccess({
        recipientName,
        recipientEmail,
        complaintNumber: selectedComplaint.complaint_number,
        status: targetStatus,
        timestamp: new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
      });

      setResponseRemarks('');
    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error('Error dispatching official response:', err);
      setErrorMessage(error?.message || 'Failed to submit response to Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredComplaints = complaints.filter((c) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.complaint_number.toLowerCase().includes(term) ||
      c.title.toLowerCase().includes(term) ||
      (c.institution?.institution_name || '').toLowerCase().includes(term) ||
      (c.complainant_name || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-[#0b3b60]" />
            <span>Respond to Complaint &amp; Redressal Dispatch Desk</span>
          </h2>
          <p className="text-xs text-slate-500">
            Transmit official AICTE directives, examination findings, and formal notices directly to complainants and institutions
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span className="px-2.5 py-1 bg-blue-50 text-[#0b3b60] border border-blue-200 rounded font-semibold font-mono">
            {profile?.departments?.code || 'PGRC'} Desk
          </span>
        </div>
      </div>

      {/* Main Grid: Selector on left, Composer on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Complaint Picker (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Select Grievance to Answer
            </h3>
            <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
              {filteredComplaints.length} Cases
            </span>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search case #, institution, complainant..."
              className="w-full text-xs border border-slate-300 rounded pl-8 pr-2.5 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0b3b60]"
            />
          </div>

          {/* List */}
          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {isLoadingList ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading cases...</div>
            ) : filteredComplaints.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No matching grievances.</div>
            ) : (
              filteredComplaints.map((c) => {
                const isSelected = selectedComplaint?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectComplaint(c)}
                    className={`w-full text-left p-3 rounded border transition ${
                      isSelected
                        ? 'border-[#0b3b60] bg-blue-50/50 shadow-xs ring-1 ring-[#0b3b60]'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-mono font-bold text-[#0b3b60]">
                        {c.complaint_number}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          c.status === 'Resolved' || c.status === 'Closed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'In Progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {c.title}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {c.institution?.institution_name || 'Institution'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                      <span>{c.complainant_name || 'Public Complainant'}</span>
                      <span className="font-mono text-slate-400">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Case Response Workbench (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedComplaint ? (
            <>
              {/* Case Summary Header Box */}
              <div className="bg-white border border-slate-200 rounded shadow-sm p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-sm text-[#0b3b60]">
                        {selectedComplaint.complaint_number}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700 uppercase">
                        {selectedComplaint.category}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">
                      {selectedComplaint.title}
                    </h3>
                  </div>
                  {onViewCaseDossier && (
                    <button
                      type="button"
                      onClick={() => onViewCaseDossier(selectedComplaint.id)}
                      className="text-xs text-[#0b3b60] hover:underline font-semibold flex items-center space-x-1 shrink-0"
                    >
                      <span>Full Case Dossier</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Recipient & Filing Meta */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded border border-slate-200">
                  <div>
                    <span className="text-slate-500 text-[11px] flex items-center space-x-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Complainant</span>
                    </span>
                    <span className="font-semibold text-slate-800 block mt-0.5">
                      {selectedComplaint.complainant_name || 'Anonymous Student / Citizen'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Type: {selectedComplaint.complainant_type || 'Student'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[11px] flex items-center space-x-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>Recipient Dispatch Email</span>
                    </span>
                    <span className="font-semibold text-[#0b3b60] font-mono block mt-0.5 break-all">
                      {selectedComplaint.complainant_email ||
                        `nodal.officer@${(selectedComplaint.institution?.institution_name || 'aicte')
                          .toLowerCase()
                          .replace(/[^a-z0-9]/g, '')}.edu.in`}
                    </span>
                    {selectedComplaint.complainant_phone && (
                      <span className="text-[11px] text-slate-500 font-mono">
                        Phone: {selectedComplaint.complainant_phone}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 text-[11px] flex items-center space-x-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Governed Institution</span>
                    </span>
                    <span className="font-semibold text-slate-800 block mt-0.5 truncate">
                      {selectedComplaint.institution?.institution_name}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      State: {selectedComplaint.institution?.state}
                    </span>
                  </div>
                </div>

                {/* Grievance Statement Preview */}
                <div className="text-xs text-slate-600 bg-white p-3 rounded border border-slate-200">
                  <span className="font-semibold text-slate-800 block mb-1">
                    Grievance Allegation on Record:
                  </span>
                  <p className="text-slate-700 whitespace-pre-wrap max-h-24 overflow-y-auto leading-relaxed">
                    {selectedComplaint.description}
                  </p>
                </div>
              </div>

              {/* SUCCESS NOTICE / SIMULATED EMAIL RECEIPT */}
              {dispatchSuccess && (
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded p-4 shadow-sm animate-fadeIn">
                  <div className="flex items-start space-x-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1 text-xs">
                      <div className="font-bold text-emerald-900 text-sm">
                        Official Response Dispatched Successfully
                      </div>
                      <p className="text-emerald-800 mt-1">
                        The regulatory action notice has been recorded in the central case history and dispatched to the complainant &amp; governed institution.
                      </p>
                      
                      <div className="mt-3 bg-white p-3 rounded border border-emerald-200 font-mono text-[11px] space-y-1 text-slate-800">
                        <div>
                          <span className="text-slate-500">Recipient:</span>{' '}
                          <strong>{dispatchSuccess.recipientName}</strong> &lt;{dispatchSuccess.recipientEmail}&gt;
                        </div>
                        <div>
                          <span className="text-slate-500">Case ID:</span>{' '}
                          <strong className="text-[#0b3b60]">{dispatchSuccess.complaintNumber}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Updated Lifecycle Status:</span>{' '}
                          <span className="px-1.5 py-0.5 rounded font-bold uppercase text-[10px] bg-emerald-100 text-emerald-800">
                            {dispatchSuccess.status}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Transmission Timestamp:</span>{' '}
                          <span>{dispatchSuccess.timestamp}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Dispatch Service:</span>{' '}
                          <span className="text-slate-700 font-sans">
                            AICTE Central Redressal Notification Gateway (Simulated E-mail Dispatch)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ERROR BANNER */}
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-800 rounded flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Response Composer Form */}
              <form
                onSubmit={handleDispatchResponse}
                className="bg-white border border-slate-200 rounded shadow-sm p-5 space-y-4"
              >
                <div className="border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center space-x-1.5">
                    <FileCheck className="w-4 h-4 text-[#0b3b60]" />
                    <span>Compose Official Response / Regulatory Order</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Dispatch Order / Communication Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={dispatchType}
                      onChange={(e) => setDispatchType(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0b3b60]"
                    >
                      {DISPATCH_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Dispatch File Reference Number
                    </label>
                    <input
                      type="text"
                      value={officialRefNo}
                      onChange={(e) => setOfficialRefNo(e.target.value)}
                      placeholder="e.g. AICTE/PGRC/ORD/2026/0491"
                      className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-[#0b3b60]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Update Case Status Upon Dispatch <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={targetStatus}
                      onChange={(e) => setTargetStatus(e.target.value as ComplaintStatus)}
                      className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0b3b60]"
                    >
                      {COMPLAINT_STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hearing / Inspection Date (Optional)
                    </label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="date"
                        value={hearingDate}
                        onChange={(e) => setHearingDate(e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded pl-8 pr-3 py-1.5 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0b3b60]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Official Response Body &amp; Directives to Complainant / College{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={6}
                    value={responseRemarks}
                    onChange={(e) => setResponseRemarks(e.target.value)}
                    placeholder="Enter the official response text: include regulatory findings, directives given to the institution, refund or certificate release deadline, and instructions for the student..."
                    required
                    className="w-full text-xs border border-slate-300 rounded p-3 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0b3b60]"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    This response will be committed to the case audit dossier and dispatched to the recipient's email address.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                  <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    <span>Transmitted under authority of {profile?.full_name || 'Officer'}</span>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-[#0b3b60] hover:bg-[#072a45] text-white text-xs font-semibold rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0b3b60] disabled:opacity-50 flex items-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Transmitting Order...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Dispatch Response &amp; Notify Recipient</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Case Updates / Prior Responses History */}
              <div className="bg-white border border-slate-200 rounded shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#0b3b60]" />
                    <span>Prior Dispatches &amp; Case Notes ({caseUpdates.length})</span>
                  </h4>
                </div>

                {caseUpdates.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No prior responses dispatched for this case yet.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {caseUpdates.map((u) => (
                      <div
                        key={u.id}
                        className="p-3 rounded bg-slate-50 border border-slate-200 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-800">
                            {u.author?.full_name || 'Bureau Officer'} ({u.author?.designation || 'AICTE'})
                          </span>
                          <span className="font-mono text-slate-400">
                            {new Date(u.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap text-[11px] leading-relaxed">
                          {u.update_text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white border border-slate-200 rounded shadow-sm p-12 text-center text-xs text-slate-500">
              Please choose a complaint from the left registry to compose a response.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
