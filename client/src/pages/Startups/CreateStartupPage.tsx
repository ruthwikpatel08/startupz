import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Rocket, ShieldAlert, Sparkles, Lock, ArrowRight } from 'lucide-react';
import { StartupStage } from '../../types';
import { SEO } from '../../components/common/SEO';

export const CreateStartupPage: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [logo, setLogo] = useState('');
  const [oneLineDescription, setOneLineDescription] = useState('');
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [targetCustomers, setTargetCustomers] = useState('');
  const [industry, setIndustry] = useState('AI');
  const [businessModel, setBusinessModel] = useState('B2B SaaS');
  const [stage, setStage] = useState<StartupStage>('Idea');
  const [location, setLocation] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [fundingStatus, setFundingStatus] = useState('Bootstrapped');
  const [fundingRequired, setFundingRequired] = useState('');
  const [currentTraction, setCurrentTraction] = useState('');
  const [website, setWebsite] = useState('');
  const [demoLink, setDemoLink] = useState('');
  const [pitchDeckUrl, setPitchDeckUrl] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'CONNECTIONS_ONLY' | 'PRIVATE'>('PUBLIC');
  const [isConfidential, setIsConfidential] = useState(false);

  // Hiring & Opportunities linking (Jobs & Internships)
  const [hiringType, setHiringType] = useState<'NONE' | 'INTERNSHIP' | 'JOB' | 'BOTH'>('NONE');
  const [opportunityRole, setOpportunityRole] = useState('');
  const [opportunityWorkplaceType, setOpportunityWorkplaceType] = useState('Remote');
  const [opportunityCompensation, setOpportunityCompensation] = useState('');
  const [opportunityDescription, setOpportunityDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const NAME_MAX = 60;
  const TAGLINE_MAX = 100;
  const FIELD_MAX = 500;

  const formIsValid =
    name.trim().length > 0 &&
    name.length <= NAME_MAX &&
    oneLineDescription.trim().length > 0 &&
    oneLineDescription.length <= TAGLINE_MAX &&
    problem.trim().length > 0 &&
    problem.length <= FIELD_MAX &&
    solution.trim().length > 0 &&
    solution.length <= FIELD_MAX;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.createStartup({
        name,
        logo: logo || undefined,
        oneLineDescription,
        problem,
        solution,
        targetCustomers,
        industry,
        businessModel,
        stage,
        location,
        requiredSkills,
        fundingStatus,
        fundingRequired,
        currentTraction,
        website,
        demoLink,
        pitchDeckUrl,
        visibility,
        isConfidential,
        // Link to Opportunities (Jobs / Internships)
        hiringType,
        opportunityRole: hiringType !== 'NONE' ? opportunityRole : undefined,
        opportunityWorkplaceType: hiringType !== 'NONE' ? opportunityWorkplaceType : undefined,
        opportunityCompensation: hiringType !== 'NONE' ? opportunityCompensation : undefined,
        opportunityDescription: hiringType !== 'NONE' ? opportunityDescription : undefined,
      });

      navigate(`/startups/${res.startup.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create startup venture.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillSample = () => {
    setName('EcoPulse AI');
    setOneLineDescription('Automated edge IoT and satellite intelligence for precision farm irrigation.');
    setProblem('Smallholder and commercial farms lose over 35% of fresh water through uncalibrated irrigation cycles.');
    setSolution('Low-cost edge IoT soil telemetry paired with micro-climate satellite AI to deliver hourly irrigation schedules.');
    setTargetCustomers('Commercial agriculture collectives and greenhouse operators');
    setIndustry('AgTech');
    setBusinessModel('B2B SaaS');
    setStage('MVP');
    setLocation('Bengaluru / Austin');
    setRequiredSkills('IoT Firmware, React, Python, Remote Sensing');
    setFundingStatus('Bootstrapped');
    setFundingRequired('$250,000');
    setCurrentTraction('3 live pilot farms, 1,200 acres actively monitored');
    setHiringType('BOTH');
    setOpportunityRole('Full Stack Engineer & AI Specialist');
    setOpportunityWorkplaceType('Remote');
    setOpportunityCompensation('Paid Stipend + Equity');
    setOpportunityDescription('Seeking ambitious student builders or engineers to co-build our edge telemetry gateway.');
  };

  const industries = ['AI', 'AgTech', 'HealthTech', 'ClimateTech', 'EdTech', 'FinTech', 'B2B SaaS', 'Consumer Tech', 'Robotics', 'Other'];
  const stages: StartupStage[] = ['Idea', 'Validation', 'MVP', 'Early Revenue', 'Growth', 'Fundraising'];
  const businessModels = ['B2B SaaS', 'B2C Subscription', 'Marketplace', 'D2C', 'Enterprise', 'Freemium', 'Usage-based API'];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <SEO title="Publish Startup Idea or Venture | HookZ" noindex={true} />
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
            <Rocket className="text-brand-600" size={26} /> Publish Startup Idea or Venture
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Publish your venture on HookZ to discover co-founders, early teammates, and investor interest.
          </p>
        </div>
        <button
          type="button"
          onClick={handleFillSample}
          className="btn-secondary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium shrink-0 cursor-pointer"
        >
          <Sparkles size={14} className="text-brand-600" />
          <span>Auto-Fill Sample Idea</span>
        </button>
      </div>

      {/* IP Protection Notice */}
      <div className="p-3.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
        <ShieldAlert size={17} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div className="space-y-1">
          <p className="font-semibold">Privacy & Idea Protection Advisory:</p>
          <p className="leading-relaxed">
            HookZ does not automatically enforce NDAs or legal patents. Focus on sharing your problem, market insight, and execution vision without disclosing sensitive proprietary algorithms or trade secrets. You can set visibility to "Connections Only" or toggle "Confidential Idea".
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="card-base p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 text-xs rounded-md bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
              {error}
            </div>
          )}

          {/* Core Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Startup Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
                placeholder="e.g. FarmConnect"
                className={`input-base w-full px-3 py-2 text-sm ${name.length > NAME_MAX ? 'border-red-500' : ''}`}
              />
              <div className="flex justify-between mt-1">
                {name.length > NAME_MAX && <span className="text-xs text-red-500">Exceeds {NAME_MAX} characters</span>}
                <span className={`text-xs ml-auto ${name.length > NAME_MAX ? 'text-red-500' : 'text-slate-400'}`}>{name.length}/{NAME_MAX}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Industry Sector *
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="input-base w-full px-3 py-2 text-sm"
              >
                {industries.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              One-Line Pitch / Elevator Summary *
            </label>
            <input
              type="text"
              required
              value={oneLineDescription}
              onChange={(e) => setOneLineDescription(e.target.value.slice(0, TAGLINE_MAX))}
              placeholder="e.g. AI-powered agronomic advisory platform delivering real-time crop disease detection."
              className={`input-base w-full px-3 py-2 text-sm ${oneLineDescription.length > TAGLINE_MAX ? 'border-red-500' : ''}`}
            />
            <div className="flex justify-between mt-1">
              {oneLineDescription.length > TAGLINE_MAX && <span className="text-xs text-red-500">Exceeds {TAGLINE_MAX} characters</span>}
              <span className={`text-xs ml-auto ${oneLineDescription.length > TAGLINE_MAX ? 'text-red-500' : 'text-slate-400'}`}>{oneLineDescription.length}/{TAGLINE_MAX}</span>
            </div>
          </div>

          {/* Problem & Solution */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              The Problem You're Solving *
            </label>
            <textarea
              rows={3}
              required
              value={problem}
              onChange={(e) => setProblem(e.target.value.slice(0, FIELD_MAX))}
              placeholder="What painful friction or loss does the customer experience today?"
              className={`input-base w-full px-3 py-2 text-sm resize-none ${problem.length > FIELD_MAX ? 'border-red-500' : ''}`}
            />
            <div className="flex justify-between mt-1">
              {problem.trim().length === 0 && <span className="text-xs text-red-500">Required</span>}
              <span className={`text-xs ml-auto ${problem.length > FIELD_MAX ? 'text-red-500' : 'text-slate-400'}`}>{problem.length}/{FIELD_MAX}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Your Solution & Technology *
            </label>
            <textarea
              rows={3}
              required
              value={solution}
              onChange={(e) => setSolution(e.target.value.slice(0, FIELD_MAX))}
              placeholder="How does your product solve this problem 10x better or cheaper?"
              className={`input-base w-full px-3 py-2 text-sm resize-none ${solution.length > FIELD_MAX ? 'border-red-500' : ''}`}
            />
            <div className="flex justify-between mt-1">
              {solution.trim().length === 0 && <span className="text-xs text-red-500">Required</span>}
              <span className={`text-xs ml-auto ${solution.length > FIELD_MAX ? 'text-red-500' : 'text-slate-400'}`}>{solution.length}/{FIELD_MAX}</span>
            </div>
          </div>

          {/* Target Customers & Business Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Target Customers
              </label>
              <input
                type="text"
                value={targetCustomers}
                onChange={(e) => setTargetCustomers(e.target.value)}
                placeholder="e.g. Commercial farmers, B2B SaaS SMBs"
                className="input-base w-full px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Business Model
              </label>
              <select
                value={businessModel}
                onChange={(e) => setBusinessModel(e.target.value)}
                className="input-base w-full px-3 py-2 text-sm"
              >
                {businessModels.map((bm) => (
                  <option key={bm} value={bm}>
                    {bm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stage, Location, Required Skills */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Venture Stage *
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as StartupStage)}
                className="input-base w-full px-3 py-2 text-sm"
              >
                {stages.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Headquarters / Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Austin, TX or Remote"
                className="input-base w-full px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Funding Status
              </label>
              <input
                type="text"
                value={fundingStatus}
                onChange={(e) => setFundingStatus(e.target.value)}
                placeholder="e.g. Bootstrapped / Pre-Seed"
                className="input-base w-full px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Required Skills (comma separated)
            </label>
            <input
              type="text"
              value={requiredSkills}
              onChange={(e) => setRequiredSkills(e.target.value)}
              placeholder="e.g. AI Developer, Full Stack Engineer, Growth Marketer"
              className="input-base w-full px-3 py-2 text-sm"
            />
          </div>

          {/* Hiring & Opportunities Linking (Internships & Jobs) */}
          <div className="p-4 rounded-xl border border-brand-200/70 dark:border-brand-900/60 bg-brand-50/40 dark:bg-brand-950/20 space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                Looking for Talent or Team Members? (Appear under Opportunities)
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose if you are seeking interns or full-time builders. We will automatically link and display these openings in the Opportunities directory.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'NONE', label: 'Not Hiring Now' },
                { id: 'INTERNSHIP', label: 'Internship Wanted' },
                { id: 'JOB', label: 'Job Opening' },
                { id: 'BOTH', label: 'Both (Jobs & Internships)' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setHiringType(opt.id as any)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-center cursor-pointer ${
                    hiringType === opt.id
                      ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                      : 'bg-white dark:bg-dark-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-dark-700 hover:border-brand-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {hiringType !== 'NONE' && (
              <div className="pt-2 border-t border-brand-100 dark:border-brand-900/50 space-y-3 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Opportunity Role Title *
                    </label>
                    <input
                      type="text"
                      value={opportunityRole}
                      onChange={(e) => setOpportunityRole(e.target.value)}
                      placeholder="e.g. Frontend Engineer, Product Design Intern"
                      className="input-base w-full px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Workplace Type
                    </label>
                    <select
                      value={opportunityWorkplaceType}
                      onChange={(e) => setOpportunityWorkplaceType(e.target.value)}
                      className="input-base w-full px-3 py-2 text-sm"
                    >
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="On-site">On-site</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Compensation / Stipend
                    </label>
                    <input
                      type="text"
                      value={opportunityCompensation}
                      onChange={(e) => setOpportunityCompensation(e.target.value)}
                      placeholder="e.g. Paid Stipend ($500/mo), Equity + Stipend, Full-time"
                      className="input-base w-full px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Role Overview / What You Need
                    </label>
                    <input
                      type="text"
                      value={opportunityDescription}
                      onChange={(e) => setOpportunityDescription(e.target.value)}
                      placeholder="Brief role summary for applicants"
                      className="input-base w-full px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Links & Traction */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Funding Target ($)
              </label>
              <input
                type="text"
                value={fundingRequired}
                onChange={(e) => setFundingRequired(e.target.value)}
                placeholder="e.g. $250,000"
                className="input-base w-full px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Website
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                className="input-base w-full px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Demo Link
              </label>
              <input
                type="url"
                value={demoLink}
                onChange={(e) => setDemoLink(e.target.value)}
                placeholder="https://demo..."
                className="input-base w-full px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Current Traction / Milestones
            </label>
            <input
              type="text"
              value={currentTraction}
              onChange={(e) => setCurrentTraction(e.target.value)}
              placeholder="e.g. 500 active beta users, 12 signed LOIs, $3k MRR"
              className="input-base w-full px-3 py-2 text-sm"
            />
          </div>

          {/* Privacy & Confidentiality Settings */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-dark-800 space-y-3">
            <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Visibility & Confidentiality
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Audience Visibility</label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as any)}
                  className="input-base w-full py-1.5 px-2.5 text-xs"
                >
                  <option value="PUBLIC">Public (Visible across HookZ)</option>
                  <option value="CONNECTIONS_ONLY">Connections Only</option>
                  <option value="PRIVATE">Private (Only You & Team)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="confidential"
                  checked={isConfidential}
                  onChange={(e) => setIsConfidential(e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                />
                <label htmlFor="confidential" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Mark as Confidential Idea
                </label>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !formIsValid}
            className="w-full btn-primary inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? (
              'Publishing Venture...'
            ) : (
              <>
                <Rocket size={16} />
                <span>Publish Startup Profile</span>
              </>
            )}
          </button>
        </form>
      </div>

    </div>
  );
};
