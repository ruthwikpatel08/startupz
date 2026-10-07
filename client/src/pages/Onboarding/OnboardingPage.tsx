import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { upsertUserProfile } from '../../lib/supabase';

const STUDENT_AREAS = [
  'Graphic Designer','UI/UX Designer','Frontend Developer','Backend Developer',
  'Full-Stack Developer','Python Expert','JavaScript Expert','ML/AI','Mobile Dev',
  'DevOps','Presenter/Pitcher','Other',
];

const YEARS = ['1st Year','2nd Year','3rd Year','4th Year'];

type RoleType = 'Student' | 'Professional' | 'Founder' | 'Co-Founder' | '';

export const OnboardingPage: React.FC = () => {
  const { user, updateUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<RoleType>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Student fields
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [year, setYear] = useState('');
  const [college, setCollege] = useState('');
  const [skills, setSkills] = useState('');

  // Founder fields
  const [startupStage, setStartupStage] = useState('');
  const [startupDomain, setStartupDomain] = useState('');
  const [rolesNeeded, setRolesNeeded] = useState('');

  // Co-Founder fields
  const [coFounderSkills, setCoFounderSkills] = useState('');
  const [preferredStage, setPreferredStage] = useState('');
  const [availability, setAvailability] = useState('');

  // Professional fields
  const [profRole, setProfRole] = useState('');
  const [company, setCompany] = useState('');
  const [experience, setExperience] = useState('');
  const [profSkills, setProfSkills] = useState('');

  // If user already completed onboarding, redirect directly to home
  React.useEffect(() => {
    if (user && ((user as any).onboarding_completed === true || (user as any).onboardingCompleted === true)) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const toggleArea = (area: string) => {
    setSelectedAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      let profileUpdate: Record<string, any> = {
        preferred_role: role.toUpperCase(),
        is_category_selected: true,
        onboarding_completed: true,
      };

      if (role === 'Student') {
        profileUpdate.skills = skills || selectedAreas.join(', ');
        profileUpdate.education = [college, year].filter(Boolean).join(' | ');
        profileUpdate.startup_interests = selectedAreas.join(', ');
      } else if (role === 'Founder') {
        profileUpdate.startup_experience = startupStage;
        profileUpdate.industries = startupDomain;
        profileUpdate.open_to = rolesNeeded;
      } else if (role === 'Co-Founder') {
        profileUpdate.skills = coFounderSkills;
        profileUpdate.startup_interests = preferredStage;
        profileUpdate.availability = availability;
      } else if (role === 'Professional') {
        profileUpdate.skills = profSkills;
        profileUpdate.headline = profRole + (company ? ` at ${company}` : '');
        profileUpdate.startup_experience = experience;
      }

      await upsertUserProfile(user.id, { ...profileUpdate, email: user.email });
      api.updateProfile({ ...profileUpdate, email: user.email }).catch(() => null);

      // Immediately set onboarding_completed = true in local user state and store
      const updatedUser: any = {
        ...user,
        isCategorySelected: true,
        onboardingCompleted: true,
        onboarding_completed: true,
        profile: {
          ...(user.profile || {}),
          ...profileUpdate,
          isCategorySelected: true,
          onboarding_completed: true,
        },
      };
      updateUser(updatedUser);
      localStorage.setItem('startupz_user', JSON.stringify(updatedUser));

      await refreshUser();
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  const baseStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#f9fafb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Inter, system-ui, sans-serif',
    padding: '24px',
  };

  const cardStyle: React.CSSProperties = {
    background: '#ffffff',
    borderRadius: 16,
    padding: '40px 36px',
    maxWidth: 560,
    width: '100%',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  };

  const btnPrimary: React.CSSProperties = {
    padding: '11px 28px',
    borderRadius: 8,
    background: '#4f46e5',
    color: '#fff',
    fontWeight: 700,
    fontSize: 15,
    border: 'none',
    cursor: saving ? 'not-allowed' : 'pointer',
    opacity: saving ? 0.7 : 1,
  };

  const btnSecondary: React.CSSProperties = {
    padding: '11px 28px',
    borderRadius: 8,
    background: 'transparent',
    color: '#6b7280',
    fontWeight: 600,
    fontSize: 15,
    border: '1.5px solid #d1d5db',
    cursor: 'pointer',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1.5px solid #d1d5db',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 6,
    display: 'block',
  };

  // Step 1: Role selection
  if (step === 1) {
    return (
      <div style={baseStyle}>
        <div style={cardStyle}>
          <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#4f46e5' }}>
            Step 1 of 3
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
            Welcome to HookZ!
          </h1>
          <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 28 }}>
            What best describes you?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            {(['Student', 'Founder', 'Co-Founder', 'Professional'] as RoleType[]).map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                style={{
                  padding: '14px 20px',
                  borderRadius: 10,
                  border: role === r ? '2px solid #4f46e5' : '1.5px solid #d1d5db',
                  background: role === r ? '#eef2ff' : '#fff',
                  color: role === r ? '#4f46e5' : '#374151',
                  fontWeight: role === r ? 700 : 500,
                  fontSize: 15,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                {r}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              style={{ ...btnPrimary, opacity: role ? 1 : 0.5, cursor: role ? 'pointer' : 'not-allowed' }}
              disabled={!role}
              onClick={() => role && setStep(2)}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Dynamic fields
  if (step === 2) {
    return (
      <div style={baseStyle}>
        <div style={cardStyle}>
          <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#4f46e5' }}>
            Step 2 of 3
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 20 }}>
            Tell us more about yourself
          </h1>

          {role === 'Student' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={labelStyle}>Areas of interest (select all that apply)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {STUDENT_AREAS.map(area => (
                    <button
                      key={area}
                      onClick={() => toggleArea(area)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 20,
                        border: selectedAreas.includes(area) ? '2px solid #4f46e5' : '1.5px solid #d1d5db',
                        background: selectedAreas.includes(area) ? '#eef2ff' : '#fff',
                        color: selectedAreas.includes(area) ? '#4f46e5' : '#374151',
                        fontSize: 13,
                        fontWeight: selectedAreas.includes(area) ? 600 : 400,
                        cursor: 'pointer',
                      }}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Year of study</label>
                <select style={inputStyle} value={year} onChange={e => setYear(e.target.value)}>
                  <option value="">Select year</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>College / University</label>
                <input style={inputStyle} placeholder="e.g. IIT Delhi" value={college} onChange={e => setCollege(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Skills (comma separated)</label>
                <input style={inputStyle} placeholder="e.g. React, Python, Figma" value={skills} onChange={e => setSkills(e.target.value)} />
              </div>
            </div>
          )}

          {role === 'Founder' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={labelStyle}>Startup stage</label>
                <select style={inputStyle} value={startupStage} onChange={e => setStartupStage(e.target.value)}>
                  <option value="">Select stage</option>
                  <option>Idea</option>
                  <option>MVP</option>
                  <option>Launched</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Domain / Industry</label>
                <input style={inputStyle} placeholder="e.g. EdTech, FinTech, HealthTech" value={startupDomain} onChange={e => setStartupDomain(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Roles you are looking for</label>
                <input style={inputStyle} placeholder="e.g. Developer, Designer, Marketer" value={rolesNeeded} onChange={e => setRolesNeeded(e.target.value)} />
              </div>
            </div>
          )}

          {role === 'Co-Founder' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={labelStyle}>Skills you bring</label>
                <input style={inputStyle} placeholder="e.g. Full-Stack, Growth, Sales" value={coFounderSkills} onChange={e => setCoFounderSkills(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Startup stage you are interested in</label>
                <select style={inputStyle} value={preferredStage} onChange={e => setPreferredStage(e.target.value)}>
                  <option value="">Select stage</option>
                  <option>Idea</option>
                  <option>MVP</option>
                  <option>Launched</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Availability</label>
                <select style={inputStyle} value={availability} onChange={e => setAvailability(e.target.value)}>
                  <option value="">Select availability</option>
                  <option>Full-time</option>
                  <option>Part-time</option>
                </select>
              </div>
            </div>
          )}

          {role === 'Professional' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={labelStyle}>Your role / title</label>
                <input style={inputStyle} placeholder="e.g. Senior Engineer" value={profRole} onChange={e => setProfRole(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Company</label>
                <input style={inputStyle} placeholder="e.g. Google, Startup XYZ" value={company} onChange={e => setCompany(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Years of experience</label>
                <input style={inputStyle} placeholder="e.g. 3" value={experience} onChange={e => setExperience(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Skills (comma separated)</label>
                <input style={inputStyle} placeholder="e.g. Java, System Design, Leadership" value={profSkills} onChange={e => setProfSkills(e.target.value)} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
            <button style={btnSecondary} onClick={() => setStep(1)}>← Back</button>
            <button style={btnPrimary} onClick={() => setStep(3)}>Next →</button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Review & Finish
  return (
    <div style={baseStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#4f46e5' }}>
          Step 3 of 3
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>
          Review your profile
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
          This is how you will appear on HookZ. You can always edit later.
        </p>

        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '20px', marginBottom: 24, border: '1px solid #e5e7eb' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#111827', marginBottom: 4 }}>
            {user?.profile?.fullName || user?.email}
          </div>
          <div style={{ fontSize: 13, color: '#4f46e5', fontWeight: 600, marginBottom: 12 }}>
            {role}
          </div>
          {role === 'Student' && (
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
              {college && <div>📍 {college} {year && `— ${year}`}</div>}
              {(skills || selectedAreas.length > 0) && <div>🛠 {skills || selectedAreas.join(', ')}</div>}
            </div>
          )}
          {role === 'Founder' && (
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
              {startupStage && <div>📈 Stage: {startupStage}</div>}
              {startupDomain && <div>🏷 Domain: {startupDomain}</div>}
              {rolesNeeded && <div>🔍 Looking for: {rolesNeeded}</div>}
            </div>
          )}
          {role === 'Co-Founder' && (
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
              {coFounderSkills && <div>🛠 Skills: {coFounderSkills}</div>}
              {preferredStage && <div>📈 Interested in: {preferredStage} stage</div>}
              {availability && <div>⏱ {availability}</div>}
            </div>
          )}
          {role === 'Professional' && (
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
              {profRole && <div>💼 {profRole}{company ? ` at ${company}` : ''}</div>}
              {experience && <div>📅 {experience} years experience</div>}
              {profSkills && <div>🛠 {profSkills}</div>}
            </div>
          )}
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button style={btnSecondary} onClick={() => setStep(2)}>← Back</button>
          <button style={btnPrimary} disabled={saving} onClick={handleFinish}>
            {saving ? 'Saving...' : 'Finish & Go to HookZ →'}
          </button>
        </div>
      </div>
    </div>
  );
};
