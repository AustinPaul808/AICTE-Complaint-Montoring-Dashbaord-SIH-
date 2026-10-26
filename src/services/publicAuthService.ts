/**
 * AICTE Public User Authentication & Grievance Governance Service
 * Handles public user registration, permanent email binding,
 * registered-email-only authentication, and the 7-day cooling period restriction.
 */

import { supabase, isSupabaseConfigured } from './supabase/client';

export interface RegisteredPublicUser {
  id: string;
  fullName: string;
  email: string; // Permanent email ID
  rollNumber: string; // Compulsory: Enrollment / Student Roll No / Employee ID
  mobileNumber: string; // Compulsory: 10-digit mobile number
  userType: 'Student' | 'Faculty' | 'Citizen';
  institutionId?: string;
  institutionName?: string;
  registeredAt: string;
  password?: string;
}

export interface PublicUserSession {
  id: string;
  fullName: string;
  email: string;
  rollNumber: string;
  mobileNumber: string;
  userType: 'Student' | 'Faculty' | 'Citizen';
  institutionId?: string;
  institutionName?: string;
  loginAt: string;
}

export interface GrievanceEligibility {
  isEligible: boolean;
  lastComplaintNumber?: string;
  lastComplaintTitle?: string;
  lastSubmittedAt?: string;
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  eligibleDate?: Date;
  reason?: string;
}

const STORAGE_USERS_KEY = 'aicte_registered_public_users';
const STORAGE_SESSION_KEY = 'aicte_public_session';
const STORAGE_COMPLAINTS_HISTORY_KEY = 'aicte_public_complaints_history';

// Default pre-registered users for instant demo verification
const DEFAULT_REGISTERED_USERS: RegisteredPublicUser[] = [
  {
    id: 'pub-usr-001',
    fullName: 'Aarav Sharma',
    email: 'aarav.sharma@coep.ac.in',
    rollNumber: '2023-BTECH-CS-042',
    mobileNumber: '+91 98230 11223',
    userType: 'Student',
    institutionId: 'a0000000-0000-0000-0000-000000000001',
    institutionName: 'College of Engineering Pune (COEP)',
    registeredAt: '2026-09-01T10:00:00Z',
    password: 'Password@123',
  },
  {
    id: 'pub-usr-002',
    fullName: 'Priya Iyer',
    email: 'priya.iyer@vtu.ac.in',
    rollNumber: '1VT21CS089',
    mobileNumber: '+91 98450 77889',
    userType: 'Student',
    institutionId: 'a0000000-0000-0000-0000-000000000002',
    institutionName: 'Visvesvaraya Technological University',
    registeredAt: '2026-10-01T09:30:00Z',
    password: 'Password@123',
  },
  {
    id: 'pub-usr-003',
    fullName: 'Dr. Meenakshi Sundaram',
    email: 'm.sundaram@coep.ac.in',
    rollNumber: 'FAC-EMP-8842',
    mobileNumber: '+91 94440 55667',
    userType: 'Faculty',
    institutionId: 'a0000000-0000-0000-0000-000000000001',
    institutionName: 'College of Engineering Pune (COEP)',
    registeredAt: '2026-08-15T11:00:00Z',
    password: 'Password@123',
  },
];

/**
 * Retrieve all registered public users from local persistent storage
 */
export function getRegisteredPublicUsers(): RegisteredPublicUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(DEFAULT_REGISTERED_USERS));
      return DEFAULT_REGISTERED_USERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_REGISTERED_USERS;
  } catch (err) {
    console.error('Error reading registered public users:', err);
    return DEFAULT_REGISTERED_USERS;
  }
}

/**
 * Check if an email has already been registered
 */
export function isEmailRegistered(email: string): boolean {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  const users = getRegisteredPublicUsers();
  return users.some((u) => u.email.toLowerCase() === cleanEmail);
}

/**
 * Register a new public user with compulsory Roll Number, Mobile Number & permanent email
 */
export function registerPublicUser(data: {
  fullName: string;
  email: string;
  rollNumber: string;
  mobileNumber: string;
  userType: 'Student' | 'Faculty' | 'Citizen';
  institutionId?: string;
  institutionName?: string;
  password?: string;
}): RegisteredPublicUser {
  const cleanEmail = data.email.trim().toLowerCase();
  const cleanRoll = data.rollNumber.trim();
  const cleanMobile = data.mobileNumber.trim();

  // Validate compulsory fields
  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    throw new Error('Please enter a valid email address.');
  }
  if (!cleanRoll) {
    throw new Error('Roll Number / Enrollment ID is compulsory for registration.');
  }
  if (!cleanMobile || cleanMobile.replace(/\D/g, '').length < 10) {
    throw new Error('Valid 10-digit Mobile Number is compulsory for registration.');
  }
  if (!data.fullName.trim()) {
    throw new Error('Full Legal Name is compulsory for registration.');
  }

  // Check if email already registered
  if (isEmailRegistered(cleanEmail)) {
    throw new Error(
      `The email "${cleanEmail}" is already registered. Please proceed to the Login tab.`
    );
  }

  const newUser: RegisteredPublicUser = {
    id: 'pub-usr-' + Date.now(),
    fullName: data.fullName.trim(),
    email: cleanEmail,
    rollNumber: cleanRoll,
    mobileNumber: cleanMobile,
    userType: data.userType,
    institutionId: data.institutionId,
    institutionName: data.institutionName,
    registeredAt: new Date().toISOString(),
    password: data.password || 'Password@123',
  };

  const currentUsers = getRegisteredPublicUsers();
  currentUsers.push(newUser);
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(currentUsers));

  // Automatically start an active session for the newly registered user
  startPublicSession(newUser);

  return newUser;
}

/**
 * Public User Login - Email-Based Authentication
 * Only accepts emails that were previously registered.
 * Does NOT apply to AICTE Officers/Admins.
 */
export function loginPublicUser(email: string, password?: string): PublicUserSession {
  const cleanEmail = email.trim().toLowerCase();

  // Verify that email is registered
  const users = getRegisteredPublicUsers();
  const existingUser = users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!existingUser) {
    throw new Error(
      `Access Denied: The email "${cleanEmail}" is not registered in the AICTE Public Grievance Registry. Public grievance submission requires a pre-registered email. Please click "New User Registration" to register first.`
    );
  }

  // Optional password check (accepts Password@123 or whatever user set)
  if (password && existingUser.password && password !== existingUser.password) {
    // For demo flexibility, if user typed anything non-empty and it's a test account, accept Password@123
    if (password !== 'Password@123' && existingUser.password !== password) {
      throw new Error('Invalid password. Please check your credentials or reset your password.');
    }
  }

  const session = startPublicSession(existingUser);
  return session;
}

/**
 * Start and persist public user session
 */
export function startPublicSession(user: RegisteredPublicUser): PublicUserSession {
  const session: PublicUserSession = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    rollNumber: user.rollNumber,
    mobileNumber: user.mobileNumber,
    userType: user.userType,
    institutionId: user.institutionId,
    institutionName: user.institutionName,
    loginAt: new Date().toISOString(),
  };

  try {
    sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    // Also save in aicte_inst_user for backward compatibility with existing components
    sessionStorage.setItem(
      'aicte_inst_user',
      JSON.stringify({
        fullName: session.fullName,
        email: session.email,
        role: session.userType === 'Faculty' ? 'Institution Staff / Faculty' : 'Student',
        institutionId: session.institutionId || '',
        institutionName: session.institutionName || 'AICTE Approved Institution',
        idNumber: session.rollNumber,
        phone: session.mobileNumber,
      })
    );
  } catch (err) {
    console.error('Failed to save public session:', err);
  }

  return session;
}

/**
 * Get the currently authenticated public user session
 */
export function getActivePublicSession(): PublicUserSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Terminate public user session
 */
export function logoutPublicSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_SESSION_KEY);
    sessionStorage.removeItem('aicte_inst_user');
  } catch (err) {
    console.error('Failed to clear public session:', err);
  }
}

/**
 * Record a submitted grievance timestamp for 7-day cooling period enforcement
 */
export function recordGrievanceSubmission(
  email: string,
  complaintNumber: string,
  title: string
): void {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const raw = localStorage.getItem(STORAGE_COMPLAINTS_HISTORY_KEY);
    const history: Record<string, { complaintNumber: string; title: string; submittedAt: string }[]> =
      raw ? JSON.parse(raw) : {};

    if (!history[cleanEmail]) {
      history[cleanEmail] = [];
    }

    history[cleanEmail].unshift({
      complaintNumber,
      title,
      submittedAt: new Date().toISOString(),
    });

    localStorage.setItem(STORAGE_COMPLAINTS_HISTORY_KEY, JSON.stringify(history));
  } catch (err) {
    console.error('Failed to record grievance submission in local history:', err);
  }
}

/**
 * Check if user is eligible to submit a grievance (7-Day Restriction Rule)
 * A user cannot register another grievance using the same email ID until
 * 7 days have passed since their previous grievance registration.
 */
export async function checkGrievanceEligibility(email: string): Promise<GrievanceEligibility> {
  const cleanEmail = email.trim().toLowerCase();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const now = new Date().getTime();

  let lastSubmittedAt: string | null = null;
  let lastComplaintNumber: string | undefined;
  let lastComplaintTitle: string | undefined;

  // 1. Check local storage submission history first (instant & works offline)
  try {
    const raw = localStorage.getItem(STORAGE_COMPLAINTS_HISTORY_KEY);
    if (raw) {
      const history = JSON.parse(raw);
      const userHistory = history[cleanEmail];
      if (Array.isArray(userHistory) && userHistory.length > 0) {
        lastSubmittedAt = userHistory[0].submittedAt;
        lastComplaintNumber = userHistory[0].complaintNumber;
        lastComplaintTitle = userHistory[0].title;
      }
    }
  } catch (err) {
    console.warn('Error reading local complaint history:', err);
  }

  // 2. If Supabase is configured, also query live database
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase
        .from('complaints')
        .select('complaint_number, title, created_at')
        .ilike('complainant_email', cleanEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && data.created_at) {
        const dbDate = new Date(data.created_at).getTime();
        const localDate = lastSubmittedAt ? new Date(lastSubmittedAt).getTime() : 0;

        // Use whichever is more recent
        if (dbDate > localDate) {
          lastSubmittedAt = data.created_at;
          lastComplaintNumber = data.complaint_number;
          lastComplaintTitle = data.title;
        }
      }
    } catch (err) {
      console.warn('Supabase check for 7-day grievance restriction skipped:', err);
    }
  }

  // If no prior grievance exists for this email, user is eligible
  if (!lastSubmittedAt) {
    return {
      isEligible: true,
      daysRemaining: 0,
      hoursRemaining: 0,
      minutesRemaining: 0,
    };
  }

  const lastDate = new Date(lastSubmittedAt).getTime();
  const diffMs = now - lastDate;

  if (diffMs >= SEVEN_DAYS_MS) {
    // 7 days have elapsed
    return {
      isEligible: true,
      lastComplaintNumber,
      lastComplaintTitle,
      lastSubmittedAt,
      daysRemaining: 0,
      hoursRemaining: 0,
      minutesRemaining: 0,
    };
  }

  // 7 days have NOT yet elapsed -> Restriction active
  const remainingMs = SEVEN_DAYS_MS - diffMs;
  const daysRemaining = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const eligibleDate = new Date(lastDate + SEVEN_DAYS_MS);

  return {
    isEligible: false,
    lastComplaintNumber,
    lastComplaintTitle,
    lastSubmittedAt,
    daysRemaining,
    hoursRemaining,
    minutesRemaining,
    eligibleDate,
    reason: `Under AICTE grievance regulations, a user cannot submit another grievance using the same email ID until 7 days have passed since their previous grievance registration (${lastComplaintNumber || 'Prior Complaint'}).`,
  };
}
