import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { StartupOpportunity, OpportunityApplication } from '../../types';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
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
} from 'lucide-react';

export const OpportunitiesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentType = (searchParams.get('type') || 'ALL').toLowerCase();

  const [activeTab, setActiveTab] = useState<'EXPLORE' | 'MY_APPLICATIONS'>('EXPLORE');
  const [opportunities, setOpportunities] = useState<StartupOpportunity[]>([]);
  const [myApplications, setMyApplications] = useState<OpportunityApplication[]>([]);
  const [loading, setLoading] = useState(true);

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

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentType && currentType !== 'all') params.append('type', currentType);
      if (role !== 'ALL') params.append('role', role);
      if (workplaceType !== 'ALL') params.append('workplaceType', workplaceType);
      if (commitment !== 'ALL') params.append('commitment', commitment);
      if (search) params.append('search', search);

      const res = await api.getOpportunities(params.toString());
      setOpportunities(res.opportunities || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyApplications = async () => {
    try {
      const res = await api.getMyApplications();
      setMyApplications(res.applications || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOpportunities();
    fetchMyApplications();
  }, [currentType, role, workplaceType, commitment, search]);

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Opportunity Type:
            </label>
            <div className="flex flex-wrap gap-2.5">
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
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25 ring-2 ring-brand-500/30'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-brand-400'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search roles, skills, startups..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                className="w-full py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                className="w-full py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-60 rounded-3xl bg-slate-100 dark:bg-dark-850 animate-pulse" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {opportunities.map((opp) => (
                <div
                  key={opp.id}
                  className="p-6 rounded-3xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header: Role & Startup info */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={opp.startup?.logo || `https://api.dicebear.com/7.x/identicon/svg?seed=${opp.startup?.name}`}
                          alt=""
                          className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-800"
                        />
                        <div>
                          <h3 className="font-bold text-base text-slate-900 dark:text-white">
                            {opp.role}
                          </h3>
                          <Link
                            to={`/startups/${opp.startup?.id}`}
                            className="text-xs font-semibold text-brand-600 hover:underline block"
                          >
                            {opp.startup?.name} • {opp.startup?.stage}
                          </Link>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400">
                        {opp.workplaceType}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">
                      {opp.description}
                    </p>

                    {/* Compensation & Meta */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
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
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(opp.requiredSkills || '').split(',').map((sk) => sk.trim()).filter(Boolean).map((sk, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-dark-850 text-slate-600 dark:text-slate-300"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/startups/${opp.startup?.id}`}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                      >
                        View Startup Profile →
                      </Link>
                      {(() => {
                        const urlMatch = opp.description.match(/https?:\/\/[^\s)]+/);
                        return urlMatch ? (
                          <a
                            href={urlMatch[0]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
                            title="Official External Portal / Source"
                          >
                            <span>Official Portal</span>
                            <ExternalLink size={12} />
                          </a>
                        ) : null;
                      })()}
                    </div>

                    {opp.hasApplied ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950">
                        <CheckCircle size={14} /> Applied
                      </span>
                    ) : (
                      <button
                        onClick={() => setSelectedOpp(opp)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-sm"
                      >
                        <Send size={13} /> Apply Now
                      </button>
                    )}
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
                  className="p-5 rounded-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {app.opportunity?.role}
                      </h4>
                      <span className="text-xs text-slate-400">@ {app.opportunity?.startup?.name}</span>
                    </div>
                    {app.coverLetter && (
                      <p className="text-xs text-slate-500 italic line-clamp-1">
                        "{app.coverLetter}"
                      </p>
                    )}
                    <span className="text-[10px] text-slate-400">
                      Applied on {new Date(app.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                        app.status === 'ACCEPTED'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : app.status === 'REJECTED'
                          ? 'bg-rose-50 text-rose-600 border border-rose-200'
                          : 'bg-amber-50 text-amber-600 border border-amber-200'
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

      {/* Apply Modal */}
      <Modal
        isOpen={!!selectedOpp}
        onClose={() => setSelectedOpp(null)}
        title={selectedOpp ? `Apply: ${selectedOpp.role}` : ''}
      >
        {applySuccess ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={28} />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base">Application Submitted!</h4>
            <p className="text-xs text-slate-500">
              The founder at {selectedOpp?.startup?.name} has been notified of your application.
            </p>
          </div>
        ) : (
          <form onSubmit={handleApplySubmit} className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-dark-850 rounded-xl text-xs space-y-1">
              <div className="font-bold text-slate-900 dark:text-white">{selectedOpp?.startup?.name}</div>
              <div className="text-slate-500">{selectedOpp?.commitment} • {selectedOpp?.compensation}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Why are you a great fit? (Cover note) *
              </label>
              <textarea
                required
                rows={4}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Mention your relevant experience with these skills, past projects, or portfolio links..."
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Resume URL or Portfolio Link (Optional)
              </label>
              <input
                type="url"
                value={resumeUrl}
                onChange={(e) => setResumeUrl(e.target.value)}
                placeholder="https://linkedin.com/in/... or drive link"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {applyError && (
              <div className="p-3 text-xs rounded-xl bg-red-50 dark:bg-red-950 text-red-600">
                {applyError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedOpp(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={applying}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md"
              >
                {applying ? 'Submitting...' : 'Submit Candidacy'}
              </button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
};
