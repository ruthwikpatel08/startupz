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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 text-xs font-bold border border-brand-200 dark:border-brand-800">
            <Sparkles size={13} /> Welcome to StartupZ!
          </div>

          <div className="flex flex-col items-center gap-2">
            <img
              src={user.profile?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`}
              alt=""
              className="w-14 h-14 rounded-full object-cover border-2 border-brand-500 shadow-md"
            />
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Which category do you belong to, {displayName.split(' ')[0]}?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Please choose your category below so we can display you in the correct directory (Founders, Co-Founders, Marketers, or Investors).
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 text-xs text-center border border-rose-200 dark:border-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Category Cards */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Select Your Category
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
              {roleCategories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedRole === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat.id, cat.defaultHeadline)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'bg-brand-50 dark:bg-brand-950/80 border-brand-600 dark:border-brand-500 ring-2 ring-brand-500/30 shadow-sm'
                        : 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-brand-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <span
                      className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-brand-600 text-white'
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <Icon size={16} />
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          {cat.label}
                        </span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0">
                            <Check size={10} strokeWidth={3} />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Professional Headline
              </label>
              <input
                type="text"
                required
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Co-Founder | Technical Partner"
                className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Location
              </label>
              <div className="relative">
                <MapPin size={13} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bengaluru, India or Remote"
                  className="w-full pl-8 pr-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-5 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-brand-500/25 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Saving Your Category...</span>
                </>
              ) : (
                <>
                  <span>Save Category & Proceed</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
