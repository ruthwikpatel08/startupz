import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, upsertUserProfile, recordAuthProviderHint, fetchUserProfile } from '../../lib/supabase';
import { api } from '../../services/api';
import {
  Rocket,
  AlertCircle,
  RefreshCw,
  Users,
  Megaphone,
  TrendingUp,
  Code,
  Palette,
  GraduationCap,
  BriefcaseBusiness,
  Check,
  Sparkles,
  MapPin,
  AtSign,
  ArrowRight,
} from 'lucide-react';

interface RoleCategoryOption {
  id: string;
  label: string;
  icon: React.ElementType;
  desc: string;
  defaultHeadline: string;
}

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Google user setup state
  const [isNewUser, setIsNewUser] = useState(false);
  const [authUser, setAuthUser] = useState<any | null>(null);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('');
  const [selectedRole, setSelectedRole] = useState('Founders');
  const [headline, setHeadline] = useState('Founder & Visionary | Building Startup');
  const [location, setLocation] = useState('Remote');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleCategories: RoleCategoryOption[] = [
    {
      id: 'Founders',
      label: 'Founder',
      icon: Rocket,
      desc: 'Active founder building or launching a venture.',
      defaultHeadline: 'Founder & Visionary | Startup Builder',
    },
    {
      id: 'Co-Founders',
      label: 'Co-Founder',
      icon: Users,
      desc: 'Seeking a synergy partner or looking to join an early team.',
      defaultHeadline: 'Co-Founder | Technical & Product Partner',
    },
    {
      id: 'Marketers',
      label: 'Marketer',
      icon: Megaphone,
      desc: 'Growth lead, performance marketer, GTM strategist.',
      defaultHeadline: 'Growth Marketer | Demand & Traction Lead',
    },
    {
      id: 'Investors',
      label: 'Investor',
      icon: TrendingUp,
      desc: 'Angel investor, syndicate backer, or venture capitalist.',
      defaultHeadline: 'Angel Investor | Early-Stage Backer',
    },
    {
      id: 'Developer',
      label: 'Developer / Engineer',
      icon: Code,
      desc: 'Software engineer, technical builder, AI engineer.',
      defaultHeadline: 'Software Engineer | Technical Builder',
    },
    {
      id: 'Designer',
      label: 'Designer',
      icon: Palette,
      desc: 'UI/UX architect, brand designer, product design lead.',
      defaultHeadline: 'Product & UI/UX Designer | Creative Lead',
    },
    {
      id: 'Mentor',
      label: 'Mentor / Advisor',
      icon: GraduationCap,
      desc: 'Experienced advisor, startup mentor, executive coach.',
      defaultHeadline: 'Startup Mentor & Strategic Advisor',
    },
    {
      id: 'Other',
      label: 'Other / Operator',
      icon: BriefcaseBusiness,
      desc: 'Startup enthusiast, community builder, operator.',
      defaultHeadline: 'Startup Operator & Ecosystem Member',
    },
  ];

  useEffect(() => {
    let isSubscribed = true;

    const handleCallback = async () => {
      // 1. Check for error in query params (e.g. user denied consent)
      const errorParam = searchParams.get('error_description') || searchParams.get('error');
      if (errorParam) {
        if (isSubscribed) {
          setErrorMessage(errorParam.replace(/\+/g, ' '));
        }
        return;
      }

      try {
        // 2. Obtain session from Supabase client
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (session?.user) {
          const user = session.user;

          // Record Google auth provider hint
          if (user.email) {
            recordAuthProviderHint(user.email, 'google');
          }

          // Check if profile exists in public.profiles
          const existingProfile = await fetchUserProfile(user.id);

          // If existing profile has a preferred_role already, they are an existing user!
          // Proceed directly to dashboard without interrupting them.
          if (existingProfile && existingProfile.preferred_role) {
            if (isSubscribed) {
              navigate('/dashboard', { replace: true });
            }
            return;
          }

          // BRAND NEW USER: prompt them to choose their category and set their profile!
          const userFullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0] ||
            'Member';

          const userAvatar =
            user.user_metadata?.avatar_url ||
            user.user_metadata?.picture ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userFullName)}&backgroundColor=4f46e5,06b6d4,10b981`;

          const cleanUsername = (user.email?.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '');

          // Check if user pre-selected a role on the register page
          let savedMeta: any = {};
          try {
            const rawMeta = localStorage.getItem('startupz_oauth_meta');
            if (rawMeta) savedMeta = JSON.parse(rawMeta);
          } catch {
            // Ignore
          }

          const initialRole = savedMeta.role === 'COFOUNDER' ? 'Co-Founders' : (savedMeta.role ? savedMeta.role : 'Founders');
          const matchedCategory = roleCategories.find((r) => r.id.toLowerCase() === initialRole.toLowerCase());

          if (isSubscribed) {
            setAuthUser(user);
            setFullName(userFullName);
            setUsername(cleanUsername);
            setAvatar(userAvatar);
            setSelectedRole(matchedCategory ? matchedCategory.id : 'Founders');
            setHeadline(savedMeta.headline || matchedCategory?.defaultHeadline || 'Founder & Visionary | Startup Builder');
            setLocation(savedMeta.location || 'Remote');
            setIsNewUser(true);
          }
          return;
        }

        // If session not ready yet, listen for the SIGNED_IN event
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (event === 'SIGNED_IN' && newSession?.user) {
            const user = newSession.user;
            if (user.email) {
              recordAuthProviderHint(user.email, 'google');
            }

            const existing = await fetchUserProfile(user.id);
            if (existing && existing.preferred_role) {
              if (isSubscribed) {
                navigate('/dashboard', { replace: true });
              }
            } else {
              const userFullName =
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.email?.split('@')[0] ||
                'Member';

              const userAvatar =
                user.user_metadata?.avatar_url ||
                user.user_metadata?.picture ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userFullName)}&backgroundColor=4f46e5,06b6d4,10b981`;

              if (isSubscribed) {
                setAuthUser(user);
                setFullName(userFullName);
                setUsername((user.email?.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9_]/g, ''));
                setAvatar(userAvatar);
                setSelectedRole('Founders');
                setHeadline('Founder & Visionary | Startup Builder');
                setLocation('Remote');
                setIsNewUser(true);
              }
            }
          }
        });

        // Timeout fallback if session doesn't arrive within 8 seconds
        const timer = setTimeout(() => {
          if (isSubscribed && !isNewUser) {
            setErrorMessage('Authentication timed out. Please try signing in again.');
          }
        }, 8000);

        return () => {
          subscription.unsubscribe();
          clearTimeout(timer);
        };
      } catch (err: any) {
        if (isSubscribed) {
          setErrorMessage(err.message || 'Failed to complete authentication. Please try again.');
        }
      }
    };

    handleCallback();

    return () => {
      isSubscribed = false;
    };
  }, [navigate, searchParams]);

  const handleCategorySelect = (roleId: string, defaultHeadline: string) => {
    setSelectedRole(roleId);
    setHeadline(defaultHeadline);
  };

  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || authUser.email?.split('@')[0] || 'user';
      const cleanFullName = fullName.trim() || 'Member';
      const cleanHeadline = headline.trim() || `${selectedRole} | Startup Builder`;
      const cleanLocation = location.trim() || 'Remote';

      // 1. Save profile to Supabase public.profiles
      await upsertUserProfile(authUser.id, {
        full_name: cleanFullName,
        username: cleanUsername,
        headline: cleanHeadline,
        location: cleanLocation,
        avatar,
        preferred_role: selectedRole,
        auth_provider: 'google',
        email: authUser.email || '',
        open_to: selectedRole === 'Co-Founders' ? 'Co-Founder,Startup Team' : 'Co-Founder,Startup Team,Investment',
        profile_completion: 75,
      });

      // 2. Clear any temporary OAuth meta
      localStorage.removeItem('startupz_oauth_meta');

      // 3. Sync to backend API if available
      try {
        await api.syncAuth({
          id: authUser.id,
          email: authUser.email,
          fullName: cleanFullName,
          role: selectedRole.toUpperCase(),
          headline: cleanHeadline,
          location: cleanLocation,
          avatar,
        });
      } catch {
        // Backend offline fallback
      }

      // 4. Navigate to dashboard
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save your profile category. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (errorMessage) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-5">
          <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Authentication Notice
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {errorMessage}
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-md transition-all text-sm cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // NEW USER CATEGORY & PROFILE SETUP VIEW
  if (isNewUser) {
    return (
      <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="max-w-3xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 animate-in fade-in duration-300">
          
          {/* Welcome Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 text-xs font-bold border border-brand-200 dark:border-brand-800">
              <Sparkles size={13} /> Welcome to StartupZ
            </div>
            
            <div className="flex flex-col items-center gap-3 pt-2">
              <img
                src={avatar}
                alt={fullName}
                className="w-16 h-16 rounded-full object-cover border-2 border-brand-500 shadow-md"
              />
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                  Welcome, {fullName.split(' ')[0]}!
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-lg mx-auto">
                  Which category do you belong to? Choose your role below so we place you in the right directory and connect you with matching co-founders, builders, or investors.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleCompleteSetup} className="space-y-6">
            
            {/* Category Selector Grid */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                1. Select Which Category You Belong To
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {roleCategories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedRole === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategorySelect(cat.id, cat.defaultHeadline)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 text-left ${
                        isSelected
                          ? 'bg-brand-50 dark:bg-brand-950/80 border-brand-600 dark:border-brand-500 ring-2 ring-brand-500/30 shadow-md'
                          : 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-brand-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`p-2 rounded-xl ${
                            isSelected
                              ? 'bg-brand-600 text-white'
                              : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <Icon size={18} />
                        </span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">
                          {cat.label}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                          {cat.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Profile Fields */}
            <div className="space-y-4 pt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                2. Confirm Your Details
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <AtSign size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Professional Headline
                </label>
                <input
                  type="text"
                  required
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Co-Founder | Full Stack Engineer or Founder & CEO"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Location
                </label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Bengaluru, India or Remote"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm transition-all shadow-lg shadow-brand-500/25 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Saving Profile & Entering StartupZ...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Profile & Enter StartupZ</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // DEFAULT CONNECTING LOADER
  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-5">
        <div className="w-14 h-14 bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 rounded-2xl flex items-center justify-center mx-auto">
          <Rocket size={28} className="animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Connecting to StartupZ...
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Verifying your Google session and preparing your profile.
        </p>
        <div className="flex justify-center pt-2">
          <RefreshCw size={22} className="text-brand-500 animate-spin" />
        </div>
      </div>
    </div>
  );
};
