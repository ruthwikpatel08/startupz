import assert from 'node:assert/strict';
import { getQuestions, validateAnswer, submissionAnswers } from '../client/src/pages/Onboarding/questions.ts';

for (const [role, count] of [['Student', 10], ['Investor', 8], ['Other', 7]]) {
  const questions = getQuestions(role);
  assert.equal(questions.length, count);
  const answers = { role, otherRole: 'Community organizer' };
  for (const q of questions) {
    answers[q.key] ??= q.type === 'multi' || q.type === 'skills' ? [q.options[0]] : q.type === 'choice' ? q.options[0] : q.optional ? '' : 'Sample answer';
    assert.equal(validateAnswer(q, answers), '', `${role}/${q.key}`);
  }
  const clean = submissionAnswers(role, { ...answers, secret: 'ignore', organization: 'old investor branch', college: 'old student branch' });
  assert.equal('secret' in clean, false);
  if (role !== 'Student') assert.equal('college' in clean, false);
  if (role !== 'Investor') assert.equal('organization' in clean, false);
  const required = questions.find(q => q.key === 'fullName');
  assert.notEqual(validateAnswer(required, { fullName: '  ' }), '');
  assert.notEqual(validateAnswer(required, { fullName: 'a'.repeat(101) }), '');
  const bio = questions.at(-1);
  assert.equal(validateAnswer(bio, { bio: '' }), '');
  assert.notEqual(validateAnswer(bio, { bio: 'a'.repeat(161) }), '');
}
assert.notEqual(validateAnswer(getQuestions('Other')[0], { role: 'Other', otherRole: ' ' }), '');
const skills = getQuestions('Student').find(q => q.key === 'skills');
assert.notEqual(validateAnswer(skills, { skills: [] }), '');
assert.notEqual(validateAnswer(skills, { skills: Array(21).fill('React') }), '');
const choice = getQuestions('Student').find(q => q.key === 'year');
assert.notEqual(validateAnswer(choice, { year: 'not a year' }), '');
console.log('PASS: all branch lengths, validation, optional fields, limits, and stale-branch exclusion');
