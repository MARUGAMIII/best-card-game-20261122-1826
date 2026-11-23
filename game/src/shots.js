// Emberhold — the screenshot scenes behind ?shot=title|play|win|loss. Each one
// plays the real rules forward from a fresh game with the autopilot, so the
// frame is what a real game looks like and the same seed always gives the same
// frame. The win scene's player plays well and the Warden fumbles; the loss
// scene is the reverse.
import { createGame, gameSummary } from './state.js';
import { autoplay } from './ai.js';
import { SCREEN_LOSS, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

function playScene(seed, youSkill, foeSkill, maxTurns) {
  const state = createGame(seed);
  autoplay(state, youSkill, foeSkill, maxTurns);
  return state;
}

function midGameScore(state) {
  if (state.over) return -1;
  // A good play frame has creatures on both sides of the table, not one
  // side's army alone: the weaker board counts double.
  const weaker = Math.min(state.you.board.length, state.foe.board.length);
  return weaker * 10 + state.you.board.length + state.foe.board.length + Math.min(state.you.hand.length, 4);
}

/**
 * Stage the named scene from `seed` and return the state, the screen to draw
 * and the end summary (for the win/loss screens).
 */
export function stageShot(name, seed) {
  if (name === 'play') {
    let best = null;
    let bestScore = -1;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const state = playScene(seed + attempt * 7919, 0.8, 0.8, 6);
      const score = midGameScore(state);
      if (score > bestScore) {
        bestScore = score;
        best = state;
      }
      if (state.you.board.length >= 2 && state.foe.board.length >= 2 && state.you.hand.length >= 3) break;
    }
    return { state: best, screen: SCREEN_PLAY, summary: gameSummary(best) };
  }
  if (name === 'win' || name === 'loss') {
    const want = name === 'win' ? 'win' : 'loss';
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const state = playScene(
        seed + attempt * 7919,
        name === 'win' ? 1.0 : 0.25,
        name === 'win' ? 0.25 : 1.0,
        40,
      );
      if (state.over === want) return { state, screen: name === 'win' ? SCREEN_WIN : SCREEN_LOSS, summary: gameSummary(state) };
    }
    // No seed in range ended that way: fall back to a mid-game frame on the play screen.
    const state = playScene(seed, 0.8, 0.8, 8);
    return { state, screen: SCREEN_PLAY, summary: gameSummary(state) };
  }
  // Title: a few turns in, so the table behind the title already has cards.
  const state = playScene(seed, 0.7, 0.7, 3);
  return { state, screen: SCREEN_TITLE, summary: gameSummary(state) };
}
