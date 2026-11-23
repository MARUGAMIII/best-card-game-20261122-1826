// Emberhold — every tuning number and colour in one place. The table is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below
// depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Starting flame (life) for each lantern. */
export const START_LIFE = 35;
/** Cards in the deck (one copy of each of the 24). */
export const DECK_SIZE = 24;
/** Cards drawn at the start of the game, and at the start of each turn. */
export const OPENING_HAND = 4;
/** The side that moves second opens with one extra card, to blunt the first move. */
export const SECOND_PLAYER_BONUS_CARDS = 1;
export const DRAW_PER_TURN = 2;
/** Largest hand; a drawn card past this burns. */
export const MAX_HAND = 7;
/** Largest board; a creature past this cannot be played. */
export const MAX_BOARD = 5;
/** Mana cap; mana each turn is the turn number, up to this. */
export const MAX_MANA = 10;
/** Damage taken when drawing from an empty deck. */
export const FATIGUE_DAMAGE = 2;
/** Resonance: a card sharing a faction with the last card played this turn costs this much less. */
export const RESONANCE_DISCOUNT = 1;

/** Milliseconds between the rival's actions, so its plays can be watched. */
export const AI_STEP_MS = 650;

export const FACTIONS = {
  ember: { name: 'Ember', color: '#e2574c', deep: '#8f241c', glow: '#ffb199', text: '#ffd9c9' },
  tide: { name: 'Tide', color: '#3d9bd6', deep: '#14486e', glow: '#a8d8f5', text: '#d3ecfb' },
  thorn: { name: 'Thorn', color: '#57a85a', deep: '#1f5c26', glow: '#b3e3ae', text: '#dcf2d8' },
  gloom: { name: 'Gloom', color: '#9a6fc0', deep: '#4a2d68', glow: '#d3b8ec', text: '#eadcf7' },
};

export const PALETTE = {
  table: '#1d2b1a',
  tableFelt: '#24401f',
  tableEdge: '#3a2f1d',
  panel: '#20242e',
  panelEdge: '#3a4152',
  text: '#f2ead8',
  muted: '#a9a58f',
  gold: '#e8b64c',
  mana: '#57b8e8',
  flame: '#ff7a3c',
  danger: '#e5534b',
  good: '#7fd08a',
};

export const FONT = 'Georgia, "Times New Roman", serif';
export const FONT_UI = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the win/loss record is kept between visits (this browser only). */
export const RECORD_KEY = 'emberhold.record';
