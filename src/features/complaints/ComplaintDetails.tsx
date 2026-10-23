import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getComplaintById,
  updateComplaintStatus,
  updateComplaintAssignment,
  getComplaintUpdates,
  addComplaintUpdate,
  getComplaintAssignments,
  getComplaintAuditHistory,
} from '../../services/supabase/complaints';
import { getDepartments, type Department } from '../../services/supabase/departments';
import { getOfficersByDepartment, type UserProfile } from '../../services/supabase/users';
import type {
  ComplaintWithRelations,
  ComplaintUpdateWithAuthor,
  AssignmentWithRelations,
  AuditLogWithActor,
  ComplaintStatus,
} from '../../types/database.types';
import {
  ArrowLeft,
  Building2,
  Clock,
  Shield,
  User,
  Send,
  History,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Share2
} from 'lucide-react';

interface ComplaintDetailsProps {
  complaintId: string;
  onBack: () => void;
}

const ALL_STATUSES: ComplaintStatus[] = [
  'Received',
  'Under Review',
  'In Progress',
  'On Hold',
  'Resolved',
  'Closed',
];

export const ComplaintDetails: React.FC<ComplaintDetailsProps> = ({
  complaintId,
  onBack,
}) => {
  const { user } = useAuth();

  const [complaint, setComplaint] = useState<ComplaintWithRelations | null>(null);
  const [updates, setUpdates] = useState<ComplaintUpdateWithAuthor[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithRelations[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogWithActor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptOfficers, setDeptOfficers] = useState<UserProfile[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [newStatus, setNewStatus] = useState<ComplaintStatus>('Received');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Investigation Note Form
  const [newNote, setNewNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Re-assignment State
  const [showReassign, setShowReassign] = useState(false);
  const [reassignDeptId, setReassignDeptId] = useState('');
  const [reassignOfficerId, setReassignOfficerId] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);

  const [activeTab, setActiveTab] = useState<'notes' | 'assignments' | 'audit'>('notes');
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadComplaintData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [comp, notesList, assignList, auditList, deptList] = await Promise.all([
        getComplaintById(complaintId),
        getComplaintUpdates(complaintId),
        getComplaintAssignments(complaintId),
        getComplaintAuditHistory(complaintId),
        getDepartments(),
      ]);

      setComplaint(comp);
      setUpdates(notesList);
      setAssignments(assignList);
      setAuditLogs(auditList);
      setDepartments(deptList);

      if (comp) {
        setNewStatus(comp.status);
        setReassignDeptId(comp.assigned_department_id);
        setReassignOfficerId(comp.assigned_officer_id || '');
      }
    } catch (err) {
      console.error('Error fetching complaint details:', err);
    } finally {
      setIsLoading(false);
    }
  }, [complaintId]);

  useEffect(() => {
    loadComplaintData();
  }, [loadComplaintData]);

  // Load officers for reassignment dropdown when bureau changes
  useEffect(() => {
    if (reassignDeptId) {
      getOfficersByDepartment(reassignDeptId)
        .then(setDeptOfficers)
        .catch(console.error);
    }
  }, [reassignDeptId]);

  // Handle status update
  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || newStatus === complaint.status) return;

    setIsUpdatingStatus(true);
    setFeedbackMessage(null);

    try {
      await updateComplaintStatus(complaintId, newStatus);
      setFeedbackMessage({ text: `Status updated to "${newStatus}". System audit log registered.`, type: 'success' });
      await loadComplaintData();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setFeedbackMessage({ text: error?.message || 'Failed to update complaint status.', type: 'error' });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle adding progress note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !user) return;

    setIsSubmittingNote(true);
    setFeedbackMessage(null);

    try {
      await addComplaintUpdate(complaintId, user.id, newNote.trim());
      setNewNote('');
      setFeedbackMessage({ text: 'Official investigation note committed.', type: 'success' });
      await loadComplaintData();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setFeedbackMessage({ text: error?.message || 'Failed to add progress update.', type: 'error' });
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Handle bureau / officer reassignment
  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignDeptId) return;

    setIsReassigning(true);
    setFeedbackMessage(null);

    try {
      await updateComplaintAssignment(
        complaintId,
        reassignDeptId,
        reassignOfficerId || null
      );
      setShowReassign(false);
      setFeedbackMessage({ text: 'Case transferred/reassigned successfully.', type: 'success' });
      await loadComplaintData();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setFeedbackMessage({ text: error?.message || 'Failed to reassign case.', type: 'error' });
    } finally {
      setIsReassigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded p-16 text-center text-xs text-slate-500 shadow-sm">
        <div className="w-8 h-8 border-2 border-[#0b3b60] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <span>Retrieving official case dossier from Supabase...</span>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="bg-white border border-slate-200 rounded p-8 text-center shadow-sm">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-900">Case Record Not Found</h3>
        <p className="text-xs text-slate-500 mt-1">This complaint may have been deleted or access restricted by RLS policy.</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 px-3 py-1.5 bg-[#0b3b60] text-white rounded text-xs"
        >
          Return to Registry
        </button>
      </div>
    );
  }

  const isOverdue = complaint.due_at && !['Resolved', 'Closed'].includes(complaint.status) && new Date(complaint.due_at) < new Date();

  return (
    <div className="space-y-5">
      {/* Top Breadcrumb & Action Banner */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-[#0b3b60] hover:text-[#072a45] font-semibold flex items-center space-x-1.5 py-1 px-2.5 bg-white border border-slate-200 rounded shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Complaints Registry</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowReassign(!showReassign)}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded flex items-center space-x-1 shadow-sm"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Reassign / Transfer Desk</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMessage && (
        <div className={`p-3 rounded text-xs flex items-center space-x-2 border ${
          feedbackMessage.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Reassignment Modal Bar */}
      {showReassign && (
        <form onSubmit={handleReassign} className="bg-amber-50 border border-amber-300 rounded p-4 shadow-sm text-xs space-y-3 animate-in fade-in">
          <div className="font-bold text-amber-900 flex items-center space-x-1.5">
            <Share2 className="w-4 h-4 text-amber-700" />
            <span>Transfer Case or Reassign Desk Officer</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Target Bureau / Cell *</label>
              <select
                value={reassignDeptId}
                onChange={(e) => setReassignDeptId(e.target.value)}
                required
                className="w-full border border-slate-300 rounded p-2 bg-white text-slate-900"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Assigned Officer (Optional)</label>
              <select
                value={reassignOfficerId}
                onChange={(e) => setReassignOfficerId(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 bg-white text-slate-900"
              >
                <option value="">-- Unassigned (Bureau Pool) --</option>
                {deptOfficers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.full_name} ({o.designation || 'Officer'})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={() => setShowReassign(false)}
              className="px-3 py-1.5 border border-slate-300 rounded bg-white text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isReassigning}
              className="px-4 py-1.5 bg-[#0b3b60] text-white font-semibold rounded hover:bg-[#072a45]"
            >
              {isReassigning ? 'Transferring...' : 'Confirm Desk Transfer'}
            </button>
          </div>
        </form>
      )}

      {/* Main Case Dossier Header */}
      <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div className="flex items-center space-x-3">
              <span className="font-mono text-base font-extrabold text-[#0b3b60] bg-white px-3 py-1 rounded border border-slate-300 shadow-sm">
                {complaint.complaint_number}
              </span>
              <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                complaint.priority === 'Urgent'
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : complaint.priority === 'High'
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}>
                {complaint.priority.toUpperCase()} PRIORITY
              </span>
            </div>

            {/* Quick Status Workflow Selector */}
            <form onSubmit={handleStatusChange} className="flex items-center space-x-2">
              <label className="text-xs font-semibold text-slate-600 shrink-0">Workflow Status:</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as ComplaintStatus)}
                className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-[#0b3b60]"
              >
                {ALL_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={isUpdatingStatus || newStatus === complaint.status}
                className="px-3 py-1.5 bg-[#0b3b60] text-white text-xs font-semibold rounded hover:bg-[#072a45] disabled:opacity-40"
              >
                {isUpdatingStatus ? 'Saving...' : 'Update'}
              </button>
            </form>
          </div>

          <h1 className="text-lg font-bold text-slate-900 mt-2">
            {complaint.title}
          </h1>
          <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>Category: <strong className="text-slate-700">{complaint.category}</strong></span>
            <span>•</span>
            <span>Intake: <strong className="text-slate-700">{new Date(complaint.received_at).toLocaleDateString()}</strong></span>
            {complaint.due_at && (
              <>
                <span>•</span>
                <span className={isOverdue ? 'text-red-700 font-bold' : ''}>
                  Deadline: <strong>{new Date(complaint.due_at).toLocaleDateString()}</strong>
                  {isOverdue && ' (OVERDUE)'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Fact Sheet Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white">
          
          {/* Column 1: Institution Details */}
          <div className="border border-slate-200 rounded p-4 bg-slate-50 text-xs space-y-2">
            <div className="font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5 text-[11px] text-[#0b3b60]">
              <Building2 className="w-3.5 h-3.5" />
              <span>Governed Institution</span>
            </div>
            <div className="font-semibold text-slate-900 text-sm">
              {complaint.institution?.institution_name || 'N/A'}
            </div>
            <div className="text-slate-600">
              <span className="text-slate-500">AICTE Permanent ID:</span>{' '}
              <span className="font-mono font-bold text-slate-800">
                {complaint.institution?.aicte_permanent_id || 'Not on Record'}
              </span>
            </div>
            <div className="text-slate-600">
              <span className="text-slate-500">State / Territory:</span> {complaint.institution?.state}
            </div>
            {complaint.institution?.address && (
              <div className="text-slate-500 text-[11px] leading-relaxed">
                {complaint.institution.address}
              </div>
            )}
          </div>

          {/* Column 2: Bureau & Officer Allocation */}
          <div className="border border-slate-200 rounded p-4 bg-slate-50 text-xs space-y-2">
            <div className="font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5 text-[11px] text-[#0b3b60]">
              <Shield className="w-3.5 h-3.5" />
              <span>Bureau Desk</span>
            </div>
            <div className="font-semibold text-slate-900 text-sm">
              {complaint.department?.name} ({complaint.department?.code})
            </div>
            <div className="text-slate-600">
              <span className="text-slate-500">Nodal Officer:</span>{' '}
              <span className="font-semibold text-slate-800">
                {complaint.assigned_officer?.full_name || 'Unassigned (Bureau Pool)'}
              </span>
            </div>
            {complaint.assigned_officer?.designation && (
              <div className="text-slate-500 text-[11px]">
                {complaint.assigned_officer.designation}
              </div>
            )}
            <div className="text-slate-500 text-[11px] pt-1 border-t border-slate-200">
              Lodged By: {complaint.creator?.full_name || 'System Portal'}
            </div>
          </div>

          {/* Column 3: Status & SLA Timeline */}
          <div className="border border-slate-200 rounded p-4 bg-slate-50 text-xs space-y-2">
            <div className="font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5 text-[11px] text-[#0b3b60]">
              <Clock className="w-3.5 h-3.5" />
              <span>Resolution Compliance</span>
            </div>
            <div>
              <span className="text-slate-500">Current Status:</span>{' '}
              <span className="font-bold text-slate-900">{complaint.status}</span>
            </div>
            <div>
              <span className="text-slate-500">Resolution Deadline:</span>{' '}
              <span className={`font-semibold ${isOverdue ? 'text-red-700' : 'text-slate-800'}`}>
                {complaint.due_at ? new Date(complaint.due_at).toLocaleDateString() : 'Open Timeline'}
              </span>
            </div>
            {complaint.resolved_at && (
              <div className="text-emerald-700 font-semibold">
                Resolved on: {new Date(complaint.resolved_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {/* Full Allegation Description */}
        <div className="p-6 border-t border-slate-200">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
            Grievance Particulars & Allegation Description
          </h4>
          <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded border border-slate-200 whitespace-pre-wrap font-sans">
            {complaint.description}
          </div>
        </div>
      </div>

      {/* Tabs: Investigation Notes | Assignment History | Audit Trail */}
      <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 flex items-center space-x-6 text-xs font-bold uppercase tracking-wide">
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'notes'
                ? 'border-[#0b3b60] text-[#0b3b60]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Investigation Notes ({updates.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('assignments')}
            className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'assignments'
                ? 'border-[#0b3b60] text-[#0b3b60]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Assignment History ({assignments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`py-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'audit'
                ? 'border-[#0b3b60] text-[#0b3b60]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Audit Trail ({auditLogs.length})</span>
          </button>
        </div>

        <div className="p-6">
          {/* TAB 1: Investigation Notes */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Record Official Investigation Note / Finding
                </label>
                <textarea
                  rows={3}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Record verification findings, show-cause notices issued, hearings scheduled, or settlement proofs..."
                  className="w-full text-xs border border-slate-300 rounded p-3 bg-white text-slate-900 focus:ring-2 focus:ring-[#0b3b60]"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingNote || !newNote.trim()}
                    className="px-4 py-2 bg-[#0b3b60] hover:bg-[#072a45] text-white text-xs font-semibold rounded flex items-center space-x-1.5 disabled:opacity-40 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingNote ? 'Saving...' : 'Commit Note to Dossier'}</span>
                  </button>
                </div>
              </form>

              {/* Notes Feed */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Chronological Case Notes
                </h4>
                {updates.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No investigation notes entered yet.</p>
                ) : (
                  <div className="space-y-3">
                    {updates.map((note) => (
                      <div key={note.id} className="p-3.5 rounded bg-slate-50 border border-slate-200 text-xs">
                        <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1.5">
                          <span className="font-semibold text-[#0b3b60] flex items-center space-x-1">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{note.author?.full_name || 'Desk Officer'}</span>
                            {note.author?.designation && (
                              <span className="text-slate-400 font-normal">({note.author.designation})</span>
                            )}
                          </span>
                          <span>{new Date(note.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                          {note.update_text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Assignment History */}
          {activeTab === 'assignments' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold text-[11px] uppercase border-b border-slate-200">
                    <th className="py-2.5 px-3">Assigned Bureau</th>
                    <th className="py-2.5 px-3">Assigned Officer</th>
                    <th className="py-2.5 px-3">Assigned By</th>
                    <th className="py-2.5 px-3">Assigned At</th>
                    <th className="py-2.5 px-3">Tenure Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {a.department?.name} ({a.department?.code})
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {a.officer?.full_name || 'Bureau General Desk'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {a.assigner?.full_name || 'System / Auto'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {new Date(a.assigned_at).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        {a.ended_at ? (
                          <span className="text-slate-400 text-[11px]">
                            Ended: {new Date(a.ended_at).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            CURRENT ACTIVE
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: Immutable Audit Trail */}
          {activeTab === 'audit' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-sans font-semibold text-[11px] uppercase border-b border-slate-200">
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Actor / Officer</th>
                    <th className="py-2.5 px-3">Metadata Details</th>
                    <th className="py-2.5 px-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-[#0b3b60]">
                        {log.action_type}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-800">
                        {log.actor?.full_name || 'System Trigger'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-sm truncate">
                        {JSON.stringify(log.details)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
