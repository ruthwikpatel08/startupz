import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { User, Connection } from '../../types';
import { VerificationBadge, RoleBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Users,
  UserCheck,
  UserPlus,
  Clock,
  MessageSquare,
  UserX,
  Check,
  X,
  Search,
} from 'lucide-react';

export const NetworkPage: React.FC = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'CONNECTED' | 'PENDING'>('CONNECTED');
  const [connections, setConnections] = useState<any[]>([]);
  const [pendingReceived, setPendingReceived] = useState<any[]>([]);
  const [pendingSent, setPendingSent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [connRes, pendingRes] = await Promise.all([
        api.getConnections().catch(() => ({ connections: [] })),
        api.getPendingConnections().catch(() => ({ received: [], sent: [] })),
      ]);

      setConnections(connRes.connections || []);
      setPendingReceived(pendingRes.received || []);
      setPendingSent(pendingRes.sent || []);
    } catch (err) {
      console.error('Failed to load network connections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRespond = async (connectionId: string, action: 'ACCEPT' | 'REJECT') => {
    setActionLoading((prev) => ({ ...prev, [connectionId]: true }));
    try {
      await api.respondConnection(connectionId, action);
      // Refresh network
      await fetchData();
    } catch (err) {
      console.error(`Failed to ${action} connection:`, err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [connectionId]: false }));
    }
  };

  const handleRemove = async (connectionId: string) => {
    if (!window.confirm('Are you sure you want to disconnect from this user?')) return;
    setActionLoading((prev) => ({ ...prev, [connectionId]: true }));
    try {
      await api.removeConnection(connectionId);
      setConnections((prev) => prev.filter((c) => c.connectionId !== connectionId));
    } catch (err) {
      console.error('Failed to remove connection:', err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [connectionId]: false }));
    }
  };

  const totalPending = pendingReceived.length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="text-brand-600" size={28} /> My Startup Network
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Manage your founders, co-founders, advisors, and ecosystem connections.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('CONNECTED')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'CONNECTED'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <UserCheck size={15} />
            <span>Connections ({connections.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('PENDING')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all relative ${
              activeTab === 'PENDING'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Clock size={15} />
            <span>Invitations</span>
            {totalPending > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {totalPending}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      ) : activeTab === 'CONNECTED' ? (
        /* 1. CONNECTED MEMBERS */
        connections.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No connections yet"
            description="Explore the startup directory, match with prospective co-founders, and expand your network."
            actionText="Find Co-Founders"
            actionHref="/cofounders"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {connections.map((c) => {
              const u = c.user;
              const name = u?.profile?.fullName || u?.email || 'Founder';
              const avatar = u?.profile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${name}`;
              const headline = u?.profile?.headline || u?.role;
              const location = u?.profile?.location || 'Remote';

              return (
                <div
                  key={c.connectionId}
                  className="flex flex-col justify-between p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Link to={`/profile/${u?.id}`}>
                        <img
                          src={avatar}
                          alt={name}
                          className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            to={`/profile/${u?.id}`}
                            className="font-bold text-sm text-slate-900 dark:text-white hover:text-brand-600 transition-colors truncate"
                          >
                            {name}
                          </Link>
                          <VerificationBadge badge={u?.verificationBadge} isVerified={u?.isVerified} size="sm" />
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1">{headline}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{location}</p>
                      </div>
                    </div>

                    {u?.profile?.skills && (
                      <div className="flex flex-wrap gap-1">
                        {u.profile.skills
                          .split(',')
                          .slice(0, 3)
                          .map((s: string, idx: number) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                            >
                              {s.trim()}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      onClick={() => navigate(`/messages?user=${u?.id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-sm transition-all"
                    >
                      <MessageSquare size={14} />
                      <span>Chat</span>
                    </button>

                    <button
                      onClick={() => handleRemove(c.connectionId)}
                      disabled={actionLoading[c.connectionId]}
                      title="Disconnect"
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <UserX size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* 2. PENDING REQUESTS */
        <div className="space-y-8">
          {/* Received Requests */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Invitations Received</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-brand-50 dark:bg-brand-950 text-brand-600 font-bold">
                {pendingReceived.length}
              </span>
            </h3>

            {pendingReceived.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">No pending invitations received.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingReceived.map((req) => {
                  const s = req.sender;
                  const name = s?.profile?.fullName || s?.email || 'Founder';
                  const avatar = s?.profile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${name}`;
                  const headline = s?.profile?.headline || s?.role;

                  return (
                    <div
                      key={req.id}
                      className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <Link to={`/profile/${s?.id}`}>
                          <img
                            src={avatar}
                            alt={name}
                            className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                          />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/profile/${s?.id}`}
                            className="font-bold text-sm text-slate-900 dark:text-white hover:text-brand-600 truncate block"
                          >
                            {name}
                          </Link>
                          <p className="text-xs text-slate-500 line-clamp-1">{headline}</p>
                        </div>
                      </div>

                      {req.note && (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 italic">
                          "{req.note}"
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => handleRespond(req.id, 'ACCEPT')}
                          disabled={actionLoading[req.id]}
                          className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition-all flex items-center justify-center gap-1.5"
                        >
                          <Check size={14} />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => handleRespond(req.id, 'REJECT')}
                          disabled={actionLoading[req.id]}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                        >
                          <X size={14} />
                          <span>Decline</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sent Requests */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Invitations Sent</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                {pendingSent.length}
              </span>
            </h3>

            {pendingSent.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">No pending outgoing invitations.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingSent.map((req) => {
                  const r = req.receiver;
                  const name = r?.profile?.fullName || r?.email || 'User';
                  const avatar = r?.profile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${name}`;

                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={avatar}
                          alt={name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {name}
                          </h4>
                          <p className="text-[11px] text-slate-500 truncate">{r?.profile?.headline || r?.role}</p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shrink-0">
                        Pending
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
