import assert from 'assert';

// 1. Logic Check: Separation of Internships and Jobs
const isInternship = (opp) => {
  const r = (opp.role || '').toLowerCase();
  const c = (opp.commitment || '').toLowerCase();
  const d = (opp.description || '').toLowerCase();
  return c.includes('intern') || r.includes('intern') || d.includes('[internship');
};

const isJob = (opp) => {
  return !isInternship(opp);
};

const filterOpportunities = (opportunities, currentType) => {
  return opportunities.filter((opp) => {
    if (currentType && currentType !== 'all') {
      const tLower = currentType.toLowerCase();
      if (tLower === 'internships' || tLower === 'internship') {
        if (!isInternship(opp)) return false;
      } else if (tLower === 'jobs' || tLower === 'job') {
        if (!isJob(opp)) return false;
      }
    }
    return true;
  });
};

const sampleOpps = [
  { id: '1', role: 'Frontend Engineer Intern', commitment: 'Internship (60 Days)', description: 'Build UI' },
  { id: '2', role: 'Full Stack Engineer', commitment: 'Full-time', description: 'Scale backend' },
  { id: '3', role: 'AI Researcher', commitment: 'Internship', description: 'ML models' },
  { id: '4', role: 'Founding Product Designer', commitment: 'Job (180 Days)', description: 'Design systems' },
  { id: '5', role: 'Lead Architect', commitment: 'Part-time', description: 'System design' },
];

console.log('Testing Opportunities Internship vs Job Separation...');

const allOpps = filterOpportunities(sampleOpps, 'all');
assert.strictEqual(allOpps.length, 5, 'All Opportunities displays both internships and jobs');

const internships = filterOpportunities(sampleOpps, 'internships');
assert.strictEqual(internships.length, 2, 'Internships displays only internships');
assert.ok(internships.every((o) => isInternship(o)), 'All returned items in internships are internships');

const jobs = filterOpportunities(sampleOpps, 'jobs');
assert.strictEqual(jobs.length, 3, 'Jobs displays only jobs');
assert.ok(jobs.every((o) => isJob(o)), 'All returned items in jobs are jobs');
assert.ok(!jobs.some((o) => isInternship(o)), 'Internships are strictly excluded from jobs');

// 2. Logic Check: Blank headline and one-line bio for new users
function resolveNewUserProfile(inputHeadline, inputOneLineBio, selectedRole) {
  const cleanHeadline = (inputHeadline || '').trim();
  const cleanOneLineBio = (inputOneLineBio || '').trim();
  return {
    headline: cleanHeadline,
    one_line_bio: cleanOneLineBio,
  };
}

console.log('Testing Blank Headline and One-Line Bio for New Users...');

// Case: User does not enter headline or one-line bio
const blankProfile = resolveNewUserProfile('', '', 'STUDENT');
assert.strictEqual(blankProfile.headline, '', 'Headline stays blank when not entered');
assert.strictEqual(blankProfile.one_line_bio, '', 'One-line bio stays blank when not entered');
assert.notStrictEqual(blankProfile.headline, 'Student | Startup Builder', 'Headline does not default to sentence');

// Case: User enters custom headline and one-line bio
const customProfile = resolveNewUserProfile('Robotics Enthusiast & ML Hacker', 'Building autonomous rovers', 'STUDENT');
assert.strictEqual(customProfile.headline, 'Robotics Enthusiast & ML Hacker', 'Custom headline preserved');
assert.strictEqual(customProfile.one_line_bio, 'Building autonomous rovers', 'Custom one-line bio preserved');

console.log('All tests passed successfully!');
