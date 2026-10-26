import React, { useState, useEffect } from 'react';
import { getInstitutions, type Institution } from '../services/supabase/institutions';
import {
  registerPublicUser,
  loginPublicUser,
  isEmailRegistered,
  type PublicUserSession,
} from '../services/publicAuthService';
import {
  UserPlus,
  LogIn,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Briefcase,
  User,
  Shield,
  Lock,
  Phone,
  Hash,
  Mail,
  Building2,
  KeyRound,
} from 'lucide-react';

interface RegistrationAndLoginProps {
  onAuthenticated: (session: PublicUserSession) => void;
  onGoToOfficerLogin: () => void;
  onGoToExternalPortals?: () => void;
  initialTab?: 'register' | 'login';
}

export const RegistrationAndLogin: React.FC<RegistrationAndLoginProps> = ({
  onAuthenticated,
  onGoToOfficerLogin,
  onGoToExternalPortals,
  initialTab = 'register',
}) => {
  const [activeTab, setActiveTab] = useState<'register' | 'login'>(initialTab);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [, setIsLoadingInstitutions] = useState(true);

  // Registration Form State
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRollNumber, setRegRollNumber] = useState('');
  const [regMobileNumber, setRegMobileNumber] = useState('');
  const [regUserType, setRegUserType] = useState<'Student' | 'Faculty' | 'Citizen'>('Student');
  const [regInstitutionId, setRegInstitutionId] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regDeclaration, setRegDeclaration] = useState(false);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const instList = await getInstitutions();
        setInstitutions(instList);
      } catch (err) {
        console.error('Failed to load institutions:', err);
      } finally {
        setIsLoadingInstitutions(false);
      }
    }
    loadData();
  }, []);

  // Handle New User Registration Submit
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Mandatory Validations
    if (!regFullName.trim()) {
      setErrorMessage('Full Legal Name is compulsory.');
      return;
    }

    if (!regEmail.trim() || !regEmail.includes('@') || !regEmail.includes('.')) {
      setErrorMessage('Please enter a valid, active email address.');
      return;
    }

    // Roll Number is compulsory (Requirement 5)
    if (!regRollNumber.trim()) {
      setErrorMessage('Roll Number / Enrollment ID is a compulsory field.');
      return;
    }

    // Mobile Number is compulsory (Requirement 5)
    const cleanMobile = regMobileNumber.trim().replace(/\D/g, '');
    if (!cleanMobile || cleanMobile.length < 10) {
      setErrorMessage('A valid 10-digit Mobile Number is compulsory.');
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Password and Confirm Password do not match.');
      return;
    }

    if (!regDeclaration) {
      setErrorMessage('Please confirm the declaration that details provided are true and accurate.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedInst = institutions.find((i) => i.id === regInstitutionId);
      const newUser = registerPublicUser({
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        rollNumber: regRollNumber.trim(),
        mobileNumber: regMobileNumber.trim(),
        userType: regUserType,
        institutionId: regInstitutionId || undefined,
        institutionName: selectedInst?.institution_name || 'Technical Institution',
        password: regPassword,
      });

      setSuccessMessage(
        `Registration successful! Permanent Email ID bound: "${newUser.email}". Logging you in...`
      );

      // Auto redirect after short delay
      setTimeout(() => {
        onAuthenticated({
          id: newUser.id,
          fullName: newUser.fullName,
          email: newUser.email,
          rollNumber: newUser.rollNumber,
          mobileNumber: newUser.mobileNumber,
          userType: newUser.userType,
          institutionId: newUser.institutionId,
          institutionName: newUser.institutionName,
          loginAt: new Date().toISOString(),
        });
      }, 1000);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setErrorMessage(error?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Registered User Login Submit
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = loginEmail.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    // If an official enters an AICTE email here, offer direct route
    if (cleanEmail.endsWith('@aicte.gov.in') || cleanEmail.includes('.gov.in')) {
      setErrorMessage(
        'Notice: This login is strictly for Students, Faculty, and Public Grievants. For Administrators, Regulation Bureau, or PGRC Officers, please use the AICTE Officer Login portal.'
      );
      return;
    }

    // Requirement 3: Email-based authentication for public users only.
    // The email ID used during registration must be the only email accepted for subsequent logins.
    if (!isEmailRegistered(cleanEmail)) {
      setErrorMessage(
        `Access Denied: The email "${cleanEmail}" is not registered. In accordance with AICTE policy, public users must complete registration first. Please click "New User Registration" above.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const session = loginPublicUser(cleanEmail, loginPassword);
      setSuccessMessage(`Welcome back, ${session.fullName}! Opening Public Grievance Desk...`);
      setTimeout(() => {
        onAuthenticated(session);
      }, 600);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setErrorMessage(error?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Demo Pre-fill for Testing Registered Login
  const handleDemoLoginFill = (email: string) => {
    setLoginEmail(email);
    setLoginPassword('Password@123');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans">
      {/* Top Government Tricolor Stripe */}
      <div className="gov-tricolor-stripe w-full"></div>

      {/* Official Government Header Banner */}
      <header className="bg-[#0b3b60] text-white border-b-4 border-[#e67e22] shadow-sm py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3.5 text-center sm:text-left">
            <img
              src="/aicte-emblem.png"
              alt="AICTE Official Emblem"
              className="w-12 h-12 object-contain drop-shadow-md shrink-0 mx-auto sm:mx-0"
            />
            <div>
              <div className="text-[11px] sm:text-xs tracking-wider uppercase text-amber-200 font-medium">
                अखिल भारतीय तकनीकी शिक्षा परिषद | All India Council for Technical Education
              </div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight">
                Public Grievance Redressal &amp; Institution Monitoring Portal
              </h1>
              <div className="text-[11px] text-slate-300">
                Ministry of Education, Government of India • SIH Problem Statement ID: 26264
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {onGoToExternalPortals && (
              <button
                type="button"
                onClick={onGoToExternalPortals}
                className="text-xs bg-[#e26a00] hover:bg-[#c2410c] text-white font-bold px-3 py-1.5 rounded shadow-xs transition flex items-center space-x-1.5"
                title="Lodge complaints on simulated CPGRAMS & CSS Portals"
              >
                <span>🇮🇳 CPGRAMS &amp; CSS Simulator</span>
              </button>
            )}

            <button
              type="button"
              onClick={onGoToOfficerLogin}
              className="text-xs bg-white/10 hover:bg-white/20 text-white font-semibold px-3 py-1.5 rounded border border-white/20 transition flex items-center space-x-1.5 shrink-0"
            >
              <Shield className="w-3.5 h-3.5 text-amber-300" />
              <span>Officer Portal &rarr;</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl w-full mx-auto px-4 py-8 flex-1">
        {/* External Portals Simulator Teaser */}
        {onGoToExternalPortals && (
          <div className="mb-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-300 rounded p-3 text-xs text-orange-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center space-x-2">
              <span className="text-base">🏛️</span>
              <span>
                <strong>Official External Portals:</strong> Test real-time intake from <strong>CPGRAMS (GoI)</strong> and <strong>AICTE CSS</strong> to see how complaints trigger instant overlap alerts on the AICTE Dashboard.
              </span>
            </div>
            <button
              type="button"
              onClick={onGoToExternalPortals}
              className="px-3 py-1 bg-[#e26a00] hover:bg-[#c2410c] text-white font-bold rounded text-xs shrink-0 transition"
            >
              Launch CPGRAMS / CSS Simulator &rarr;
            </button>
          </div>
        )}

        {/* Portal Information Card */}
        <div className="bg-white border border-slate-200 rounded-t shadow-sm p-4 sm:p-5 border-b-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-[#0b3b60] uppercase tracking-wide">
              <Building2 className="w-4 h-4 text-[#e67e22]" />
              <span>AICTE Citizen &amp; Student Redressal Desk</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">
              Public User Registration &amp; Authentication Gateway
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Register your permanent student or citizen profile, or sign in to lodge and track institutional grievances.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded px-3 py-1.5 text-xs text-[#0b3b60]">
            <Lock className="w-3.5 h-3.5 text-[#0b3b60] shrink-0" />
            <span>DPDP &amp; AICTE Charter Compliant</span>
          </div>
        </div>

        {/* 2 Main Options / Tabs Navigation */}
        <div className="bg-slate-50 border-x border-slate-200 flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-3.5 px-4 text-xs font-bold flex items-center justify-center space-x-2 transition border-b-2 ${
              activeTab === 'register'
                ? 'border-[#0b3b60] text-[#0b3b60] bg-white shadow-sm'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <UserPlus className="w-4 h-4 text-[#e67e22]" />
            <span>Option 1: New User Registration</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-3.5 px-4 text-xs font-bold flex items-center justify-center space-x-2 transition border-b-2 ${
              activeTab === 'login'
                ? 'border-[#0b3b60] text-[#0b3b60] bg-white shadow-sm'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LogIn className="w-4 h-4 text-[#0b3b60]" />
            <span>Option 2: Already Registered? Proceed to Login</span>
          </button>
        </div>

        {/* Feedback Banners */}
        {errorMessage && (
          <div className="bg-red-50 border-x border-slate-200 border-b border-red-200 p-4 text-xs text-red-800 flex items-start space-x-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">Authentication Notice: </span>
              {errorMessage}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-50 border-x border-slate-200 border-b border-emerald-200 p-4 text-xs text-emerald-800 flex items-start space-x-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed font-semibold">{successMessage}</div>
          </div>
        )}

        {/* TAB 1: NEW USER REGISTRATION */}
        {activeTab === 'register' && (
          <form
            onSubmit={handleRegisterSubmit}
            className="bg-white border-x border-b border-slate-200 rounded-b shadow-sm p-6 space-y-6"
          >
            {/* Step 1: Complainant Category */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
                1. Select Complainant Category <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setRegUserType('Student')}
                  className={`p-3.5 border rounded-md text-left transition flex items-center space-x-3 ${
                    regUserType === 'Student'
                      ? 'border-[#0b3b60] bg-blue-50/70 ring-1 ring-[#0b3b60]'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div
                    className={`p-2 rounded-full ${
                      regUserType === 'Student'
                        ? 'bg-[#0b3b60] text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Student</div>
                    <div className="text-[10px] text-slate-500">Diploma / UG / PG student</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRegUserType('Faculty')}
                  className={`p-3.5 border rounded-md text-left transition flex items-center space-x-3 ${
                    regUserType === 'Faculty'
                      ? 'border-[#0b3b60] bg-blue-50/70 ring-1 ring-[#0b3b60]'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div
                    className={`p-2 rounded-full ${
                      regUserType === 'Faculty'
                        ? 'bg-[#0b3b60] text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Faculty / Staff</div>
                    <div className="text-[10px] text-slate-500">Teaching or administrative staff</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRegUserType('Citizen')}
                  className={`p-3.5 border rounded-md text-left transition flex items-center space-x-3 ${
                    regUserType === 'Citizen'
                      ? 'border-[#0b3b60] bg-blue-50/70 ring-1 ring-[#0b3b60]'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div
                    className={`p-2 rounded-full ${
                      regUserType === 'Citizen'
                        ? 'bg-[#0b3b60] text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Parent / Citizen</div>
                    <div className="text-[10px] text-slate-500">Concerned stakeholder</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Step 2: Affiliated Technical Institution */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1">
                2. Select Affiliated AICTE Institution (Optional)
              </label>
              <select
                value={regInstitutionId}
                onChange={(e) => {
                  setRegInstitutionId(e.target.value);
                }}
                className="w-full text-xs border border-slate-300 rounded px-3 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60] cursor-pointer"
              >
                <option value="">-- Choose Affiliated Technical Institution (Optional for Citizens) --</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.institution_name} [{inst.aicte_permanent_id || 'ID Pending'}] — {inst.state}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 3: Identity & Contact Details with Compulsory Fields */}
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                3. Identity &amp; Contact Credentials (Compulsory Verification)
              </label>

              {/* Full Name & Compulsory Roll Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Legal Name <span className="text-red-600 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    required
                    className="w-full text-xs border border-slate-300 rounded px-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                  />
                </div>

                {/* Requirement 5: Roll Number is compulsory */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>
                      {regUserType === 'Student'
                        ? 'Enrollment / Student Roll Number'
                        : regUserType === 'Faculty'
                        ? 'Employee / Faculty ID Number'
                        : 'Voter ID / Citizen Identifier'}
                      <span className="text-red-600 font-bold ml-1">* Compulsory</span>
                    </span>
                  </label>
                  <div className="relative">
                    <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={regRollNumber}
                      onChange={(e) => setRegRollNumber(e.target.value)}
                      placeholder={
                        regUserType === 'Student'
                          ? 'e.g. 2023-CS-042 (Compulsory)'
                          : 'e.g. EMP-9821 / ID-1042'
                      }
                      required
                      className="w-full text-xs border border-slate-300 rounded pl-9 pr-3 py-2 bg-white text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Compulsory: Roll/ID Number is required to prevent fraudulent grievance filings.
                  </span>
                </div>
              </div>

              {/* Compulsory Mobile Number & Compulsory Permanent Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Requirement 5: Mobile Number is compulsory */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>
                      Mobile Number (10 Digits)<span className="text-red-600 font-bold ml-1">* Compulsory</span>
                    </span>
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      value={regMobileNumber}
                      onChange={(e) => setRegMobileNumber(e.target.value)}
                      placeholder="+91 98765 43210 (Compulsory)"
                      required
                      className="w-full text-xs border border-slate-300 rounded pl-9 pr-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Compulsory: Used for SMS inquiry notices and two-factor verification.
                  </span>
                </div>

                {/* Email Address with Permanent Notice Warning in Red Box (Requirement 4) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>
                      Email Address <span className="text-red-600 font-bold">* Compulsory</span>
                    </span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. rahul.sharma@domain.edu.in"
                      required
                      className="w-full text-xs border border-slate-300 rounded pl-9 pr-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                    />
                  </div>

                  {/* Requirement 4: Warning in a red box below the email entry field */}
                  <div className="mt-2.5 p-3 bg-red-50 border-2 border-red-500 rounded-md text-red-900 shadow-sm flex items-start space-x-2.5">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-0.5">
                      <div className="font-bold text-red-800 uppercase tracking-wide text-[11px] flex items-center space-x-1">
                        <span>Important Notice: Permanent Registered Email</span>
                      </div>
                      <p className="text-red-700 leading-relaxed text-[11px]">
                        <strong>The registered email ID cannot be changed later.</strong> All subsequent logins, grievance filings, and official AICTE inquiry updates will be strictly bound to this email ID. Please ensure this address is correct.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Create Portal Password <span className="text-red-600 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      className="w-full text-xs border border-slate-300 rounded pl-9 pr-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Portal Password <span className="text-red-600 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      required
                      className="w-full text-xs border border-slate-300 rounded pl-9 pr-3 py-2 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Declaration Checkbox */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded text-xs flex items-start space-x-2.5">
              <input
                type="checkbox"
                id="declaration"
                checked={regDeclaration}
                onChange={(e) => setRegDeclaration(e.target.checked)}
                className="mt-0.5 rounded text-[#0b3b60] focus:ring-[#0b3b60]"
                required
              />
              <label htmlFor="declaration" className="text-slate-700 leading-relaxed text-[11px]">
                I solemnly affirm that the personal credentials, roll number, mobile number, and email ID supplied are genuine. I understand that false statements or spam grievances are punishable under statutory AICTE and IT Act regulations.
              </label>
            </div>

            {/* Submit & Navigation */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="text-xs text-[#0b3b60] hover:underline font-semibold flex items-center space-x-1"
              >
                <span>Already registered? Switch to Login &rarr;</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#0b3b60] hover:bg-[#072a45] text-white text-xs font-bold rounded shadow-sm flex items-center justify-center space-x-2 transition"
              >
                <UserPlus className="w-4 h-4 text-[#e67e22]" />
                <span>{isSubmitting ? 'Registering User...' : 'Complete Registration & Proceed'}</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: ALREADY REGISTERED USER LOGIN */}
        {activeTab === 'login' && (
          <form
            onSubmit={handleLoginSubmit}
            className="bg-white border-x border-b border-slate-200 rounded-b shadow-sm p-6 space-y-6"
          >
            <div className="bg-blue-50/70 border border-blue-200 rounded p-4 text-xs text-[#0b3b60] flex items-start space-x-3">
              <Lock className="w-5 h-5 text-[#0b3b60] shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold">Email-Based Verified Login: </span>
                In accordance with AICTE Redressal Security Norms, only email addresses that were verified during prior registration will be accepted for public login.
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="e.g. aarav.sharma@coep.ac.in"
                    required
                    className="w-full text-xs border border-slate-300 rounded pl-9 pr-3 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Must match the exact permanent email ID registered on this portal.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Portal Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full text-xs border border-slate-300 rounded pl-9 pr-3 py-2.5 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0b3b60]"
                  />
                </div>
              </div>
            </div>

            {/* Login Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className="text-xs text-[#0b3b60] hover:underline font-semibold flex items-center space-x-1"
              >
                <span>Don't have an account yet? Register Here &rarr;</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#0b3b60] hover:bg-[#072a45] text-white text-xs font-bold rounded shadow-sm flex items-center justify-center space-x-2 transition"
              >
                <LogIn className="w-4 h-4 text-[#e67e22]" />
                <span>{isSubmitting ? 'Authenticating...' : 'Sign In & Open Grievance Desk'}</span>
              </button>
            </div>

            {/* Quick Demo Pre-fills for Testing Registered Logins */}
            <div className="pt-4 border-t border-slate-200">
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Quick Test (Pre-Registered Users):</span>
                <span className="text-[10px] text-slate-400 font-normal">Click to auto-fill registered credentials</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoLoginFill('aarav.sharma@coep.ac.in')}
                  className="px-3 py-1.5 border border-slate-200 hover:border-[#0b3b60] hover:bg-blue-50 rounded text-xs text-slate-700 flex items-center space-x-1.5 transition"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-[#0b3b60]" />
                  <span>Student: Aarav Sharma (COEP Pune - Registered)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoLoginFill('m.sundaram@coep.ac.in')}
                  className="px-3 py-1.5 border border-slate-200 hover:border-[#0b3b60] hover:bg-blue-50 rounded text-xs text-slate-700 flex items-center space-x-1.5 transition"
                >
                  <Briefcase className="w-3.5 h-3.5 text-[#0b3b60]" />
                  <span>Faculty: Dr. M. Sundaram (COEP Pune - Registered)</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </main>

      {/* Official Government Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-4 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-center sm:text-left space-y-2 sm:space-y-0">
          <div>
            AICTE Cross-Bureau Complaint Coordination Platform • SIH Problem Statement ID: 26264
          </div>
          <div className="text-slate-500">
            Regulation Bureau (RB) • Public Grievance Redressal Cell (PGRC) • Approval Bureau
          </div>
        </div>
      </footer>
    </div>
  );
};
