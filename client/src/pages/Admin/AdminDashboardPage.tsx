import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, WorldwideOpportunity, OpportunitySource } from '../../services/api';
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
  Globe,
  RefreshCw,
  Plus,
  ExternalLink,
  Edit2,
} from 'lucide-react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { SEO } from '../../components/common/SEO';

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const hasAdminAccess = Boolean(user?.isAdmin || isLocalDev);

  const tabParam = (searchParams.get('tab') || '').toUpperCase();
  const initialTab = (tabParam === 'STARTUPS' || tabParam === 'REPORTS' || tabParam === 'OPPORTUNITIES') ? tabParam : 'USERS';

  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [startups, setStartups] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [worldwideOpps, setWorldwideOpps] = useState<WorldwideOpportunity[]>([]);
  const [oppSources, setOppSources] = useState<OpportunitySource[]>([]);
  const [activeTab, setActiveTab] = useState<'USERS' | 'STARTUPS' | 'REPORTS' | 'OPPORTUNITIES'>(initialTab as any);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [syncingOpps, setSyncingOpps] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [oppStatusFilter, setOppStatusFilter] = useState('ALL');

  // Modal for creating a new opportunity
  const [showAddOppModal, setShowAddOppModal] = useState(false);
  const [oppForm, setOppForm] = useState({
    title: '',
    organizer_name: '',
    category: 'Hackathon',
    participation_mode: 'ONLINE',
    country: 'Worldwide',
    location: 'Online / Virtual',
    registration_url: '',
    start_date: '',
    end_date: '',
    registration_deadline: '',
    description_summary: '',
    skills_required: '',
    price_type: 'FREE',
    certificate_available: true,
  });

  useEffect(() => {
    const currentTab = (searchParams.get('tab') || '').toUpperCase();
    if (['USERS', 'STARTUPS', 'REPORTS', 'OPPORTUNITIES'].includes(currentTab)) {
      setActiveTab(currentTab as any);
    }
  }, [searchParams]);

  const fetchAdminData = async () => {
    if (!hasAdminAccess) return;
    setLoading(true);
    try {
      const [statsRes, usersRes, startupsRes, reportsRes, oppsRes, sourcesRes] = await Promise.all([
        api.getAdminStats().catch(() => ({ stats: {} })),
        api.getAdminUsers().catch(() => ({ users: [] })),
        api.getAdminStartups().catch(() => ({ startups: [] })),
        api.getAdminReports().catch(() => ({ reports: [] })),
        api.getWorldwideOpportunities({ status: 'ALL', limit: 100 }).catch(() => ({ opportunities: [] })),
        api.getOpportunitySources().catch(() => []),
      ]);

      setStats((statsRes as any).stats || statsRes);
      setUsers((usersRes as any).users || (Array.isArray(usersRes) ? usersRes : []));
      setStartups((startupsRes as any).startups || (Array.isArray(startupsRes) ? startupsRes : []));
      setReports((reportsRes as any).reports || (Array.isArray(reportsRes) ? reportsRes : []));
      setWorldwideOpps(oppsRes?.opportunities || []);
      setOppSources(Array.isArray(sourcesRes) ? sourcesRes : []);
    } catch (err) {
      console.error('Failed to load admin telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncWorldwideOpps = async () => {
    setSyncingOpps(true);
    setSyncStatusMsg('Running worldwide opportunity collection cycle...');
    try {
      const res = await api.syncWorldwideOpportunities({ force: true });
      setSyncStatusMsg('Synchronization completed successfully!');
      // Refresh list
      const freshOpps = await api.getWorldwideOpportunities({ status: 'ALL', limit: 100 });
      if (freshOpps?.opportunities) setWorldwideOpps(freshOpps.opportunities);
      const freshSources = await api.getOpportunitySources();
      if (Array.isArray(freshSources)) setOppSources(freshSources);
    } catch (err: any) {
      setSyncStatusMsg(`Sync error: ${err.message || 'Failed to complete collection'}`);
    } finally {
      setSyncingOpps(false);
      setTimeout(() => setSyncStatusMsg(''), 5000);
    }
  };

  const handleApproveOpportunity = async (id: string) => {
    try {
      await api.updateWorldwideOpportunity(id, { status: 'APPROVED' });
      setWorldwideOpps((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: 'APPROVED' } : o))
      );
    } catch (err) {
      console.error('Failed to approve opportunity:', err);
    }
  };

  const handleWithdrawOpportunity = async (id: string) => {
    try {
      await api.deleteWorldwideOpportunity(id);
      setWorldwideOpps((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: 'WITHDRAWN' } : o))
      );
    } catch (err) {
      console.error('Failed to withdraw opportunity:', err);
    }
  };

  const handleToggleSourceStatus = async (source: OpportunitySource) => {
    const newStatus = source.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      await api.updateOpportunitySource(source.id, { status: newStatus });
      setOppSources((prev) =>
        prev.map((s) => (s.id === source.id ? { ...s, status: newStatus } : s))
      );
    } catch (err) {
      console.error('Failed to toggle source status:', err);
    }
  };

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...oppForm,
        skills_required: oppForm.skills_required.split(',').map((s) => s.trim()).filter(Boolean),
      };
      const created = await api.createWorldwideOpportunity(payload);
      setWorldwideOpps((prev) => [created, ...prev]);
      setShowAddOppModal(false);
      setOppForm({
        title: '',
        organizer_name: '',
        category: 'Hackathon',
        participation_mode: 'ONLINE',
        country: 'Worldwide',
        location: 'Online / Virtual',
        registration_url: '',
        start_date: '',
        end_date: '',
        registration_deadline: '',
        description_summary: '',
        skills_required: '',
        price_type: 'FREE',
        certificate_available: true,
      });
    } catch (err: any) {
      alert(`Failed to create opportunity: ${err.message || 'Validation error'}`);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [hasAdminAccess]);

  if (!hasAdminAccess) {
    return <Navigate to="/" replace />;
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
      <SEO title="Admin Dashboard | HookZ" noindex={true} />
      {/* Admin Banner */}
      <div className="card-base bg-slate-900 border-slate-800 p-6 sm:p-8 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <Shield size={13} /> Trust & Safety Council
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            HookZ Platform Moderation & Administration
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">
            Audit user accounts, grant official badges, review reports, and enforce ecosystem integrity.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        <div className="card-base p-4">
          <div className="text-xs font-semibold uppercase text-[var(--text-muted)]">Total Users</div>
          <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            {stats?.totalUsers || users.length || 0}
          </div>
        </div>

        <div className="card-base p-4">
          <div className="text-xs font-semibold uppercase text-[var(--text-muted)]">Startups</div>
          <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            {stats?.totalStartups || startups.length || 0}
          </div>
        </div>

        <div className="card-base p-4">
          <div className="text-xs font-semibold uppercase text-[var(--text-muted)]">Connections</div>
          <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            {stats?.totalConnections || 0}
          </div>
        </div>

        <div className="card-base p-4">
          <div className="text-xs font-semibold uppercase text-rose-600 dark:text-rose-400">Pending Reports</div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {reports.filter((r) => r.status === 'PENDING').length}
          </div>
        </div>

        <div
          onClick={() => {
            setActiveTab('OPPORTUNITIES');
            setSearchParams({ tab: 'opportunities' });
          }}
          className="card-base p-4 cursor-pointer hover:border-emerald-500/50 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-emerald-600 dark:text-emerald-400">Opportunities</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold group-hover:bg-emerald-500 group-hover:text-white transition">Verify</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {worldwideOpps.length || 0}
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => {
            setActiveTab('USERS');
            setSearchParams({ tab: 'users' });
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-md text-xs font-semibold transition-all border-b-2 -mb-px ${
            activeTab === 'USERS'
              ? 'border-brand-600 text-[var(--brand-primary)] bg-[var(--brand-soft)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)]'
          }`}
        >
          <Users size={14} />
          <span>Users ({users.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('STARTUPS');
            setSearchParams({ tab: 'startups' });
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-md text-xs font-semibold transition-all border-b-2 -mb-px ${
            activeTab === 'STARTUPS'
              ? 'border-brand-600 text-[var(--brand-primary)] bg-[var(--brand-soft)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)]'
          }`}
        >
          <Compass size={14} />
          <span>Startups ({startups.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('REPORTS');
            setSearchParams({ tab: 'reports' });
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-md text-xs font-semibold transition-all border-b-2 -mb-px ${
            activeTab === 'REPORTS'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)]'
          }`}
        >
          <AlertTriangle size={14} />
          <span>Reports ({reports.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('OPPORTUNITIES');
            setSearchParams({ tab: 'opportunities' });
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-md text-xs font-semibold transition-all border-b-2 -mb-px ${
            activeTab === 'OPPORTUNITIES'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 font-bold'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)]'
          }`}
        >
          <Globe size={14} />
          <span>Opportunities ({worldwideOpps.length})</span>
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
        <div className="h-64 card-base bg-[var(--bg-primary)] animate-pulse" />
      ) : activeTab === 'USERS' ? (
        /* USERS TABLE */
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-2.5 text-[var(--text-muted)]" />
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
              <thead className="bg-[var(--bg-primary)] text-[var(--text-muted)] border-b border-[var(--border-subtle)] font-medium">
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
                  <tr key={u.id} className="hover:bg-[var(--bg-primary)] transition-colors">
                    <td className="p-3.5">
                      <div className="font-semibold text-[var(--text-primary)]">
                        {u.profile?.fullName || 'No name'}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">{u.email}</div>
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
            <thead className="bg-[var(--bg-primary)] text-[var(--text-muted)] border-b border-[var(--border-subtle)] font-medium">
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
                <tr key={s.id} className="hover:bg-[var(--bg-primary)] transition-colors">
                  <td className="p-3.5">
                    <Link to={`/startups/${s.id}`} className="font-semibold text-[var(--text-primary)] hover:text-[var(--brand-primary)]">
                      {s.name}
                    </Link>
                    <div className="text-[11px] text-[var(--text-muted)]">{s.industry}</div>
                  </td>
                  <td className="p-3.5 text-[var(--text-secondary)]">
                    {s.founder?.profile?.fullName || s.founder?.email || 'Founder'}
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--brand-soft)] text-[var(--brand-primary)] border border-brand-200/60 dark:border-brand-900/40">
                      {s.stage}
                    </span>
                  </td>
                  <td className="p-3.5">
                    {s.isVerified ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <Check size={13} /> Verified
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">Unverified</span>
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
      ) : activeTab === 'REPORTS' ? (
        /* REPORTS STREAM */
        <div className="space-y-4">
          {reports.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-6 text-center">No reports currently submitted.</p>
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
                    <span className="text-xs text-[var(--text-muted)]">
                      Target: {r.targetType} ({r.targetId})
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {r.description || 'No detailed note provided by reporter.'}
                  </p>
                  <div className="text-[11px] text-[var(--text-muted)]">
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
                        : 'bg-[var(--bg-soft)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
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
      ) : (
        /* OPPORTUNITIES MANAGEMENT & SOURCE REGISTRY */
        <div className="space-y-6">
          {/* Controls & Actions Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-[var(--card-bg)] border border-[var(--border-subtle)]">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Worldwide Opportunities & Source Registry
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Manage automated collectors, review pending curated events, and enforce source attribution.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSyncWorldwideOpps}
                disabled={syncingOpps}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-sm"
              >
                <RefreshCw size={13} className={syncingOpps ? 'animate-spin' : ''} />
                <span>{syncingOpps ? 'Syncing...' : 'Trigger Sync'}</span>
              </button>

              <button
                onClick={() => setShowAddOppModal(true)}
                className="px-3.5 py-1.5 rounded-lg bg-[var(--brand-primary)] hover:opacity-90 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-sm"
              >
                <Plus size={13} />
                <span>Add Opportunity</span>
              </button>
            </div>
          </div>

          {syncStatusMsg && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              {syncStatusMsg}
            </div>
          )}

          {/* Source Registry Summary Card */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--card-bg)] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Automated Source Registry ({oppSources.length})
              </h4>
              <span className="text-[11px] text-[var(--text-muted)]">
                Scheduled background sync frequency: 6h
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                    <th className="py-2 pr-4 font-semibold">Source Name</th>
                    <th className="py-2 px-4 font-semibold">Method</th>
                    <th className="py-2 px-4 font-semibold">Permission Status</th>
                    <th className="py-2 px-4 font-semibold">Attribution</th>
                    <th className="py-2 px-4 font-semibold">Status</th>
                    <th className="py-2 pl-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-secondary)]">
                  {oppSources.map((source) => (
                    <tr key={source.id} className="hover:bg-[var(--card-hover)] transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-[var(--text-primary)]">
                        <a
                          href={source.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-emerald-600 inline-flex items-center gap-1"
                        >
                          <span>{source.name}</span>
                          <ExternalLink size={11} className="text-[var(--text-muted)]" />
                        </a>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-[var(--bg-soft)] text-[10px] font-mono">
                          {source.collection_method}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          {source.permission_status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-[11px] max-w-xs truncate" title={source.attribution || ''}>
                        {source.attribution || 'Standard link attribution'}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            source.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          }`}
                        >
                          {source.status}
                        </span>
                      </td>
                      <td className="py-2.5 pl-4 text-right">
                        <button
                          onClick={() => handleToggleSourceStatus(source)}
                          className="text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline"
                        >
                          {source.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Opportunities Inventory Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Opportunities Inventory
              </h4>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-[var(--text-muted)]">Filter Status:</span>
                <select
                  value={oppStatusFilter}
                  onChange={(e) => setOppStatusFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--card-bg)] text-xs text-[var(--text-primary)]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PENDING_REVIEW">Pending Review</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="WITHDRAWN">Withdrawn</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--card-bg)]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] bg-[var(--card-hover)]">
                    <th className="py-2.5 px-4 font-semibold">Title</th>
                    <th className="py-2.5 px-4 font-semibold">Organizer</th>
                    <th className="py-2.5 px-4 font-semibold">Category</th>
                    <th className="py-2.5 px-4 font-semibold">Mode</th>
                    <th className="py-2.5 px-4 font-semibold">Dates</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-secondary)]">
                  {worldwideOpps
                    .filter((o) => (oppStatusFilter === 'ALL' ? true : o.status === oppStatusFilter))
                    .map((opp) => (
                      <tr key={opp.id} className="hover:bg-[var(--card-hover)] transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-[var(--text-primary)] max-w-xs truncate">
                          {opp.title}
                        </td>
                        <td className="py-2.5 px-4">{opp.organizer_name}</td>
                        <td className="py-2.5 px-4">{opp.category}</td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-[var(--bg-soft)] text-[10px]">
                            {opp.participation_mode}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-[11px] whitespace-nowrap">
                          {opp.start_date ? new Date(opp.start_date).toLocaleDateString() : 'TBA'}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              opp.status === 'APPROVED'
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                : opp.status === 'PENDING_REVIEW'
                                ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                : opp.status === 'EXPIRED'
                                ? 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                                : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                            }`}
                          >
                            {opp.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right space-x-2 whitespace-nowrap">
                          {opp.status === 'PENDING_REVIEW' && (
                            <button
                              onClick={() => handleApproveOpportunity(opp.id)}
                              className="text-emerald-600 font-semibold hover:underline"
                            >
                              Approve
                            </button>
                          )}
                          <a
                            href={opp.registration_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-600 hover:underline"
                            title="Test Registration URL"
                          >
                            Visit
                          </a>
                          {opp.status !== 'WITHDRAWN' && (
                            <button
                              onClick={() => handleWithdrawOpportunity(opp.id)}
                              className="text-rose-600 hover:underline"
                            >
                              Withdraw
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Opportunity Modal */}
          {showAddOppModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in" onClick={() => setShowAddOppModal(false)}>
              <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#1b1825] bg-[var(--card-bg)] border border-[var(--border-subtle)] p-6 space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Curate / Add Opportunity
                  </h3>
                  <button
                    onClick={() => setShowAddOppModal(false)}
                    className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleCreateOpportunity} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold mb-1">Opportunity Title *</label>
                    <input
                      type="text"
                      required
                      value={oppForm.title}
                      onChange={(e) => setOppForm({ ...oppForm, title: e.target.value })}
                      placeholder="e.g. Google Cloud AI Hackathon 2026"
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Organizer Name *</label>
                      <input
                        type="text"
                        required
                        value={oppForm.organizer_name}
                        onChange={(e) => setOppForm({ ...oppForm, organizer_name: e.target.value })}
                        placeholder="e.g. Google Developers"
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Category *</label>
                      <select
                        value={oppForm.category}
                        onChange={(e) => setOppForm({ ...oppForm, category: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                      >
                        <option value="Hackathon">Hackathon</option>
                        <option value="Google Developer Event">Google Developer Event</option>
                        <option value="Microsoft Event">Microsoft Event</option>
                        <option value="AWS Workshop">AWS Workshop</option>
                        <option value="AI & Machine Learning Event">AI & Machine Learning Event</option>
                        <option value="Coding Competition">Coding Competition</option>
                        <option value="Startup Competition">Startup Competition</option>
                        <option value="Certificate Programme">Certificate Programme</option>
                        <option value="Technical Workshop">Technical Workshop</option>
                        <option value="Student Developer Programme">Student Developer Programme</option>
                        <option value="Internship & Learning Opportunity">Internship & Learning Opportunity</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Participation Mode</label>
                      <select
                        value={oppForm.participation_mode}
                        onChange={(e) => setOppForm({ ...oppForm, participation_mode: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                      >
                        <option value="ONLINE">ONLINE</option>
                        <option value="OFFLINE">OFFLINE</option>
                        <option value="HYBRID">HYBRID</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Country</label>
                      <input
                        type="text"
                        value={oppForm.country}
                        onChange={(e) => setOppForm({ ...oppForm, country: e.target.value })}
                        placeholder="Worldwide / India / USA"
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Price</label>
                      <select
                        value={oppForm.price_type}
                        onChange={(e) => setOppForm({ ...oppForm, price_type: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                      >
                        <option value="FREE">FREE</option>
                        <option value="PAID">PAID</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Official Registration URL *</label>
                    <input
                      type="url"
                      required
                      value={oppForm.registration_url}
                      onChange={(e) => setOppForm({ ...oppForm, registration_url: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Start Date</label>
                      <input
                        type="date"
                        value={oppForm.start_date}
                        onChange={(e) => setOppForm({ ...oppForm, start_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Registration Deadline</label>
                      <input
                        type="date"
                        value={oppForm.registration_deadline}
                        onChange={(e) => setOppForm({ ...oppForm, registration_deadline: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Description Summary</label>
                    <textarea
                      rows={3}
                      value={oppForm.description_summary}
                      onChange={(e) => setOppForm({ ...oppForm, description_summary: e.target.value })}
                      placeholder="Brief summary of the opportunity, challenges, and goals..."
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Skills (comma separated)</label>
                    <input
                      type="text"
                      value={oppForm.skills_required}
                      onChange={(e) => setOppForm({ ...oppForm, skills_required: e.target.value })}
                      placeholder="AI/ML, Python, Cloud, Web3"
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => setShowAddOppModal(false)}
                      className="btn-secondary px-4 py-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                    >
                      Publish Opportunity
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
