// Emberhold — the game itself: state, turns, playing cards, combat and the
// Resonance rule. Nothing here touches the screen; it returns plain events the
// renderer turns into motion and sound. Every function takes the state and
// returns events, so the autopilot and the screenshots play the real rules.
import {
  DRAW_PER_TURN,
  FATIGUE_DAMAGE,
  MAX_BOARD,
  MAX_HAND,
  MAX_MANA,
  OPENING_HAND,
  RESONANCE_DISCOUNT,
  SECOND_PLAYER_BONUS_CARDS,
  START_LIFE,
} from './config.js';
import { CARD_BY_ID } from './cards.js';
import { buildDeck, createRandom, drawCards } from './deck.js';

export const SIDE_YOU = 'you';
export const SIDE_FOE = 'foe';

/** A fresh game: both lanterns at 30 flame, opening hands dealt, you to move. */
export function createGame(seed) {
  const random = createRandom(seed);
  const state = {
    seed,
    random,
    nextUid: 1,
    turn: 1,
    active: SIDE_YOU,
    over: null,
    winner: null,
    lastFaction: null,
    log: [],
    cardsPlayed: 0,
    you: freshSide(random),
    foe: freshSide(random),
  };
  drawCards(state, SIDE_YOU, OPENING_HAND, MAX_HAND, FATIGUE_DAMAGE);
  // The Warden moves second, so it opens with one extra card and one bonus
  // mana on its first turn — the court's answer to the first move.
  drawCards(state, SIDE_FOE, OPENING_HAND + SECOND_PLAYER_BONUS_CARDS, MAX_HAND, FATIGUE_DAMAGE);
  state.foe.bonusMana = 1;
  state.you.mana = 1;
  state.you.maxMana = 1;
  return state;
}

function freshSide(random) {
  return {
    life: START_LIFE,
    mana: 0,
    maxMana: 0,
    bonusMana: 0,
    deck: buildDeck(random),
    hand: [],
    board: [],
  };
}

export function otherSide(side) {
  return side === SIDE_YOU ? SIDE_FOE : SIDE_YOU;
}

/** The mana a card costs this turn: 1 less when it shares a faction with the last card played. */
export function cardCost(state, card) {
  if (state.lastFaction === card.faction) return Math.max(0, card.cost - RESONANCE_DISCOUNT);
  return card.cost;
}

/** Can `side` play the card at `handIndex` right now (mana, board room, a legal target)? */
export function canPlayCard(state, side, handIndex) {
  const player = state[side];
  const card = CARD_BY_ID.get(player.hand[handIndex]);
  if (!card) return false;
  if (state.active !== side || state.over) return false;
  if (player.mana < cardCost(state, card)) return false;
  if (card.type === 'creature' && player.board.length >= MAX_BOARD) return false;
  return true;
}

/** Targets a card needs: 'any' (creature or lantern), 'creature', 'hero', or none. */
export function cardTargets(state, side, handIndex) {
  const player = state[side];
  const card = CARD_BY_ID.get(player.hand[handIndex]);
  if (!card || !card.target) return [];
  const foe = state[otherSide(side)];
  const targets = [];
  if (card.target === 'any' || card.target === 'creature') {
    for (const creature of foe.board) targets.push({ kind: 'creature', uid: creature.uid });
  }
  if (card.target === 'any' || card.target === 'hero') targets.push({ kind: 'hero', side: otherSide(side) });
  if (card.target === 'creature' && card.onPlay?.kind === 'damageDraw') {
    for (const creature of player.board) targets.push({ kind: 'creature', uid: creature.uid, own: true });
  }
  return targets;
}

function summon(state, side, card) {
  const creature = {
    uid: state.nextUid,
    cardId: card.id,
    attack: card.attack,
    health: card.health,
    maxHealth: card.health,
    canAttack: Boolean(card.swift),
    summonedTurn: state.turn,
    tempAttack: 0,
  };
  state.nextUid += 1;
  state[side].board.push(creature);
  return creature;
}

/**
 * A deep copy of the state (the random source is shared: planning never draws
 * from the deck, it only reads it). Uids come from state.nextUid, so a plan
 * made on a copy replays exactly on the real state.
 */
export function cloneState(state) {
  const copy = JSON.parse(JSON.stringify(state));
  copy.random = state.random;
  return copy;
}

function dealDamageToCreature(state, creature, amount, events) {
  creature.health -= amount;
  events.push({ kind: 'damage', uid: creature.uid, amount });
  if (creature.health <= 0) {
    for (const side of [SIDE_YOU, SIDE_FOE]) {
      const index = state[side].board.findIndex((c) => c.uid === creature.uid);
      if (index !== -1) {
        state[side].board.splice(index, 1);
        events.push({ kind: 'destroy', uid: creature.uid, side });
      }
    }
  }
}

function dealDamageToHero(state, side, amount, events) {
  state[side].life -= amount;
  events.push({ kind: 'heroDamage', side, amount });
  checkOver(state, events);
}

function findCreature(state, uid) {
  for (const side of [SIDE_YOU, SIDE_FOE]) {
    const creature = state[side].board.find((c) => c.uid === uid);
    if (creature) return { creature, side };
  }
  return null;
}

/** Run a card's on-play effect. `target` is {kind:'creature',uid} or {kind:'hero',side}. */
function runOnPlay(state, side, card, target, events) {
  const effect = card.onPlay;
  if (!effect) return;
  const foe = otherSide(side);
  switch (effect.kind) {
    case 'draw':
      events.push(...drawCards(state, side, effect.amount, MAX_HAND, FATIGUE_DAMAGE));
      break;
    case 'mana':
      state[side].mana += effect.amount;
      events.push({ kind: 'mana', side, amount: effect.amount });
      break;
    case 'rally':
      for (const creature of state[side].board) creature.tempAttack += effect.amount;
      events.push({ kind: 'rally', side, amount: effect.amount });
      break;
    case 'heal':
      state[side].life = Math.min(START_LIFE, state[side].life + effect.amount);
      events.push({ kind: 'heal', side, amount: effect.amount });
      break;
    case 'damageHero':
      dealDamageToHero(state, foe, effect.amount, events);
      break;
    case 'damageAllEnemyCreatures': {
      const victims = [...state[foe].board];
      for (const creature of victims) dealDamageToCreature(state, creature, effect.amount, events);
      break;
    }
    case 'veil':
      for (const creature of state[foe].board) creature.tempAttack -= effect.amount;
      events.push({ kind: 'veil', side: foe, amount: effect.amount });
      break;
    case 'damage': {
      if (target?.kind === 'hero') dealDamageToHero(state, target.side, effect.amount, events);
      else if (target?.kind === 'creature') {
        const found = findCreature(state, target.uid);
        if (found) dealDamageToCreature(state, found.creature, effect.amount, events);
      }
      break;
    }
    case 'damageDraw': {
      if (target?.kind === 'creature') {
        const found = findCreature(state, target.uid);
        if (found) dealDamageToCreature(state, found.creature, effect.amount, events);
      }
      events.push(...drawCards(state, side, 1, MAX_HAND, FATIGUE_DAMAGE));
      break;
    }
    default:
      break;
  }
}

/**
 * Play the card at `handIndex` for `side`, with an optional target. Returns the
 * events (played, summoned, damage, draws, ...). Illegal plays return [].
 */
export function playCard(state, side, handIndex, target = null) {
  if (!canPlayCard(state, side, handIndex)) return [];
  const player = state[side];
  const card = CARD_BY_ID.get(player.hand[handIndex]);
  const cost = cardCost(state, card);
  player.mana -= cost;
  player.hand.splice(handIndex, 1);
  state.lastFaction = card.faction;
  state.cardsPlayed += 1;
  const events = [{ kind: 'played', side, cardId: card.id, cost, handIndex }];
  if (card.type === 'creature') {
    const creature = summon(state, side, card);
    events.push({ kind: 'summon', side, uid: creature.uid, cardId: card.id });
    runOnPlay(state, side, card, target, events);
  } else {
    events.push({ kind: 'spell', side, cardId: card.id });
    runOnPlay(state, side, card, target, events);
  }
  state.log.push(`${side === SIDE_YOU ? 'You' : 'The Warden'} played ${card.name}.`);
  checkOver(state, events);
  return events;
}

/** Which enemy creatures (or the lantern) may `attacker` hit: Guards first. */
export function attackTargets(state, side, attackerUid) {
  const foe = state[otherSide(side)];
  const attacker = state[side].board.find((c) => c.uid === attackerUid);
  if (!attacker || !attacker.canAttack || state.active !== side || state.over) return [];
  const guards = foe.board.filter((c) => CARD_BY_ID.get(c.cardId).guard);
  const targets = (guards.length > 0 ? guards : foe.board).map((c) => ({ kind: 'creature', uid: c.uid }));
  if (guards.length === 0) targets.push({ kind: 'hero', side: otherSide(side) });
  return targets;
}

/** One creature attacks a target: both creatures trade damage, or the lantern takes it. */
export function attack(state, side, attackerUid, target) {
  const attacker = state[side].board.find((c) => c.uid === attackerUid);
  if (!attacker || !attacker.canAttack) return [];
  const legal = attackTargets(state, side, attackerUid).some(
    (t) => t.kind === target.kind && (t.kind === 'hero' ? t.side === target.side : t.uid === target.uid),
  );
  if (!legal) return [];
  attacker.canAttack = false;
  const events = [{ kind: 'attack', side, uid: attackerUid, target }];
  const power = attacker.attack + attacker.tempAttack;
  if (target.kind === 'hero') {
    dealDamageToHero(state, target.side, power, events);
  } else {
    const found = findCreature(state, target.uid);
    if (!found) return events;
    dealDamageToCreature(state, found.creature, power, events);
    dealDamageToCreature(state, attacker, found.creature.attack + found.creature.tempAttack, events);
  }
  checkOver(state, events);
  return events;
}

/** Start `side`'s turn: mana refills and grows, two cards are drawn, creatures wake. */
export function startTurn(state, side) {
  state.active = side;
  state.lastFaction = null;
  const player = state[side];
  player.maxMana = Math.min(MAX_MANA, player.maxMana + 1);
  player.mana = player.maxMana + (player.bonusMana ?? 0);
  player.bonusMana = 0;
  for (const creature of player.board) {
    creature.canAttack = true;
    creature.tempAttack = 0;
  }
  const events = [{ kind: 'turn', side, turn: state.turn }];
  events.push(...drawCards(state, side, DRAW_PER_TURN, MAX_HAND, FATIGUE_DAMAGE));
  checkOver(state, events);
  return events;
}

/** End the active side's turn and begin the other's. */
export function endTurn(state) {
  if (state.over) return [];
  const next = otherSide(state.active);
  if (next === SIDE_YOU) state.turn += 1;
  return startTurn(state, next);
}

function checkOver(state, events) {
  if (state.over) return;
  if (state.foe.life <= 0 && state.you.life <= 0) {
    state.over = 'win';
    state.winner = SIDE_YOU;
  } else if (state.foe.life <= 0) {
    state.over = 'win';
    state.winner = SIDE_YOU;
  } else if (state.you.life <= 0) {
    state.over = 'loss';
    state.winner = SIDE_FOE;
  }
  if (state.over) events.push({ kind: 'over', result: state.over });
}

/** A one-line summary of the game so far, for the end screens. */
export function gameSummary(state) {
  return {
    turns: state.turn,
    cardsPlayed: state.cardsPlayed,
    yourLife: Math.max(0, state.you.life),
    foeLife: Math.max(0, state.foe.life),
  };
}
