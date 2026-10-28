import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { SEO } from '../../components/common/SEO';
import {
  Shield,
  Download,
  Trash2,
  Edit3,
  UserX,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Mail,
  Clock,
  ArrowRight,
  FileCheck,
} from 'lucide-react';

export const DSARPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Form State
  const [requestType, setRequestType] = useState<'ACCESS' | 'CORRECTION' | 'ERASURE' | 'CONSENT_WITHDRAWAL' | 'NOMINATION'>('ACCESS');
  const [fullName, setFullName] = useState(user?.profile?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [details, setDetails] = useState('');
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeEmail, setNomineeEmail] = useState('');
  const [nomineeRelation, setNomineeRelation] = useState('');

  // Status & Actions State
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [submittedRefId, setSubmittedRefId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showErasureConfirm, setShowErasureConfirm] = useState(false);

  // Instant Data Export (Access Right - Sec 11)
  const handleInstantExport = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setExporting(true);
    setError(null);
    try {
      const response = await fetch(`${(api as any).getApiBase ? (api as any).getApiBase() : '/api'}/dsar/export`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('startupz_token') || ''}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate export file. Please submit a formal access request below.');
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hookz_personal_data_export_${user.id}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || 'Error exporting personal data.');
    } finally {
      setExporting(false);
    }
  };

  // Instant Account & Data Erasure (Erasure Right - Sec 12)
  const handleConfirmErasure = async () => {
    if (!user) return;
    setErasing(true);
    setError(null);
    try {
      const response = await fetch(`${(api as any).getApiBase ? (api as any).getApiBase() : '/api'}/users/me`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('startupz_token') || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: user.email }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to erase account.');
      }

      // Clear local session and storage
      await logout();
      navigate('/login?deleted=true');
    } catch (err: any) {
      setError(err?.message || 'Failed to complete automatic account erasure.');
      setErasing(false);
      setShowErasureConfirm(false);
    }
  };

  // Submit Formal DSAR Request Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !fullName.trim()) {
      setError('Please provide your full name and email address.');
      return;
    }
    if (!details.trim() && requestType !== 'NOMINATION') {
      setError('Please describe your specific request in the details field.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const apiEndpoint = `${(api as any).getApiBase ? (api as any).getApiBase() : '/api'}/dsar`;
      const payload: Record<string, any> = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        requestType,
        details: details.trim(),
        userId: user?.id || null,
      };

      if (requestType === 'NOMINATION') {
        payload.nominee = {
          name: nomineeName.trim(),
          email: nomineeEmail.trim().toLowerCase(),
          relation: nomineeRelation.trim(),
        };
      }

      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user ? { 'Authorization': `Bearer ${localStorage.getItem('startupz_token') || ''}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to submit DSAR request.');
      }

      setSubmittedRefId(resData.referenceId || resData.id || `DSAR-${Date.now().toString().slice(-6)}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit request. Please contact grievance@hookz.in directly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[var(--bg-primary)] py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <SEO
        title="Data Subject Rights (DSAR) Portal — HookZ DPDP Act Compliance"
        description="Exercise your statutory rights under the Digital Personal Data Protection Act 2023: Access, Correction, Erasure, Consent Withdrawal, and Nomination."
      />

      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 mb-8 shadow-xs">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center border border-brand-200 dark:border-brand-900">
              <Shield size={22} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                DPDP Act 2023 Statutory Portal
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Data Subject Rights Request (DSAR)
              </h1>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Under Chapter III of India's <strong>Digital Personal Data Protection Act, 2023</strong>,
            you have legal rights regarding your digital personal data. Use this portal to export your personal data,
            request corrections, withdraw consent, delete your account, or register a statutory nominee.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1.5"><Clock size={13} /> SLA: 30 Days statutory resolution</span>
            <span>•</span>
            <span className="flex items-center gap-1.5"><Mail size={13} /> Officer: grievance@hookz.in</span>
          </div>
        </div>

        {/* Quick Self-Service Actions for Logged-In Users */}
        {user && (
          <div className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-8 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <UserCheck size={16} className="text-emerald-500" />
              Instant Self-Service Tools (Signed-In)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Instant Export */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-dark-800/50 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-xs">
                  <Download size={15} className="text-brand-600 dark:text-brand-400" />
                  <span>Download Personal Data (Sec 11)</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Export an instant machine-readable JSON copy of your profile, projects, startups, applications, and messages.
                </p>
                <button
                  type="button"
                  onClick={handleInstantExport}
                  disabled={exporting}
                  className="w-full mt-2 py-2 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {exporting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Generating Export...</span>
                    </>
                  ) : (
                    <>
                      <Download size={13} />
                      <span>Instant Data Export</span>
                    </>
                  )}
                </button>
              </div>

              {/* Instant Erasure */}
              <div className="p-4 rounded-xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 space-y-2">
                <div className="flex items-center gap-2 text-rose-900 dark:text-rose-300 font-semibold text-xs">
                  <Trash2 size={15} className="text-rose-600 dark:text-rose-400" />
                  <span>Permanent Account Erasure (Sec 12)</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Permanently delete your profile, credentials, and all associated personal data from active databases.
                </p>
                <button
                  type="button"
                  onClick={() => setShowErasureConfirm(true)}
                  className="w-full mt-2 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Erase My Account &amp; Data</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal for Erasure */}
        {showErasureConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full space-y-4 shadow-xl">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
                <AlertCircle size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Confirm Permanent Data Erasure?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                This action is irreversible. All your profile information, startup listings, applications, connections, and chat records will be permanently removed pursuant to your Right to Erasure under Section 12 of the DPDP Act 2023.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={erasing}
                  onClick={() => setShowErasureConfirm(false)}
                  className="flex-1 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-dark-800 dark:text-slate-300 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={erasing}
                  onClick={handleConfirmErasure}
                  className="flex-1 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all inline-flex items-center justify-center gap-1.5"
                >
                  {erasing ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Erasing...</span>
                    </>
                  ) : (
                    <span>Confirm Permanent Delete</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Formal DSAR Submission Form */}
        <div className="bg-white dark:bg-dark-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            Submit a Formal Rights Request
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Requests are logged and reviewed directly by the Data Protection &amp; Grievance Officer within 30 days.
          </p>

          {submittedRefId ? (
            <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <FileCheck size={24} />
              </div>
              <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                DSAR Request Submitted Successfully
              </h3>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 max-w-md mx-auto leading-relaxed">
                Your statutory request has been logged under reference code:
              </p>
              <div className="inline-block py-1.5 px-4 bg-white dark:bg-dark-900 border border-emerald-300 dark:border-emerald-700 rounded-lg text-sm font-mono font-bold text-slate-900 dark:text-white">
                {submittedRefId}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 pt-2">
                We have recorded your submission. You will receive an acknowledgment at <strong>{email}</strong> within 48 hours, and a complete resolution within 30 days.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmittedRefId(null);
                  setDetails('');
                }}
                className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-all"
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitForm} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Request Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Type of Right to Exercise (DPDP Act 2023)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRequestType('ACCESS')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                      requestType === 'ACCESS'
                        ? 'border-brand-600 bg-brand-50/60 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    1. Data Access (Sec 11)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestType('CORRECTION')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                      requestType === 'CORRECTION'
                        ? 'border-brand-600 bg-brand-50/60 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    2. Data Correction (Sec 12)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestType('ERASURE')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                      requestType === 'ERASURE'
                        ? 'border-brand-600 bg-brand-50/60 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    3. Data Erasure (Sec 12)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestType('CONSENT_WITHDRAWAL')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                      requestType === 'CONSENT_WITHDRAWAL'
                        ? 'border-brand-600 bg-brand-50/60 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    4. Withdraw Consent (Sec 6(4))
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestType('NOMINATION')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer sm:col-span-2 ${
                      requestType === 'NOMINATION'
                        ? 'border-brand-600 bg-brand-50/60 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    5. Nominate Beneficiary / Representative (Sec 14)
                  </button>
                </div>
              </div>

              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Registered Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rahul@example.com"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
                  />
                </div>
              </div>

              {/* Nomination-specific inputs */}
              {requestType === 'NOMINATION' && (
                <div className="p-4 rounded-xl border border-brand-200 dark:border-brand-900/50 bg-brand-50/30 dark:bg-brand-950/20 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Nominee Particulars (Section 14)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Nominee Name *</label>
                      <input
                        type="text"
                        required
                        value={nomineeName}
                        onChange={(e) => setNomineeName(e.target.value)}
                        placeholder="Full Legal Name"
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Nominee Email *</label>
                      <input
                        type="email"
                        required
                        value={nomineeEmail}
                        onChange={(e) => setNomineeEmail(e.target.value)}
                        placeholder="nominee@example.com"
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Relationship</label>
                      <input
                        type="text"
                        value={nomineeRelation}
                        onChange={(e) => setNomineeRelation(e.target.value)}
                        placeholder="e.g. Sibling, Spouse"
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Details text area */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Request Specifics &amp; Explanations *
                </label>
                <textarea
                  rows={4}
                  required={requestType !== 'NOMINATION'}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder={
                    requestType === 'ACCESS'
                      ? 'Specify what information or processing categories you would like summarized...'
                      : requestType === 'CORRECTION'
                      ? 'Describe the inaccurate data and provide the exact corrected details...'
                      : requestType === 'ERASURE'
                      ? 'State the specific records or accounts you request erased...'
                      : requestType === 'CONSENT_WITHDRAWAL'
                      ? 'Specify the purpose(s) for which you are withdrawing your consent...'
                      : 'Provide any additional instructions regarding this nomination designation...'
                  }
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 focus:border-brand-600"
                />
              </div>

              {/* Affirmation Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    required
                    className="mt-0.5 rounded-sm border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>
                    I affirm that I am the Data Principal associated with the above email address (or an authorized representative) and submit this statutory request under the Digital Personal Data Protection Act, 2023.
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Statutory Rights Request</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default DSARPage;
