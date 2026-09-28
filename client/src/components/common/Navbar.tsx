import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/api';
import { Avatar } from './Avatar';
import {
  Rocket,
  Compass,
  Users,
  Briefcase,
  GraduationCap,
  MessageSquare,
  Bookmark,
  Bell,
  Search,
  Sun,
  Moon,
  Plus,
  Shield,
  Menu,
  X,
  LogOut,
  User as UserIcon,
  LayoutDashboard,
  Share2,
  Skull,
  Sparkles,
  Bot,
  Globe,
  ChevronDown,
  TrendingUp,
  Megaphone,
  BriefcaseBusiness,
  Crown,
  LogIn,
  Edit3,
} from 'lucide-react';
import { AIScoutModal } from '../ai/AIScoutModal';
import { GlobalSearchModal } from '../search/GlobalSearchModal';
import { GoogleAccountChooserModal } from '../auth/GoogleAccountChooserModal';
import { QuickLoginModal } from '../auth/QuickLoginModal';
import { NotificationsDropdown } from './NotificationsDropdown';
import { supabase } from '../../lib/supabase';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Click-only toggling dropdown states
  const [coFoundersDropdownOpen, setCoFoundersDropdownOpen] = useState(false);
  const [opportunitiesDropdownOpen, setOpportunitiesDropdownOpen] = useState(false);

  // Position offsets for fixed viewport dropdown rendering (prevents clipping inside slidebar)
  const [coFoundersPos, setCoFoundersPos] = useState<{ left: number; top: number }>({ left: 16, top: 58 });
  const [opportunitiesPos, setOpportunitiesPos] = useState<{ left: number; top: number }>({ left: 16, top: 58 });

  // Mobile accordion state
  const [mobileCoFoundersOpen, setMobileCoFoundersOpen] = useState(true);
  const [mobileOpportunitiesOpen, setMobileOpportunitiesOpen] = useState(true);

  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [aiScoutOpen, setAiScoutOpen] = useState(false);
  const [googleChooserOpen, setGoogleChooserOpen] = useState(false);
  const [quickLoginOpen, setQuickLoginOpen] = useState(false);

  const handleGoogleClick = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
        },
      });

      if (error || !data?.url) {
        setGoogleChooserOpen(true);
        return;
      }

      try {
        const probe = await fetch(data.url, { redirect: 'manual' });
        if (probe.status === 400) {
          setGoogleChooserOpen(true);
          return;
        }
      } catch {
        // If opaque redirect, provider is ready
      }

      window.location.href = data.url;
    } catch {
      setGoogleChooserOpen(true);
    }
  };

  const coFoundersRef = useRef<HTMLDivElement>(null);
  const coFoundersMenuRef = useRef<HTMLDivElement>(null);
  const opportunitiesRef = useRef<HTMLDivElement>(null);
  const opportunitiesMenuRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const handleToggleCoFounders = (e: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 400;
    const clampedLeft = Math.max(12, Math.min(rect.left, windowWidth - 270));
    setCoFoundersPos({ left: clampedLeft, top: rect.bottom + 6 });
    setCoFoundersDropdownOpen((prev) => !prev);
    setOpportunitiesDropdownOpen(false);
  };

  const handleToggleOpportunities = (e: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 400;
    const clampedLeft = Math.max(12, Math.min(rect.left, windowWidth - 260));
    setOpportunitiesPos({ left: clampedLeft, top: rect.bottom + 6 });
    setOpportunitiesDropdownOpen((prev) => !prev);
    setCoFoundersDropdownOpen(false);
  };

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        coFoundersRef.current &&
        !coFoundersRef.current.contains(target) &&
        (!coFoundersMenuRef.current || !coFoundersMenuRef.current.contains(target))
      ) {
        setCoFoundersDropdownOpen(false);
      }
      if (
        opportunitiesRef.current &&
        !opportunitiesRef.current.contains(target) &&
        (!opportunitiesMenuRef.current || !opportunitiesMenuRef.current.contains(target))
      ) {
        setOpportunitiesDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCoFoundersDropdownOpen(false);
        setOpportunitiesDropdownOpen(false);
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Close all dropdowns and mobile drawer on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
    setCoFoundersDropdownOpen(false);
    setOpportunitiesDropdownOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (user) {
      api.getNotifications()
        .then((res: any) => {
          const unread = typeof res?.unreadCount === 'number'
            ? res.unreadCount
            : (Array.isArray(res?.notifications)
                ? res.notifications.filter((n: any) => !n.isRead).length
                : (Array.isArray(res) ? res.filter((n: any) => !n.isRead).length : 0));
          setUnreadNotifications(unread);
        })
        .catch(() => {});
    }
  }, [user, location.pathname]);

  const coFoundersDropdownItems = [
    { name: 'All Members', categoryKey: 'all', href: '/cofounders?category=all', description: 'Browse all platform members', icon: Users },
    { name: 'Founders', categoryKey: 'founders', href: '/cofounders?category=founders', description: 'Active founders building startups', icon: Rocket },
    { name: 'Co-Founders', categoryKey: 'cofounders', href: '/cofounders?category=cofounders', description: 'Builders seeking synergy', icon: Users },
    { name: 'Marketers', categoryKey: 'marketers', href: '/cofounders?category=marketers', description: 'Growth & demand leads', icon: Megaphone },
    { name: 'Investors', categoryKey: 'investors', href: '/cofounders?category=investors', description: 'Venture funds & angel backers', icon: TrendingUp },
    { name: 'Other', categoryKey: 'other', href: '/cofounders?category=other', description: 'Engineers, designers & advisors', icon: BriefcaseBusiness },
  ];

  const opportunitiesDropdownItems = [
    { name: 'Internships', typeKey: 'internships', href: '/opportunities?type=internships', description: 'Hands-on startup training roles', icon: GraduationCap },
    { name: 'Jobs', typeKey: 'jobs', href: '/opportunities?type=jobs', description: 'Full-time & part-time positions', icon: Briefcase },
  ];

  const otherNavLinks = [
    { name: 'Graveyard', href: '/failed-startups', icon: Skull },
    { name: 'Mentors', href: '/mentors', icon: GraduationCap },
    { name: 'Problem Statements', href: '/problems', icon: Globe },
  ];

  const isCoFoundersActive = location.pathname.startsWith('/cofounders');
  const isOpportunitiesActive = location.pathname.startsWith('/opportunities');
  const isActive = (path?: string) => path ? location.pathname === path : false;

  const currentCategoryParam = new URLSearchParams(location.search).get('category')?.toLowerCase();
  const currentTypeParam = new URLSearchParams(location.search).get('type')?.toLowerCase();

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white dark:bg-dark-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-3">
            
            {/* Brand Logo */}
            <Link
              to={user ? '/dashboard' : '/'}
              title="StartupZ"
              className="flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-md bg-brand-600 flex items-center justify-center text-white shadow-subtle">
                <Rocket size={15} />
              </div>
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                Startup<span className="text-brand-600">Z</span>
              </span>
            </Link>

            {/* Global Search Button (Desktop & Tablet) */}
            <button
              onClick={() => setSearchModalOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md text-xs bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex-1 max-w-[210px] text-left cursor-pointer group shrink-0"
            >
              <Search size={13} className="text-slate-400 group-hover:text-brand-600 transition-colors shrink-0" />
              <span className="truncate">Search usernames...</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 rounded text-[10px] bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 text-slate-400 ml-auto shrink-0 font-mono">
                ⌘K
              </kbd>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 overflow-x-auto no-scrollbar whitespace-nowrap max-w-xl xl:max-w-2xl py-1 shrink">
              {/* 1. AI-Scout */}
              <button
                onClick={() => setAiScoutOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-dark-800 hover:bg-slate-200/70 dark:hover:bg-dark-850 border border-slate-200 dark:border-slate-700 transition-colors shrink-0 cursor-pointer"
                title="AI People Finder Bot"
              >
                <Sparkles size={13} className="text-brand-600 dark:text-brand-400" />
                <span>AI - Scout</span>
              </button>

              {/* 2. Startups */}
              <Link
                to="/startups"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 ${
                  isActive('/startups')
                    ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800'
                }`}
              >
                <Compass size={14} />
                <span>Startups</span>
              </Link>

              {/* 3. Co-Founders Dropdown Trigger */}
              <div ref={coFoundersRef} className="shrink-0">
                <button
                  type="button"
                  onClick={handleToggleCoFounders}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    isCoFoundersActive || coFoundersDropdownOpen
                      ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800'
                  }`}
                  aria-expanded={coFoundersDropdownOpen}
                  aria-haspopup="true"
                >
                  <Users size={14} />
                  <span>Co - Founders</span>
                  <ChevronDown
                    size={12}
                    className={`transition-transform duration-150 ${
                      coFoundersDropdownOpen ? 'transform rotate-180 text-brand-600' : 'text-slate-400'
                    }`}
                  />
                </button>
              </div>

              {/* 4. Opportunities Dropdown Trigger */}
              <div ref={opportunitiesRef} className="shrink-0">
                <button
                  type="button"
                  onClick={handleToggleOpportunities}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    isOpportunitiesActive || opportunitiesDropdownOpen
                      ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800'
                  }`}
                  aria-expanded={opportunitiesDropdownOpen}
                  aria-haspopup="true"
                >
                  <Briefcase size={14} />
                  <span>Opportunities</span>
                  <ChevronDown
                    size={12}
                    className={`transition-transform duration-150 ${
                      opportunitiesDropdownOpen ? 'transform rotate-180 text-brand-600' : 'text-slate-400'
                    }`}
                  />
                </button>
              </div>

              {/* 5. Remaining Items: Graveyard, Mentors, Problem Statements */}
              {otherNavLinks.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 ${
                      active
                        ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-dark-800'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* FIXED VIEWPORT DROPDOWNS */}
            {coFoundersDropdownOpen && (
              <div
                ref={coFoundersMenuRef}
                onMouseDown={(e) => e.stopPropagation()}
                className="fixed z-50 animate-fade-in"
                style={{ left: `${coFoundersPos.left}px`, top: `${coFoundersPos.top}px` }}
              >
                <div className="w-64 bg-white dark:bg-dark-900 rounded-lg shadow-modal border border-slate-200 dark:border-slate-800 py-1.5">
                  <div className="px-3.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 mb-1">
                    Co-Founder Network
                  </div>
                  {coFoundersDropdownItems.map((item) => {
                    const Icon = item.icon;
                    const isOptionActive =
                      isCoFoundersActive &&
                      (currentCategoryParam === item.categoryKey ||
                        (!currentCategoryParam && item.categoryKey === 'cofounders'));
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setCoFoundersDropdownOpen(false)}
                        className={`flex items-start gap-2.5 px-3 py-1.5 mx-1 rounded-md text-xs transition-colors ${
                          isOptionActive
                            ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-semibold'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-800'
                        }`}
                      >
                        <Icon size={14} className={`mt-0.5 shrink-0 ${isOptionActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}`} />
                        <div className="flex flex-col">
                          <span className="font-medium text-xs leading-tight">{item.name}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal leading-normal">{item.description}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {opportunitiesDropdownOpen && (
              <div
                ref={opportunitiesMenuRef}
                onMouseDown={(e) => e.stopPropagation()}
                className="fixed z-50 animate-fade-in"
                style={{ left: `${opportunitiesPos.left}px`, top: `${opportunitiesPos.top}px` }}
              >
                <div className="w-60 bg-white dark:bg-dark-900 rounded-lg shadow-modal border border-slate-200 dark:border-slate-800 py-1.5">
                  <div className="px-3.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 mb-1">
                    Startup Opportunities
                  </div>
                  {opportunitiesDropdownItems.map((item) => {
                    const Icon = item.icon;
                    const isOptionActive =
                      isOpportunitiesActive &&
                      currentTypeParam === item.typeKey;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setOpportunitiesDropdownOpen(false)}
                        className={`flex items-start gap-2.5 px-3 py-1.5 mx-1 rounded-md text-xs transition-colors ${
                          isOptionActive
                            ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-semibold'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-800'
                        }`}
                      >
                        <Icon size={14} className={`mt-0.5 shrink-0 ${isOptionActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}`} />
                        <div className="flex flex-col">
                          <span className="font-medium text-xs leading-tight">{item.name}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal leading-normal">{item.description}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Right Action Icons & Profile */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

              {/* Mobile Search Button */}
              <button
                type="button"
                onClick={() => setSearchModalOpen(true)}
                aria-label="Search platform"
                className="md:hidden p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors cursor-pointer"
                title="Search usernames & platform"
              >
                <Search size={16} className="text-slate-600 dark:text-slate-300" />
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors cursor-pointer"
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              {user ? (
                <>
                  {/* Notifications */}
                  <NotificationsDropdown />

                  {/* Messages */}
                  <Link
                    to="/messages"
                    aria-label="Messages"
                    className={`p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors ${
                      isActive('/messages') ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60' : ''
                    }`}
                  >
                    <MessageSquare size={16} />
                  </Link>

                  {/* Network */}
                  <Link
                    to="/network"
                    aria-label="Network Connections"
                    className={`p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors ${
                      isActive('/network') ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60' : ''
                    }`}
                  >
                    <Users size={16} />
                  </Link>

                  {/* Saved Items */}
                  <Link
                    to="/saved"
                    aria-label="Saved items"
                    className={`hidden sm:inline-flex p-1.5 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors ${
                      isActive('/saved') ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60' : ''
                    }`}
                  >
                    <Bookmark size={16} />
                  </Link>

                  {/* Profile Bar at Top in Mobile View */}
                  <Link
                    to={`/profile/${user.id}`}
                    aria-label="My Profile Bar"
                    className={`sm:hidden flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium transition-colors shrink-0 ${
                      location.pathname.startsWith('/profile')
                        ? 'bg-brand-50 dark:bg-brand-950/80 border-brand-300 dark:border-brand-800 text-brand-700 dark:text-brand-300'
                        : 'bg-white dark:bg-dark-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <Avatar
                      src={user.profile?.avatar}
                      name={user.profile?.fullName || user.email}
                      size="xs"
                      className="!w-4 !h-4"
                    />
                    <span className="text-[11px] truncate max-w-[70px]">
                      {user.profile?.fullName?.split(' ')[0] || 'Profile'}
                    </span>
                    <Edit3 size={10} className="text-brand-600 shrink-0" />
                  </Link>

                  {/* Post Startup Action */}
                  <Link
                    to="/startups/create"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-subtle transition-colors"
                  >
                    <Plus size={13} />
                    <span>Post Idea</span>
                  </Link>

                  {/* Admin Quick Link */}
                  {user.isAdmin && (
                    <Link
                      to="/admin"
                      title="Admin Moderation Portal"
                      className="p-1.5 rounded-md text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 transition-colors"
                    >
                      <Shield size={16} />
                    </Link>
                  )}

                  {/* User Avatar & Dropdown (Desktop) */}
                  <div ref={profileRef} className="relative hidden sm:block">
                    <button
                      onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                      className="flex items-center gap-2 p-0.5 rounded-full border border-slate-200 dark:border-slate-700 hover:border-brand-600 transition-colors focus:outline-none cursor-pointer"
                    >
                      <Avatar
                        src={user.profile?.avatar}
                        name={user.profile?.fullName || user.email}
                        size="sm"
                      />
                    </button>

                    {profileDropdownOpen && (
                      <div className="absolute right-0 mt-1.5 w-56 bg-white dark:bg-dark-900 rounded-lg shadow-modal border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-fade-in">
                        <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {user.profile?.fullName || 'Founder'}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {user.email}
                          </p>
                        </div>

                        <div className="py-1">
                          <Link
                            to="/dashboard"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800"
                          >
                            <LayoutDashboard size={14} className="text-slate-400" />
                            <span>Dashboard</span>
                          </Link>
                          <Link
                            to={`/profile/${user.id}`}
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800"
                          >
                            <UserIcon size={14} className="text-slate-400" />
                            <span>My Startup Profile</span>
                          </Link>
                          <Link
                            to="/network"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800"
                          >
                            <Users size={14} className="text-slate-400" />
                            <span>My Startup Network</span>
                          </Link>
                          <Link
                            to="/memberships"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800"
                          >
                            <Crown size={14} className="text-slate-400" />
                            <span>Memberships & Plans</span>
                          </Link>
                          <Link
                            to="/feed"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800"
                          >
                            <Share2 size={14} className="text-slate-400" />
                            <span>Community Feed</span>
                          </Link>
                          <Link
                            to="/saved"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800"
                          >
                            <Bookmark size={14} className="text-slate-400" />
                            <span>Saved Items</span>
                          </Link>
                          {user.isAdmin && (
                            <Link
                              to="/admin"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3.5 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            >
                              <Shield size={14} />
                              <span>Admin Panel</span>
                            </Link>
                          )}
                        </div>

                        <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                          <button
                            onClick={async () => {
                              setProfileDropdownOpen(false);
                              await logout();
                              navigate('/');
                            }}
                            className="flex items-center gap-2.5 w-full text-left px-3.5 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          >
                            <LogOut size={14} />
                            <span>Log Out</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={handleGoogleClick}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-850 hover:bg-slate-50 dark:hover:bg-dark-800 shadow-subtle transition-colors cursor-pointer"
                    title="Sign in with Google"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.39 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.98 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.61 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span className="hidden sm:inline">Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickLoginOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors cursor-pointer"
                  >
                    <LogIn size={13} className="text-slate-400" />
                    <span>Log In</span>
                  </button>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md text-white bg-brand-600 hover:bg-brand-700 shadow-subtle transition-colors shrink-0"
                  >
                    <span>Join</span>
                  </Link>
                </div>
              )}

              {/* Mobile Hamburger Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Horizontal Slidebar */}
        <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap px-3 py-1.5 bg-slate-50 dark:bg-dark-950 border-t border-slate-200 dark:border-slate-800 scroll-smooth shrink-0">
          {/* 0. Search */}
          <button
            onClick={() => setSearchModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-dark-850 border border-slate-200 dark:border-slate-800 shrink-0 shadow-subtle cursor-pointer"
            title="Search Usernames & Platform"
          >
            <Search size={12} className="text-slate-400" />
            <span>Search</span>
          </button>

          {/* 1. AI-Scout */}
          <button
            onClick={() => setAiScoutOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 shrink-0 shadow-subtle cursor-pointer"
            title="AI People Finder Bot"
          >
            <Sparkles size={12} className="text-brand-600 dark:text-brand-400" />
            <span>AI - Scout</span>
          </button>

          {/* User Profile Quick Link on Mobile Slidebar */}
          {user && (
            <Link
              to={`/profile/${user.id}`}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium shrink-0 shadow-subtle transition-colors ${
                location.pathname.startsWith('/profile')
                  ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/70 border border-brand-200 dark:border-brand-800'
                  : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-dark-850 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <UserIcon size={12} className="text-slate-400" />
              <span>My Profile</span>
            </Link>
          )}

          {/* 2. Startups */}
          <Link
            to="/startups"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium shrink-0 transition-colors ${
              isActive('/startups')
                ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800'
            }`}
          >
            <Compass size={13} />
            <span>Startups</span>
          </Link>

          {/* 3. Co-Founders */}
          <button
            type="button"
            onClick={handleToggleCoFounders}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium shrink-0 cursor-pointer transition-colors ${
              isCoFoundersActive || coFoundersDropdownOpen
                ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800'
            }`}
          >
            <Users size={13} />
            <span>Co - Founders</span>
            <ChevronDown size={11} className={coFoundersDropdownOpen ? 'rotate-180 text-brand-600' : 'text-slate-400'} />
          </button>

          {/* 4. Opportunities */}
          <button
            type="button"
            onClick={handleToggleOpportunities}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium shrink-0 cursor-pointer transition-colors ${
              isOpportunitiesActive || opportunitiesDropdownOpen
                ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800'
            }`}
          >
            <Briefcase size={13} />
            <span>Opportunities</span>
            <ChevronDown size={11} className={opportunitiesDropdownOpen ? 'rotate-180 text-brand-600' : 'text-slate-400'} />
          </button>

          {/* 5. Graveyard, Mentors, Problem Statements */}
          {otherNavLinks.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium shrink-0 transition-colors ${
                  active
                    ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800'
                }`}
              >
                <Icon size={13} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden px-4 pt-3 pb-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900 space-y-3 max-h-[85vh] overflow-y-auto">
            {/* Logged-In User Profile */}
            {user && (
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <Avatar
                    src={user.profile?.avatar}
                    name={user.profile?.fullName || user.email}
                    size="md"
                    className="!w-9 !h-9"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {user.profile?.fullName || 'Founder'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {user.profile?.username ? `@${user.profile.username}` : user.email}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to={`/profile/${user.id}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-secondary text-center py-1.5"
                  >
                    <span>View Profile</span>
                  </Link>
                  <Link
                    to={`/profile/${user.id}?edit=true`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-primary text-center py-1.5"
                  >
                    <span>Edit Profile</span>
                  </Link>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setSearchModalOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs bg-slate-50 dark:bg-dark-850 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
            >
              <Search size={14} className="text-slate-400" />
              <span>Search platform, skills, founders...</span>
            </button>

            {/* Quick Primary Links */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAiScoutOpen(true);
                }}
                className="flex items-center gap-2 p-2 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-dark-800 hover:bg-slate-200/60"
              >
                <Sparkles size={14} className="text-brand-600 dark:text-brand-400" />
                <span>AI - Scout</span>
              </button>
              <Link
                to="/startups"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 p-2 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-800"
              >
                <Compass size={14} className="text-slate-400" />
                <span>Startups</span>
              </Link>
            </div>

            {/* Co-Founders Mobile Section */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50/50 dark:bg-dark-850/50">
              <button
                type="button"
                onClick={() => setMobileCoFoundersOpen(!mobileCoFoundersOpen)}
                className="flex items-center justify-between w-full text-xs font-semibold text-slate-900 dark:text-white pb-1"
              >
                <div className="flex items-center gap-1.5">
                  <Users size={14} className="text-brand-600" />
                  <span>Co - Founders</span>
                </div>
                <ChevronDown size={13} className={`text-slate-400 transition-transform ${mobileCoFoundersOpen ? 'rotate-180' : ''}`} />
              </button>
              {mobileCoFoundersOpen && (
                <div className="grid grid-cols-2 gap-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                  {coFoundersDropdownItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-2 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800 flex items-center gap-1.5"
                    >
                      <item.icon size={12} className="text-slate-400" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Opportunities Mobile Section */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50/50 dark:bg-dark-850/50">
              <button
                type="button"
                onClick={() => setMobileOpportunitiesOpen(!mobileOpportunitiesOpen)}
                className="flex items-center justify-between w-full text-xs font-semibold text-slate-900 dark:text-white pb-1"
              >
                <div className="flex items-center gap-1.5">
                  <Briefcase size={14} className="text-slate-600 dark:text-slate-400" />
                  <span>Opportunities</span>
                </div>
                <ChevronDown size={13} className={`text-slate-400 transition-transform ${mobileOpportunitiesOpen ? 'rotate-180' : ''}`} />
              </button>
              {mobileOpportunitiesOpen && (
                <div className="grid grid-cols-2 gap-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                  {opportunitiesDropdownItems.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="px-2 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800 flex items-center gap-1.5"
                    >
                      <item.icon size={12} className="text-slate-400" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Other Nav Links */}
            <div className="grid grid-cols-2 gap-1.5">
              {otherNavLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-1.5 p-2 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800"
                  >
                    <Icon size={14} className="text-slate-400" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Mobile Auth / Profile Section */}
            {!user ? (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleGoogleClick();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-xs font-medium text-slate-800 dark:text-slate-100 shadow-subtle cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.39 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.98 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.61 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setQuickLoginOpen(true);
                    }}
                    className="flex-1 btn-secondary text-center py-1.5"
                  >
                    Log In
                  </button>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 btn-primary text-center py-1.5"
                  >
                    Join StartupZ
                  </Link>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <div className="grid grid-cols-3 gap-1.5">
                  <Link
                    to="/startups/create"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-primary text-center py-1.5 text-xs"
                  >
                    + Post Idea
                  </Link>
                  <Link
                    to={`/profile/${user.id}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-secondary text-center py-1.5 text-xs"
                  >
                    Profile
                  </Link>
                  <Link
                    to={`/profile/${user.id}?edit=true`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-secondary text-center py-1.5 text-xs"
                  >
                    Edit
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await logout();
                    navigate('/');
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors cursor-pointer"
                >
                  <LogOut size={13} />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* AI Scout Modal */}
      <AIScoutModal isOpen={aiScoutOpen} onClose={() => setAiScoutOpen(false)} />

      {/* Global Search Modal (Opens like AI Scout) */}
      <GlobalSearchModal isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} />

      {/* Quick Login Modal (Gmail, Username, Email + Password) */}
      <QuickLoginModal
        isOpen={quickLoginOpen}
        onClose={() => setQuickLoginOpen(false)}
        onOpenGoogleChooser={() => setGoogleChooserOpen(true)}
      />

      {/* Google Account Selection Modal */}
      <GoogleAccountChooserModal
        isOpen={googleChooserOpen}
        onClose={() => setGoogleChooserOpen(false)}
      />
    </>
  );
};
