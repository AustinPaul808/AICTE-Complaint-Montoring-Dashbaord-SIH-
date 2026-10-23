import React, { useState, useEffect } from 'react';
import { getDashboardMetrics, type DashboardMetrics } from '../../services/supabase/reports';
import {
  AlertTriangle,
  Clock,
  Building2,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

interface DashboardProps {
  onNavigateTab: (tab: string) => void;
  onSelectComplaint?: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateTab }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const data = await getDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Error fetching dashboard statistics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Refresh */}
      <div className="bg-white border border-slate-200 rounded p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            AICTE Inter-Bureau Case Monitoring Executive Dashboard
          </h2>
          <p className="text-xs text-slate-500">
            Real-time regulatory grievance metrics across Regulation Bureau, PGRC, and affiliated directorates
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchMetrics}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded text-slate-600"
            title="Refresh database metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => onNavigateTab('register')}
            className="px-3 py-1.5 bg-[#0b3b60] hover:bg-[#072a45] text-white text-xs font-semibold rounded shadow-sm transition-colors flex items-center space-x-1"
          >
            <span>+ New Intake</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Total */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            Total Intake
          </div>
          <div className="text-2xl font-extrabold text-[#0b3b60] mt-1 font-mono">
            {metrics?.totalComplaints ?? '--'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">All bureaus</div>
        </div>

        {/* Received */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-sky-800 uppercase tracking-wide">
            Newly Received
          </div>
          <div className="text-2xl font-extrabold text-sky-700 mt-1 font-mono">
            {metrics?.receivedCount ?? '--'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Awaiting review</div>
        </div>

        {/* Under Review */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-purple-800 uppercase tracking-wide">
            Under Review
          </div>
          <div className="text-2xl font-extrabold text-purple-700 mt-1 font-mono">
            {metrics?.underReviewCount ?? '--'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Preliminary examination</div>
        </div>

        {/* In Progress */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-blue-800 uppercase tracking-wide">
            Active Inquiry
          </div>
          <div className="text-2xl font-extrabold text-blue-700 mt-1 font-mono">
            {metrics?.inProgressCount ?? '--'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Investigation ongoing</div>
        </div>

        {/* Resolved */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide">
            Resolved
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1 font-mono">
            {metrics?.resolvedCount ?? '--'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Orders/Relief issued</div>
        </div>

        {/* Overdue */}
        <div className="bg-red-50 border border-red-200 rounded p-4 shadow-sm">
          <div className="text-[11px] font-bold text-red-800 uppercase tracking-wide flex items-center space-x-1">
            <AlertTriangle className="w-3 h-3 text-red-600" />
            <span>Overdue Target</span>
          </div>
          <div className="text-2xl font-extrabold text-red-700 mt-1 font-mono">
            {metrics?.overdueCount ?? '--'}
          </div>
          <div className="text-[10px] text-red-600 font-semibold mt-1">Requires hearing</div>
        </div>
      </div>

      {/* Bureau Workload Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bureau Workload Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded shadow-sm p-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-[#0b3b60]" />
              <span>Departmental Workload & Distribution</span>
            </h3>
            <span className="text-[11px] text-slate-400">Live Database Aggregation</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold text-[11px] uppercase border-b border-slate-200">
                  <th className="py-2.5 px-3">Bureau / Cell</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3 text-center">Total Assigned</th>
                  <th className="py-2.5 px-3 text-center">Pending Inquiry</th>
                  <th className="py-2.5 px-3 text-center">Resolved Cases</th>
                  <th className="py-2.5 px-3 text-right">Clearance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics?.departmentWorkload.map((dept) => {
                  const rate = dept.total > 0 ? Math.round((dept.resolved / dept.total) * 100) : 0;
                  return (
                    <tr key={dept.departmentId} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {dept.departmentName}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 font-bold">
                        {dept.departmentCode}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                        {dept.total}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-amber-700">
                        {dept.pending}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">
                        {dept.resolved}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${
                          rate >= 50 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Audit Activities Feed */}
        <div className="bg-white border border-slate-200 rounded shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-[#0b3b60]" />
                <span>Recent System Activities</span>
              </h3>
              <button
                onClick={() => onNavigateTab('audit')}
                className="text-[11px] text-[#0b3b60] hover:underline font-semibold"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              {metrics?.recentActivity.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No recent activities recorded.
                </div>
              ) : (
                metrics?.recentActivity.slice(0, 5).map((log) => (
                  <div key={log.id} className="text-xs p-2.5 rounded bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                      <span className="font-bold text-[#0b3b60] font-sans uppercase">
                        {log.action_type}
                      </span>
                      <span>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="text-slate-800 font-medium">
                      {log.actor?.full_name || 'System Operator'}
                    </div>
                    <div className="text-slate-500 text-[11px] truncate mt-0.5 font-mono">
                      {JSON.stringify(log.details)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('complaints')}
            className="w-full mt-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded flex items-center justify-center space-x-1.5 transition-colors"
          >
            <span>Open All Complaints Registry</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
