import assert from 'assert';

// Self-check validation logic for Headline (up to 50 words) and One-Line Bio
function validateHeadline(headline) {
  if (headline === undefined || headline === null) return { valid: true };
  const clean = String(headline).trim();
  if (clean.length > 0 && clean.length < 3) {
    return { valid: false, error: 'Headline must be at least 3 characters.' };
  }
  const wordCount = clean ? clean.split(/\s+/).filter(Boolean).length : 0;
  if (wordCount > 50) {
    return { valid: false, error: 'Headline cannot exceed 50 words.' };
  }
  return { valid: true };
}

function validateOneLineBio(bio) {
  if (bio === undefined || bio === null) return { valid: true };
  const clean = String(bio).trim();
  if (clean.length > 0 && clean.length < 3) {
    return { valid: false, error: 'One-line bio must be at least 3 characters.' };
  }
  if (clean.length > 160) {
    return { valid: false, error: 'One-line bio cannot exceed 160 characters.' };
  }
  return { valid: true };
}

console.log('Running profile validation assertions...');

// Headline tests
assert.strictEqual(validateHeadline('').valid, true, 'Empty headline is valid (optional)');
assert.strictEqual(validateHeadline('CS Student | AI Builder').valid, true, 'Valid headline passes');
assert.strictEqual(validateHeadline('AB').valid, false, 'Headline under 3 chars rejected');

// 50 words test
const fiftyWords = Array(50).fill('developer').join(' ');
assert.strictEqual(validateHeadline(fiftyWords).valid, true, 'Headline with exactly 50 words passes');

const fiftyOneWords = Array(51).fill('developer').join(' ');
assert.strictEqual(validateHeadline(fiftyOneWords).valid, false, 'Headline with 51 words rejected');

// One-line bio tests
assert.strictEqual(validateOneLineBio('').valid, true, 'Empty one-line bio is valid (optional)');
assert.strictEqual(validateOneLineBio('Building next-gen AI tools for developers').valid, true, 'Valid bio passes');
assert.strictEqual(validateOneLineBio('Hi').valid, false, 'One-line bio under 3 chars rejected');
assert.strictEqual(validateOneLineBio('B'.repeat(161)).valid, false, 'One-line bio over 160 chars rejected');
assert.strictEqual(validateOneLineBio('B'.repeat(160)).valid, true, 'One-line bio exactly 160 chars passes');

console.log('All profile validation assertions passed successfully!');
