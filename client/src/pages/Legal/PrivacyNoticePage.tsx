import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, FileText, UserCheck, AlertTriangle, Mail, MapPin, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { SEO } from '../../components/common/SEO';

export const PrivacyNoticePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F17] py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <SEO
        title="Privacy Notice — Digital Personal Data Protection (DPDP) Act Compliance"
        description="HookZ Privacy Notice detailing data collection, processing purposes, retention, third-party sharing, user rights, and grievance redressal under the Digital Personal Data Protection Act, 2023."
      />

      <div className="max-w-4xl mx-auto">
        {/* Header Banner */}
        <div className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 mb-8 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-200 dark:border-brand-900">
              <Shield size={22} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                Compliance & Trust
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Privacy Notice
              </h1>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            [LEGAL REVIEW REQUIRED] HookZ Technologies Inc. ("HookZ", "we", "us", or "our") acts as a Data Fiduciary
            under the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act, India)</strong>. This Privacy Notice
            sets forth in clear and plain language what digital personal data we collect, the specific purposes for which
            it is processed, your statutory rights as a Data Principal, retention policies, and our Grievance Redressal Mechanism.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-100 dark:border-slate-800">
            <span><strong>Effective Date:</strong> October 2026</span>
            <span>•</span>
            <span><strong>Applicable Law:</strong> DPDP Act 2023 (India)</span>
            <span>•</span>
            <span><strong>Status:</strong> <span className="text-amber-600 dark:text-amber-400 font-semibold">[LEGAL REVIEW REQUIRED]</span></span>
          </div>
        </div>

        {/* Quick Links Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <a href="#data-collection" className="p-3 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-600 hover:border-brand-300 transition-all text-center">
            1. Data Collected
          </a>
          <a href="#processing-purposes" className="p-3 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-600 hover:border-brand-300 transition-all text-center">
            2. Specific Purposes
          </a>
          <a href="#user-rights" className="p-3 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-600 hover:border-brand-300 transition-all text-center">
            3. Your DPDP Rights
          </a>
          <a href="#grievance-redressal" className="p-3 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-600 hover:border-brand-300 transition-all text-center">
            4. Grievance Officer
          </a>
        </div>

        {/* Notice Body */}
        <div className="space-y-6">
          {/* Section 1 */}
          <section id="data-collection" className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-4 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs flex items-center justify-center font-bold text-slate-700 dark:text-slate-300">1</span>
              Personal Data We Collect
            </h2>
            <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50 flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0" />
              <span>[LEGAL REVIEW REQUIRED] The following categories represent all personal data gathered directly or automatically.</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Under Section 5 of the DPDP Act 2023, we collect only the digital personal data necessary to provide our student networking, hackathon matchmaking, and startup discovery services:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-100 dark:border-slate-700 space-y-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">A. Identity & Account Data</h3>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-4">
                  <li>Full name, email address, chosen username</li>
                  <li>Cryptographically salted and hashed passwords</li>
                  <li>OAuth credentials (when signing in via Google)</li>
                  <li>Profile avatar images and photos</li>
                </ul>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-100 dark:border-slate-700 space-y-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">B. Professional & Student Builder Data</h3>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-4">
                  <li>College/university, graduation year, degree</li>
                  <li>Technical skills, portfolio links (GitHub, LinkedIn, personal website)</li>
                  <li>Startup profile, pitch decks, demo URLs</li>
                  <li>Resumes and cover letters submitted for opportunities</li>
                </ul>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-100 dark:border-slate-700 space-y-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">C. Communications & Content</h3>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-4">
                  <li>Direct messages and chat transcripts exchanged on platform</li>
                  <li>Connection notes and partnership proposals</li>
                  <li>Forum posts, comments, upvotes, and saved items</li>
                  <li>Safety reports and grievance submissions</li>
                </ul>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-100 dark:border-slate-700 space-y-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">D. Technical & Session Data</h3>
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-4">
                  <li>IP address, browser user-agent, operating system</li>
                  <li>Session timestamps, sign-in timestamps</li>
                  <li>Consent log records (timestamp, purpose, consent version)</li>
                  <li>Essential authentication tokens in local browser storage</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section id="processing-purposes" className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-4 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs flex items-center justify-center font-bold text-slate-700 dark:text-slate-300">2</span>
              Specific Purposes of Processing
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              [LEGAL REVIEW REQUIRED] In compliance with Section 6(1) of the DPDP Act 2023, HookZ processes personal data exclusively for specified, lawful purposes for which you have provided explicit consent:
            </p>
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Account Management & Authentication</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">To create, maintain, secure, and authenticate your user account and verify your identity.</p>
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Hackathon & Team Matchmaking</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">To enable peers, co-founders, and recruiters to discover your builder profile according to your expressed category preferences.</p>
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Startup Opportunity Applications</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">To deliver your resume, contact information, and pitch materials to the startup founders whose listings you apply to.</p>
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Platform Safety & Moderation</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">To detect and prevent spam, fraud, harassment, unauthorized access, and violations of our Community Guidelines.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section id="retention-and-location" className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-4 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs flex items-center justify-center font-bold text-slate-700 dark:text-slate-300">3</span>
              Data Retention & Processing Locations
            </h2>
            <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                [LEGAL REVIEW REQUIRED] <strong>Retention Policy:</strong> Personal data is retained only for as long as is necessary to fulfill the purpose for which it was collected, or as required by applicable Indian laws. When you delete your account or withdraw consent:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Your profile, credentials, messages, startup associations, and applications are immediately deleted from active systems.</li>
                <li>Backups are rotated out within 30 days.</li>
                <li>Audit logs and consent records are retained for compliance verification as mandated by Section 8 of the DPDP Act 2023.</li>
              </ul>
              <p>
                [LEGAL REVIEW REQUIRED] <strong>Processing Locations & Cross-Border Transfers:</strong> HookZ stores and processes personal data primarily within India, utilizing secure cloud infrastructure provided by AWS / Supabase Cloud. Any cross-border data transfer complies strictly with restrictions and regulations notified by the Central Government of India under Section 16 of the DPDP Act 2023.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section id="third-parties" className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-4 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs flex items-center justify-center font-bold text-slate-700 dark:text-slate-300">4</span>
              Third-Party Sharing & Data Processors
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              [LEGAL REVIEW REQUIRED] HookZ does <strong>not</strong> sell, rent, or trade your personal data. We engage contracted Data Processors who are legally bound to uphold equivalent confidentiality and data protection standards:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <thead className="bg-slate-50 dark:bg-dark-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Processor</th>
                    <th className="p-3">Role / Service</th>
                    <th className="p-3">Data Shared</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-400">
                  <tr>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">Supabase Inc.</td>
                    <td className="p-3">Database & Authentication Hosting</td>
                    <td className="p-3">User IDs, encrypted auth tokens, profile records</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">Google Identity Services</td>
                    <td className="p-3">Single Sign-On (OAuth 2.0)</td>
                    <td className="p-3">Email, public Google profile name & photo</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">Google Gemini API</td>
                    <td className="p-3">AI Problem Statement Analysis</td>
                    <td className="p-3">Non-identifying text prompts for problem breakdowns</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">Render Services Inc.</td>
                    <td className="p-3">Backend API Server Hosting</td>
                    <td className="p-3">Encrypted API traffic in transit</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 5: User Rights */}
          <section id="user-rights" className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-4 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs flex items-center justify-center font-bold text-slate-700 dark:text-slate-300">5</span>
              Your Rights as a Data Principal under the DPDP Act 2023
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              [LEGAL REVIEW REQUIRED] The DPDP Act confers specific statutory rights upon you as a Data Principal. HookZ provides self-service tools and an automated request mechanism to exercise these rights:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <h3 className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">A. Right to Access Information (Sec 11)</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  You have the right to obtain a summary of personal data being processed by HookZ and the identities of all entities with whom it has been shared. You can download an instant JSON copy of all your data via our DSAR portal.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <h3 className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">B. Right to Correction & Erasure (Sec 12)</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  You may correct inaccurate data directly in your profile. You may also request permanent erasure of your personal data at any time via the self-service "Delete Account" button or the DSAR form.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <h3 className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">C. Right of Grievance Redressal (Sec 13)</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  You have the right to have your data protection concerns investigated and resolved by our designated Grievance Officer within the statutory SLA (30 days).
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <h3 className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">D. Right to Nominate (Sec 14)</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  You have the right to nominate another individual who shall, in the event of your death or incapacity, exercise your rights as a Data Principal under the DPDP Act.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 md:col-span-2">
                <h3 className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">E. Right to Withdraw Consent (Sec 6(4))</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Where processing is based on consent, you may withdraw your consent at any time. Withdrawal is as simple as giving consent, accessible directly via our Cookie Preferences and DSAR tools.
                </p>
              </div>
            </div>

            <div className="pt-3">
              <Link
                to="/dsar"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
              >
                <span>Submit a Data Subject Rights Request (DSAR)</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </section>

          {/* Section 6: Grievance Redressal Mechanism */}
          <section id="grievance-redressal" className="bg-white dark:bg-dark-900 rounded-2xl border-2 border-brand-500/30 p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/60 text-xs flex items-center justify-center font-bold text-brand-700 dark:text-brand-300">6</span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Grievance Redressal Mechanism & Officer Contact
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              [LEGAL REVIEW REQUIRED] In compliance with Section 13 of the DPDP Act 2023, HookZ has appointed a dedicated Data Protection & Grievance Officer. If you have any questions, feedback, or grievances regarding the processing of your personal data:
            </p>

            <div className="p-5 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase text-slate-400">Designated Grievance Officer</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">Ruthwik Patel</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Data Protection & Grievance Officer</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">HookZ Technologies Inc.</div>
              </div>

              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-brand-600 dark:text-brand-400 shrink-0" />
                  <span><strong>Email:</strong> <a href="mailto:grievance@hookz.in" className="text-brand-600 hover:underline">grievance@hookz.in</a> / <a href="mailto:privacy@hookz.in" className="text-brand-600 hover:underline">privacy@hookz.in</a></span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
                  <span><strong>Address:</strong> Mindspace Cyberabad, Hitech City, Hyderabad, Telangana 500081, India</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-brand-600 dark:text-brand-400 shrink-0" />
                  <span><strong>Response SLA:</strong> Acknowledged within 48 hours; resolved within 30 days.</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              If your grievance is not resolved by our Grievance Officer within 30 days, or if you are unsatisfied with the resolution, you have the statutory right under the DPDP Act to file a complaint before the <strong>Data Protection Board of India (DPBI)</strong>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyNoticePage;
