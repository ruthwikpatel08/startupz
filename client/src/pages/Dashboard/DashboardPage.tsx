import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Startup, User, StartupOpportunity, Post } from '../../types';
import { VerificationBadge } from '../../components/common/Badge';
import { ConnectModal } from '../../components/common/ConnectModal';
import {
  Rocket,
  Users,
  Compass,
  Briefcase,
  TrendingUp,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Plus,
  MessageSquare,
  Bookmark,
  Building,
  UserPlus,
  Heart,
  MessageCircle,
  Crown,
  Share2,
  ShieldCheck,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const [recommendedPeople, setRecommendedPeople] = useState<User[]>([]);
  const [recommendedStartups, setRecommendedStartups] = useState<Startup[]>([]);
  const [opportunities, setOpportunities] = useState<StartupOpportunity[]>([]);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [connectUser, setConnectUser] = useState<any | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [peopleRes, startupsRes, oppsRes, postsRes, connRes] = await Promise.all([
          api.getRecommendedPeople().catch(() => ({ recommendations: [] })),
          api.getRecommendedStartups().catch(() => ({ recommendations: [] })),
          api.getOpportunities('limit=4').catch(() => ({ opportunities: [] })),
          api.getPosts('limit=3').catch(() => ({ posts: [] })),
          api.getPendingConnections().catch(() => ({ received: [] })),
        ]);

        setRecommendedPeople(peopleRes.recommendations || peopleRes.matches || []);
        setRecommendedStartups(startupsRes.recommendations || startupsRes.startups || []);
        setOpportunities(oppsRes.opportunities || []);
        setRecentPosts(postsRes.posts || []);
        setPendingRequests(connRes.received || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const profileCompletion = user?.profile?.profileCompletion || 65;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* 1. WELCOME BANNER & PROFILE COMPLETION */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 via-indigo-600 to-cyan-600 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md">
                {user?.role || 'FOUNDER'} PORTAL
              </span>
              <VerificationBadge badge={user?.verificationBadge} isVerified={user?.isVerified} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.profile?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Builder'}! 👋
            </h1>
            <p className="text-sm text-brand-100 leading-relaxed">
              Find the right people. Build the right startup. Here is what is happening across your network today.
            </p>
          </div>

          {/* Profile Progress Box */}
          <div className="w-full md:w-72 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shrink-0">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span>Profile Strength</span>
              <span>{profileCompletion}% Complete</span>
            </div>
            <div className="w-full h-2.5 bg-black/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-300 rounded-full transition-all duration-500"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-3 text-xs">
              <span className="text-brand-100 text-[11px]">
                {profileCompletion >= 80 ? '🔥 High match readiness' : 'Add skills to boost matching'}
              </span>
              <Link
                to={`/profile/${user?.id}`}
                className="font-bold underline text-white hover:text-cyan-200"
              >
                Complete
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. STATS QUICK ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/cofounders"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users size={18} />
            </div>
            <span className="text-xs font-bold text-slate-400 group-hover:text-brand-600">Browse →</span>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white">Co-Founders</div>
          <div className="text-xs text-slate-500 mt-0.5">Compatible talent matching</div>
        </Link>

        <Link
          to="/network"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <UserPlus size={18} />
            </div>
            <span className="text-xs font-bold text-slate-400 group-hover:text-cyan-600">Network →</span>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white">My Network</div>
          <div className="text-xs text-slate-500 mt-0.5">Connections & Invitations</div>
        </Link>

        <Link
          to="/memberships"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Crown size={18} />
            </div>
            <span className="text-xs font-bold text-slate-400 group-hover:text-amber-600">Plans →</span>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white">Memberships</div>
          <div className="text-xs text-slate-500 mt-0.5">Basic, Pro & Premium</div>
        </Link>

        <Link
          to="/feed"
          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Share2 size={18} />
            </div>
            <span className="text-xs font-bold text-slate-400 group-hover:text-emerald-600">Updates →</span>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white">Community Feed</div>
          <div className="text-xs text-slate-500 mt-0.5">Ecosystem posts & launches</div>
        </Link>
      </div>

      {/* 3. MAIN DASHBOARD CONTENT: 2-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2 Cols wide): Recommended People, Startups, Feed */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Recommended Co-Founders / People */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users size={18} className="text-brand-600" /> Recommended Co-Founders
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Algorithmic matches based on complementary skills and shared stage
                </p>
              </div>
              <Link
                to="/cofounders"
                className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
              >
                View all ({recommendedPeople.length})
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recommendedPeople.slice(0, 4).map((p: any) => (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.profile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${p.profile?.fullName || p.email}`}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/profile/${p.id}`}
                          className="font-bold text-xs text-slate-900 dark:text-white hover:text-brand-600 truncate block"
                        >
                          {p.profile?.fullName || p.email}
                        </Link>
                        <p className="text-[11px] text-slate-500 truncate">{p.profile?.headline || p.role}</p>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      💡 {p.recommendationReason || p.matchExplanation || 'Complementary startup background'}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-400">
                      {p.profile?.location || 'Remote'}
                    </span>
                    <button
                      onClick={() => setConnectUser(p.profile ? { id: p.id, ...p.profile } : p)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950 transition-colors"
                    >
                      <UserPlus size={13} /> Connect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Startups */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Compass size={18} className="text-cyan-600" /> Startups Seeking Your Skills
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ventures aligned with your industry experience
                </p>
              </div>
              <Link
                to="/startups"
                className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Explore all
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recommendedStartups.slice(0, 4).map((s: any) => (
                <Link
                  key={s.id}
                  to={`/startups/${s.id}`}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-brand-500 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 uppercase">
                        {s.stage}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">{s.industry}</span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-brand-600 truncate">
                      {s.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {s.oneLineDescription}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border-t border-slate-200/60 dark:border-slate-800">
                    {s.recommendationReason || 'Matches your preferred industry profile'}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Feed Highlights */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500" /> Recent Network Updates
              </h3>
              <Link to="/feed" className="text-xs font-bold text-brand-600 hover:underline">
                Open Feed →
              </Link>
            </div>

            <div className="space-y-3">
              {recentPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950 text-brand-600">
                        {post.postType}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {post.author?.profile?.fullName || 'Community Member'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {post.title && <h5 className="font-bold text-xs text-slate-900 dark:text-white mb-1">{post.title}</h5>}
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {post.content}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Sidebar: Membership Plan, Connection Requests, Opportunities */}
        <div className="space-y-6">
          
          {/* Membership & Plan Status Card */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Crown size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Membership Tier</span>
                  <h4 className="text-sm font-bold text-white">Standard Founder Plan</h4>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Active
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Unlimited co-founder connections, 100 AI Scout queries, and directory priority.
            </p>

            <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
              <Link
                to="/memberships"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
              >
                <span>View Benefits & Upgrade</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Pending Connection Requests */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <UserPlus size={16} className="text-brand-600" /> Connection Requests
              </h4>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600">
                {pendingRequests.length}
              </span>
            </div>

            {pendingRequests.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No pending requests.</p>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs space-y-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={req.sender?.profile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${req.sender?.profile?.fullName}`}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold truncate">{req.sender?.profile?.fullName}</div>
                        <div className="text-[10px] text-slate-400 truncate">{req.sender?.profile?.headline}</div>
                      </div>
                    </div>
                    {req.note && (
                      <p className="text-[11px] text-slate-500 italic">"{req.note}"</p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <Link
                        to="/network"
                        className="w-full text-center py-1 rounded-lg bg-brand-600 text-white font-bold text-[11px]"
                      >
                        Respond
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Opportunities */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Briefcase size={16} className="text-cyan-600" /> Early-Stage Roles
              </h4>
              <Link to="/opportunities" className="text-xs text-brand-600 hover:underline">
                View all
              </Link>
            </div>

            <div className="space-y-2.5">
              {opportunities.map((opp) => (
                <Link
                  key={opp.id}
                  to="/opportunities"
                  className="block p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="font-bold text-xs text-slate-900 dark:text-white truncate">{opp.role}</div>
                  <div className="text-[11px] text-slate-500 truncate">{opp.startup?.name} • {opp.compensation}</div>
                </Link>
              ))}
            </div>
          </div>

        </div>

      </div>

      <ConnectModal
        isOpen={!!connectUser}
        onClose={() => setConnectUser(null)}
        targetUser={connectUser}
      />
    </div>
  );
};
