export type JoiningRole = 'Student' | 'Investor' | 'Other';
export type Answers = Record<string, string | string[]>;
export type Question = { key: string; title: string; hint?: string; type: 'text' | 'choice' | 'multi' | 'skills' | 'bio'; options?: string[]; optional?: boolean; maxLength?: number };
export const SKILLS = ['React', 'Node.js', 'Python', 'Figma', 'TypeScript', 'JavaScript', 'Java', 'C++', 'HTML/CSS', 'Next.js', 'Flutter', 'Swift', 'Kotlin', 'SQL', 'MongoDB', 'TensorFlow', 'PyTorch', 'Docker', 'AWS', 'Git', 'UI/UX', 'Research', 'Public speaking', 'Product strategy', 'Marketing', 'Mentoring'];
const name: Question = { key: 'fullName', title: "What's your full name?", hint: 'So your future teammates know what to call you.', type: 'text', maxLength: 100 };
const bio: Question = { key: 'bio', title: 'Add a short bio.', hint: 'One little window into your world. Optional — you can add this later.', type: 'bio', optional: true, maxLength: 160 };
const skills: Question = { key: 'skills', title: 'What skills do you bring to a team?', hint: 'Select a few, or search and add your own. Learning counts, too.', type: 'skills', options: SKILLS };
const flows: Record<JoiningRole, Question[]> = {
  Student: [name,
    { key: 'college', title: 'Which college/university do you attend?', type: 'text', maxLength: 160 },
    { key: 'year', title: 'What year are you in?', type: 'choice', options: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgrad'] },
    { key: 'major', title: "What's your branch/major?", type: 'text', maxLength: 100 },
    { key: 'primaryRole', title: "What's your primary role?", type: 'choice', options: ['Frontend', 'Backend', 'Full-Stack', 'UI-UX Designer', 'ML-AI', 'Mobile Dev', 'DevOps', 'Presenter-Pitcher', 'Product Manager', 'Other'] },
    skills,
    { key: 'hackathons', title: 'How many hackathons have you participated in?', hint: 'Your first one could be the start of something great.', type: 'choice', options: ['0', '1-3', '4-7', '8+'] },
    { key: 'lookingFor', title: 'What are you looking for on HookZ?', type: 'multi', options: ['Hackathon teammates', 'Project collaborators', 'Co-founders', 'Mentorship', 'Just exploring'] }, bio],
  Investor: [name,
    { key: 'organization', title: "What's your firm or organization?", hint: 'Investing independently? Feel free to skip.', type: 'text', optional: true, maxLength: 160 },
    { key: 'stages', title: 'What stages do you typically invest in?', type: 'multi', options: ['Idea', 'Pre-Seed', 'Seed', 'Series A', 'Later'] },
    { key: 'sectors', title: 'What sectors interest you most?', type: 'multi', options: ['AI/ML', 'FinTech', 'EdTech', 'HealthTech', 'Consumer', 'SaaS', 'Climate', 'Other'] },
    { key: 'checkSize', title: "What's your typical check size?", type: 'choice', options: ['Under $10k', '$10k-$50k', '$50k-$250k', '$250k+', 'Varies'] },
    { key: 'mentoring', title: 'Are you open to mentoring student founders?', type: 'choice', options: ['Yes', 'No'] }, bio],
  Other: [name,
    { key: 'otherRole', title: 'Tell us about your role.', hint: 'Your experience belongs here. Tell us what you do.', type: 'text', maxLength: 100 },
    { ...skills, title: 'What skills or expertise do you bring?' },
    { key: 'lookingFor', title: 'What are you looking for on HookZ?', type: 'multi', options: ['Networking', 'Collaborating on projects', 'Mentoring students', 'Discovering opportunities', 'Other'] },
    { key: 'location', title: 'Where are you based?', hint: 'Your city, your time zone, or simply “Remote”. Optional.', type: 'text', optional: true, maxLength: 120 }, bio],
};
export const getQuestions = (role: JoiningRole): Question[] => [
  { key: 'role', title: 'I am joining HookZ as a…', hint: 'A few quick questions to help your people find you.', type: 'choice', options: ['Student', 'Investor', 'Other'] }, ...flows[role],
];
export function validateAnswer(question: Question, answers: Answers): string {
  const value = answers[question.key];
  if (question.type === 'multi' || question.type === 'skills') {
    if (!Array.isArray(value) || !value.length) return 'Choose at least one option to continue.';
    if (value.length > 20 || value.some(v => typeof v !== 'string' || !v.trim() || v.length > 50)) return 'Choose up to 20 skills, each under 50 characters.';
    if (question.type === 'multi' && value.some(v => !question.options?.includes(v))) return 'Choose one of the available options.';
  } else {
    if (typeof value !== 'string' || !value.trim()) return question.optional ? '' : 'Add your answer to continue.';
    if (value.length > (question.maxLength || 160)) return 'Please shorten your answer.';
    if (question.type === 'choice' && !question.options?.includes(value)) return 'Choose one of the available options.';
  }
  if (question.key === 'role' && value === 'Other' && (typeof answers.otherRole !== 'string' || !answers.otherRole.trim() || answers.otherRole.length > 100)) return 'Tell us what you do in 100 characters or fewer.';
  return '';
}
export function submissionAnswers(role: JoiningRole, answers: Answers): Answers {
  // Submit only the active branch; going back and changing role cannot leak old answers.
  return Object.fromEntries(getQuestions(role).map(q => [q.key, Array.isArray(answers[q.key]) ? answers[q.key] : String(answers[q.key] || '').trim()]));
}
