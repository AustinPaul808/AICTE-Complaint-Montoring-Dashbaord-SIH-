import { useState, useEffect } from 'react';
import { isSupabaseConfigured } from './services/supabase/client';
import { Shield, Database, CheckCircle2, AlertTriangle, ArrowRight, BookOpen } from 'lucide-react';

export default function App() {
  const [configured, setConfigured] = useState<boolean>(false);

  useEffect(() => {
    setConfigured(isSupabaseConfigured());
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Government of India Tricolor Ribbon */}
      <div className="gov-tricolor-stripe w-full"></div>

      {/* Official Government Header */}
      <header className="bg-[#0b3b60] text-white border-b-4 border-[#e67e22] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center p-1 shadow">
              <Shield className="w-8 h-8 text-[#0b3b60]" />
            </div>
            <div>
              <div className="text-xs tracking-wider uppercase text-amber-200 font-medium">
                अखिल भारतीय तकनीकी शिक्षा परिषद | All India Council for Technical Education
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                Cross-Bureau Complaint Coordination Platform
              </h1>
              <div className="text-xs text-slate-200">
                Ministry of Education, Government of India • SIH Problem Statement ID: 26264
              </div>
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end text-xs text-slate-300">
            <span className="font-semibold text-white">NIC Standard Portal</span>
            <span>Security Classification: Restricted</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between border-b border-slate-200 pb-4 mb-6">
            <div>
              <div className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 mb-2">
                Phase 1: Backend & Database Foundation Completed
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                System Initialized & Architecture Verified
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Authoritative Supabase PostgreSQL schema, RLS security policies, triggers, and seed data are ready.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {configured ? (
                <span className="inline-flex items-center text-xs font-medium bg-green-50 text-green-700 px-3 py-1.5 rounded border border-green-200">
                  <CheckCircle2 className="w-4 h-4 mr-1.5 text-green-600" />
                  Supabase Connected
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-medium bg-amber-50 text-amber-800 px-3 py-1.5 rounded border border-amber-200">
                  <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-600" />
                  Awaiting Credentials in .env
                </span>
              )}
            </div>
          </div>

          {/* Grid of Verified Database Components */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="border border-slate-200 rounded p-4 bg-slate-50">
              <div className="flex items-center space-x-2 text-[#0b3b60] font-semibold text-sm mb-2">
                <Database className="w-4 h-4" />
                <span>8 Core Relational Tables</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                <code className="text-slate-800">departments</code>, <code className="text-slate-800">profiles</code>, <code className="text-slate-800">institutions</code>, <code className="text-slate-800">complaints</code>, <code className="text-slate-800">complaint_updates</code>, <code className="text-slate-800">complaint_assignments</code>, <code className="text-slate-800">notifications</code>, <code className="text-slate-800">audit_logs</code>.
              </p>
            </div>

            <div className="border border-slate-200 rounded p-4 bg-slate-50">
              <div className="flex items-center space-x-2 text-[#0b3b60] font-semibold text-sm mb-2">
                <Shield className="w-4 h-4" />
                <span>Row Level Security (RLS)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bureaus (RB, PGRC) isolated by department. Immutable audit trails, and strict guards preventing user self-promotion to Administrator.
              </p>
            </div>

            <div className="border border-slate-200 rounded p-4 bg-slate-50">
              <div className="flex items-center space-x-2 text-[#0b3b60] font-semibold text-sm mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Concurrency-Safe Sequence</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Complaint numbers generated via safe PostgreSQL sequence (<code className="text-slate-800">AICTE-YYYY-XXXXX</code>) immune to table-count race conditions.
              </p>
            </div>
          </div>

          {/* Instructions Box */}
          <div className="bg-sky-50 border border-sky-200 rounded p-4 text-sm text-sky-950">
            <h3 className="font-semibold text-sky-900 flex items-center mb-1">
              <BookOpen className="w-4 h-4 mr-1.5" />
              Database Migration Scripts Prepared in <span className="font-mono ml-1 text-xs bg-sky-100 px-1.5 py-0.5 rounded">supabase/migrations/</span>
            </h3>
            <p className="text-xs text-sky-800 leading-relaxed mb-2">
              Apply the SQL files in Supabase Dashboard SQL Editor or via Supabase CLI to create tables and load pre-configured AICTE seed accounts (Password for all: <code>Aicte@Admin2026</code>).
            </p>
            <div className="text-xs font-mono bg-white p-2.5 rounded border border-sky-200 text-slate-700">
              • 20261023000001_initial_schema.sql<br />
              • 20261023000002_rls_policies.sql<br />
              • 20261023000003_triggers_and_functions.sql<br />
              • 20261023000004_seed_data.sql
            </div>
          </div>
        </div>

        {/* Phase Roadmap */}
        <div className="bg-white rounded border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
            Development Phase Tracker
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded bg-emerald-50 border border-emerald-200 text-xs">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <span className="font-bold text-emerald-950">Phase 1: Repository & Database Foundation</span>
                  <div className="text-emerald-800">Schema, migrations, RLS, functions, seed data & overlap engine README</div>
                </div>
              </div>
              <span className="font-semibold text-emerald-700 uppercase">Completed</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded bg-amber-50 border border-amber-200 text-xs">
              <div className="flex items-center space-x-3">
                <ArrowRight className="w-5 h-5 text-amber-600 animate-pulse" />
                <div>
                  <span className="font-bold text-amber-950">Phase 2: Authentication & Access Control (Next)</span>
                  <div className="text-amber-800">Supabase Auth login, protected routes, user profile context, role-aware navigation</div>
                </div>
              </div>
              <span className="font-semibold text-amber-700 uppercase">Up Next</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded bg-slate-50 border border-slate-200 text-xs text-slate-500">
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-[10px] font-bold">3</div>
                <div>
                  <span className="font-bold text-slate-700">Phase 3: Complaint Lifecycle Management</span>
                  <div>Registration, filters, detailed case views, investigation notes, re-assignment</div>
                </div>
              </div>
              <span className="text-slate-400 uppercase font-medium">Pending</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded bg-slate-50 border border-slate-200 text-xs text-slate-500">
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-[10px] font-bold">4</div>
                <div>
                  <span className="font-bold text-slate-700">Phase 4: Government Administrative Dashboard & Reports</span>
                  <div>Live bureau metrics, overdue monitors, department workloads, notifications</div>
                </div>
              </div>
              <span className="text-slate-400 uppercase font-medium">Pending</span>
            </div>
          </div>
        </div>
      </main>

      {/* Official Government Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
          <div>
            AICTE Cross-Bureau Complaint Coordination Platform • Designed for AICTE Regulation Bureau & PGRC
          </div>
          <div className="text-slate-500">
            Strictly Government Official Use Only
          </div>
        </div>
      </footer>
    </div>
  );
}
