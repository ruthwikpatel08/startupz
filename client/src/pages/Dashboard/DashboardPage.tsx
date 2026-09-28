import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Startup, User, StartupOpportunity, Post } from '../../types';
import { VerificationBadge } from '../../components/common/Badge';
import { ConnectModal } from '../../components/common/ConnectModal';
import { Avatar } from '../../components/common/Avatar';
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
      <div className="rounded-xl bg-slate-900 dark:bg-slate-850 p-5 sm:p-6 text-white border border-slate-800 shadow-subtle">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {user?.role || 'FOUNDER'} PORTAL
              </span>
              <VerificationBadge badge={user?.verificationBadge} isVerified={user?.isVerified} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Welcome back, {user?.profile?.fullName?.split(' ')[0] || user?.email?.split('@')[0] || 'Builder'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Find collaborators, discover opportunities, and manage ecosystem connections.
            </p>
          </div>

          {/* Profile Progress Box */}
          <div className="w-full md:w-64 bg-slate-800/80 border border-slate-700/80 p-3.5 rounded-lg shrink-0">
            <div className="flex items-center justify-between text-xs font-medium mb-1.5 text-slate-300">
              <span>Profile Strength</span>
              <span className="font-semibold text-white">{profileCompletion}%</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-500"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2.5 text-[11px]">
              <span className="text-slate-400">
                {profileCompletion >= 80 ? 'High match readiness' : 'Complete details to match'}
              </span>
              <Link
                to={`/profile/${user?.id}`}
                className="font-medium text-brand-400 hover:underline"
              >
                Edit
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. STATS QUICK ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-sans">
        <Link
          to="/cofounders"
          className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group shadow-subtle"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-md bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-200/50 dark:border-brand-900/50">
              <Users size={16} />
            </div>
            <span className="text-xs text-slate-400 group-hover:text-brand-600">Browse →</span>
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">Co-Founders</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Compatible talent matching</div>
        </Link>

        <Link
          to="/network"
          className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group shadow-subtle"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-slate-700">
              <UserPlus size={16} />
            </div>
            <span className="text-xs text-slate-400 group-hover:text-brand-600">Network →</span>
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">My Network</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Connections & requests</div>
        </Link>

        <Link
          to="/memberships"
          className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group shadow-subtle"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-md bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/50 dark:border-amber-900/50">
              <Crown size={16} />
            </div>
            <span className="text-xs text-slate-400 group-hover:text-amber-600">Plans →</span>
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">Memberships</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Standard & Pro tiers</div>
        </Link>

        <Link
          to="/feed"
          className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group shadow-subtle"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-slate-700">
              <Share2 size={16} />
            </div>
            <span className="text-xs text-slate-400 group-hover:text-brand-600">Feed →</span>
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">Community Feed</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Ecosystem updates</div>
        </Link>
      </div>

      {/* 3. MAIN DASHBOARD CONTENT: 2-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
        
        {/* Left Column (2 Cols wide): Recommended People, Startups, Feed */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Recommended Co-Founders / People */}
          <div className="p-5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users size={16} className="text-brand-600" /> Recommended Co-Founders
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Algorithmic matches based on complementary skills
                </p>
              </div>
              <Link
                to="/cofounders"
                className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
              >
                View all ({recommendedPeople.length})
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recommendedPeople.slice(0, 4).map((p: any) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        src={p.profile?.avatar}
                        name={p.profile?.fullName || p.email}
                        size="md"
                        className="!w-9 !h-9"
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/profile/${p.id}`}
                          className="font-semibold text-xs text-slate-900 dark:text-white hover:text-brand-600 truncate block"
                        >
                          {p.profile?.fullName || p.email}
                        </Link>
                        <p className="text-[11px] text-slate-500 truncate">{p.profile?.headline || p.role}</p>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-md border border-slate-200 dark:border-slate-800">
                      {p.recommendationReason || p.matchExplanation || 'Complementary startup background'}
                    </p>
                  </div>

                  <div className="pt-2.5 mt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-400">
                      {p.profile?.location || 'Remote'}
                    </span>
                    <button
                      onClick={() => setConnectUser(p.profile ? { id: p.id, ...p.profile } : p)}
                      className="btn-secondary !text-xs !py-1 !px-2 flex items-center gap-1"
                    >
                      <UserPlus size={12} /> Connect
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Startups */}
          <div className="p-5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Compass size={16} className="text-brand-600" /> Startups Seeking Your Skills
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Ventures aligned with your industry experience
                </p>
              </div>
              <Link
                to="/startups"
                className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
              >
                Explore all
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recommendedStartups.slice(0, 4).map((s: any) => (
                <Link
                  key={s.id}
                  to={`/startups/${s.id}`}
                  className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                        {s.stage}
                      </span>
                      <span className="text-[10px] text-slate-400">{s.industry}</span>
                    </div>
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-brand-600 truncate">
                      {s.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {s.oneLineDescription}
                    </p>
                  </div>

                  <div className="mt-2.5 pt-2 text-[11px] font-medium text-slate-600 dark:text-slate-400 border-t border-slate-200/80 dark:border-slate-800">
                    {s.recommendationReason || 'Matches your preferred industry profile'}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Feed Highlights */}
          <div className="p-5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles size={15} className="text-brand-600" /> Recent Network Updates
              </h3>
              <Link to="/feed" className="text-xs font-medium text-brand-600 hover:underline">
                Open Feed →
              </Link>
            </div>

            <div className="space-y-2.5">
              {recentPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-900">
                        {post.postType}
                      </span>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        {post.author?.profile?.fullName || 'Community Member'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {post.title && <h5 className="font-semibold text-xs text-slate-900 dark:text-white mb-1">{post.title}</h5>}
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {post.content}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Sidebar: Membership Plan, Connection Requests, Opportunities */}
        <div className="space-y-4">
          
          {/* Membership & Plan Status Card */}
          <div className="p-4 rounded-lg bg-slate-900 text-white border border-slate-800 shadow-subtle space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Crown size={15} />
                </div>
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Membership Tier</span>
                  <h4 className="text-xs font-semibold text-white">Standard Founder Plan</h4>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Active
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Unlimited co-founder connections, AI Scout queries, and directory listing.
            </p>

            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <Link
                to="/memberships"
                className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 hover:underline transition-colors"
              >
                <span>View Details & Tiers</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          {/* Pending Connection Requests */}
          <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <UserPlus size={14} className="text-brand-600" /> Connection Requests
              </h4>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {pendingRequests.length}
              </span>
            </div>

            {pendingRequests.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">No pending requests.</p>
            ) : (
              <div className="space-y-2">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/40 text-xs space-y-1.5 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Avatar
                        src={req.sender?.profile?.avatar}
                        name={req.sender?.profile?.fullName}
                        size="sm"
                        className="!w-7 !h-7"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs truncate">{req.sender?.profile?.fullName}</div>
                        <div className="text-[10px] text-slate-400 truncate">{req.sender?.profile?.headline}</div>
                      </div>
                    </div>
                    {req.note && (
                      <p className="text-[11px] text-slate-500 italic">"{req.note}"</p>
                    )}
                    <div className="flex items-center gap-2 pt-0.5">
                      <Link
                        to="/network"
                        className="btn-primary w-full !text-[11px] !py-1 text-center block"
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
          <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-subtle">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Briefcase size={14} className="text-brand-600" /> Early-Stage Roles
              </h4>
              <Link to="/opportunities" className="text-xs font-medium text-brand-600 hover:underline">
                View all
              </Link>
            </div>

            <div className="space-y-2">
              {opportunities.map((opp) => (
                <Link
                  key={opp.id}
                  to="/opportunities"
                  className="block p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/60 dark:border-slate-800"
                >
                  <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">{opp.role}</div>
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
