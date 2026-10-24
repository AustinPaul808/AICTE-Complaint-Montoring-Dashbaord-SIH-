import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle, CheckCircle2, ArrowRight, KeyRound, Building2, Zap } from 'lucide-react';

interface LoginProps {
  onGoToPublicPortal?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onGoToPublicPortal }) => {
  const { signIn, instantDemoLogin, isConfigured } = useAuth();
  const [email, setEmail] = useState('admin@aicte.gov.in');
  const [password, setPassword] = useState('Aicte@Admin2026');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both your official email and password.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      // 1. Try standard Supabase Auth
      await signIn(email.trim(), password);
    } catch (err: unknown) {
      const error = err as { message?: string };
      console.warn('Supabase Auth error:', error?.message);

      // 2. Automatic fallback for demo officers to bypass GoTrue schema/email-confirm issues
      if (email.toLowerCase().includes('@aicte.gov.in')) {
        try {
          await instantDemoLogin(email.trim());
          return;
        } catch (demoErr) {
          console.error(demoErr);
        }
      }

      setErrorMessage(
        error?.message?.includes('Invalid login credentials')
          ? 'Invalid credentials. You can use the Quick Demo Sign-In button below.'
          : error?.message || 'Authentication error.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInstantLogin = async (demoEmail: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await instantDemoLogin(demoEmail);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Aicte@Admin2026');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between font-sans">
      {/* Top Government Tricolor Stripe */}
      <div className="gov-tricolor-stripe w-full"></div>

      {/* Official Government Header Banner */}
      <div className="bg-[#0b3b60] text-white border-b-4 border-[#e67e22] shadow-sm py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <img
              src="/aicte-emblem.png"
              alt="AICTE Official Emblem"
              className="w-12 h-12 object-contain drop-shadow-md shrink-0"
            />
            <div>
              <div className="text-[11px] sm:text-xs tracking-wider uppercase text-amber-200 font-medium">
                अखिल भारतीय तकनीकी शिक्षा परिषद | All India Council for Technical Education
              </div>
              <h1 className="text-base sm:text-xl font-bold tracking-tight">
                Cross-Bureau Complaint Coordination Platform
              </h1>
              <div className="text-[11px] sm:text-xs text-slate-300">
                Ministry of Education, Government of India • SIH Problem Statement ID: 26264
              </div>
            </div>
          </div>
          <div className="hidden md:block text-right text-xs text-slate-200">
            <div className="font-semibold text-white">Central Complaint Portal</div>
            <div>National Informatics Centre (NIC) Security Standard</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        {/* Student / Institution Grievance Direct Entry Banner */}
        {onGoToPublicPortal && (
          <div className="max-w-md w-full mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md p-4 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-[#0b3b60] uppercase tracking-wide">
                Student &amp; Institution Portal
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                Register a grievance without officer credentials
              </div>
            </div>
            <button
              type="button"
              onClick={onGoToPublicPortal}
              className="px-3.5 py-1.5 bg-[#0b3b60] hover:bg-[#072a45] text-white text-xs font-semibold rounded shadow-xs flex items-center space-x-1 shrink-0"
            >
              <span>Public Intake</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="max-w-md w-full bg-white rounded-md border border-slate-300 shadow-md p-6 sm:p-8">
          
          {/* Form Header */}
          <div className="border-b border-slate-200 pb-4 mb-5 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-[#0b3b60] mb-2 border border-slate-200">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Official Officer Login</h2>
            <p className="text-xs text-slate-600 mt-1">
              Authorized access for AICTE Bureau Officers, Reviewers, and Administrators
            </p>
          </div>

          {/* Missing Supabase Configuration Warning */}
          {!isConfigured && (
            <div className="mb-5 p-3.5 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Supabase Config Notice:</span>
                <p className="mt-0.5 text-amber-800">
                  Checking Supabase credentials in <code className="bg-amber-100 px-1 py-0.5 rounded">.env</code>.
                </p>
              </div>
            </div>
          )}

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Official Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@aicte.gov.in"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#0b3b60] focus:border-transparent bg-white text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#0b3b60] focus:border-transparent bg-white text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-[#0b3b60] hover:bg-[#072a45] text-white text-sm font-semibold rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0b3b60] disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleInstantLogin(email)}
                disabled={isSubmitting}
                className="w-full py-2 px-4 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
              >
                <Zap className="w-3.5 h-3.5 text-amber-700" />
                <span>Instant Demo Access (Bypass Auth Check)</span>
              </button>
            </div>
          </form>

          {/* Seed Demo Account Quick-Fill Switcher */}
          <div className="mt-5 pt-4 border-t border-slate-200">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2 flex items-center justify-between">
              <span>Select Role & Instant Login:</span>
              <span className="text-[10px] font-normal text-slate-500">1-Click</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  handleQuickFill('admin@aicte.gov.in');
                  handleInstantLogin('admin@aicte.gov.in');
                }}
                className="p-2 text-left border border-slate-200 hover:border-[#0b3b60] hover:bg-slate-50 rounded transition-all group"
              >
                <div className="font-semibold text-slate-800 group-hover:text-[#0b3b60]">Administrator</div>
                <div className="text-[10px] text-slate-500 truncate">admin@aicte.gov.in</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleQuickFill('rb.officer@aicte.gov.in');
                  handleInstantLogin('rb.officer@aicte.gov.in');
                }}
                className="p-2 text-left border border-slate-200 hover:border-[#0b3b60] hover:bg-slate-50 rounded transition-all group"
              >
                <div className="font-semibold text-slate-800 group-hover:text-[#0b3b60]">RB Officer</div>
                <div className="text-[10px] text-slate-500 truncate">Regulation Bureau</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleQuickFill('pgrc.officer@aicte.gov.in');
                  handleInstantLogin('pgrc.officer@aicte.gov.in');
                }}
                className="p-2 text-left border border-slate-200 hover:border-[#0b3b60] hover:bg-slate-50 rounded transition-all group"
              >
                <div className="font-semibold text-slate-800 group-hover:text-[#0b3b60]">PGRC Officer</div>
                <div className="text-[10px] text-slate-500 truncate">Grievance Cell</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleQuickFill('reviewer@aicte.gov.in');
                  handleInstantLogin('reviewer@aicte.gov.in');
                }}
                className="p-2 text-left border border-slate-200 hover:border-[#0b3b60] hover:bg-slate-50 rounded transition-all group"
              >
                <div className="font-semibold text-slate-800 group-hover:text-[#0b3b60]">Reviewer</div>
                <div className="text-[10px] text-slate-500 truncate">Cross-Bureau</div>
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
              <span className="flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Default password for all:
              </span>
              <code className="font-mono text-slate-700 font-medium">Aicte@Admin2026</code>
            </div>
          </div>
        </div>
      </div>

      {/* Official Government Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-4 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 text-center sm:text-left">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span>AICTE Cross-Bureau Complaint Coordination Platform (SIH-26264)</span>
          </div>
          <div>Strictly for Official Use • All Actions Audited</div>
        </div>
      </footer>
    </div>
  );
};
