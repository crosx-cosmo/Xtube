import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VIDEO_REACTION_CATALOG,
  VIDEO_REACTION_TYPES,
  applyOptimisticReactionToggle,
  createEmptyReactionCounts,
  getTotalReactionsCount,
  isValidVideoReactionType,
  normalizeReactionState,
} from './video-reactions';

test('isValidVideoReactionType validates supported emoji reaction keys and rejects invalid inputs', () => {
  for (const type of VIDEO_REACTION_TYPES) {
    assert.equal(isValidVideoReactionType(type), true);
  }
  assert.equal(VIDEO_REACTION_CATALOG.length, 5);
  assert.equal(isValidVideoReactionType('heart'), true);
  assert.equal(isValidVideoReactionType('fire'), true);
  assert.equal(isValidVideoReactionType('clap'), true);
  assert.equal(isValidVideoReactionType('unknown'), false);
  assert.equal(isValidVideoReactionType(''), false);
  assert.equal(isValidVideoReactionType(null), false);
  assert.equal(isValidVideoReactionType(42), false);
});

test('normalizeReactionState sanitizes negative/NaN counts and deduplicates viewerReactions', () => {
  const normalized = normalizeReactionState({
    counts: {
      heart: 12.8,
      fire: -4,
      clap: Number.NaN,
      kiss: 3,
    },
    viewerReactions: ['fire', 'heart', 'fire', 'invalid-reaction'],
  });

  assert.deepEqual(normalized.viewerReactions, ['heart', 'fire']);
  assert.equal(normalized.counts.heart, 12);
  assert.equal(
    normalized.counts.fire,
    1,
    'active viewer reaction ensures count is at least 1'
  );
  assert.equal(normalized.counts.clap, 0);
  assert.equal(normalized.counts.kiss, 3);
  assert.equal(normalized.counts.mindblown, 0);
});

test('applyOptimisticReactionToggle increments and decrements counts and updates active viewer reactions', () => {
  const initial = normalizeReactionState({
    counts: { heart: 5, fire: 2, clap: 1, kiss: 0, mindblown: 0 },
    viewerReactions: ['heart'],
  });

  // Toggle ON 'fire'
  const step1 = applyOptimisticReactionToggle(initial, 'fire');
  assert.equal(step1.toggledOn, true);
  assert.equal(step1.nextState.counts.fire, 3);
  assert.deepEqual(step1.nextState.viewerReactions, ['heart', 'fire']);

  // Toggle OFF 'heart'
  const step2 = applyOptimisticReactionToggle(step1.nextState, 'heart');
  assert.equal(step2.toggledOn, false);
  assert.equal(step2.nextState.counts.heart, 4);
  assert.deepEqual(step2.nextState.viewerReactions, ['fire']);
});

test('getTotalReactionsCount sums all reaction buckets accurately', () => {
  const empty = createEmptyReactionCounts();
  assert.equal(getTotalReactionsCount(empty), 0);

  assert.equal(
    getTotalReactionsCount({
      heart: 10,
      fire: 7,
      clap: 4,
      kiss: 2,
      mindblown: 1,
    }),
    24
  );
});
