import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { Shield, Loader2 } from 'lucide-react';

const AuthenticatedPortal: React.FC = () => {
  const { user, profile, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center font-sans">
        <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center p-2 shadow-sm border border-slate-200 mb-4">
          <Shield className="w-10 h-10 text-[#0b3b60] animate-pulse" />
        </div>
        <div className="flex items-center space-x-2 text-slate-800 font-semibold text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-[#0b3b60]" />
          <span>Verifying AICTE Officer Session...</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">Connecting to authoritative Supabase database</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Header onNavigate={setCurrentTab} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Left Side Navigation */}
        <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

        {/* Main Workspace Area */}
        <main className="flex-1 min-w-0">
          
          {/* Top Bureau Context Banner */}
          <div className="bg-white border border-slate-200 rounded p-4 mb-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Active Session
              </div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Welcome, {profile?.full_name || user.email}</span>
                <span className="text-xs px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  {profile?.role || 'Authenticated'}
                </span>
              </h2>
            </div>
            
            <div className="text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
              Department: <strong className="text-slate-800">{profile?.departments?.name || 'General Coordination'}</strong>
            </div>
          </div>

          {/* Phase 2 Complete Banner */}
          <div className="bg-emerald-50 border border-emerald-300 rounded p-4 mb-5 text-emerald-950 text-xs">
            <div className="font-bold text-emerald-900 text-sm mb-1 flex items-center gap-1.5">
              <span>✓ Phase 2 Authentication & Access Control Completed</span>
            </div>
            <p className="text-emerald-800 leading-relaxed">
              Session established via Supabase Auth. Department-aware context loaded for <strong className="font-semibold">{profile?.full_name}</strong> ({profile?.role}).
            </p>
          </div>

          {/* Tab Content Placeholder / Ready for Phase 3 */}
          <div className="bg-white border border-slate-200 rounded p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <h3 className="font-bold text-slate-900 capitalize text-sm">
                Active View: {currentTab.replace('-', ' ')}
              </h3>
              <span className="text-xs text-slate-400">
                Phase 3 (Complaint Management & Lifecycle) Ready
              </span>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <p>
                Authentication, session persistence, role permissions, and navigation guards are operational.
              </p>
              <div className="p-3 bg-slate-50 rounded border border-slate-200 font-mono text-[11px] text-slate-700">
                User ID: {user.id}<br />
                Role: {profile?.role}<br />
                Department: {profile?.departments?.code} ({profile?.departments?.name})<br />
                Designation: {profile?.designation || 'N/A'}
              </div>
            </div>
          </div>

        </main>
      </div>

      {/* Official Government Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-4 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-center sm:text-left space-y-2 sm:space-y-0">
          <div>
            AICTE Cross-Bureau Complaint Coordination Platform • SIH Problem Statement ID: 26264
          </div>
          <div className="text-slate-500">
            Regulation Bureau (RB) & Public Grievance Redressal Cell (PGRC)
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedPortal />
    </AuthProvider>
  );
}
