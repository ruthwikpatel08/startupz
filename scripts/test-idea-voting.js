import assert from 'assert';

function transitionVote(currentVote, clickedVote) {
  let nextVote = null;
  let delta = 0;

  if (currentVote === clickedVote) {
    nextVote = null;
    delta = clickedVote === 'up' ? -1 : 1;
  } else if (currentVote === 'up' && clickedVote === 'down') {
    nextVote = 'down';
    delta = -2;
  } else if (currentVote === 'down' && clickedVote === 'up') {
    nextVote = 'up';
    delta = 2;
  } else {
    nextVote = clickedVote;
    delta = clickedVote === 'up' ? 1 : -1;
  }

  return { nextVote, delta };
}

// 1. Clicking Upvote when unselected: Increment net score by +1; set state to upvoted.
let t1 = transitionVote(null, 'up');
assert.strictEqual(t1.nextVote, 'up', 'Unselected -> Upvote should set state to up');
assert.strictEqual(t1.delta, 1, 'Unselected -> Upvote should increment score by +1');

// 2. Clicking Upvote when already upvoted: Remove upvote (toggle off, return to 0 change).
let t2 = transitionVote('up', 'up');
assert.strictEqual(t2.nextVote, null, 'Upvoted -> Upvote should toggle off to null');
assert.strictEqual(t2.delta, -1, 'Upvoted -> Upvote should decrement score by -1 (0 net change from base)');

// 3. Clicking Upvote when currently downvoted: Change state from downvoted to upvoted (+2 net score transition).
let t3 = transitionVote('down', 'up');
assert.strictEqual(t3.nextVote, 'up', 'Downvoted -> Upvote should transition to up');
assert.strictEqual(t3.delta, 2, 'Downvoted -> Upvote should transition net score by +2');

// 4. Clicking Downvote when unselected: Decrement net score by -1; set state to downvoted.
let t4 = transitionVote(null, 'down');
assert.strictEqual(t4.nextVote, 'down', 'Unselected -> Downvote should set state to down');
assert.strictEqual(t4.delta, -1, 'Unselected -> Downvote should decrement score by -1');

// 5. Clicking Downvote when already downvoted: Remove downvote (toggle off, return to 0 change).
let t5 = transitionVote('down', 'down');
assert.strictEqual(t5.nextVote, null, 'Downvoted -> Downvote should toggle off to null');
assert.strictEqual(t5.delta, 1, 'Downvoted -> Downvote should increment score by +1 (0 net change from base)');

// 6. Clicking Downvote when currently upvoted: Change state from upvoted to downvoted (-2 net score transition).
let t6 = transitionVote('up', 'down');
assert.strictEqual(t6.nextVote, 'down', 'Upvoted -> Downvote should transition to down');
assert.strictEqual(t6.delta, -2, 'Upvoted -> Downvote should transition net score by -2');

// 7. Verify Feed Scope Rule:
const isIdeaSection = (pillar, postType) => {
  const IDEA_POST_TYPES = new Set(['IDEA', 'COFOUNDER', 'ADVICE', 'HIRING']);
  return pillar === 'IDEAS' || (postType || '').toUpperCase() === 'IDEA' || (pillar !== 'ACHIEVEMENTS' && IDEA_POST_TYPES.has((postType || '').toUpperCase()));
};

assert.strictEqual(isIdeaSection('IDEAS', 'EXPERIENCE'), true, 'Any post viewed under IDEAS pillar must use Upvote/Downvote');
assert.strictEqual(isIdeaSection('IDEAS', 'IDEA'), true, 'Idea post in IDEAS pillar must use Upvote/Downvote');
assert.strictEqual(isIdeaSection('ACHIEVEMENTS', 'EXPERIENCE'), false, 'Achievement post in ACHIEVEMENTS pillar must retain Heart');
assert.strictEqual(isIdeaSection('ACHIEVEMENTS', 'LAUNCH'), false, 'Launch post in ACHIEVEMENTS pillar must retain Heart');

console.log('✓ All 7 idea voting transition & feed scope tests passed successfully!');
