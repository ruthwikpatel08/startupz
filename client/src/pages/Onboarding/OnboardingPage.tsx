import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CheckCheck, GraduationCap, HeartHandshake, Sparkles, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, invalidateUserProfileCache, mapSupabaseToAppUser } from '../../lib/supabase';
import { SEO } from '../../components/common/SEO';
import { Avatar } from '../../components/common/Avatar';
import { INDIAN_COLLEGES_AND_UNIVERSITIES } from '../../data/indiaData';
import { getQuestions, validateAnswer, submissionAnswers, type Answers, type JoiningRole } from './questions';
import './OnboardingPage.css';
import logoIcon from '../../assets/logo-icon.png';

export const OnboardingPage: React.FC = () => {
  const { user, session, loading, updateUser } = useAuth();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Answers>({ role: 'Student', fullName: user?.profile?.fullName || '' });
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [profileConsent, setProfileConsent] = useState(false);
  const [termsConsent, setTermsConsent] = useState(false);
  const savingRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const role = answers.role as JoiningRole;
  const questions = getQuestions(role);
  const question = questions[step];
  const isPreview = step === questions.length;
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, [step]);
  if (loading) return <div role="status" className="onboarding-stage">Loading your profile…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.onboarding_completed !== false && user.onboardingCompleted !== false) return <Navigate to="/" replace />;
  const goToStep = (next: number) => { setStep(next); setSearch(''); setError(''); };
  const setAnswer = (key: string, value: string | string[]) => { setAnswers(previous => ({ ...previous, [key]: value })); setError(''); };
  const toggle = (key: string, value: string) => {
    const selected = Array.isArray(answers[key]) ? answers[key] as string[] : [];
    setAnswer(key, selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value]);
  };
  const continueFlow = () => {
    if (!question) return;
    const message = validateAnswer(question, answers);
    if (message) { setError(message); return; }
    goToStep(step + 1);
  };
  const finish = async () => {
    if (savingRef.current) return;
    const invalid = questions.findIndex(q => validateAnswer(q, answers));
    if (invalid >= 0) { goToStep(invalid); return; }
    if (!profileConsent || !termsConsent) { setError('Review and accept the two consent choices to enter HookZ.'); return; }
    if (!session?.user) { setError('Please sign in again to securely save your profile. Your answers remain on this screen.'); return; }
    savingRef.current = true; setSaving(true); setError('');
    try {
      // Exactly one request: profile + answers + consent + completion commit atomically.
      const { data, error } = await supabase.rpc('complete_onboarding', { p_answers: submissionAnswers(role, answers), p_profile_consent: profileConsent, p_terms_consent: termsConsent });
      if (error) throw error;
      if (!data?.onboarding_completed) throw new Error('Your profile was not saved. Please try again.');
      invalidateUserProfileCache(user.id);
      invalidateUserProfileCache(user.email);
      updateUser(mapSupabaseToAppUser(session.user, data));
      navigate('/', { replace: true });
    } catch (error) {
      const detail = error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unknown save error';
      if (import.meta.env.DEV) console.error('Onboarding save failed:', error);
      setError(import.meta.env.DEV ? `Couldn’t save your profile: ${detail}` : 'We couldn’t save your profile. Your answers are still here — please try again.');
    } finally { savingRef.current = false; setSaving(false); }
  };
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.nativeEvent.isComposing || saving) return;
    const target = event.target as HTMLElement;
    if (event.key === 'Enter' && !isPreview && target.tagName !== 'BUTTON' && target.tagName !== 'A') {
      if (target.tagName === 'TEXTAREA' && event.shiftKey) return;
      event.preventDefault(); continueFlow();
    }
    if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.key) && target.matches('[data-choice]')) {
      event.preventDefault();
      const choices = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[data-choice]'));
      const direction = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1;
      const next = choices[(choices.indexOf(target) + direction + choices.length) % choices.length];
      next.focus();
      if (next instanceof HTMLInputElement && next.type === 'radio') next.click();
    }
  };
  const selected = question && Array.isArray(answers[question.key]) ? answers[question.key] as string[] : [];
  const options = question?.type === 'skills' ? [...new Set([...(question.options || []), ...selected])].filter(option => option.toLowerCase().includes(search.toLowerCase())) : question?.options || [];
  const customSkill = question?.type === 'skills' && search.trim() && ![...(question.options || []), ...selected].some(s => s.toLowerCase() === search.trim().toLowerCase());

  return <div className="onboarding-stage" onKeyDown={handleKeyDown}>
    <SEO title="Find your people | HookZ" noindex />
    <div className="onboarding-progress"><div><span>YOUR HOOKZ CHAPTER</span><span>{isPreview ? 'Ready when you are' : `${questions.length - step} questions remaining`}</span></div><progress aria-label="Profile setup progress" value={step} max={questions.length} /></div>
    <div className={`onboarding-content ${isPreview ? 'onboarding-preview' : ''}`}>
      <div key={step} className="question-transition">
        <span className="onboarding-kicker">{isPreview ? 'MEET YOUR NEW PROFILE' : `QUESTION ${String(step + 1).padStart(2, '0')} / ${questions.length}`}</span>
        <h1 ref={headingRef} tabIndex={-1}>{isPreview ? "You're all set!" : question.title}</h1>
        <p className="question-hint">{isPreview ? 'A little about you. A lot of possibility ahead.' : question.hint || (question.type === 'multi' ? 'Choose all that sound like you.' : 'Make it yours. You can edit your profile later.')}</p>
        {isPreview ? <>
          <article className="onboarding-profile card-base"><div className="onboarding-profile-cover"><Sparkles size={32} /><span>OPEN TO WHAT'S NEXT</span></div><div className="onboarding-profile-body"><Avatar name={String(answers.fullName)} src={user.profile?.avatar} size="xl" /><span className="onboarding-role">{role}</span><h2>{String(answers.fullName)}</h2><p>{role === 'Student' ? `${answers.primaryRole} · ${answers.college}` : role === 'Investor' ? answers.organization || 'Independent investor' : answers.otherRole}</p><div className="onboarding-tags">{(Array.isArray(answers.skills) && role !== 'Investor' ? answers.skills : Array.isArray(answers.sectors) && role === 'Investor' ? answers.sectors : []).map(s => <span key={s}>{s}</span>)}</div>{answers.bio && <p>{String(answers.bio)}</p>}</div></article>
          <div className="onboarding-consents"><label><input type="checkbox" checked={profileConsent} onChange={e => setProfileConsent(e.target.checked)} disabled={saving} /><span>I agree to my profile being listed in the builder directory and used for teammate matching.</span></label><label><input type="checkbox" checked={termsConsent} onChange={e => setTermsConsent(e.target.checked)} disabled={saving} /><span>I agree to the <Link to="/terms" target="_blank" rel="noopener">Terms</Link> and <Link to="/privacy" target="_blank" rel="noopener">Privacy Notice</Link>. I can manage my consent from my account.</span></label></div>
        </> : <>
          {(question.type === 'text' || question.type === 'bio') && <div className="question-text"><label className="sr-only" htmlFor="question-input">{question.title}</label>{question.type === 'bio' ? <textarea id="question-input" rows={3} maxLength={question.maxLength} value={String(answers[question.key] || '')} onChange={e => setAnswer(question.key, e.target.value)} placeholder="What do you love making? What are you curious about?" aria-describedby="question-error" /> : <input id="question-input" type="text" autoComplete={question.key === 'fullName' ? 'name' : question.key === 'location' ? 'address-level2' : 'off'} maxLength={question.maxLength} list={question.key === 'college' ? 'college-suggestions' : undefined} value={String(answers[question.key] || '')} onChange={e => setAnswer(question.key, e.target.value)} placeholder="Type your answer here…" aria-describedby="question-error" />}{question.key === 'college' && <datalist id="college-suggestions">{INDIAN_COLLEGES_AND_UNIVERSITIES.map(college => <option key={college} value={college} />)}</datalist>}{question.type === 'bio' && <span className="question-counter">{String(answers.bio || '').length}/160 · Shift + Enter for a new line</span>}</div>}
          {['choice', 'multi', 'skills'].includes(question.type) && <fieldset className="question-options"><legend className="sr-only">{question.title}</legend>{question.type === 'skills' && <><label className="sr-only" htmlFor="skill-search">Search skills</label><input id="skill-search" className="input-base skill-search" placeholder="Search skills, or add your own…" value={search} maxLength={50} onChange={e => setSearch(e.target.value)} /><p className="selection-count">{selected.length} selected{selected.length > 0 ? `: ${selected.join(', ')}` : ''}</p></>}<div className={`option-grid ${question.type === 'skills' || question.type === 'multi' ? 'option-tags' : ''} ${step === 0 ? 'role-options' : ''}`}>{options.map((option, index) => {
            const checked = question.type === 'choice' ? answers[question.key] === option : selected.includes(option);
            const Icon = option === 'Student' ? GraduationCap : option === 'Investor' ? TrendingUp : HeartHandshake;
            return <label className={`question-option ${checked ? 'selected' : ''}`} key={option}><input data-choice type={question.type === 'choice' ? 'radio' : 'checkbox'} name={question.key} value={option} checked={checked} onChange={() => question.type === 'choice' ? setAnswer(question.key, option) : toggle(question.key, option)} />{step === 0 ? <Icon size={26} /> : <span className="option-key">{checked ? <Check size={13} /> : String.fromCharCode(65 + index)}</span>}<span>{option}{step === 0 && <small>{option === 'Student' ? 'Find a crew. Build something real.' : option === 'Investor' ? 'Back the next generation of builders.' : 'Bring your own kind of brilliant.'}</small>}</span>{step === 0 && checked && <Check className="role-check" size={16} />}</label>;
          })}{customSkill && <button type="button" className="btn-secondary" onClick={() => { toggle(question.key, search.trim()); setSearch(''); }}>Add “{search.trim()}”</button>}</div></fieldset>}
          {step === 0 && role === 'Other' && <div className="other-role-input"><label htmlFor="other-role">Tell us what you do.</label><input className="input-base" id="other-role" maxLength={100} value={String(answers.otherRole || '')} onChange={e => setAnswer('otherRole', e.target.value)} placeholder="e.g. Community organizer" /></div>}
        </>}
        <p id="question-error" className="question-error" role="alert">{error}</p>
        <div className="onboarding-actions"><button type="button" className="btn-primary" disabled={saving} onClick={isPreview ? finish : continueFlow}>{saving ? 'Saving your profile…' : isPreview ? 'Enter HookZ' : question.optional && !answers[question.key] ? 'Skip for now' : 'Continue'}{isPreview ? <CheckCheck size={18} /> : <ArrowRight size={18} />}</button>{!isPreview && <span>press <kbd>Enter ↵</kbd></span>}</div>
      </div>
      {step > 0 && <button type="button" className="onboarding-back" disabled={saving} onClick={() => goToStep(step - 1)}><ArrowLeft size={16} /> Back</button>}
    </div>
    <div className="onboarding-bottom"><span>Made for the ones who make things.</span><span className="inline-flex items-center gap-2"><img src={logoIcon} alt="" className="w-6 h-6 object-contain" />HookZ</span></div>
  </div>;
};
