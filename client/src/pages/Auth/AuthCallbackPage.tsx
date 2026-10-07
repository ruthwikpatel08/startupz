import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, upsertUserProfile, recordAuthProviderHint, fetchUserProfile } from '../../lib/supabase';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
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
  Briefcase,
  Check,
  Sparkles,
  MapPin,
  AtSign,
  ArrowRight,
  User,
  FileText,
  CheckSquare,
  Square,
} from 'lucide-react';
import { UserRole } from '../../types';

interface RoleCategoryOption {
  id: UserRole;
  label: string;
  icon: React.ElementType;
  desc: string;
  defaultHeadline: string;
}

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateUser } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Google user setup state
  const [isNewUser, setIsNewUser] = useState(false);
  const [authUser, setAuthUser] = useState<any | null>(null);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('STUDENT');
  const [customRoleDescription, setCustomRoleDescription] = useState('');
  const [headline, setHeadline] = useState('Student Builder & Campus Innovator');
  const [location, setLocation] = useState('Remote');
  const [oneLineBio, setOneLineBio] = useState('');
  const [bio, setBio] = useState('');
  const [openTo, setOpenTo] = useState<string[]>([
    'Co-Founder',
    'Startup Team',
    'Investment',
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleCategories: RoleCategoryOption[] = [
    {
      id: 'STUDENT',
      label: 'Student',
      icon: GraduationCap,
      desc: 'College/university student, student researcher & builder.',
      defaultHeadline: 'Student Builder & Campus Innovator',
    },
    {
      id: 'OTHER',
      label: 'Others',
      icon: Briefcase,
      desc: 'Operator, specialist, professional, ecosystem enthusiast.',
      defaultHeadline: 'Startup Operator & Ecosystem Member',
    },
    {
      id: 'FOUNDER',
      label: 'Founder',
      icon: Rocket,
      desc: 'Building a startup, looking for co-founders & capital.',
      defaultHeadline: 'Founder & Visionary | Startup Builder',
    },
    {
      id: 'COFOUNDER',
      label: 'Co-Founder',
      icon: Users,
      desc: 'Seeking a synergy partner or looking to join an early team.',
      defaultHeadline: 'Co-Founder | Technical & Product Partner',
    },
    {
      id: 'DEVELOPER',
      label: 'Developer / Engineer',
      icon: Code,
      desc: 'Software engineer, technical builder, AI engineer.',
      defaultHeadline: 'Software Engineer | Technical Builder',
    },
    {
      id: 'MARKETER',
      label: 'Marketer',
      icon: Megaphone,
      desc: 'Growth lead, performance marketer, GTM strategist.',
      defaultHeadline: 'Growth Marketer | Demand & Traction Lead',
    },
    {
      id: 'INVESTOR',
      label: 'Investor',
      icon: TrendingUp,
      desc: 'Angel investor, syndicate backer, or venture capitalist.',
      defaultHeadline: 'Angel Investor | Early-Stage Backer',
    },
    {
      id: 'MENTOR',
      label: 'Mentor / Advisor',
      icon: Sparkles,
      desc: 'Experienced advisor, startup mentor, executive coach.',
      defaultHeadline: 'Startup Mentor & Strategic Advisor',
    },
  ];

  const openToOptions = [
    'Co-Founder',
    'Startup Team',
    'Investment',
    'Mentorship',
    'Advisory',
  ];

  const toggleOpenTo = (option: string) => {
    setOpenTo((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  };

  useEffect(() => {
    let isSubscribed = true;

    const isUserExistingAccount = (_user: any, profile: any): boolean => {
      // 1. If the user's profile already has category/details confirmed (is_category_selected === true)
      if (profile?.is_category_selected === true) {
        return true;
      }
      // 2. If the profile already has non-empty custom bio or skills (previously filled profile)
      if (profile?.bio || profile?.skills || profile?.startup_interests) {
        return true;
      }
      return false;
    };

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
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (session?.user) {
          const user = session.user;

          // Record Google auth provider hint
          if (user.email) {
            recordAuthProviderHint(user.email, 'google');
          }

          // Check if profile exists in public.profiles and has completed details
          const existingProfile = await fetchUserProfile(user.id);

          // If this is an existing user who already completed setup, navigate immediately to dashboard
          if (isUserExistingAccount(user, existingProfile)) {
            if (isSubscribed) {
              navigate('/', { replace: true });
            }
            return;
          }

          // Otherwise, they are a brand-new user signing up via Google! Prompt them for details:
          const userFullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0] ||
            'Member';

          const userAvatar =
            user.user_metadata?.avatar_url ||
            user.user_metadata?.picture ||
            '';

          let initialRole: UserRole = 'STUDENT';
          let initialHeadline = 'Student Builder & Campus Innovator';
          let initialLocation = 'Remote';
          let initialCustomRole = '';

          try {
            const rawMeta = localStorage.getItem('startupz_oauth_meta');
            if (rawMeta) {
              const meta = JSON.parse(rawMeta);
              if (meta.role) {
                if (meta.role.startsWith('Other:')) {
                  initialRole = 'OTHER';
                  initialCustomRole = meta.role.replace(/^Other:\s*/, '');
                } else {
                  initialRole = meta.role as UserRole;
                }
              }
              if (meta.headline) initialHeadline = meta.headline;
              if (meta.location) initialLocation = meta.location;
              if (meta.customRole) initialCustomRole = meta.customRole;
            }
          } catch {}

          if (isSubscribed) {
            setAuthUser(user);
            setFullName(userFullName);
            setUsername((user.email?.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9_]/g, ''));
            setAvatar(userAvatar);
            setSelectedRole(initialRole);
            setCustomRoleDescription(initialCustomRole);
            setHeadline(initialHeadline);
            setLocation(initialLocation);
            setIsNewUser(true);
          }
          return;
        }

        // If session not ready yet, listen for the SIGNED_IN event
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (event === 'SIGNED_IN' && newSession?.user) {
            const user = newSession.user;
            if (user.email) {
              recordAuthProviderHint(user.email, 'google');
            }

            const existing = await fetchUserProfile(user.id);
            if (isUserExistingAccount(user, existing)) {
              if (isSubscribed) {
                navigate('/', { replace: true });
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
                '';

              let initialRole: UserRole = 'STUDENT';
              let initialHeadline = 'Student Builder & Campus Innovator';
              let initialLocation = 'Remote';
              let initialCustomRole = '';

              try {
                const rawMeta = localStorage.getItem('startupz_oauth_meta');
                if (rawMeta) {
                  const meta = JSON.parse(rawMeta);
                  if (meta.role) {
                    if (meta.role.startsWith('Other:')) {
                      initialRole = 'OTHER';
                      initialCustomRole = meta.role.replace(/^Other:\s*/, '');
                    } else {
                      initialRole = meta.role as UserRole;
                    }
                  }
                  if (meta.headline) initialHeadline = meta.headline;
                  if (meta.location) initialLocation = meta.location;
                  if (meta.customRole) initialCustomRole = meta.customRole;
                }
              } catch {}

              if (isSubscribed) {
                setAuthUser(user);
                setFullName(userFullName);
                setUsername((user.email?.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9_]/g, ''));
                setAvatar(userAvatar);
                setSelectedRole(initialRole);
                setCustomRoleDescription(initialCustomRole);
                setHeadline(initialHeadline);
                setLocation(initialLocation);
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

  const handleRoleSelect = (roleId: UserRole, defaultHeadline: string) => {
    setSelectedRole(roleId);
    if (roleId === 'OTHER' && customRoleDescription.trim()) {
      setHeadline(customRoleDescription.trim());
    } else {
      setHeadline(defaultHeadline);
    }
  };

  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const cleanUsername =
        username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') ||
        authUser.email?.split('@')[0] ||
        'user';
      const cleanFullName = fullName.trim() || 'Member';
      const cleanCustomRole = customRoleDescription.trim();
      const finalPreferredRole =
        selectedRole === 'OTHER' && cleanCustomRole
          ? `Other: ${cleanCustomRole}`
          : selectedRole;
      const cleanHeadline =
        selectedRole === 'OTHER' && cleanCustomRole
          ? cleanCustomRole
          : headline.trim() || `${selectedRole} | Startup Builder`;
      const cleanLocation = location.trim() || 'Remote';
      const cleanOneLineBio = (oneLineBio || bio || '').trim();
      const cleanBio = (bio || oneLineBio || '').trim();
      const openToString =
        openTo.length > 0
          ? openTo.join(',')
          : 'Co-Founder,Startup Team,Investment';

      // 1. Save profile to Supabase public.profiles
      await upsertUserProfile(authUser.id, {
        full_name: cleanFullName,
        username: cleanUsername,
        headline: cleanHeadline,
        one_line_bio: cleanOneLineBio || cleanHeadline,
        location: cleanLocation,
        bio: cleanBio,
        avatar,
        preferred_role: finalPreferredRole,
        is_category_selected: true,
        auth_provider: 'google',
        email: authUser.email || '',
        open_to: openToString,
        profile_completion: 75,
      });

      // 2. Clear any temporary OAuth meta
      localStorage.removeItem('startupz_oauth_meta');
      localStorage.removeItem('startupz_oauth_intent');

      // 3. Sync to backend API if available
      try {
        await api.syncAuth({
          id: authUser.id,
          email: authUser.email,
          fullName: cleanFullName,
          username: cleanUsername,
          role: selectedRole,
          headline: cleanHeadline,
          location: cleanLocation,
          bio: cleanBio,
          avatar,
        });
      } catch {
        // Backend offline fallback
      }

      // 4. Update cached user in localStorage & AuthContext
      const appUser = {
        id: authUser.id,
        email: authUser.email || '',
        role: selectedRole,
        isVerified: true,
        verificationBadge: 'Verified via Google',
        profile: {
          id: authUser.id,
          userId: authUser.id,
          fullName: cleanFullName,
          username: cleanUsername,
          headline: cleanHeadline,
          oneLineBio: cleanOneLineBio || cleanHeadline,
          location: cleanLocation,
          bio: cleanBio,
          avatar,
          preferredRole: finalPreferredRole,
          openTo: openToString,
          isCategorySelected: true,
          profileCompletion: 75,
        },
      };
      localStorage.setItem('startupz_user', JSON.stringify(appUser));
      updateUser(appUser as any);

      // 5. Navigate to home / dashboard
      navigate('/', { replace: true });
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Failed to save your profile details. Please try again.'
      );
      setIsSubmitting(false);
    }
  };

  if (errorMessage) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="card-base max-w-md w-full p-8 text-center space-y-5">
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg flex items-center justify-center mx-auto border border-rose-200/60 dark:border-rose-900/40">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Authentication Notice
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {errorMessage}
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/login')}
              className="btn-primary w-full py-2.5 px-4 text-sm"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // NEW USER COMPLETE DETAILS SETUP VIEW (LIKE JOIN NOW)
  if (isNewUser) {
    return (
      <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center bg-slate-50 dark:bg-dark-950">
        <div className="card-base max-w-3xl w-full p-6 sm:p-10 space-y-8 animate-in fade-in duration-200">
          {/* Welcome Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border border-brand-200/60 dark:border-brand-900/40">
              <Sparkles size={12} className="text-brand-600 dark:text-brand-400" /> Welcome to HookZ
            </div>

            <div className="flex flex-col items-center gap-3 pt-1">
              {avatar ? (
                <img
                  src={avatar}
                  alt={fullName}
                  className="w-16 h-16 rounded-full object-cover border-2 border-brand-500 shadow-xs"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-brand-600 text-white flex items-center justify-center text-xl font-bold shadow-xs">
                  {fullName.charAt(0) || 'U'}
                </div>
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  Welcome, {fullName.split(' ')[0]}!
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-lg mx-auto leading-relaxed">
                  Complete your startup identity below so we place you in the right directory and connect you with matching co-founders, builders, or investors.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleCompleteSetup} className="space-y-6">
            {/* Step 1: Role Selection Grid */}
            <div className="space-y-2.5">
              <label className="block text-sm font-bold sm:font-extrabold uppercase tracking-wider text-slate-900 dark:text-white mb-2">
                1. I am joining as a <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {roleCategories.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedRole === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleRoleSelect(cat.id, cat.defaultHeadline)}
                      className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? 'bg-brand-50/60 dark:bg-brand-950/30 border-brand-600 dark:border-brand-500 ring-1 ring-brand-500/30'
                          : 'bg-white dark:bg-dark-900 border-slate-200 dark:border-dark-750 hover:border-slate-300 dark:hover:border-dark-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`p-1.5 rounded-md ${
                            isSelected
                              ? 'bg-brand-600 text-white'
                              : 'bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <Icon size={16} />
                        </span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center">
                            <Check size={10} strokeWidth={3} />
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="font-semibold text-sm text-slate-900 dark:text-white">
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

              {/* Custom Role Input when 'OTHER' is selected */}
              {selectedRole === 'OTHER' && (
                <div className="mt-3 p-3.5 rounded-lg bg-brand-50/70 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900/60 animate-fade-in space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-brand-900 dark:text-brand-200">
                      Describe your role <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-medium text-brand-600 dark:text-brand-400 bg-brand-100 dark:bg-brand-900/50 px-2 py-0.5 rounded">
                      Custom Role
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    What best describes you? e.g.{' '}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Student
                    </span>
                    ,{' '}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Salesman
                    </span>
                    , or{' '}
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Frontend Designer
                    </span>
                  </p>
                  <input
                    type="text"
                    required
                    value={customRoleDescription}
                    onChange={(e) => {
                      setCustomRoleDescription(e.target.value);
                      setHeadline(e.target.value);
                    }}
                    placeholder="e.g. Student, Salesman, or Frontend Designer"
                    className="input-base w-full text-xs sm:text-sm py-2 bg-white dark:bg-dark-900 border-brand-300 dark:border-brand-800"
                  />
                </div>
              )}
            </div>

            {/* Step 2: Details Inputs */}
            <div className="space-y-4 pt-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                2. Confirm Your Profile Details <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="input-base w-full pl-9 text-xs sm:text-sm py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Username / Handle <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <AtSign size={13} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) =>
                        setUsername(
                          e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                        )
                      }
                      className="input-base w-full pl-8 text-xs sm:text-sm py-2"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Professional Headline <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. AI Founder | Serial Builder"
                    className="input-base w-full text-xs sm:text-sm py-2"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Location <span className="text-slate-400 font-normal">(City or Remote)</span>
                  </label>
                  <div className="relative">
                    <MapPin size={13} className="absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. San Francisco / Remote"
                      className="input-base w-full pl-8 text-xs sm:text-sm py-2"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Describe Yourself in One Line <span className="text-slate-400 font-normal">(One-Line Tagline)</span></span>
                  <span className="text-[10px] text-brand-600 dark:text-brand-400 font-medium">Displayed on profile cards</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {oneLineBio.length}/160
                  </span>
                </label>
                <div className="relative">
                  <FileText size={13} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    maxLength={160}
                    value={oneLineBio}
                    onChange={(e) => setOneLineBio(e.target.value)}
                    placeholder="e.g. AI Founder & Full-Stack Architect building scalable GTM tools"
                    className="input-base w-full pl-8 text-xs sm:text-sm py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  About & Bio <span className="text-slate-400 font-normal">(Optional detailed summary)</span>
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the community about your background, startup vision, and what you're building..."
                  className="input-base w-full px-3 py-2 text-xs sm:text-sm resize-none"
                />
              </div>

              {/* Open To Collaboration */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Open to Opportunities
                </label>
                <div className="flex flex-wrap gap-2">
                  {openToOptions.map((opt) => {
                    const isChecked = openTo.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleOpenTo(opt)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                          isChecked
                            ? 'bg-brand-50 dark:bg-brand-950/50 border-brand-500 text-brand-700 dark:text-brand-300'
                            : 'bg-white dark:bg-dark-900 border-slate-200 dark:border-dark-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare size={13} className="text-brand-600" />
                        ) : (
                          <Square size={13} className="text-slate-400" />
                        )}
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-slate-100 dark:border-dark-800">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-2.5 px-4 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Saving Profile & Entering HookZ...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Profile & Enter HookZ</span>
                    <ArrowRight size={15} />
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
      <div className="card-base max-w-md w-full p-8 text-center space-y-4">
        <div className="w-12 h-12 bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 rounded-lg flex items-center justify-center mx-auto border border-brand-100 dark:border-brand-900/40">
          <Rocket size={22} className="animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Connecting to HookZ...
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Verifying your Google session and preparing your profile.
        </p>
        <div className="flex justify-center pt-2">
          <RefreshCw size={20} className="text-brand-600 animate-spin" />
        </div>
      </div>
    </div>
  );
};
