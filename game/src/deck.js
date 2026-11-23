// Emberhold — the seeded random source and the deck. One deck holds one copy of
// each of the 24 cards; both lanterns draw from their own shuffled copy.
import { CARDS } from './cards.js';

/** mulberry32: a small seeded generator, so a seed always deals the same game. */
export function createRandom(seed) {
  let value = seed >>> 0;
  return function next() {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh shuffled deck: the 24 card ids in a random order. */
export function buildDeck(random) {
  const deck = CARDS.map((card) => card.id);
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [deck[index], deck[other]] = [deck[other], deck[index]];
  }
  return deck;
}

/**
 * Draw `count` cards from `side`'s deck into its hand (up to MAX_HAND; extras
 * burn). Drawing from an empty deck deals FATIGUE_DAMAGE to that lantern.
 * Returns the events the renderer announces: draws, burns and fatigue hits.
 */
export function drawCards(state, side, count, maxHand, fatigueDamage) {
  const events = [];
  const player = state[side];
  for (let n = 0; n < count; n += 1) {
    if (player.deck.length === 0) {
      player.life -= fatigueDamage;
      events.push({ kind: 'fatigue', side, amount: fatigueDamage });
      continue;
    }
    const cardId = player.deck.pop();
    if (player.hand.length >= maxHand) events.push({ kind: 'burn', side, cardId });
    else {
      player.hand.push(cardId);
      events.push({ kind: 'draw', side, cardId });
    }
  }
  return events;
}
