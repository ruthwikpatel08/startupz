import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api, isDemoRecord } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { StartupOpportunity, OpportunityApplication } from '../../types';
import { FALLBACK_OPPORTUNITIES } from '../../data/curatedFallbackData';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { SEO } from '../../components/common/SEO';
import {
  Briefcase,
  Search,
  Filter,
  MapPin,
  Clock,
  DollarSign,
  Send,
  CheckCircle,
  ExternalLink,
  Building,
  GraduationCap,
  Lock,
} from 'lucide-react';

export const OpportunitiesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentType = (searchParams.get('type') || 'ALL').toLowerCase();
  const isInitialMount = React.useRef(true);

  const [activeTab, setActiveTab] = useState<'EXPLORE' | 'MY_APPLICATIONS'>('EXPLORE');
  const [opportunities, setOpportunities] = useState<StartupOpportunity[]>(() => {
    try {
      const raw = sessionStorage.getItem('startupz_cached_opportunities');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [myApplications, setMyApplications] = useState<OpportunityApplication[]>([]);
  const [loading, setLoading] = useState(() => opportunities.length === 0);

  // Filters
  const [role, setRole] = useState('ALL');
  const [workplaceType, setWorkplaceType] = useState('ALL');
  const [commitment, setCommitment] = useState('ALL');
  const [search, setSearch] = useState('');

  // Application Modal state
  const [selectedOpp, setSelectedOpp] = useState<StartupOpportunity | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [applying, setApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const filterFallbackOpportunities = (
    typeFilter: string,
    roleFilter: string,
    workplaceFilter: string,
    commitmentFilter: string,
    searchFilter: string
  ) => {
    return FALLBACK_OPPORTUNITIES.filter((opp) => {
      if (typeFilter && typeFilter !== 'all') {
        const tLower = typeFilter.toLowerCase();
        if (tLower === 'internships' || tLower === 'internship') {
          const isIntern =
            opp.commitment.toLowerCase().includes('intern') ||
            opp.role.toLowerCase().includes('intern') ||
            opp.description.toLowerCase().includes('intern');
          if (!isIntern) return false;
        } else if (tLower === 'jobs' || tLower === 'job') {
          const isIntern =
            opp.commitment.toLowerCase().includes('intern') ||
            opp.role.toLowerCase().includes('intern');
          if (isIntern) return false;
        }
      }

      if (roleFilter !== 'ALL') {
        const rLower = roleFilter.toLowerCase();
        const oppRoleLower = opp.role.toLowerCase();
        if (!oppRoleLower.includes(rLower)) {
          if (rLower.includes('grant') && !oppRoleLower.includes('grant') && !oppRoleLower.includes('fellowship')) return false;
          if (rLower.includes('engineer') && !oppRoleLower.includes('engineer') && !oppRoleLower.includes('builder')) return false;
        }
      }

      if (workplaceFilter !== 'ALL' && opp.workplaceType !== workplaceFilter) return false;
      if (commitmentFilter !== 'ALL' && opp.commitment !== commitmentFilter) return false;

      if (searchFilter) {
        const q = searchFilter.toLowerCase();
        const text = `${opp.role} ${opp.description} ${opp.requiredSkills} ${opp.startup?.name}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    });
  };

  const fetchOpportunities = async () => {
    if (opportunities.length === 0) {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams();
      if (currentType && currentType !== 'all') params.append('type', currentType);
      if (role !== 'ALL') params.append('role', role);
      if (workplaceType !== 'ALL') params.append('workplaceType', workplaceType);
      if (commitment !== 'ALL') params.append('commitment', commitment);
      if (search) params.append('search', search);

      const res = await api.getOpportunities(params.toString());
      const clean = (res.opportunities || []).filter((o: any) => !isDemoRecord(o));
      setOpportunities(clean);
      if (currentType === 'all' && role === 'ALL' && workplaceType === 'ALL' && commitment === 'ALL' && !search && clean.length > 0) {
        try {
          sessionStorage.setItem('startupz_cached_opportunities', JSON.stringify(clean));
        } catch {}
      }
    } catch (err) {
      console.warn('Backend returned warning for opportunities:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyApplications = async () => {
    if (!user) return;
    try {
      const res = await api.getMyApplications();
      setMyApplications(res.applications || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchMyApplications();
    }
  }, [user?.id]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchOpportunities();
      return;
    }
    const timer = setTimeout(() => {
      fetchOpportunities();
    }, 250);
    return () => clearTimeout(timer);
  }, [currentType, role, workplaceType, commitment, search]);

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setSelectedOpp(null);
      navigate('/login');
      return;
    }
    if (!selectedOpp) return;
    setApplying(true);
    setApplyError(null);

    try {
      await api.applyOpportunity(selectedOpp.id, {
        coverLetter: coverLetter.trim(),
        resumeUrl: resumeUrl.trim() || undefined,
      });

      setApplySuccess(true);
      fetchOpportunities();
      fetchMyApplications();
      setTimeout(() => {
        setApplySuccess(false);
        setSelectedOpp(null);
        setCoverLetter('');
        setResumeUrl('');
      }, 1500);
    } catch (err: any) {
      setApplyError(err.message || 'Failed to submit application.');
    } finally {
      setApplying(false);
    }
  };

  const roles = ['ALL', 'Grant / Fellowship', 'Accelerator / Program', 'Engineer', 'Scientist / Researcher', 'Co-Founder', 'Developer', 'Designer', 'Product'];
  const workplaces = ['ALL', 'Remote', 'Hybrid', 'On-site'];
  const commitments = ['ALL', 'Internship', 'Full-time', 'Part-time', 'Grant / Fellowship', 'Grant / Incubation', 'National Challenge Grant', 'Contract'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <SEO
        title="Startup Opportunities | HookZ"
        description="Join early-stage startups as an intern, founding engineer, design lead, or growth partner. Explore curated startup roles on HookZ."
        canonicalPath="/opportunities"
        breadcrumbs={[{ name: 'Opportunities', path: '/opportunities' }]}
      />
      
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="text-cyan-600" size={28} /> Startup Roles & Opportunities
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Join early-stage startups as an intern, founding engineer, design lead, or growth partner.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('EXPLORE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'EXPLORE'
                ? 'bg-white dark:bg-dark-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Explore Openings ({opportunities.length})
          </button>
          <button
            onClick={() => setActiveTab('MY_APPLICATIONS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'MY_APPLICATIONS'
                ? 'bg-white dark:bg-dark-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            My Applications ({myApplications.length})
          </button>
        </div>
      </div>

      {activeTab === 'EXPLORE' ? (
        <>
          {/* Opportunity Type Filter Pills */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              Opportunity Type:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'All Opportunities', value: 'ALL' },
                { label: 'Internships', value: 'internships' },
                { label: 'Jobs', value: 'jobs' },
              ].map((t) => {
                const isSelected =
                  (t.value === 'ALL' && (!currentType || currentType === 'all')) ||
                  currentType === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => {
                      const params = new URLSearchParams(searchParams);
                      if (t.value === 'ALL') {
                        params.delete('type');
                      } else {
                        params.set('type', t.value);
                      }
                      setSearchParams(params);
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-dark-700'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filters Bar */}
          <div className="card-base p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search roles, skills, startups..."
                className="input-base w-full pl-9 pr-3 py-2 text-xs"
              />
            </div>

            <div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="input-base w-full py-2 px-3 text-xs"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r === 'ALL' ? 'All Roles' : r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={workplaceType}
                onChange={(e) => setWorkplaceType(e.target.value)}
                className="input-base w-full py-2 px-3 text-xs"
              >
                {workplaces.map((w) => (
                  <option key={w} value={w}>
                    {w === 'ALL' ? 'All Locations' : w}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={commitment}
                onChange={(e) => setCommitment(e.target.value)}
                className="input-base w-full py-2 px-3 text-xs"
              >
                {commitments.map((c) => (
                  <option key={c} value={c}>
                    {c === 'ALL' ? 'All Commitments' : c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Opportunities Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-56 rounded-lg bg-slate-100 dark:bg-dark-850 animate-pulse border border-slate-200 dark:border-dark-800" />
              ))}
            </div>
          ) : opportunities.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No opportunities found"
              description="No open roles match your current search criteria."
              actionLabel="Reset Search"
              onAction={() => {
                setRole('ALL');
                setWorkplaceType('ALL');
                setCommitment('ALL');
                setSearch('');
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {opportunities.map((opp) => (
                <div
                  key={opp.id}
                  onClick={() => setSelectedOpp(opp)}
                  className="card-base p-5 hover:border-slate-300 dark:hover:border-dark-700 transition-colors flex flex-col justify-between space-y-3.5 cursor-pointer group"
                >
                  <div className="space-y-3">
                    {/* Header: Role & Startup info */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={opp.startup?.logo || `https://api.dicebear.com/7.x/identicon/svg?seed=${opp.startup?.name}`}
                          alt=""
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-dark-700 shrink-0"
                        />
                        <div>
                          <h3 className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">
                            {opp.role}
                          </h3>
                          <Link
                            to={`/startups/${opp.startup?.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs font-medium text-slate-500 hover:text-brand-600 block transition-colors"
                          >
                            {opp.startup?.name} • {opp.startup?.stage}
                          </Link>
                        </div>
                      </div>

                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-dark-850 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-dark-700/60">
                        {opp.workplaceType}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                      {opp.description}
                    </p>

                    {/* Compensation & Meta */}
                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 pt-0.5">
                      <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                        <DollarSign size={13} /> {opp.compensation}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock size={13} /> {opp.commitment}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin size={13} /> {opp.location}
                      </span>
                    </div>

                    {/* Required Skills */}
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {(opp.requiredSkills || '').split(',').map((sk) => sk.trim()).filter(Boolean).map((sk, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-dark-850 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-dark-700/60"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/startups/${opp.startup?.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                      >
                        Startup Profile
                      </Link>
                      {(() => {
                        const urlMatch = opp.description.match(/https?:\/\/[^\s)]+/);
                        return urlMatch ? (
                          <a
                            href={urlMatch[0]}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline"
                            title="Official External Portal / Source"
                          >
                            <span>Official Portal</span>
                            <ExternalLink size={11} />
                          </a>
                        ) : null;
                      })()}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOpp(opp);
                        }}
                        className="btn-secondary px-3 py-1 text-xs font-medium"
                      >
                        Details
                      </button>

                      {opp.hasApplied ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle size={13} /> Applied
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOpp(opp);
                          }}
                          className="btn-primary inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium"
                        >
                          <Send size={12} /> Apply Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* My Applications Tab */
        <div className="space-y-4">
          {myApplications.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No applications submitted yet"
              description="Browse open opportunities and submit your candidacy to early-stage ventures."
              actionLabel="Explore Roles"
              onAction={() => setActiveTab('EXPLORE')}
            />
          ) : (
            <div className="space-y-3">
              {myApplications.map((app) => (
                <div
                  key={app.id}
                  className="card-base p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                        {app.opportunity?.role}
                      </h4>
                      <span className="text-xs text-slate-400">@ {app.opportunity?.startup?.name}</span>
                    </div>
                    {app.coverLetter && (
                      <p className="text-xs text-slate-500 italic line-clamp-1">
                        "{app.coverLetter}"
                      </p>
                    )}
                    <span className="text-[11px] text-slate-400">
                      Applied on {new Date(app.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-md uppercase tracking-wider ${
                        app.status === 'ACCEPTED'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : app.status === 'REJECTED'
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Apply / Detail Modal */}
      <Modal
        isOpen={!!selectedOpp}
        onClose={() => setSelectedOpp(null)}
        title={selectedOpp ? selectedOpp.role : ''}
      >
        {selectedOpp && (
          <div className="space-y-5">
            {/* Header info */}
            <div className="p-4 bg-slate-50 dark:bg-dark-850 rounded-lg border border-slate-200 dark:border-dark-800 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedOpp.startup?.logo || `https://api.dicebear.com/7.x/identicon/svg?seed=${selectedOpp.startup?.name}`}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-dark-700 shrink-0"
                  />
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                      {selectedOpp.startup?.name}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {selectedOpp.startup?.stage} • {selectedOpp.startup?.industry || 'Technology'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-dark-700/60">
                    {selectedOpp.workplaceType}
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200/50">
                    {selectedOpp.commitment}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs pt-2 border-t border-slate-200/60 dark:border-dark-700/60">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <DollarSign size={13} /> {selectedOpp.compensation}
                </span>
                <span className="text-slate-500 flex items-center gap-1">
                  <MapPin size={13} /> {selectedOpp.location}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Role Description & Responsibilities
              </h5>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {selectedOpp.description}
              </p>
            </div>

            {/* Required Skills */}
            {selectedOpp.requiredSkills && (
              <div className="space-y-1.5">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Required Competencies & Skills
                </h5>
                <div className="flex flex-wrap gap-1">
                  {selectedOpp.requiredSkills.split(',').map((sk) => sk.trim()).filter(Boolean).map((sk, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-dark-850 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-dark-700/60"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* External Official Portal Link */}
            {(() => {
              const urlMatch = selectedOpp.description.match(/https?:\/\/[^\s)]+/);
              return urlMatch ? (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-dark-800 flex items-center justify-between">
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    Verified external portal link available
                  </span>
                  <a
                    href={urlMatch[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-md bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                  >
                    <span>Visit Official Portal</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              ) : null;
            })()}

            {/* Apply Action Section */}
            <div className="pt-3 border-t border-slate-100 dark:border-dark-800">
              {applySuccess ? (
                <div className="text-center py-6 space-y-2">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle size={22} />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white text-sm">Application Submitted</h4>
                  <p className="text-xs text-slate-500">
                    The founder at {selectedOpp.startup?.name} has been notified of your candidacy.
                  </p>
                </div>
              ) : !user ? (
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-dark-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <h5 className="font-semibold text-xs text-slate-900 dark:text-white">
                      Sign In to Apply for this Role
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Create an account or log in to submit your profile and directly message the startup team.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOpp(null);
                        navigate('/login');
                      }}
                      className="btn-primary px-3 py-1.5 text-xs font-medium"
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOpp(null);
                        navigate('/register');
                      }}
                      className="btn-secondary px-3 py-1.5 text-xs font-medium"
                    >
                      Register
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleApplySubmit} className="space-y-3.5">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Submit Your Candidacy
                  </h5>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Why are you a great fit? (Cover note) *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder="Highlight your relevant past experience, domain enthusiasm, and how you can accelerate this startup..."
                      className="input-base w-full text-xs px-3 py-2 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Resume URL or Portfolio Link (Optional)
                    </label>
                    <input
                      type="url"
                      value={resumeUrl}
                      onChange={(e) => setResumeUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/... or GitHub / portfolio link"
                      className="input-base w-full text-xs px-3 py-2"
                    />
                  </div>

                  {applyError && (
                    <div className="p-2.5 text-xs rounded-md bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
                      {applyError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedOpp(null)}
                      className="btn-secondary px-3 py-1.5 text-xs font-medium"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={applying}
                      className="btn-primary inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium cursor-pointer"
                    >
                      <Send size={12} />
                      {applying ? 'Submitting...' : 'Submit Application'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};
