import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { upsertUserProfile } from '../../lib/supabase';
import { api } from '../../services/api';
import {
  Rocket,
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
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

interface RoleCategoryOption {
  id: string;
  label: string;
  icon: React.ElementType;
  desc: string;
  defaultHeadline: string;
}

export const NewUserCategoryModal: React.FC = () => {
  const { user, updateUser } = useAuth();

  // If not logged in, or already completed category selection, don't render anything
  if (!user || user.profile?.isCategorySelected === true) {
    return null;
  }

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

  const [selectedRole, setSelectedRole] = useState('Founders');
  const [headline, setHeadline] = useState(
    user.profile?.headline && !user.profile.headline.includes('Startup Builder')
      ? user.profile.headline
      : 'Founder & Visionary | Startup Builder'
  );
  const [location, setLocation] = useState(user.profile?.location || 'Remote');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCategorySelect = (roleId: string, defaultHeadline: string) => {
    setSelectedRole(roleId);
    setHeadline(defaultHeadline);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const cleanHeadline = headline.trim() || `${selectedRole} | Startup Builder`;
      const cleanLocation = location.trim() || 'Remote';

      // 1. Update Supabase public.profiles table
      await upsertUserProfile(user.id, {
        preferred_role: selectedRole,
        headline: cleanHeadline,
        location: cleanLocation,
        is_category_selected: true,
        open_to: selectedRole === 'Co-Founders' ? 'Co-Founder,Startup Team' : 'Co-Founder,Startup Team,Investment',
      });

      // 2. Sync to backend API
      try {
        await api.syncAuth({
          id: user.id,
          email: user.email,
          fullName: user.profile?.fullName,
          role: selectedRole.toUpperCase(),
          headline: cleanHeadline,
          location: cleanLocation,
          avatar: user.profile?.avatar,
        });
      } catch {
        // Backend offline fallback
      }

      // 3. Update local auth state so modal unmounts immediately
      if (user.profile) {
        updateUser({
          ...user,
          role: selectedRole.toUpperCase(),
          profile: {
            ...user.profile,
            preferredRole: selectedRole,
            headline: cleanHeadline,
            location: cleanLocation,
            isCategorySelected: true,
          },
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save your category. Please try again.');
      setIsSubmitting(false);
    }
  };

  const displayName = user.profile?.fullName || user.email?.split('@')[0] || 'Builder';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
      <div className="max-w-xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-modal space-y-5 my-6 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 text-xs font-medium border border-brand-200 dark:border-brand-900">
            <Sparkles size={12} className="text-brand-600" /> Welcome to StartupZ
          </div>

          <div className="flex flex-col items-center gap-2">
            <img
              src={user.profile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=2457d6`}
              alt=""
              className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700"
            />
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Which category best describes you, {displayName.split(' ')[0]}?
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Select your primary ecosystem role so you appear accurately in search and founder directories.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs text-center border border-rose-200 dark:border-rose-900">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Cards */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Select Category
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1">
              {roleCategories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedRole === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat.id, cat.defaultHeadline)}
                    className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-brand-50/70 dark:bg-brand-950/70 border-brand-600 dark:border-brand-500 ring-1 ring-brand-600/30'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span
                      className={`p-1.5 rounded-md shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-brand-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <Icon size={15} />
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white">
                          {cat.label}
                        </span>
                        {isSelected && (
                          <span className="w-3.5 h-3.5 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0">
                            <Check size={9} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {cat.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Headline and Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Headline
              </label>
              <input
                type="text"
                required
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Co-Founder | Technical Partner"
                className="input-base !py-1.5 !text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Location
              </label>
              <div className="relative">
                <MapPin size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bengaluru, India or Remote"
                  className="input-base !pl-7 !py-1.5 !text-xs"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full !py-2 !text-xs flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Saving Category...</span>
                </>
              ) : (
                <>
                  <span>Save & Continue</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
