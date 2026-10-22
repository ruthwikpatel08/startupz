import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, FileText, AlertTriangle, Scale, Lock, ArrowRight } from 'lucide-react';
import { SEO } from '../../components/common/SEO';

export const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F17] py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <SEO
        title="Terms & Conditions — HookZ Platform Terms and Data Protection"
        description="HookZ Terms of Service including dedicated Data Protection clause under India's Digital Personal Data Protection (DPDP) Act 2023."
      />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 mb-8 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-200 dark:border-brand-900">
              <Scale size={22} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                Legal Agreement
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Terms &amp; Conditions
              </h1>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            [LEGAL REVIEW REQUIRED] Welcome to HookZ ("HookZ", "Platform", "we", "us", or "our"), operated by HookZ Technologies Inc.
            By accessing or using our services, applications, and website at hookz.in, you agree to be bound by these
            Terms and Conditions ("Terms"), which include our dedicated Data Protection obligations under the
            <strong> Digital Personal Data Protection Act, 2023 (DPDP Act, India)</strong>.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-100 dark:border-slate-800">
            <span><strong>Last Updated:</strong> October 2026</span>
            <span>•</span>
            <span><strong>Jurisdiction:</strong> Republic of India</span>
            <span>•</span>
            <span><strong>Status:</strong> <span className="text-amber-600 dark:text-amber-400 font-semibold">[LEGAL REVIEW REQUIRED]</span></span>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          {/* Section 1: Acceptance */}
          <section className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-3 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">1. Acceptance of Terms</h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              [LEGAL REVIEW REQUIRED] By clicking "Create Account", "Sign In", or by otherwise accessing or using HookZ, you affirm that you are of legal age under Indian law (at least 18 years of age, or if a minor above 13 years of age, using under verifiable parental/guardian consent pursuant to Section 9 of the DPDP Act 2023) and have full legal capacity to enter into these Terms.
            </p>
          </section>

          {/* Section 2: Platform Purpose & User Conduct */}
          <section className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-3 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">2. Platform Ecosystem &amp; Community Standards</h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              [LEGAL REVIEW REQUIRED] HookZ connects student builders, developers, designers, startup founders, mentors, and investors. Users agree to:
            </p>
            <ul className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-5">
              <li>Provide truthful, accurate, and up-to-date biographical, educational, and professional details.</li>
              <li>Refrain from posting unlawful, defamatory, misleading, abusive, or infringing intellectual property materials.</li>
              <li>Respect the confidentiality flags and trade secrets of other founders when accessing confidential startup ideas.</li>
              <li>Not harvest, scrape, or automate the collection of fellow users' personal contact information without express consent.</li>
            </ul>
          </section>

          {/* Section 3: DEDICATED DATA PROTECTION CLAUSE (DPDP ACT 2023) */}
          <section className="bg-white dark:bg-dark-900 rounded-2xl border-2 border-brand-500/40 p-6 sm:p-8 space-y-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-brand-600 dark:text-brand-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                3. Dedicated Data Protection Clause (DPDP Act 2023 Compliance)
              </h2>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span><strong>[LEGAL REVIEW REQUIRED]</strong> Statutory Data Protection Clause under the Digital Personal Data Protection Act, 2023.</span>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                <strong>3.1 Fiduciary Status:</strong> HookZ Technologies Inc. operates as a <strong>Data Fiduciary</strong> in respect of digital personal data submitted by users ("Data Principals") within the territory of India, as defined under Section 2(i) and Section 2(j) of the DPDP Act 2023.
              </p>
              <p>
                <strong>3.2 Consent as Basis for Processing:</strong> All personal data is processed strictly on the basis of free, specific, informed, unconditional, and unambiguous consent signified through clear affirmative action, or for legitimate uses as explicitly recognized under Section 7 of the DPDP Act 2023.
              </p>
              <p>
                <strong>3.3 Notice of Data Processing:</strong> In accordance with Section 5 of the DPDP Act 2023, every request for consent is accompanied by or preceded by an itemised Privacy Notice describing the personal data sought and the specific purpose of processing.
              </p>
              <p>
                <strong>3.4 Data Principal Rights:</strong> Users possess all non-derogable rights guaranteed by Chapter III of the DPDP Act 2023, including:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li><strong>Right to Access:</strong> To obtain confirmation, summary, and identities of data shared.</li>
                <li><strong>Right to Correction &amp; Erasure:</strong> To correct inaccurate data and demand permanent erasure of personal data that is no longer necessary.</li>
                <li><strong>Right of Grievance Redressal:</strong> To have grievances investigated and resolved within 30 days.</li>
                <li><strong>Right to Nominate:</strong> To designate a representative in the event of death or incapacity.</li>
                <li><strong>Right to Withdraw Consent:</strong> To revoke consent at any time with equal ease.</li>
              </ul>
              <p>
                <strong>3.5 Security Safeguards &amp; Breach Reporting:</strong> In compliance with Section 8(5) and Section 8(6) of the DPDP Act 2023, HookZ implements reasonable technical, organizational, and cryptographic security measures to prevent personal data breaches. In the event of an intimation of a breach, HookZ shall report such personal data breach to the Data Protection Board of India (DPBI) and affected users in the form and manner prescribed.
              </p>
            </div>
          </section>

          {/* Section 4: Idea Protection & Intellectual Property */}
          <section className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-3 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">4. Intellectual Property &amp; Confidential Ideas</h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              [LEGAL REVIEW REQUIRED] Users retain full copyright, trademark, and patent rights to the original content, source code, and pitch decks they publish. Startups marked as "Confidential" are protected by our platform visibility engine. However, users acknowledge that public submissions can be viewed across the student and investor directory.
            </p>
          </section>

          {/* Section 5: Grievance Redressal & Governing Law */}
          <section className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-3 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">5. Grievance Redressal &amp; Dispute Resolution</h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              [LEGAL REVIEW REQUIRED] Any disputes or grievances arising out of these Terms or data processing practices shall first be referred to our Grievance Officer:
            </p>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <div><strong>Grievance Officer:</strong> Ruthwik Patel (Data Protection Officer)</div>
              <div><strong>Email:</strong> <a href="mailto:grievance@hookz.in" className="text-brand-600 hover:underline">grievance@hookz.in</a> / <a href="mailto:privacy@hookz.in" className="text-brand-600 hover:underline">privacy@hookz.in</a></div>
              <div><strong>Physical Address:</strong> HookZ Technologies Inc., Mindspace Cyberabad, Hitech City, Hyderabad, Telangana 500081, India</div>
              <div><strong>Governing Law:</strong> Republic of India (Courts of Hyderabad, Telangana shall have exclusive jurisdiction)</div>
            </div>
          </section>
        </div>

        {/* Footer Link Callout */}
        <div className="mt-8 flex items-center justify-between p-4 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs">
          <span className="text-slate-600 dark:text-slate-400">
            Learn more about how we collect and process your digital personal data.
          </span>
          <Link
            to="/privacy"
            className="inline-flex items-center gap-1.5 font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            <span>View Privacy Notice</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
