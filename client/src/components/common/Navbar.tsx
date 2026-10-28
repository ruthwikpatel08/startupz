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
  Settings,
} from 'lucide-react';
import { AIScoutModal } from '../ai/AIScoutModal';
import { GlobalSearchModal } from '../search/GlobalSearchModal';
import { GoogleAccountChooserModal } from '../auth/GoogleAccountChooserModal';
import { NotificationsDropdown } from './NotificationsDropdown';
import { supabase, fetchUnreadMessagesCount } from '../../lib/supabase';
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
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      setUnreadMessagesCount(0);
      return;
    }

    const loadUnread = async () => {
      const count = await fetchUnreadMessagesCount(user.id);
      setUnreadMessagesCount(count);
    };

    loadUnread();

    const channel = supabase
      .channel(`navbar_messages_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          loadUnread();
        }
      )
      .subscribe();

    const handleMessagesUpdated = () => {
      loadUnread();
    };

    window.addEventListener('startupz_messages_updated', handleMessagesUpdated);
    const interval = setInterval(loadUnread, 15000);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('startupz_messages_updated', handleMessagesUpdated);
      clearInterval(interval);
    };
  }, [user?.id, location.pathname]);

  const handleGoogleClick = async () => {
    try {
      try {
        localStorage.setItem('startupz_oauth_intent', 'login');
      } catch {}

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

  const isAuthPage =
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/register') ||
    location.pathname.startsWith('/forgot-password') ||
    location.pathname.startsWith('/reset-password') ||
    location.pathname.startsWith('/auth');

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 w-full bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] transition-colors">
        <div className="w-full px-2.5 sm:px-6 lg:px-6">
          <div className="flex items-center justify-between h-14 gap-2 sm:gap-4 w-full">
            
            {/* 1. LEFT EDGE: HookZ logo + name */}
            <div className="flex items-center shrink-0">
              <Link
                to="/feed"
                title="HookZ"
                className="brand-wordmark cursor-pointer group"
              >
                <img
                  src="/logo-icon.png"
                  alt="HookZ"
                  className="object-contain group-hover:scale-105 transition-transform"
                />
                <span>HookZ</span>
              </Link>
            </div>

            {/* 2. CENTER: WIDER search bar (hidden on login/signup auth pages) */}
            {!isAuthPage && (
              <div className="hidden md:flex flex-1 max-w-[48%] min-w-0 justify-center px-2">
                <button
                  onClick={() => setSearchModalOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs bg-[var(--bg-primary)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)] transition-colors w-full text-left cursor-pointer group shadow-xs"
                >
                  <Search size={14} className="text-[var(--text-muted)] group-hover:text-[var(--brand-primary)] transition-colors shrink-0" />
                  <span className="truncate">Search students, projects, skills & usernames...</span>
                  <kbd className="hidden lg:inline-block px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)] ml-auto shrink-0 font-mono">
                    ⌘K
                  </kbd>
                </button>
              </div>
            )}

            {/* 3. RIGHT EDGE: All action icons grouped tightly together */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0 justify-end">
              {/* Mobile Search Button (Opens dedicated /search page like Instagram) */}
              {!isAuthPage && (
                <button
                  type="button"
                  onClick={() => navigate('/search')}
                  aria-label="Search platform"
                  className="md:hidden p-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-soft)] transition-colors cursor-pointer"
                  title="Search usernames & platform"
                >
                  <Search size={16} className="text-[var(--text-secondary)]" />
                </button>
              )}

              {/* AI-Scout Trigger Button (hidden on login/signup auth pages) */}
              {!isAuthPage && (
                <button
                  onClick={() => setAiScoutOpen(true)}
                  className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-md text-xs font-semibold btn-primary transition-colors shrink-0 cursor-pointer shadow-xs"
                  title="AI People Finder Bot"
                >
                  <Sparkles size={13} className="text-white" />
                  <span className="hidden xs:inline">AI - Scout</span>
                </button>
              )}

              {user ? (
                <>
                  {/* Notifications Bell */}
                  <NotificationsDropdown />

                  {/* Messages Icon */}
                  <Link
                    to="/messages"
                    aria-label="Messages"
                    className={`relative p-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-soft)] transition-colors ${
                      isActive('/messages') ? 'text-[var(--brand-primary)] bg-[var(--brand-soft)]' : ''
                    }`}
                  >
                    <MessageSquare size={16} />
                    {unreadMessagesCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-brand-600 text-white text-[9px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center border-2 border-white dark:border-dark-900 shadow-xs">
                        {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                      </span>
                    )}
                  </Link>

                  {/* Connections / Network Icon (hidden on mobile, moved into profile menu) */}
                  <Link
                    to="/network"
                    aria-label="Network Connections"
                    className={`hidden sm:inline-flex p-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-soft)] transition-colors ${
                      isActive('/network') ? 'text-[var(--brand-primary)] bg-[var(--brand-soft)]' : ''
                    }`}
                  >
                    <Users size={16} />
                  </Link>

                  {/* Bookmarks / Saved Items */}
                  <Link
                    to="/saved"
                    aria-label="Saved items"
                    className={`hidden sm:inline-flex p-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-soft)] transition-colors ${
                      isActive('/saved') ? 'text-[var(--brand-primary)] bg-[var(--brand-soft)]' : ''
                    }`}
                  >
                    <Bookmark size={16} />
                  </Link>

                  {/* Post Idea Action Button */}
                  <Link
                    to="/startups/create"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-[var(--brand-primary)] bg-transparent hover:bg-[var(--brand-soft)] border border-[var(--brand-primary)] shadow-subtle transition-colors"
                  >
                    <Plus size={13} />
                    <span>Post Idea</span>
                  </Link>

                  {/* Theme Toggle */}
                  <button
                    onClick={toggleTheme}
                    aria-label="Toggle theme"
                    className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-soft)] transition-colors cursor-pointer"
                  >
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                  </button>

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

                  {/* User Avatar & Dropdown (Round on both Mobile & Desktop) */}
                  <div ref={profileRef} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(!profileDropdownOpen);
                        setMobileMenuOpen(false);
                      }}
                      aria-label="My Profile Menu"
                      className="flex items-center justify-center p-0.5 rounded-full border border-[var(--border-subtle)] hover:border-brand-600 transition-colors focus:outline-none cursor-pointer shrink-0"
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
                        <div className="absolute right-0 mt-1.5 w-56 max-w-[calc(100vw-1rem)] bg-[var(--bg-surface)] rounded-lg shadow-modal border border-[var(--border-subtle)] py-1.5 z-50 animate-fade-in">
                          <div className="px-3.5 py-2 border-b border-[var(--border-subtle)]">
                            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                              {user.profile?.fullName || 'Founder'}
                            </p>
                            <p className="text-[11px] text-[var(--text-muted)] truncate">
                              {user.email}
                            </p>
                          </div>

                          <div className="py-1">
                            <button
                              type="button"
                              onClick={() => {
                                setProfileDropdownOpen(false);
                                setAiScoutOpen(true);
                              }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-soft)] text-left transition-colors cursor-pointer"
                            >
                              <Sparkles size={14} className="text-[var(--brand-primary)]" />
                              <span>AI - Scout (Finder)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setProfileDropdownOpen(false);
                                window.dispatchEvent(new CustomEvent('startupz_open_notifications'));
                              }}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] text-left transition-colors cursor-pointer"
                            >
                              <Bell size={14} className="text-[var(--brand-primary)]" />
                              <span>Notifications</span>
                            </button>
                            <Link
                              to="/network"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] transition-colors"
                            >
                              <Users size={14} className="text-[var(--brand-primary)]" />
                              <span>My Network</span>
                            </Link>
                            <Link
                              to={`/profile/${user.id}`}
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]"
                            >
                              <UserIcon size={14} className="text-[var(--text-muted)]" />
                              <span>My Profile</span>
                            </Link>
                            <Link
                              to="/saved"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]"
                            >
                              <Bookmark size={14} className="text-[var(--text-muted)]" />
                              <span>Saved Items</span>
                            </Link>
                            <Link
                              to={`/profile/${user.id}?edit=true`}
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]"
                            >
                              <Settings size={14} className="text-[var(--text-muted)]" />
                              <span>Settings</span>
                            </Link>
                            <button type="button" onClick={toggleTheme} aria-pressed={theme === 'dark'}
                              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]">
                              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                              <span>{theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}</span>
                            </button>
                          </div>

                          <div className="pt-1 border-t border-[var(--border-subtle)]">
                            <button
                              type="button"
                              onClick={async () => {
                                setProfileDropdownOpen(false);
                                await logout();
                                navigate('/login');
                              }}
                              className="flex items-center gap-2.5 w-full text-left px-3.5 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
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
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md text-[var(--text-secondary)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-primary)] shadow-subtle transition-colors cursor-pointer"
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

                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] transition-colors cursor-pointer"
                  >
                    <LogIn size={13} className="text-[var(--text-muted)]" />
                    <span>Log In</span>
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md text-white btn-primary shadow-subtle transition-colors shrink-0"
                  >
                    <span>Join</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden px-4 pt-3 pb-6 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3 max-h-[85vh] overflow-y-auto">
            {/* Logged-In User Profile */}
            {user && (
              <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-subtle)] space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <Avatar
                    src={user.profile?.avatar}
                    name={user.profile?.fullName || user.email}
                    size="md"
                    className="!w-9 !h-9"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {user.profile?.fullName || 'Founder'}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">
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
                navigate('/search');
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs bg-[var(--bg-primary)] text-[var(--text-muted)] border border-[var(--border-subtle)] cursor-pointer"
            >
              <Search size={14} className="text-[var(--text-muted)]" />
              <span>Search platform, skills, founders...</span>
            </button>

            {/* Quick Primary Links - 5 Core Tools + AI Scout */}
            <div className="space-y-2">
              {!isAuthPage && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAiScoutOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg text-xs font-semibold btn-primary shadow-xs"
                >
                  <Sparkles size={15} className="text-white" />
                  <span>AI - Scout Finder</span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium border transition-colors ${
                    isActive('/')
                      ? 'border-brand-600 bg-[var(--brand-soft)] text-[var(--brand-primary)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]'
                  }`}
                >
                  <Home size={15} className="text-[var(--brand-primary)]" />
                  <span>1. Home</span>
                </Link>

                <Link
                  to="/feed"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium border transition-colors ${
                    isActive('/feed')
                      ? 'border-brand-600 bg-[var(--brand-soft)] text-[var(--brand-primary)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]'
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
                      ? 'border-brand-600 bg-[var(--brand-soft)] text-[var(--brand-primary)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]'
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
                      ? 'border-brand-600 bg-[var(--brand-soft)] text-[var(--brand-primary)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]'
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
                      ? 'border-brand-600 bg-[var(--brand-soft)] text-[var(--brand-primary)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]'
                  }`}
                >
                  <Briefcase size={15} className="text-[var(--brand-primary)]" />
                  <span>5. Opportunities</span>
                </Link>
              </div>
            </div>

            {/* Mobile Auth / Profile Section */}
            {!user ? (
              <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleGoogleClick();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-primary)] shadow-subtle cursor-pointer"
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
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 btn-secondary text-center py-1.5"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 btn-primary text-center py-1.5"
                  >
                    Join HookZ
                  </Link>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5">
                <div className="grid grid-cols-3 gap-1.5">
                  <Link
                    to="/startups/create"
                    onClick={() => setMobileMenuOpen(false)}
                    className="border border-[var(--brand-primary)] text-[var(--brand-primary)] bg-transparent hover:bg-[var(--brand-soft)] rounded-md text-center py-1.5 text-xs font-semibold transition-colors"
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
                    navigate('/login');
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



      {/* Google Account Selection Modal */}
      <GoogleAccountChooserModal
        isOpen={googleChooserOpen}
        onClose={() => setGoogleChooserOpen(false)}
      />
    </>
  );
};
