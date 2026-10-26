import { supabase, isSupabaseConfigured } from './client';
import { DEFAULT_DEPARTMENTS } from './departments';
import { DEFAULT_INSTITUTIONS } from './institutions';
import type {
  ComplaintPriority,
  ComplaintStatus,
  ComplaintWithRelations,
  ComplaintUpdateWithAuthor,
  AssignmentWithRelations,
  AuditLogWithActor,
  Database
} from '../../types/database.types';

export type NewComplaintInput = {
  institution_id: string;
  title: string;
  description: string;
  category: string;
  priority: ComplaintPriority;
  assigned_department_id: string;
  assigned_officer_id?: string | null;
  due_at?: string | null;
  received_at?: string;
  created_by?: string | null;
  complainant_name?: string | null;
  complainant_email?: string | null;
  complainant_phone?: string | null;
  complainant_type?: string | null;
  student_roll_no?: string | null;
};

export interface ComplaintFilterOptions {
  search?: string;
  departmentId?: string;
  status?: ComplaintStatus | 'ALL';
  priority?: ComplaintPriority | 'ALL';
  sortBy?: 'recent' | 'due_date' | 'priority';
  page?: number;
  pageSize?: number;
}

export type ExternalComplaintSource = 'CPGRAMS' | 'CSS' | 'PGRC_DIRECT';

export interface ExternalStreamItem {
  id: string;
  source: ExternalComplaintSource;
  externalReferenceId: string;
  internalComplaintNumber: string;
  institutionName: string;
  category: string;
  submittedAt: string;
  assignedCell: string;
  status: string;
}

const STORAGE_LOCAL_COMPLAINTS_KEY = 'aicte_local_complaints';
const STORAGE_EXTERNAL_STREAM_KEY = 'aicte_external_complaints_stream';

export const DEFAULT_SEED_COMPLAINTS: ComplaintWithRelations[] = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    complaint_number: 'AICTE-2026-01001',
    institution_id: 'a0000000-0000-0000-0000-000000000001',
    title: 'Excess capitation fee collection under institutional quota',
    description: 'Parent complaints regarding arbitrary capitation fee demand of INR 3,50,000 in cash prior to granting admission confirmation in B.Tech Computer Science, violating AICTE Approval Process Handbook Clause 13.2.',
    category: 'Fee Cap Violation',
    priority: 'Urgent',
    status: 'In Progress',
    assigned_department_id: 'd0000000-0000-0000-0000-000000000001',
    assigned_officer_id: 'b0000000-0000-0000-0000-000000000002',
    received_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    due_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    resolved_at: null,
    created_by: 'b0000000-0000-0000-0000-000000000001',
    complainant_name: 'Shri Rajesh Gupta',
    complainant_email: 'rajesh.gupta@example.in',
    complainant_phone: '+91 98110 44556',
    complainant_type: 'Parent',
    student_roll_no: '2026-ENG-089',
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    institution: DEFAULT_INSTITUTIONS[0],
    department: DEFAULT_DEPARTMENTS[0],
    assigned_officer: {
      id: 'b0000000-0000-0000-0000-000000000002',
      full_name: 'Smt. Sunita Verma',
      department_id: 'd0000000-0000-0000-0000-000000000001',
      role: 'Bureau Officer',
      designation: 'Director (Regulation)',
      contact_number: '+91 11 2958 1012',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    creator: {
      id: 'b0000000-0000-0000-0000-000000000001',
      full_name: 'Dr. R. K. Sharma',
      department_id: 'd0000000-0000-0000-0000-000000000001',
      role: 'Administrator',
      designation: 'Chief Vigilance Officer',
      contact_number: '+91 11 2958 1000',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    complaint_number: 'AICTE-2026-01002',
    institution_id: 'a0000000-0000-0000-0000-000000000002',
    title: 'Withholding of original degree certificates on course withdrawal',
    description: 'Grievance filed by final semester MBA students. The college administration has retained 10th, 12th, and undergraduate mark sheets, refusing return despite full payment of prescribed fee schedule.',
    category: 'Non-Refund of Security Deposit',
    priority: 'High',
    status: 'Under Review',
    assigned_department_id: 'd0000000-0000-0000-0000-000000000002',
    assigned_officer_id: 'b0000000-0000-0000-0000-000000000003',
    received_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    due_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    resolved_at: null,
    created_by: 'b0000000-0000-0000-0000-000000000003',
    complainant_name: 'Aarav Sharma',
    complainant_email: 'aarav.sharma@coep.ac.in',
    complainant_phone: '+91 98230 11223',
    complainant_type: 'Student',
    student_roll_no: '2023-BTECH-CS-042',
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    institution: DEFAULT_INSTITUTIONS[1],
    department: DEFAULT_DEPARTMENTS[1],
    assigned_officer: {
      id: 'b0000000-0000-0000-0000-000000000003',
      full_name: 'Shri Arvind Nair',
      department_id: 'd0000000-0000-0000-0000-000000000002',
      role: 'Bureau Officer',
      designation: 'Nodal Officer (PGRC)',
      contact_number: '+91 11 2958 1024',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    creator: {
      id: 'b0000000-0000-0000-0000-000000000003',
      full_name: 'Shri Arvind Nair',
      department_id: 'd0000000-0000-0000-0000-000000000002',
      role: 'Bureau Officer',
      designation: 'Nodal Officer (PGRC)',
      contact_number: '+91 11 2958 1024',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    complaint_number: 'AICTE-2026-01003',
    institution_id: 'a0000000-0000-0000-0000-000000000003',
    title: 'Operation of unapproved Post Graduate Diploma in AI & Robotics',
    description: 'Institute is advertising and enrolling students in 2-year PGDM without seeking mandatory Extension of Approval (EoA) from AICTE for the academic year 2026-27.',
    category: 'Unauthorized Course Operation',
    priority: 'High',
    status: 'Received',
    assigned_department_id: 'd0000000-0000-0000-0000-000000000001',
    assigned_officer_id: 'b0000000-0000-0000-0000-000000000002',
    received_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    due_at: new Date(Date.now() + 12 * 86400000).toISOString(),
    resolved_at: null,
    created_by: 'b0000000-0000-0000-0000-000000000001',
    complainant_name: 'Priya Iyer',
    complainant_email: 'priya.iyer@vtu.ac.in',
    complainant_phone: '+91 98450 77889',
    complainant_type: 'Student',
    student_roll_no: '1VT21CS089',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    institution: DEFAULT_INSTITUTIONS[2],
    department: DEFAULT_DEPARTMENTS[0],
  },
  {
    id: 'c0000000-0000-0000-0000-000000000004',
    complaint_number: 'AICTE-2026-01004',
    institution_id: 'a0000000-0000-0000-0000-000000000004',
    title: 'Non-disbursement of faculty remuneration for 4 consecutive months',
    description: 'Faculty collective grievance concerning pending salaries from May to August 2026. College management had withheld bank transfer proofs requested during previous review committee.',
    category: 'Faculty Deficiency & Non-Payment of Remuneration',
    priority: 'Normal',
    status: 'Resolved',
    assigned_department_id: 'd0000000-0000-0000-0000-000000000002',
    assigned_officer_id: 'b0000000-0000-0000-0000-000000000003',
    received_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    due_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    resolved_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    created_by: 'b0000000-0000-0000-0000-000000000003',
    complainant_name: 'Dr. Vivek Sharma',
    complainant_email: 'v.sharma@apex.ac.in',
    complainant_phone: '+91 98101 22334',
    complainant_type: 'Faculty',
    student_roll_no: 'FAC-APX-101',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    institution: DEFAULT_INSTITUTIONS[3],
    department: DEFAULT_DEPARTMENTS[1],
  },
  {
    id: 'c0000000-0000-0000-0000-000000000005',
    complaint_number: 'AICTE-2026-01005',
    institution_id: 'a0000000-0000-0000-0000-000000000005',
    title: 'Severe faculty cadre ratio deficit and unaccredited computer labs',
    description: 'Standing Complaint Scrutiny Committee (SCSC) notice following whistleblower inspection. Ratio of Professor to Assistant Professor is 1:24 against AICTE mandated 1:12 norm.',
    category: 'Faculty Deficiency & Non-Payment of Remuneration',
    priority: 'High',
    status: 'In Progress',
    assigned_department_id: 'd0000000-0000-0000-0000-000000000001',
    assigned_officer_id: 'b0000000-0000-0000-0000-000000000002',
    received_at: new Date(Date.now() - 19 * 86400000).toISOString(),
    due_at: new Date(Date.now() + 5 * 86400000).toISOString(),
    resolved_at: null,
    created_by: 'b0000000-0000-0000-0000-000000000001',
    complainant_name: 'AICTE Scrutiny Cell (Suo Motu)',
    complainant_email: 'scrutiny.cell@aicte.gov.in',
    complainant_phone: '+91 11 2958 1000',
    complainant_type: 'Faculty',
    student_roll_no: 'AUDIT-REF-2026',
    created_at: new Date(Date.now() - 19 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 19 * 86400000).toISOString(),
    institution: DEFAULT_INSTITUTIONS[4],
    department: DEFAULT_DEPARTMENTS[0],
  },
];

// Helper to get local stored complaints
export function getLocalStoredComplaints(): ComplaintWithRelations[] {
  try {
    const raw = localStorage.getItem(STORAGE_LOCAL_COMPLAINTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Error reading local complaints:', err);
    return [];
  }
}

// Helper to store local complaint
export function saveLocalStoredComplaint(complaint: ComplaintWithRelations): void {
  try {
    const current = getLocalStoredComplaints();
    const existingIndex = current.findIndex(c => c.id === complaint.id || c.complaint_number === complaint.complaint_number);
    if (existingIndex >= 0) {
      current[existingIndex] = complaint;
    } else {
      current.unshift(complaint);
    }
    localStorage.setItem(STORAGE_LOCAL_COMPLAINTS_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn('Error saving local complaint:', err);
  }
}

export async function getComplaints(options: ComplaintFilterOptions = {}): Promise<{
  data: ComplaintWithRelations[];
  count: number;
}> {
  const {
    search,
    departmentId,
    status,
    priority,
    sortBy = 'recent',
    page = 1,
    pageSize = 20,
  } = options;

  let remoteComplaints: ComplaintWithRelations[] = [];
  let isRemoteSuccess = false;

  if (isSupabaseConfigured()) {
    try {
      let query = supabase
        .from('complaints')
        .select(`
          *,
          institution:institutions(*),
          department:departments(*),
          assigned_officer:profiles!complaints_assigned_officer_id_fkey(*),
          creator:profiles!complaints_created_by_fkey(*)
        `);

      const { data, error } = await query;
      if (!error && data) {
        remoteComplaints = data as unknown as ComplaintWithRelations[];
        isRemoteSuccess = true;
      }
    } catch (err) {
      console.warn('Supabase query failed, falling back to local dataset:', err);
    }
  }

  // Base list is remote complaints if available, or default seed
  const baseList: ComplaintWithRelations[] = isRemoteSuccess && remoteComplaints.length > 0
    ? remoteComplaints
    : [...DEFAULT_SEED_COMPLAINTS];

  // Merge any complaints stored locally (e.g. from CPGRAMS or CSS intake)
  const localList = getLocalStoredComplaints();
  const mergedMap = new Map<string, ComplaintWithRelations>();

  // Add base list first
  for (const c of baseList) {
    mergedMap.set(c.id, c);
  }

  // Overlay / prepend local complaints
  for (const c of localList) {
    mergedMap.set(c.id, c);
  }

  let allComplaints = Array.from(mergedMap.values());

  // Enrich with institution & department if missing
  allComplaints = allComplaints.map(c => {
    if (!c.institution) {
      c.institution = DEFAULT_INSTITUTIONS.find(i => i.id === c.institution_id);
    }
    if (!c.department) {
      c.department = DEFAULT_DEPARTMENTS.find(d => d.id === c.assigned_department_id);
    }
    return c;
  });

  // Apply filters
  if (departmentId && departmentId !== 'ALL') {
    allComplaints = allComplaints.filter(c => c.assigned_department_id === departmentId);
  }

  if (status && status !== 'ALL') {
    allComplaints = allComplaints.filter(c => c.status === status);
  }

  if (priority && priority !== 'ALL') {
    allComplaints = allComplaints.filter(c => c.priority === priority);
  }

  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    allComplaints = allComplaints.filter(c =>
      c.complaint_number.toLowerCase().includes(term) ||
      c.title.toLowerCase().includes(term) ||
      c.description.toLowerCase().includes(term) ||
      (c.institution?.institution_name || '').toLowerCase().includes(term)
    );
  }

  // Sort
  if (sortBy === 'due_date') {
    allComplaints.sort((a, b) => {
      if (!a.due_at) return 1;
      if (!b.due_at) return -1;
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    });
  } else if (sortBy === 'priority') {
    const pWeight = { Urgent: 3, High: 2, Normal: 1 };
    allComplaints.sort((a, b) => (pWeight[b.priority] || 0) - (pWeight[a.priority] || 0));
  } else {
    allComplaints.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const totalCount = allComplaints.length;
  const from = (page - 1) * pageSize;
  const paginated = allComplaints.slice(from, from + pageSize);

  return {
    data: paginated,
    count: totalCount,
  };
}

export async function getComplaintById(id: string): Promise<ComplaintWithRelations | null> {
  // Check Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          institution:institutions(*),
          department:departments(*),
          assigned_officer:profiles!complaints_assigned_officer_id_fkey(*),
          creator:profiles!complaints_created_by_fkey(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return data as unknown as ComplaintWithRelations;
      }
    } catch (err) {
      console.warn('Supabase getComplaintById error:', err);
    }
  }

  // Check local stored complaints
  const localList = getLocalStoredComplaints();
  const localFound = localList.find(c => c.id === id || c.complaint_number === id);
  if (localFound) return localFound;

  // Check seed complaints
  const seedFound = DEFAULT_SEED_COMPLAINTS.find(c => c.id === id || c.complaint_number === id);
  return seedFound || null;
}

export async function getComplaintByNumberOrId(identifier: string): Promise<ComplaintWithRelations | null> {
  const clean = identifier.trim().replace(/\s*-\s*/g, '-');

  if (isSupabaseConfigured()) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);
      let query = supabase
        .from('complaints')
        .select(`
          *,
          institution:institutions(*),
          department:departments(*),
          assigned_officer:profiles!complaints_assigned_officer_id_fkey(*),
          creator:profiles!complaints_created_by_fkey(*)
        `);

      if (isUuid) {
        query = query.or(`id.eq.${clean},complaint_number.ilike.${clean}`);
      } else {
        query = query.ilike('complaint_number', clean);
      }

      const { data, error } = await query.maybeSingle();
      if (!error && data) {
        return data as unknown as ComplaintWithRelations;
      }
    } catch (err) {
      console.warn('Supabase lookup error:', err);
    }
  }

  // Check local & seed complaints
  const all = [...getLocalStoredComplaints(), ...DEFAULT_SEED_COMPLAINTS];
  const found = all.find(c =>
    c.id.toLowerCase() === clean.toLowerCase() ||
    c.complaint_number.toLowerCase() === clean.toLowerCase()
  );

  return found || null;
}

export async function createComplaint(payload: NewComplaintInput): Promise<Database['public']['Tables']['complaints']['Row']> {
  const insertData: Database['public']['Tables']['complaints']['Insert'] = {
    institution_id: payload.institution_id,
    title: payload.title,
    description: payload.description,
    category: payload.category,
    priority: payload.priority,
    status: 'Received',
    assigned_department_id: payload.assigned_department_id,
    assigned_officer_id: payload.assigned_officer_id || null,
    due_at: payload.due_at || null,
    received_at: payload.received_at || new Date().toISOString(),
    created_by: payload.created_by || null,
    complainant_name: payload.complainant_name || null,
    complainant_email: payload.complainant_email || null,
    complainant_phone: payload.complainant_phone || null,
    complainant_type: payload.complainant_type || null,
    student_roll_no: payload.student_roll_no || null,
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .insert(insertData)
        .select()
        .single();

      if (!error && data) {
        // Also save to local storage for instant multi-tab sync
        const fullObj: ComplaintWithRelations = {
          ...(data as Database['public']['Tables']['complaints']['Row']),
          institution: DEFAULT_INSTITUTIONS.find(i => i.id === payload.institution_id),
          department: DEFAULT_DEPARTMENTS.find(d => d.id === payload.assigned_department_id),
        };
        saveLocalStoredComplaint(fullObj);
        return data as Database['public']['Tables']['complaints']['Row'];
      }
    } catch (err) {
      console.warn('Supabase createComplaint error, using local fallback:', err);
    }
  }

  // Fallback: Generate sequential mock complaint
  const localList = getLocalStoredComplaints();
  const nextSeq = 1050 + localList.length + 1;
  const mockNumber = `AICTE-2026-0${nextSeq}`;
  const mockId = 'c' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();

  const mockRow: ComplaintWithRelations = {
    id: mockId,
    complaint_number: mockNumber,
    institution_id: payload.institution_id,
    title: payload.title,
    description: payload.description,
    category: payload.category,
    priority: payload.priority,
    status: 'Received',
    assigned_department_id: payload.assigned_department_id,
    assigned_officer_id: payload.assigned_officer_id || null,
    received_at: payload.received_at || new Date().toISOString(),
    due_at: payload.due_at || new Date(Date.now() + 30 * 86400000).toISOString(),
    resolved_at: null,
    created_by: payload.created_by || null,
    complainant_name: payload.complainant_name || null,
    complainant_email: payload.complainant_email || null,
    complainant_phone: payload.complainant_phone || null,
    complainant_type: payload.complainant_type || null,
    student_roll_no: payload.student_roll_no || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    institution: DEFAULT_INSTITUTIONS.find(i => i.id === payload.institution_id),
    department: DEFAULT_DEPARTMENTS.find(d => d.id === payload.assigned_department_id),
  };

  saveLocalStoredComplaint(mockRow);
  return mockRow as unknown as Database['public']['Tables']['complaints']['Row'];
}

/**
 * Ingest complaint from External Portals (CPGRAMS / CSS)
 * This automatically creates the grievance in the central AICTE registry,
 * links the external reference ID, assigns to PGRC, and records it in the live stream.
 */
export async function ingestExternalComplaint(params: {
  source: ExternalComplaintSource;
  externalReferenceId: string;
  institutionId: string;
  title: string;
  description: string;
  category: string;
  priority: ComplaintPriority;
  complainantName: string;
  complainantEmail: string;
  complainantPhone: string;
  complainantType: string;
  studentRollNo?: string;
}): Promise<ComplaintWithRelations> {
  // PGRC department ID (CPGRAMS and CSS public grievances route to PGRC by default)
  const pgrcDept = DEFAULT_DEPARTMENTS.find(d => d.code === 'PGRC');
  const targetDeptId = pgrcDept?.id || 'd0000000-0000-0000-0000-000000000002';

  // Format title with clear external portal tag
  const formattedTitle = `[${params.source}: ${params.externalReferenceId}] ${params.title}`;

  // Prepend external metadata to description for officer review
  const fullDescription = `[SOURCE: ${params.source} PORTAL | REF: ${params.externalReferenceId}]\n` +
    `Ingested via automated CPGRAMS/CSS data connector on ${new Date().toLocaleString('en-IN')}.\n\n` +
    params.description;

  const createdRow = await createComplaint({
    institution_id: params.institutionId,
    title: formattedTitle,
    description: fullDescription,
    category: params.category,
    priority: params.priority,
    assigned_department_id: targetDeptId,
    complainant_name: params.complainantName,
    complainant_email: params.complainantEmail,
    complainant_phone: params.complainantPhone,
    complainant_type: params.complainantType,
    student_roll_no: params.studentRollNo || null,
  });

  const fullComplaint: ComplaintWithRelations = {
    ...createdRow,
    institution: DEFAULT_INSTITUTIONS.find(i => i.id === params.institutionId),
    department: pgrcDept,
  };

  // Add to external stream history
  try {
    const raw = localStorage.getItem(STORAGE_EXTERNAL_STREAM_KEY);
    const stream: ExternalStreamItem[] = raw ? JSON.parse(raw) : [];
    stream.unshift({
      id: fullComplaint.id,
      source: params.source,
      externalReferenceId: params.externalReferenceId,
      internalComplaintNumber: fullComplaint.complaint_number,
      institutionName: fullComplaint.institution?.institution_name || 'Technical Institution',
      category: params.category,
      submittedAt: new Date().toISOString(),
      assignedCell: 'PGRC',
      status: 'Received',
    });
    localStorage.setItem(STORAGE_EXTERNAL_STREAM_KEY, JSON.stringify(stream));
  } catch (err) {
    console.warn('Error saving external stream item:', err);
  }

  return fullComplaint;
}

export function getExternalStreamHistory(): ExternalStreamItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_EXTERNAL_STREAM_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function updateComplaintStatus(
  id: string,
  newStatus: ComplaintStatus
): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('complaints')
        .update({ status: newStatus })
        .eq('id', id);
    } catch (err) {
      console.warn('Supabase updateComplaintStatus error:', err);
    }
  }

  // Update local
  const localList = getLocalStoredComplaints();
  const target = localList.find(c => c.id === id);
  if (target) {
    target.status = newStatus;
    saveLocalStoredComplaint(target);
  }
}

export async function updateComplaintAssignment(
  id: string,
  departmentId: string,
  officerId: string | null
): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('complaints')
        .update({
          assigned_department_id: departmentId,
          assigned_officer_id: officerId,
        })
        .eq('id', id);
    } catch (err) {
      console.warn('Supabase updateComplaintAssignment error:', err);
    }
  }

  // Update local
  const localList = getLocalStoredComplaints();
  const target = localList.find(c => c.id === id);
  if (target) {
    target.assigned_department_id = departmentId;
    target.assigned_officer_id = officerId;
    saveLocalStoredComplaint(target);
  }
}

export async function getComplaintUpdates(complaintId: string): Promise<ComplaintUpdateWithAuthor[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('complaint_updates')
        .select(`
          *,
          author:profiles(*)
        `)
        .eq('complaint_id', complaintId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as unknown as ComplaintUpdateWithAuthor[];
      }
    } catch (err) {
      console.warn('Supabase getComplaintUpdates error:', err);
    }
  }

  return [];
}

export async function addComplaintUpdate(
  complaintId: string,
  authorId: string,
  updateText: string
): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('complaint_updates')
        .insert({
          complaint_id: complaintId,
          author_id: authorId,
          update_text: updateText,
        });
    } catch (err) {
      console.warn('Supabase addComplaintUpdate error:', err);
    }
  }
}

export async function getComplaintAssignments(complaintId: string): Promise<AssignmentWithRelations[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('complaint_assignments')
        .select(`
          *,
          department:departments(*),
          officer:profiles!complaint_assignments_officer_id_fkey(*),
          assigner:profiles!complaint_assignments_assigned_by_fkey(*)
        `)
        .eq('complaint_id', complaintId)
        .order('assigned_at', { ascending: false });

      if (!error && data) {
        return data as unknown as AssignmentWithRelations[];
      }
    } catch (err) {
      console.warn('Supabase getComplaintAssignments error:', err);
    }
  }

  return [];
}

export async function getComplaintAuditHistory(complaintId: string): Promise<AuditLogWithActor[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          actor:profiles(*)
        `)
        .eq('entity_id', complaintId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as unknown as AuditLogWithActor[];
      }
    } catch (err) {
      console.warn('Supabase getComplaintAuditHistory error:', err);
    }
  }

  return [];
}
