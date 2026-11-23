// Emberhold — the rival's brain. The Hollow Warden plays greedily and out loud:
// it weighs each card it could play, picks the best, and attacks where the trade
// is good or the lantern is open. A `skill` of 1 plays the best move it sees; a
// low skill fumbles, so the screenshots can stage a win or a loss on purpose.
// The same planner drives both sides in the screenshot autopilot.
import { CARD_BY_ID } from './cards.js';
import {
  attack,
  attackTargets,
  canPlayCard,
  cardCost,
  cardTargets,
  cloneState,
  endTurn,
  otherSide,
  playCard,
} from './state.js';

/** How much a card is worth to the side playing it, before its cost. */
function cardValue(state, side, handIndex) {
  const player = state[side];
  const card = CARD_BY_ID.get(player.hand[handIndex]);
  const foe = state[otherSide(side)];
  let value = 0;
  if (card.type === 'creature') {
    value = card.attack * 2 + card.health;
    if (card.guard) value += 2;
    if (card.swift) value += 1.5;
    if (card.onPlay?.kind === 'draw') value += 2;
    if (card.onPlay?.kind === 'rally') value += player.board.length * 1.5;
    if (card.onPlay?.kind === 'mana') value += 1;
    if (card.onPlay?.kind === 'damageHero') value += 3;
    if (card.onPlay?.kind === 'damageAllEnemyCreatures') value += foe.board.length * 2;
    if (player.board.length >= 5) value -= 99;
  } else {
    switch (card.onPlay?.kind) {
      case 'damage': {
        const targets = cardTargets(state, side, handIndex);
        const best = targets
          .filter((t) => t.kind === 'creature')
          .map((t) => state[otherSide(side)].board.find((c) => c.uid === t.uid))
          .filter(Boolean)
          .reduce((max, c) => Math.max(max, c.attack + c.health), 0);
        value = 2 + best;
        if (foe.life <= card.onPlay.amount) value += 20;
        break;
      }
      case 'damageDraw':
        value = 4;
        break;
      case 'damageHero':
        value = foe.life <= card.onPlay.amount ? 30 : 5;
        break;
      case 'damageAllEnemyCreatures':
        value = 1 + foe.board.length * 2.5;
        break;
      case 'heal':
        value = player.life <= 12 ? 8 : 1;
        break;
      case 'draw':
        value = 5;
        break;
      case 'veil':
        value = foe.board.length >= 2 ? 5 : 0.5;
        break;
      default:
        value = 1;
    }
  }
  return value - cardCost(state, card) * 1.4;
}

/** The best target for a card that needs one, or null. */
function bestTarget(state, side, handIndex) {
  const player = state[side];
  const card = CARD_BY_ID.get(player.hand[handIndex]);
  const targets = cardTargets(state, side, handIndex);
  if (targets.length === 0) return null;
  const foe = state[otherSide(side)];
  if (card.onPlay?.kind === 'damage' && card.target === 'any') {
    if (foe.life <= card.onPlay.amount) return { kind: 'hero', side: otherSide(side) };
    const creatures = targets.filter((t) => t.kind === 'creature');
    creatures.sort((a, b) => {
      const ca = foe.board.find((c) => c.uid === a.uid);
      const cb = foe.board.find((c) => c.uid === b.uid);
      return cb.attack + cb.health - (ca.attack + ca.health);
    });
    if (creatures.length > 0) return creatures[0];
    return { kind: 'hero', side: otherSide(side) };
  }
  if (card.onPlay?.kind === 'damage' || card.onPlay?.kind === 'damageDraw') {
    const creatures = targets.filter((t) => t.kind === 'creature' && !t.own);
    creatures.sort((a, b) => {
      const ca = foe.board.find((c) => c.uid === a.uid);
      const cb = foe.board.find((c) => c.uid === b.uid);
      return cb.attack + cb.health - (ca.attack + ca.health);
    });
    return creatures[0] ?? null;
  }
  return null;
}

/** Where a ready creature should strike: a Guard first, a good trade next, else the lantern. */
function bestAttack(state, side, attackerUid) {
  const attacker = state[side].board.find((c) => c.uid === attackerUid);
  const targets = attackTargets(state, side, attackerUid);
  if (!attacker || targets.length === 0) return null;
  const foe = state[otherSide(side)];
  const power = attacker.attack + attacker.tempAttack;
  const creatureTargets = targets.filter((t) => t.kind === 'creature');
  if (creatureTargets.length > 0) {
    const guards = creatureTargets.filter((t) => CARD_BY_ID.get(foe.board.find((c) => c.uid === t.uid)?.cardId)?.guard);
    if (guards.length > 0) return guards[0];
    // Removing a dangerous creature is worth more than face damage: trade when
    // we survive, or when the victim would hit back for 2 or more anyway.
    const trades = creatureTargets
      .map((t) => ({ target: t, victim: foe.board.find((c) => c.uid === t.uid) }))
      .filter(({ victim }) => victim && victim.health <= power)
      .sort((a, b) => b.victim.attack - a.victim.attack || b.victim.health - a.victim.health);
    if (trades.length > 0) {
      const best = trades[0];
      if (best.victim.attack < attacker.health || best.victim.attack >= 2) return best.target;
    }
    if (foe.life <= power) return { kind: 'hero', side: otherSide(side) };
    if (foe.board.length === 0) return { kind: 'hero', side: otherSide(side) };
  }
  const hero = targets.find((t) => t.kind === 'hero');
  return hero ?? null;
}

/**
 * Plan one side's whole turn as a list of steps ({play, attack} then {end}).
 * The plan is made on a copy of the state, so the real game is untouched until
 * the steps are executed one by one (which lets the live game show each play).
 * With skill < 1 the planner sometimes takes a random legal step instead of the
 * best one, which is how the screenshots stage a win or a loss.
 */
export function planTurn(state, side, skill, random) {
  const steps = [];
  const sim = cloneState(state);
  for (;;) {
    if (sim.over) break;
    let bestIndex = -1;
    let bestValue = 0;
    const playable = [];
    for (let index = 0; index < sim[side].hand.length; index += 1) {
      if (!canPlayCard(sim, side, index)) continue;
      playable.push(index);
      const value = cardValue(sim, side, index);
      if (value > bestValue) {
        bestValue = value;
        bestIndex = index;
      }
    }
    if (playable.length === 0 || bestValue <= 0.2) break;
    const index = random() < skill ? bestIndex : playable[Math.floor(random() * playable.length)];
    const target = bestTarget(sim, side, index);
    steps.push({ type: 'play', handIndex: index, target });
    const events = playCard(sim, side, index, target);
    if (events.length === 0) break;
  }
  for (const creature of [...sim[side].board]) {
    if (sim.over) break;
    if (!creature.canAttack) continue;
    const target = random() < skill ? bestAttack(sim, side, creature.uid) : pickRandomAttack(sim, side, creature.uid, random);
    if (!target) continue;
    steps.push({ type: 'attack', uid: creature.uid, target });
    attack(sim, side, creature.uid, target);
  }
  steps.push({ type: 'end' });
  return steps;
}

function pickRandomAttack(state, side, attackerUid, random) {
  const targets = attackTargets(state, side, attackerUid);
  if (targets.length === 0) return null;
  return targets[Math.floor(random() * targets.length)];
}

/** Apply one planned step to the real state; returns its events. */
export function executeStep(state, step) {
  if (step.type === 'play') return playCard(state, state.active, step.handIndex, step.target);
  if (step.type === 'attack') return attack(state, state.active, step.uid, step.target);
  if (step.type === 'end') return endTurn(state);
  return [];
}

/**
 * Play a whole game instantly between two planners (used by the screenshots):
 * returns the finished state. `maxTurns` caps the game so it always ends.
 */
export function autoplay(state, youSkill, foeSkill, maxTurns = 40) {
  while (!state.over && state.turn <= maxTurns) {
    const side = state.active;
    const skill = side === 'you' ? youSkill : foeSkill;
    const steps = planTurn(state, side, skill, state.random);
    for (const step of steps) {
      executeStep(state, step);
      if (state.over) break;
    }
    if (state.over) break;
  }
  return state;
}
