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
  Home,
  Flame,
  Building2,
  FolderKanban,
} from 'lucide-react';
import { AIScoutModal } from '../ai/AIScoutModal';
import { GlobalSearchModal } from '../search/GlobalSearchModal';
import { GoogleAccountChooserModal } from '../auth/GoogleAccountChooserModal';
import { QuickLoginModal } from '../auth/QuickLoginModal';
import { NotificationsDropdown } from './NotificationsDropdown';
import { supabase } from '../../lib/supabase';
import { prefetchRouteData } from '../../utils/prefetch';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
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

  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Close dropdowns and mobile drawer on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  }, [location.pathname, location.search]);

  const isActive = (path?: string) => path ? location.pathname === path : false;

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

            {/* AI-Scout Trigger Button */}
            <button
              onClick={() => setAiScoutOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-dark-800 hover:bg-slate-200/70 dark:hover:bg-dark-850 border border-slate-200 dark:border-slate-700 transition-colors shrink-0 cursor-pointer"
              title="AI People Finder Bot"
            >
              <Sparkles size={13} className="text-brand-600 dark:text-brand-400" />
              <span>AI - Scout</span>
            </button>

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

                  {/* User Avatar & Dropdown (Desktop & Mobile) */}
                  <div ref={profileRef} className="relative">
                    {/* Mobile Profile Trigger Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(!profileDropdownOpen);
                        setMobileMenuOpen(false);
                      }}
                      aria-label="My Profile Menu"
                      className={`sm:hidden flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                        profileDropdownOpen || location.pathname.startsWith('/profile')
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
                      <ChevronDown size={11} className={`text-slate-400 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Desktop Avatar Trigger Button */}
                    <button
                      type="button"
                      onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                      className="hidden sm:flex items-center gap-2 p-0.5 rounded-full border border-slate-200 dark:border-slate-700 hover:border-brand-600 transition-colors focus:outline-none cursor-pointer"
                    >
                      <Avatar
                        src={user.profile?.avatar}
                        name={user.profile?.fullName || user.email}
                        size="sm"
                      />
                    </button>

                    {profileDropdownOpen && (
                      <>
                        {/* Mobile backdrop */}
                        <div
                          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 sm:hidden"
                          onClick={() => setProfileDropdownOpen(false)}
                        />
                        <div className="absolute right-0 mt-1.5 w-56 max-w-[calc(100vw-1rem)] bg-white dark:bg-dark-900 rounded-lg shadow-modal border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-fade-in">
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
                              type="button"
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
                      </>
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
                onClick={() => {
                  setMobileMenuOpen(!mobileMenuOpen);
                  setProfileDropdownOpen(false);
                }}
                className="lg:hidden p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-800"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
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

            {/* Quick Primary Links - 5 Core Tools + AI Scout */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setAiScoutOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg text-xs font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-900/50 hover:bg-brand-100"
              >
                <Sparkles size={15} className="text-brand-600 dark:text-brand-400" />
                <span>AI - Scout Finder</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium border transition-colors ${
                    isActive('/')
                      ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-800'
                  }`}
                >
                  <Home size={15} className="text-brand-600" />
                  <span>1. Home</span>
                </Link>

                <Link
                  to="/feed"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium border transition-colors ${
                    isActive('/feed')
                      ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-800'
                  }`}
                >
                  <Flame size={15} className="text-amber-500" />
                  <span>2. Feed</span>
                </Link>

                <Link
                  to="/business"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium border transition-colors ${
                    isActive('/business')
                      ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-800'
                  }`}
                >
                  <Building2 size={15} className="text-blue-500" />
                  <span>3. Business</span>
                </Link>

                <Link
                  to="/projects"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium border transition-colors ${
                    isActive('/projects')
                      ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-800'
                  }`}
                >
                  <FolderKanban size={15} className="text-emerald-500" />
                  <span>4. Projects</span>
                </Link>

                <Link
                  to="/opportunities"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`col-span-2 flex items-center justify-center gap-2 p-2.5 rounded-lg text-xs font-medium border transition-colors ${
                    isActive('/opportunities')
                      ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-800'
                  }`}
                >
                  <Briefcase size={15} className="text-purple-500" />
                  <span>5. Opportunities</span>
                </Link>
              </div>
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
