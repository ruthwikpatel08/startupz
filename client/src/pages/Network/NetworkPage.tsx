import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Avatar } from '../../components/common/Avatar';
import { VerificationBadge, RoleBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Users,
  UserCheck,
  Clock,
  MessageSquare,
  UserX,
  Check,
  X,
  Rocket,
  ArrowRight,
  Shield,
  Sparkles,
} from 'lucide-react';

export const NetworkPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab')?.toUpperCase();

  const [activeTab, setActiveTab] = useState<'CONNECTED' | 'PENDING' | 'PROPOSALS'>(
    urlTab === 'PENDING' || urlTab === 'PROPOSALS' ? urlTab : 'CONNECTED'
  );
  const [connections, setConnections] = useState<any[]>([]);
  const [pendingReceived, setPendingReceived] = useState<any[]>([]);
  const [pendingSent, setPendingSent] = useState<any[]>([]);
  const [receivedProposals, setReceivedProposals] = useState<any[]>([]);
  const [sentProposals, setSentProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [justAccepted, setJustAccepted] = useState<{ name: string; userId: string } | null>(null);

  useEffect(() => {
    const t = searchParams.get('tab')?.toUpperCase();
    if (t === 'PENDING' || t === 'PROPOSALS' || t === 'CONNECTED') {
      setActiveTab(t as any);
    }
  }, [searchParams]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [connRes, pendingRes, proposalsRes] = await Promise.all([
        api.getConnections().catch(() => ({ connections: [] })),
        api.getPendingConnections().catch(() => ({ received: [], sent: [] })),
        api.getStartupProposals().catch(() => ({ received: [], sent: [] })),
      ]);

      let connList = connRes.connections || [];
      // Only keep PENDING items (backend may include accepted in its sent list in some versions)
      let rxList = (pendingRes.received || []).filter((r: any) => !r.status || r.status === 'PENDING');
      let txList = (pendingRes.sent || []).filter((r: any) => !r.status || r.status === 'PENDING');
      let rxProp = (proposalsRes as any)?.received || [];
      let txProp = (proposalsRes as any)?.sent || [];

      // Also merge with Supabase live connections and proposals
      if (user?.id) {
        try {
          const { data: supaConns } = await supabase
            .from('connections')
            .select('*')
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

          if (supaConns && supaConns.length > 0) {
            const otherIds = supaConns.map((c) => (c.sender_id === user.id ? c.receiver_id : c.sender_id));
            const { data: profiles } = await supabase
              .from('profiles')
              .select('*')
              .in('user_id', otherIds);
            const profMap = new Map((profiles || []).map((p) => [p.user_id, p]));

            for (const c of supaConns) {
              const otherId = c.sender_id === user.id ? c.receiver_id : c.sender_id;
              const p = profMap.get(otherId);
              const otherUserObj = {
                id: otherId,
                email: p?.email || '',
                role: p?.preferred_role || 'FOUNDER',
                isVerified: true,
                verificationBadge: 'Verified Member',
                profile: {
                  id: p?.id || otherId,
                  userId: otherId,
                  fullName: p?.full_name || 'Startup Builder',
                  avatar: p?.avatar,
                  headline: p?.headline || '',
                  location: p?.location || 'Remote',
                  preferredRole: p?.preferred_role,
                },
              };

              if (c.status === 'ACCEPTED') {
                // Ensure ACCEPTED connections are in connList for BOTH sender and receiver
                if (!connList.some((item: any) => item.connectionId === c.id || item.user?.id === otherId)) {
                  connList.push({
                    connectionId: c.id,
                    connectedAt: c.updated_at,
                    user: otherUserObj,
                  });
                }
                // Remove from pending lists if present (cleanup stale state)
                rxList = rxList.filter((item: any) => item.id !== c.id);
                txList = txList.filter((item: any) => item.id !== c.id);
              } else if (c.status === 'PENDING') {
                if (c.receiver_id === user.id) {
                  if (!rxList.some((item: any) => item.id === c.id || item.senderId === c.sender_id)) {
                    rxList.push({
                      id: c.id,
                      senderId: c.sender_id,
                      receiverId: c.receiver_id,
                      status: 'PENDING',
                      note: c.note,
                      createdAt: c.created_at,
                      sender: otherUserObj,
                    });
                  }
                } else if (c.sender_id === user.id) {
                  if (!txList.some((item: any) => item.id === c.id || item.receiverId === c.receiver_id)) {
                    txList.push({
                      id: c.id,
                      senderId: c.sender_id,
                      receiverId: c.receiver_id,
                      status: 'PENDING',
                      note: c.note,
                      createdAt: c.created_at,
                      receiver: otherUserObj,
                    });
                  }
                }
              }
            }
          }
        } catch (supaErr) {
          console.warn('Supabase network connections notice:', supaErr);
        }

        try {
          const { data: supaProps } = await supabase
            .from('startup_proposals')
            .select('*')
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

          if (supaProps && supaProps.length > 0) {
            const otherIds = supaProps.map((pr) => (pr.sender_id === user.id ? pr.receiver_id : pr.sender_id));
            const { data: profiles } = await supabase
              .from('profiles')
              .select('*')
              .in('user_id', otherIds);
            const profMap = new Map((profiles || []).map((p) => [p.user_id, p]));

            for (const pr of supaProps) {
              const otherId = pr.sender_id === user.id ? pr.receiver_id : pr.sender_id;
              const p = profMap.get(otherId);
              const otherUserObj = {
                id: otherId,
                email: p?.email || '',
                role: p?.preferred_role || 'FOUNDER',
                isVerified: true,
                verificationBadge: 'Verified Member',
                profile: {
                  id: p?.id || otherId,
                  fullName: p?.full_name || 'Startup Builder',
                  avatar: p?.avatar,
                  headline: p?.headline || '',
                },
              };

              if (pr.receiver_id === user.id) {
                if (!rxProp.some((item: any) => item.id === pr.id)) {
                  rxProp.push({
                    id: pr.id,
                    senderId: pr.sender_id,
                    receiverId: pr.receiver_id,
                    ideaTitle: pr.idea_title,
                    pitchDescription: pr.pitch_description,
                    proposedRole: pr.proposed_role,
                    proposedEquity: pr.proposed_equity,
                    status: pr.status || 'PENDING',
                    createdAt: pr.created_at,
                    sender: otherUserObj,
                  });
                }
              } else if (pr.sender_id === user.id) {
                if (!txProp.some((item: any) => item.id === pr.id)) {
                  txProp.push({
                    id: pr.id,
                    senderId: pr.sender_id,
                    receiverId: pr.receiver_id,
                    ideaTitle: pr.idea_title,
                    pitchDescription: pr.pitch_description,
                    proposedRole: pr.proposed_role,
                    proposedEquity: pr.proposed_equity,
                    status: pr.status || 'PENDING',
                    createdAt: pr.created_at,
                    receiver: otherUserObj,
                  });
                }
              }
            }
          }
        } catch (propErr) {
          console.warn('Supabase startup proposals notice:', propErr);
        }
      }

      setConnections(connList);
      setPendingReceived(rxList);
      setPendingSent(txList);
      setReceivedProposals(rxProp);
      setSentProposals(txProp);
    } catch (err) {
      console.error('Failed to load network connections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (!user?.id) return;

    const channel = supabase
      .channel(`network-conns:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections',
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleRespond = async (connectionId: string, action: 'ACCEPT' | 'REJECT', senderName?: string, senderId?: string) => {
    if (!user?.id) return;
    setActionLoading((prev) => ({ ...prev, [connectionId]: true }));
    try {
      const newStatus = action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';

      // 1. Find the connection in Supabase — try by ID first, then by sender/receiver
      let conn: any = null;
      const actualSenderId = senderId || null;

      // Try by ID
      const { data: connById } = await supabase
        .from('connections')
        .select('*')
        .eq('id', connectionId)
        .maybeSingle();

      if (connById) {
        conn = connById;
      } else if (actualSenderId) {
        // ID from Prisma backend doesn't match Supabase — find by sender/receiver pair
        const { data: connByPair } = await supabase
          .from('connections')
          .select('*')
          .eq('sender_id', actualSenderId)
          .eq('receiver_id', user.id)
          .maybeSingle();
        conn = connByPair;
      }

      // 2. Update in Supabase by sender_id + receiver_id (reliable regardless of ID source)
      if (actualSenderId) {
        await supabase
          .from('connections')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('sender_id', actualSenderId)
          .eq('receiver_id', user.id);
      }
      // Also try by ID as fallback
      await supabase
        .from('connections')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', connectionId);

      // 3. If accepted: create conversation + notify sender
      const resolvedSenderId = actualSenderId || conn?.sender_id;
      if (action === 'ACCEPT' && resolvedSenderId) {
        try {
          const [p1, p2] = [resolvedSenderId, user.id].sort();
          const { data: existingConv } = await supabase
            .from('conversations')
            .select('id')
            .eq('participant1_id', p1)
            .eq('participant2_id', p2)
            .maybeSingle();

          if (!existingConv) {
            await supabase.from('conversations').insert({
              participant1_id: p1,
              participant2_id: p2,
              last_message: 'Connected! Say hello and start collaborating.',
              last_message_at: new Date().toISOString(),
            });
          }
        } catch {}

        // Notify the sender about the acceptance
        try {
          const { data: myProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', user.id)
            .maybeSingle();
          const myName = myProfile?.full_name || 'Your connection';
          await supabase.from('notifications').insert({
            user_id: resolvedSenderId,
            sender_id: user.id,
            type: 'CONNECTION_ACCEPTED',
            title: '🎉 Connection Accepted!',
            message: `${myName} accepted your connection request. You are now connected — start a conversation!`,
            link: `/messages?user=${user.id}`,
            is_read: false,
            created_at: new Date().toISOString(),
          });
        } catch {}

        // Show "Let's Chat" banner
        setJustAccepted({
          name: senderName || 'Your new connection',
          userId: resolvedSenderId,
        });
        setTimeout(() => setJustAccepted(null), 6000);
      }

      // 4. Mark related notifications as read in Supabase
      if (resolvedSenderId) {
        try {
          await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('sender_id', resolvedSenderId)
            .eq('type', 'CONNECTION_REQUEST');
        } catch {}
      }

      // 5. Mirror to backend API
      try {
        await api.respondConnection(connectionId, action);
      } catch (e) {
        console.warn('Backend respondConnection notice:', e);
      }

      // 6. Broadcast event so profile and homepage update instantly
      window.dispatchEvent(new CustomEvent('connections_updated'));

      try {
        const broadcastChannel = supabase.channel('global-connections-broadcast');
        await broadcastChannel.send({
          type: 'broadcast',
          event: 'connection_changed',
          payload: {
            senderId: resolvedSenderId,
            receiverId: user?.id,
            action,
            timestamp: new Date().toISOString(),
          },
        });
        supabase.removeChannel(broadcastChannel);
      } catch {}

      // 7. Clean up local pending list immediately
      setPendingReceived((prev) =>
        prev.filter((r) => r.id !== connectionId && r.senderId !== resolvedSenderId && r.sender?.id !== resolvedSenderId)
      );

      await fetchData();
    } catch (err) {
      console.error(`Failed to ${action} connection:`, err);
      alert(`Unable to ${action.toLowerCase()} connection request. Please try again.`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [connectionId]: false }));
    }
  };

  const handleRemove = async (connectionId: string) => {
    if (!user?.id) return;
    if (!window.confirm('Are you sure you want to remove this connection?')) return;
    setActionLoading((prev) => ({ ...prev, [connectionId]: true }));
    try {
      // 1. Delete from Supabase
      const { error: supaErr } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (supaErr) {
        console.warn('Supabase delete connection notice:', supaErr);
      }

      // 2. Mirror to backend API
      try {
        await api.removeConnection(connectionId);
      } catch (e) {
        console.warn('Backend removeConnection notice:', e);
      }

      setConnections((prev) => prev.filter((c) => c.connectionId !== connectionId));
      setPendingSent((prev) => prev.filter((r) => r.id !== connectionId));

      // Broadcast event so profile and homepage update instantly
      window.dispatchEvent(new CustomEvent('connections_updated'));

      try {
        const broadcastChannel = supabase.channel('global-connections-broadcast');
        await broadcastChannel.send({
          type: 'broadcast',
          event: 'connection_changed',
          payload: {
            connectionId,
            userId: user?.id,
            action: 'REMOVED',
            timestamp: new Date().toISOString(),
          },
        });
        supabase.removeChannel(broadcastChannel);
      } catch {}

      await fetchData();
    } catch (err) {
      console.error('Failed to remove connection:', err);
      alert('Unable to remove connection. Please try again.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [connectionId]: false }));
    }
  };

  const handleRespondProposal = async (proposalId: string, status: 'ACCEPTED' | 'DECLINED') => {
    setActionLoading((prev) => ({ ...prev, [proposalId]: true }));
    try {
      try {
        await api.respondStartupProposal(proposalId, status);
      } catch (e) {
        console.warn('Backend respondStartupProposal notice:', e);
      }
      try {
        await supabase
          .from('startup_proposals')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('id', proposalId);
      } catch {}
      await fetchData();
    } catch (err) {
      console.error(`Failed to respond to startup proposal:`, err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [proposalId]: false }));
    }
  };

  const totalPending = pendingReceived.filter((r: any) => r.status !== 'ACCEPTED').length;
  const pendingProposalsCount = receivedProposals.filter((p) => p.status === 'PENDING').length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* "Let's Chat" success banner shown after accepting a connection */}
      {justAccepted && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                You're now connected with {justAccepted.name}!
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Both of your connection counts have been updated. Start a conversation!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate(`/messages?user=${justAccepted.userId}`)}
              className="btn-primary py-1.5 px-3 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <MessageSquare size={13} />
              <span>Let's Chat</span>
            </button>
            <button
              onClick={() => setJustAccepted(null)}
              className="p-1 text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-300"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="text-brand-600 dark:text-brand-400" size={24} /> My Startup Network
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your connections, invitations, and co-founder venture proposals.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-md bg-slate-100 dark:bg-dark-850 border border-slate-200 dark:border-dark-800 flex-wrap">
          <button
            onClick={() => setActiveTab('CONNECTED')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'CONNECTED'
                ? 'bg-white dark:bg-dark-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserCheck size={14} />
            <span>Connections ({connections.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('PENDING')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors relative cursor-pointer ${
              activeTab === 'PENDING'
                ? 'bg-white dark:bg-dark-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock size={14} />
            <span>Invitations</span>
            {totalPending > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {totalPending}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('PROPOSALS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors relative cursor-pointer ${
              activeTab === 'PROPOSALS'
                ? 'bg-white dark:bg-dark-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Rocket size={14} />
            <span>Startup Proposals</span>
            {pendingProposalsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">
                {pendingProposalsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-40 card-base bg-slate-100 dark:bg-dark-850 animate-pulse" />
          ))}
        </div>
      ) : activeTab === 'CONNECTED' ? (
        /* 1. CONNECTED MEMBERS */
        connections.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No connections yet"
            description="Explore the directory, match with prospective co-founders, and expand your network."
            actionLabel="Find Co-Founders"
            onAction={() => navigate('/cofounders')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connections.map((c) => {
              const u = c.user;
              const name = u?.profile?.fullName || (u?.email ? u.email.split('@')[0] : 'Member');
              const username = u?.profile?.username || (u?.email ? u.email.split('@')[0] : 'user');
              const headline = u?.profile?.headline || u?.role;
              const location = u?.profile?.location || 'Remote';

              return (
                <div
                  key={c.connectionId}
                  className="card-base p-4 sm:p-5 flex flex-col justify-between space-y-3 hover:border-slate-300 dark:hover:border-dark-700 transition-colors"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-3">
                      <Link to={`/profile/${u?.id}`}>
                        <Avatar
                          src={u?.profile?.avatar}
                          name={name}
                          size="md"
                          className="!w-11 !h-11 rounded-lg"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            to={`/profile/${u?.id}`}
                            className="font-semibold text-xs text-slate-900 dark:text-white hover:text-brand-600 transition-colors truncate"
                          >
                            {name}
                          </Link>
                          <RoleBadge role={u?.role || 'MEMBER'} size="sm" />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{headline}</p>
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
                              className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-850 text-slate-600 dark:text-slate-300 font-medium border border-slate-200/60 dark:border-dark-800"
                            >
                              {s.trim()}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between">
                    <button
                      onClick={() => navigate(`/messages?user=${u?.id}`)}
                      className="btn-primary py-1 px-3 text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <MessageSquare size={13} />
                      <span>Chat</span>
                    </button>

                    <button
                      onClick={() => handleRemove(c.connectionId)}
                      disabled={actionLoading[c.connectionId]}
                      title="Disconnect"
                      className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <UserX size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : activeTab === 'PENDING' ? (
        /* 2. PENDING REQUESTS */
        <div className="space-y-6">
          {/* Received Requests */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Invitations Received</span>
              <span className="px-2 py-0.5 rounded text-xs bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-semibold border border-brand-200/50 dark:border-brand-900/50">
                {pendingReceived.length}
              </span>
            </h3>

            {pendingReceived.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No pending connection invitations received.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingReceived.map((req) => {
                  const s = req.sender;
                  const name = s?.profile?.fullName || (s?.email ? s.email.split('@')[0] : 'Founder');
                  const username = s?.profile?.username || (s?.email ? s.email.split('@')[0] : 'user');
                  const headline = s?.profile?.headline || s?.role;

                  return (
                    <div
                      key={req.id}
                      className="card-base p-4 sm:p-5 space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <Link to={`/profile/${s?.id}`}>
                          <Avatar
                            src={s?.profile?.avatar}
                            name={name}
                            size="md"
                            className="!w-10 !h-10 rounded-lg"
                          />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                              to={`/profile/${s?.id}`}
                              className="font-semibold text-xs text-slate-900 dark:text-white hover:text-brand-600 truncate block"
                            >
                              {name}
                            </Link>
                            <span className="text-[11px] text-slate-400 font-mono">
                              @{username}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{headline}</p>
                        </div>
                      </div>

                      {req.note && (
                        <div className="p-2.5 rounded-md bg-slate-50 dark:bg-dark-850 border border-slate-200/80 dark:border-dark-800 text-xs text-slate-700 dark:text-slate-300 italic">
                          "{req.note}"
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-dark-800">
                        <button
                          onClick={() => handleRespond(
                            req.id,
                            'ACCEPT',
                            s?.profile?.fullName || (s?.email ? s.email.split('@')[0] : 'Your connection'),
                            s?.id
                          )}
                          disabled={actionLoading[req.id]}
                          className="btn-primary flex-1 py-1.5 px-3 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {actionLoading[req.id] ? (
                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Check size={13} />
                          )}
                          <span>Accept Connection</span>
                        </button>
                        <button
                          onClick={() => handleRespond(req.id, 'REJECT', undefined, s?.id || req.senderId)}
                          disabled={actionLoading[req.id]}
                          className="btn-secondary py-1.5 px-3 text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                        >
                          <X size={13} />
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
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-dark-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Invitations Sent</span>
              <span className="px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-dark-850 text-slate-600 dark:text-slate-400 font-semibold border border-slate-200/60 dark:border-dark-800">
                {pendingSent.length}
              </span>
            </h3>

            {pendingSent.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">No pending outgoing invitations.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingSent.map((req) => {
                  const r = req.receiver;
                  const name = r?.profile?.fullName || (r?.email ? r.email.split('@')[0] : 'User');
                  return (
                    <div
                      key={req.id}
                      className="card-base p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar
                          src={r?.profile?.avatar}
                          name={name}
                          size="sm"
                          className="!w-8 !h-8"
                        />
                        <div className="min-w-0">
                          <h4 className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                            {name}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{r?.profile?.headline || r?.role}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 shrink-0">
                          Pending
                        </span>
                        <button
                          onClick={() => handleRemove(req.id)}
                          disabled={actionLoading[req.id]}
                          className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors cursor-pointer px-1 py-0.5"
                          title="Withdraw invitation"
                        >
                          Withdraw
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 3. STARTUP PROPOSALS */
        <div className="space-y-6">
          {/* Received Proposals */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Rocket size={16} className="text-brand-600 dark:text-brand-400" />
              <span>Startup Co-Founding Proposals Received</span>
              <span className="px-2 py-0.5 rounded text-xs bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-semibold border border-brand-200/50 dark:border-brand-900/50">
                {receivedProposals.length}
              </span>
            </h3>

            {receivedProposals.length === 0 ? (
              <EmptyState
                icon={Rocket}
                title="No startup proposals received yet"
                description="Explore other founders and send them a proposal to build a venture together!"
                actionLabel="Explore Co-Founders"
                onAction={() => navigate('/cofounders')}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {receivedProposals.map((prop) => {
                  const s = prop.sender;
                  const name = s?.profile?.fullName || (s?.email ? s.email.split('@')[0] : 'Founder');
                  return (
                    <div
                      key={prop.id}
                      className="card-base p-4 sm:p-5 space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar
                              src={s?.profile?.avatar}
                              name={name}
                              size="md"
                              className="!w-9 !h-9 rounded-lg"
                            />
                            <div className="min-w-0">
                              <h4 className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                                {name}
                              </h4>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{s?.profile?.headline}</p>
                            </div>
                          </div>

                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                            prop.status === 'ACCEPTED'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60'
                              : prop.status === 'DECLINED'
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60'
                              : 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-900/60'
                          }`}>
                            {prop.status}
                          </span>
                        </div>

                        {/* Idea Title */}
                        <div className="p-3 rounded-md bg-slate-50 dark:bg-dark-850 border border-slate-200/80 dark:border-dark-800 space-y-1">
                          <span className="text-[10px] uppercase font-semibold text-brand-600 dark:text-brand-400 tracking-wide block">
                            Proposed Venture Idea:
                          </span>
                          <h4 className="font-semibold text-xs text-slate-900 dark:text-white">
                            {prop.ideaTitle}
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-0.5">
                            {prop.pitchDescription}
                          </p>
                        </div>

                        {/* Terms */}
                        <div className="flex items-center gap-2 text-xs flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-850 text-slate-700 dark:text-slate-300 font-medium border border-slate-200/60 dark:border-dark-800 text-[11px]">
                            Role: {prop.proposedRole}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-200/50 dark:border-emerald-900/50 text-[11px]">
                            Equity: {prop.proposedEquity}
                          </span>
                        </div>
                      </div>

                      {/* Response actions if pending */}
                      {prop.status === 'PENDING' ? (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-dark-800">
                          <button
                            onClick={() => handleRespondProposal(prop.id, 'ACCEPTED')}
                            disabled={actionLoading[prop.id]}
                            className="btn-primary flex-1 py-1.5 px-3 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Check size={13} />
                            <span>Accept Offer</span>
                          </button>
                          <button
                            onClick={() => handleRespondProposal(prop.id, 'DECLINED')}
                            disabled={actionLoading[prop.id]}
                            className="btn-secondary py-1.5 px-3 text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                          >
                            <X size={13} />
                            <span>Decline</span>
                          </button>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-slate-100 dark:border-dark-800 text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between flex-wrap gap-2">
                          <span>{prop.status === 'ACCEPTED' ? '🎉 Offer Accepted! You are now connected partners.' : 'Offer declined.'}</span>
                          {prop.status === 'ACCEPTED' && (
                            <button
                              onClick={() => navigate(`/messages?user=${prop.senderId || prop.sender?.id}`)}
                              className="btn-primary !py-1 !px-2.5 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <MessageSquare size={13} />
                              <span>Chat Now</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sent Proposals */}
          {sentProposals.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-dark-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Proposals Sent by You ({sentProposals.length})</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sentProposals.map((prop) => {
                  const r = prop.receiver;
                  const name = r?.profile?.fullName || (r?.email ? r.email.split('@')[0] : 'Founder');
                  return (
                    <div
                      key={prop.id}
                      className="card-base p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar
                            src={r?.profile?.avatar}
                            name={name}
                            size="xs"
                            className="!w-7 !h-7"
                          />
                          <span className="font-semibold text-xs text-slate-900 dark:text-white">{name}</span>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          prop.status === 'ACCEPTED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60'
                            : prop.status === 'DECLINED'
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60'
                        }`}>
                          {prop.status}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                        "{prop.ideaTitle}"
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {prop.proposedRole} • {prop.proposedEquity}
                      </div>

                      {prop.status === 'ACCEPTED' && (
                        <div className="pt-1.5 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between">
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Partner Accepted!</span>
                          <button
                            onClick={() => navigate(`/messages?user=${prop.receiverId || prop.receiver?.id}`)}
                            className="btn-primary !py-1 !px-2.5 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <MessageSquare size={12} />
                            <span>Chat Now</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
