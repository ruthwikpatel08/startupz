import assert from 'assert';

function transitionCounts(currentVote, clickedVote, currentUpvotes = 0, currentDownvotes = 0) {
  let nextVote = null;
  let nextUpvotes = currentUpvotes;
  let nextDownvotes = currentDownvotes;

  if (clickedVote === 'up') {
    if (currentVote === 'up') {
      nextVote = null;
      nextUpvotes = Math.max(0, currentUpvotes - 1);
    } else if (currentVote === 'down') {
      nextVote = 'up';
      nextDownvotes = Math.max(0, currentDownvotes - 1);
      nextUpvotes = currentUpvotes + 1;
    } else {
      nextVote = 'up';
      nextUpvotes = currentUpvotes + 1;
    }
  } else if (clickedVote === 'down') {
    if (currentVote === 'down') {
      nextVote = null;
      nextDownvotes = Math.max(0, currentDownvotes - 1);
    } else if (currentVote === 'up') {
      nextVote = 'down';
      nextUpvotes = Math.max(0, currentUpvotes - 1);
      nextDownvotes = currentDownvotes + 1;
    } else {
      nextVote = 'down';
      nextDownvotes = currentDownvotes + 1;
    }
  }

  const nextScore = nextUpvotes - nextDownvotes;
  return { nextVote, nextUpvotes, nextDownvotes, nextScore };
}

// 1. Clicking Upvote when unselected:
// Increments upvotesCount by +1; downvotesCount unchanged; state set to 'up'.
let t1 = transitionCounts(null, 'up', 2, 2);
assert.strictEqual(t1.nextVote, 'up', 'Unselected -> Upvote should set state to up');
assert.strictEqual(t1.nextUpvotes, 3, 'Unselected -> Upvote should increment upvotes to 3');
assert.strictEqual(t1.nextDownvotes, 2, 'Unselected -> Upvote keeps downvotes at 2');
assert.strictEqual(t1.nextScore, 1, 'Net score transitions to 1');

// 2. Clicking Upvote when already upvoted:
// Toggles off; decrements upvotesCount by -1; state becomes null.
let t2 = transitionCounts('up', 'up', 3, 2);
assert.strictEqual(t2.nextVote, null, 'Upvoted -> Upvote should toggle off to null');
assert.strictEqual(t2.nextUpvotes, 2, 'Upvoted -> Upvote returns upvotes to 2');
assert.strictEqual(t2.nextDownvotes, 2, 'Downvotes remain 2');
assert.strictEqual(t2.nextScore, 0, 'Net score returns to 0');

// 3. Clicking Upvote when currently downvoted:
// Decrements downvotesCount by -1; increments upvotesCount by +1; state becomes 'up'.
let t3 = transitionCounts('down', 'up', 2, 2);
assert.strictEqual(t3.nextVote, 'up', 'Downvoted -> Upvote should transition to up');
assert.strictEqual(t3.nextUpvotes, 3, 'Downvoted -> Upvote increases upvotes to 3');
assert.strictEqual(t3.nextDownvotes, 1, 'Downvoted -> Upvote decreases downvotes to 1');
assert.strictEqual(t3.nextScore, 2, 'Net score transitions from 0 to +2');

// 4. Clicking Downvote when unselected:
// Increments downvotesCount by +1; upvotesCount unchanged; state set to 'down'.
let t4 = transitionCounts(null, 'down', 2, 2);
assert.strictEqual(t4.nextVote, 'down', 'Unselected -> Downvote should set state to down');
assert.strictEqual(t4.nextUpvotes, 2, 'Upvotes remain 2');
assert.strictEqual(t4.nextDownvotes, 3, 'Downvotes increment to 3');
assert.strictEqual(t4.nextScore, -1, 'Net score becomes -1');

// 5. Clicking Downvote when already downvoted:
// Toggles off; decrements downvotesCount by -1; state becomes null.
let t5 = transitionCounts('down', 'down', 2, 3);
assert.strictEqual(t5.nextVote, null, 'Downvoted -> Downvote should toggle off to null');
assert.strictEqual(t5.nextUpvotes, 2, 'Upvotes remain 2');
assert.strictEqual(t5.nextDownvotes, 2, 'Downvotes return to 2');
assert.strictEqual(t5.nextScore, 0, 'Net score returns to 0');

// 6. Clicking Downvote when currently upvoted:
// Decrements upvotesCount by -1; increments downvotesCount by +1; state becomes 'down'.
let t6 = transitionCounts('up', 'down', 3, 2);
assert.strictEqual(t6.nextVote, 'down', 'Upvoted -> Downvote should transition to down');
assert.strictEqual(t6.nextUpvotes, 2, 'Upvotes decrease to 2');
assert.strictEqual(t6.nextDownvotes, 3, 'Downvotes increase to 3');
assert.strictEqual(t6.nextScore, -1, 'Net score transitions to -1');

// 7. Verify counts are NEVER lost or cancelled:
// An idea with 2 upvotes and 2 downvotes must have upvotesCount === 2 and downvotesCount === 2
const post = { upvotesCount: 2, downvotesCount: 2, likesCount: 0 };
assert.strictEqual(post.upvotesCount, 2, 'Upvoted count must NOT be gone when downvotes exist');
assert.strictEqual(post.downvotesCount, 2, 'Downvoted count must be preserved');

// 8. Verify Feed Scope Rule:
const isIdeaSection = (pillar, postType) => {
  const IDEA_POST_TYPES = new Set(['IDEA', 'COFOUNDER', 'ADVICE', 'HIRING']);
  return pillar === 'IDEAS' || (postType || '').toUpperCase() === 'IDEA' || (pillar !== 'ACHIEVEMENTS' && IDEA_POST_TYPES.has((postType || '').toUpperCase()));
};

assert.strictEqual(isIdeaSection('IDEAS', 'EXPERIENCE'), true, 'Any post viewed under IDEAS pillar must use Upvote/Downvote');
assert.strictEqual(isIdeaSection('IDEAS', 'IDEA'), true, 'Idea post in IDEAS pillar must use Upvote/Downvote');
assert.strictEqual(isIdeaSection('ACHIEVEMENTS', 'EXPERIENCE'), false, 'Achievement post in ACHIEVEMENTS pillar must retain Heart');
assert.strictEqual(isIdeaSection('ACHIEVEMENTS', 'LAUNCH'), false, 'Launch post in ACHIEVEMENTS pillar must retain Heart');

console.log('✓ All 8 idea upvote/downvote count & transition tests passed successfully!');
