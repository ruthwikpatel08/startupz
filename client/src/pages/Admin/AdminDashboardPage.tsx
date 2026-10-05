import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { VerificationBadge, RoleBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Shield,
  Users,
  Compass,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Check,
  X,
  Trash2,
  Lock,
  Unlock,
  ShieldCheck,
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [startups, setStartups] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'USERS' | 'STARTUPS' | 'REPORTS'>('USERS');
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const fetchAdminData = async () => {
    if (!user?.isAdmin) return;
    setLoading(true);
    try {
      const [statsRes, usersRes, startupsRes, reportsRes] = await Promise.all([
        api.getAdminStats().catch(() => ({ stats: {} })),
        api.getAdminUsers().catch(() => ({ users: [] })),
        api.getAdminStartups().catch(() => ({ startups: [] })),
        api.getAdminReports().catch(() => ({ reports: [] })),
      ]);

      setStats((statsRes as any).stats || statsRes);
      setUsers((usersRes as any).users || (Array.isArray(usersRes) ? usersRes : []));
      setStartups((startupsRes as any).startups || (Array.isArray(startupsRes) ? startupsRes : []));
      setReports((reportsRes as any).reports || (Array.isArray(reportsRes) ? reportsRes : []));
    } catch (err) {
      console.error('Failed to load admin telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [user?.isAdmin]);

  if (!user?.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleToggleSuspend = async (userId: string, currentStatus: boolean) => {
    setActionLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      await api.toggleUserSuspension(userId, !currentStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isSuspended: !currentStatus } : u))
      );
    } catch (err) {
      console.error('Failed to update suspension:', err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleVerifyUser = async (userId: string, currentBadge: string | null) => {
    const newBadge = currentBadge ? null : 'Verified Founder';
    setActionLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      await api.verifyUserBadge(userId, newBadge);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, verificationBadge: newBadge, isVerified: !!newBadge } : u
        )
      );
    } catch (err) {
      console.error('Failed to update user verification:', err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleVerifyStartup = async (startupId: string, currentStatus: boolean) => {
    setActionLoading((prev) => ({ ...prev, [startupId]: true }));
    try {
      await api.verifyStartupBadge(startupId, !currentStatus);
      setStartups((prev) =>
        prev.map((s) => (s.id === startupId ? { ...s, isVerified: !currentStatus } : s))
      );
    } catch (err) {
      console.error('Failed to verify startup:', err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [startupId]: false }));
    }
  };

  const handleReportAction = async (reportId: string, status: string) => {
    setActionLoading((prev) => ({ ...prev, [reportId]: true }));
    try {
      await api.updateReportStatus(reportId, status);
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status } : r))
      );
    } catch (err) {
      console.error('Failed to resolve report:', err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [reportId]: false }));
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    const name = u.profile?.fullName?.toLowerCase() || '';
    const email = u.email?.toLowerCase() || '';
    return name.includes(q) || email.includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Admin Banner */}
      <div className="card-base bg-slate-900 border-slate-800 p-6 sm:p-8 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <Shield size={13} /> Trust & Safety Council
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            StartupZ Platform Moderation & Administration
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Audit user accounts, grant official badges, review reports, and enforce ecosystem integrity.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-base p-4">
          <div className="text-xs font-semibold uppercase text-slate-400">Total Users</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {stats?.totalUsers || users.length || 0}
          </div>
        </div>

        <div className="card-base p-4">
          <div className="text-xs font-semibold uppercase text-slate-400">Startups</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {stats?.totalStartups || startups.length || 0}
          </div>
        </div>

        <div className="card-base p-4">
          <div className="text-xs font-semibold uppercase text-slate-400">Connections</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {stats?.totalConnections || 0}
          </div>
        </div>

        <div className="card-base p-4">
          <div className="text-xs font-semibold uppercase text-rose-600 dark:text-rose-400">Pending Reports</div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {reports.filter((r) => r.status === 'PENDING').length}
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-dark-800 pb-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('USERS')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-md text-xs font-semibold transition-all border-b-2 -mb-px ${
            activeTab === 'USERS'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-950/20'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300'
          }`}
        >
          <Users size={14} />
          <span>Users ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('STARTUPS')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-md text-xs font-semibold transition-all border-b-2 -mb-px ${
            activeTab === 'STARTUPS'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-950/20'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300'
          }`}
        >
          <Compass size={14} />
          <span>Startups ({startups.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('REPORTS')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-md text-xs font-semibold transition-all border-b-2 -mb-px ${
            activeTab === 'REPORTS'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300'
          }`}
        >
          <AlertTriangle size={14} />
          <span>Reports ({reports.length})</span>
        </button>

        <Link
          to="/admin/problems"
          className="btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3 ml-auto"
        >
          <span>Manage Problem Statements &rarr;</span>
        </Link>
      </div>

      {/* Tab Panels */}
      {loading ? (
        <div className="h-64 card-base bg-slate-50 dark:bg-dark-900 animate-pulse" />
      ) : activeTab === 'USERS' ? (
        /* USERS TABLE */
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search user by name or email..."
              className="input-base w-full pl-8 pr-3 py-1.5 text-xs"
            />
          </div>

          <div className="overflow-x-auto card-base">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-dark-800/60 text-slate-500 border-b border-slate-200 dark:border-dark-800 font-medium">
                <tr>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Verification</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-800/60">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-dark-800/40 transition-colors">
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {u.profile?.fullName || 'No name'}
                      </div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="p-3.5">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="p-3.5">
                      {u.isSuspended ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40">
                          Suspended
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <VerificationBadge badge={u.verificationBadge} isVerified={u.isVerified} size="sm" />
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleVerifyUser(u.id, u.verificationBadge)}
                        disabled={actionLoading[u.id]}
                        className="btn-secondary px-2.5 py-1 text-[11px]"
                      >
                        {u.verificationBadge ? 'Revoke Badge' : 'Verify'}
                      </button>

                      <button
                        onClick={() => handleToggleSuspend(u.id, u.isSuspended)}
                        disabled={actionLoading[u.id]}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors ${
                          u.isSuspended
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                        }`}
                      >
                        {u.isSuspended ? 'Unsuspend' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'STARTUPS' ? (
        /* STARTUPS TABLE */
        <div className="overflow-x-auto card-base">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-dark-800/60 text-slate-500 border-b border-slate-200 dark:border-dark-800 font-medium">
              <tr>
                <th className="p-3.5">Startup</th>
                <th className="p-3.5">Founder</th>
                <th className="p-3.5">Stage</th>
                <th className="p-3.5">Verified</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-dark-800/60">
              {startups.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-dark-800/40 transition-colors">
                  <td className="p-3.5">
                    <Link to={`/startups/${s.id}`} className="font-semibold text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400">
                      {s.name}
                    </Link>
                    <div className="text-[11px] text-slate-400">{s.industry}</div>
                  </td>
                  <td className="p-3.5 text-slate-600 dark:text-slate-300">
                    {s.founder?.profile?.fullName || s.founder?.email || 'Founder'}
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-200/60 dark:border-brand-900/40">
                      {s.stage}
                    </span>
                  </td>
                  <td className="p-3.5">
                    {s.isVerified ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <Check size={13} /> Verified
                      </span>
                    ) : (
                      <span className="text-slate-400">Unverified</span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => handleVerifyStartup(s.id, s.isVerified)}
                      disabled={actionLoading[s.id]}
                      className="btn-secondary px-3 py-1 text-[11px]"
                    >
                      {s.isVerified ? 'Remove Verified' : 'Verify Startup'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* REPORTS STREAM */
        <div className="space-y-4">
          {reports.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No reports currently submitted.</p>
          ) : (
            reports.map((r) => (
              <div
                key={r.id}
                className="card-base p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40">
                      {r.reason}
                    </span>
                    <span className="text-xs text-slate-400">
                      Target: {r.targetType} ({r.targetId})
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    {r.description || 'No detailed note provided by reporter.'}
                  </p>
                  <div className="text-[11px] text-slate-400">
                    Reported by: {r.reporter?.profile?.fullName || r.reporter?.email || r.reporterId}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-semibold px-2.5 py-0.5 rounded ${
                      r.status === 'PENDING'
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40'
                        : r.status === 'ACTIONED'
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40'
                        : 'bg-slate-100 dark:bg-dark-800 text-slate-500 border border-slate-200/60 dark:border-dark-700'
                    }`}
                  >
                    {r.status}
                  </span>

                  {r.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleReportAction(r.id, 'ACTIONED')}
                        disabled={actionLoading[r.id]}
                        className="px-3 py-1 rounded-md text-[11px] font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                      >
                        Action
                      </button>
                      <button
                        onClick={() => handleReportAction(r.id, 'DISMISSED')}
                        disabled={actionLoading[r.id]}
                        className="btn-secondary px-3 py-1 text-[11px]"
                      >
                        Dismiss
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
