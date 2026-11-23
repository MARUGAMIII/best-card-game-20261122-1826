// Emberhold — the 24 cards of the Lantern Court, six per faction. Every card is
// original: its own name, art motif and rules text. A card is a creature (it stays
// on the board with attack and health) or a spell (it resolves and is gone).
// Keywords: Guard (must be attacked first), Swift (attacks the turn it is played),
// Draw (draw a card when played), Rally (friendly creatures +1 attack this turn),
// Sprout (gain 1 mana this turn when played).

// One SVG motif per card, drawn in the art panel in the faction's colours. Each
// motif is a small path picture (viewBox 0 0 100 100) so cards are told apart by
// shape as well as colour.
const MOTIFS = {
  imp: '<path d="M50 12 L62 38 L88 34 L66 52 L74 80 L50 64 L26 80 L34 52 L12 34 L38 38 Z"/>',
  lash: '<path d="M58 6 L30 54 L48 54 L40 94 L72 44 L52 44 Z"/>',
  brazier: '<path d="M30 78 h40 l-6 14 h-28 Z M28 66 h44 l-4 -34 h-36 Z M50 22 c8 8 10 16 4 24 c-6 -4 -8 -12 -4 -24 Z"/>',
  drake: '<path d="M14 66 Q34 26 52 40 Q66 20 88 30 Q70 44 66 58 Q78 62 84 74 L16 74 Q10 70 14 66 Z M40 74 l6 -12 6 12 Z"/>',
  wildfire: '<path d="M50 8 C62 22 74 30 74 48 a24 24 0 1 1 -48 0 C26 34 34 28 38 18 c4 8 8 10 12 8 C48 18 48 12 50 8 Z"/>',
  phoenix: '<path d="M50 10 C58 26 74 30 82 44 C74 42 66 44 62 52 C70 54 74 60 74 68 L26 68 C26 60 30 54 38 52 C34 44 26 42 18 44 C26 30 42 26 50 10 Z M44 74 h12 l-3 12 h-6 Z"/>',
  sprite: '<circle cx="50" cy="42" r="16"/><path d="M50 58 C40 70 34 80 30 92 L70 92 C66 80 60 70 50 58 Z M38 38 a6 6 0 1 0 0.1 0 M62 38 a6 6 0 1 0 0.1 0"/>',
  riptide: '<path d="M12 40 Q30 24 50 40 T88 40 Q70 56 50 40 T12 40 Z M12 62 Q30 46 50 62 T88 62 Q70 78 50 62 T12 62 Z"/>',
  warden: '<path d="M50 10 L64 30 L58 34 L64 44 L50 38 L36 44 L42 34 L36 30 Z M42 44 h16 v40 h-16 Z M34 84 h32 v8 h-32 Z"/>',
  deepcaller: '<path d="M50 14 a20 20 0 1 0 0.1 0 M50 34 C42 44 40 56 44 66 L56 66 C60 56 58 44 50 34 Z M30 74 Q50 62 70 74 L70 88 L30 88 Z"/>',
  flood: '<path d="M50 12 C64 30 78 42 78 60 a28 28 0 1 1 -56 0 C22 42 36 30 50 12 Z"/>',
  leviathan: '<path d="M10 58 Q30 30 52 44 Q70 30 90 46 Q76 52 72 62 Q84 66 88 76 L14 76 Q8 68 10 58 Z M36 76 l5 -10 5 10 Z M58 76 l5 -10 5 10 Z"/>',
  sprout: '<path d="M50 88 V46 M50 56 C50 42 40 34 28 34 C30 48 38 56 50 56 Z M50 48 C50 34 60 26 72 26 C70 40 62 48 50 48 Z"/>',
  bramble: '<circle cx="38" cy="46" r="14"/><circle cx="62" cy="46" r="14"/><circle cx="50" cy="64" r="14"/><path d="M50 78 v12 M44 90 h12"/>',
  grove: '<path d="M50 8 L78 40 H64 L84 66 H16 L36 40 H22 Z M46 66 h8 v22 h-8 Z"/>',
  whip: '<path d="M22 22 Q60 40 78 78 M78 78 l-12 -2 M78 78 l-2 -12" fill="none" stroke-width="7" stroke-linecap="round"/>',
  treant: '<path d="M50 6 C66 14 74 28 72 44 C80 44 86 50 86 58 C86 66 80 70 74 70 L72 88 L64 88 L64 72 L58 72 L58 88 L42 88 L42 72 L36 72 L36 88 L28 88 L28 70 C22 70 14 66 14 58 C14 50 20 44 28 44 C26 28 34 14 50 6 Z"/>',
  bloom: '<circle cx="50" cy="38" r="12"/><circle cx="50" cy="38" r="24" fill="none" stroke-width="5"/><path d="M50 62 v26 M50 74 C42 70 34 72 30 78 M50 74 C58 70 66 72 70 78"/>',
  wisp: '<path d="M50 14 C66 28 72 44 66 58 C60 72 40 72 34 58 C28 44 34 28 50 14 Z M46 40 a5 5 0 1 0 0.1 0 M60 46 a4 4 0 1 0 0.1 0"/>',
  stalker: '<path d="M50 10 L58 34 L82 34 L62 50 L70 76 L50 60 L30 76 L38 50 L18 34 L42 34 Z"/>',
  veil: '<path d="M62 12 a40 40 0 1 0 0 76 a32 32 0 1 1 0 -76 Z"/>',
  keeper: '<rect x="30" y="26" width="40" height="58" rx="4"/><path d="M38 44 h24 M38 56 h24 M38 68 h14"/>',
  nightmare: '<path d="M50 12 L60 38 L88 40 L66 56 L74 84 L50 68 L26 84 L34 56 L12 40 L40 38 Z M50 46 a6 6 0 1 0 0.1 0"/>',
  dragon: '<path d="M12 70 Q26 30 50 34 Q58 18 78 22 Q64 34 66 48 Q80 50 86 62 L88 76 L12 76 Q8 72 12 70 Z M40 76 l6 -14 6 14 Z M60 76 l6 -14 6 14 Z"/>',
};

/**
 * The card list. cost is mana; attack/health are for creatures; `text` is the
 * rules line shown on the card; `onPlay` names the play effect the state engine
 * runs (draw, mana, rally, damage, heal, veil), `target` says what it needs.
 */
export const CARDS = [
  { id: 'cinder-imp', name: 'Cinder Imp', faction: 'ember', type: 'creature', cost: 1, attack: 2, health: 1, swift: true, motif: 'imp', text: 'Swift. A spark with somewhere to be.' },
  { id: 'flame-lash', name: 'Flame Lash', faction: 'ember', type: 'spell', cost: 2, motif: 'lash', text: 'Deal 3 damage to any target.', target: 'any', onPlay: { kind: 'damage', amount: 3 } },
  { id: 'brazier-guard', name: 'Brazier Guard', faction: 'ember', type: 'creature', cost: 2, attack: 1, health: 4, guard: true, motif: 'brazier', text: 'Guard. It stands where the fire is hottest.' },
  { id: 'pyre-drake', name: 'Pyre Drake', faction: 'ember', type: 'creature', cost: 4, attack: 4, health: 3, motif: 'drake', text: 'It nests in the chimney of the court.' },
  { id: 'wildfire', name: 'Wildfire', faction: 'ember', type: 'spell', cost: 3, motif: 'wildfire', text: 'Deal 2 damage to all enemy creatures.', onPlay: { kind: 'damageAllEnemyCreatures', amount: 2 } },
  { id: 'phoenix-ember', name: 'Phoenix Ember', faction: 'ember', type: 'creature', cost: 5, attack: 5, health: 4, motif: 'phoenix', text: 'On play: deal 2 damage to the enemy lantern.', onPlay: { kind: 'damageHero', amount: 2 } },
  { id: 'tidepool-sprite', name: 'Tidepool Sprite', faction: 'tide', type: 'creature', cost: 1, attack: 1, health: 2, motif: 'sprite', text: 'On play: draw a card.', onPlay: { kind: 'draw', amount: 1 } },
  { id: 'riptide', name: 'Riptide', faction: 'tide', type: 'spell', cost: 2, motif: 'riptide', text: 'Deal 2 damage to a creature. Draw a card.', target: 'creature', onPlay: { kind: 'damageDraw', amount: 2 } },
  { id: 'coral-warden', name: 'Coral Warden', faction: 'tide', type: 'creature', cost: 3, attack: 2, health: 5, guard: true, motif: 'warden', text: 'Guard. The reef does not hurry.' },
  { id: 'deepcaller', name: 'Deepcaller', faction: 'tide', type: 'creature', cost: 4, attack: 3, health: 4, motif: 'deepcaller', text: 'On play: draw a card.', onPlay: { kind: 'draw', amount: 1 } },
  { id: 'floodtide', name: 'Floodtide', faction: 'tide', type: 'spell', cost: 3, motif: 'flood', text: 'Restore 6 flame to your lantern.', onPlay: { kind: 'heal', amount: 6 } },
  { id: 'leviathan', name: 'Leviathan', faction: 'tide', type: 'creature', cost: 6, attack: 7, health: 7, motif: 'leviathan', text: 'The tide, given teeth.' },
  { id: 'thorn-sprout', name: 'Thorn Sprout', faction: 'thorn', type: 'creature', cost: 1, attack: 1, health: 1, motif: 'sprout', text: 'On play: gain 1 mana this turn.', onPlay: { kind: 'mana', amount: 1 } },
  { id: 'bramblekin', name: 'Bramblekin', faction: 'thorn', type: 'creature', cost: 2, attack: 2, health: 3, motif: 'bramble', text: 'Small, thorny, everywhere at once.' },
  { id: 'grove-guardian', name: 'Grove Guardian', faction: 'thorn', type: 'creature', cost: 3, attack: 2, health: 6, guard: true, motif: 'grove', text: 'Guard. Older than the court itself.' },
  { id: 'thornwhip', name: 'Thornwhip', faction: 'thorn', type: 'spell', cost: 2, motif: 'whip', text: 'Deal 3 damage to a creature.', target: 'creature', onPlay: { kind: 'damage', amount: 3 } },
  { id: 'elder-treant', name: 'Elder Treant', faction: 'thorn', type: 'creature', cost: 5, attack: 4, health: 7, motif: 'treant', text: 'On play: friendly creatures gain +1 attack this turn.', onPlay: { kind: 'rally', amount: 1 } },
  { id: 'blooming', name: 'Blooming', faction: 'thorn', type: 'spell', cost: 2, motif: 'bloom', text: 'Draw 2 cards.', onPlay: { kind: 'draw', amount: 2 } },
  { id: 'gloom-wisp', name: 'Gloom Wisp', faction: 'gloom', type: 'creature', cost: 1, attack: 2, health: 1, motif: 'wisp', text: 'It hums the tune the dark forgot.' },
  { id: 'shade-stalker', name: 'Shade Stalker', faction: 'gloom', type: 'creature', cost: 2, attack: 3, health: 2, swift: true, motif: 'stalker', text: 'Swift. Seen only after it strikes.' },
  { id: 'gloomveil', name: 'Gloomveil', faction: 'gloom', type: 'spell', cost: 2, motif: 'veil', text: 'Enemy creatures lose 2 attack until end of turn.', onPlay: { kind: 'veil', amount: 2 } },
  { id: 'crypt-keeper', name: 'Crypt Keeper', faction: 'gloom', type: 'creature', cost: 3, attack: 2, health: 4, motif: 'keeper', text: 'On play: deal 1 damage to all enemy creatures.', onPlay: { kind: 'damageAllEnemyCreatures', amount: 1 } },
  { id: 'nightmare', name: 'Nightmare', faction: 'gloom', type: 'spell', cost: 4, motif: 'nightmare', text: 'Deal 4 damage to the enemy lantern.', onPlay: { kind: 'damageHero', amount: 4 } },
  { id: 'umbral-dragon', name: 'Umbral Dragon', faction: 'gloom', type: 'creature', cost: 6, attack: 6, health: 6, motif: 'dragon', text: 'It wears the night like a cloak.' },
];

export const CARD_BY_ID = new Map(CARDS.map((card) => [card.id, card]));

/** The art panel's inner SVG for a card: its motif in the faction's glow colour. */
export function motifSvg(card, color) {
  const inner = MOTIFS[card.motif] ?? MOTIFS.imp;
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="${color}" stroke="none">${inner}</g></svg>`;
}
