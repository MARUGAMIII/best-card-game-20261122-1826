// Emberhold — boot and the one loop: input is read every frame, the world
// advances through the player's clicks and the Warden's planned steps, and the
// renderer paints what is there. The game moves between five screens: title,
// play, paused, win and loss.
//
// ?seed=N fixes the deal. ?shot=title|play|win|loss (with &seed=N) stages that
// scene instead of running the loop, paints it once and sets window.__shotReady
// for a screenshot.
import { AI_STEP_MS, RECORD_KEY } from './config.js';
import { CARD_BY_ID } from './cards.js';
import {
  attackTargets,
  canPlayCard,
  cardCost,
  cardTargets,
  createGame,
  endTurn,
  gameSummary,
  playCard,
  attack as stateAttack,
} from './state.js';
import { executeStep, planTurn } from './ai.js';
import { createRenderer, SCREEN_LOSS, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const root = document.getElementById('stage');
const status = document.getElementById('status');
const audio = createAudio();
const input = createInput(root);

/** The table is a fixed 1280x720; scale it to the window. */
function fitStage() {
  const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
  root.style.transform = `translate(-50%, -50%) scale(${scale})`;
}
window.addEventListener('resize', fitStage);
fitStage();

function readRecord() {
  try {
    return JSON.parse(window.localStorage.getItem(RECORD_KEY) ?? '{}') || {};
  } catch {
    return {};
  }
}

function saveRecord(record) {
  try {
    window.localStorage.setItem(RECORD_KEY, JSON.stringify(record));
  } catch {
    // Storage can be off (private windows): the record then lasts this visit only.
  }
}

const record = {
  wins: readRecord().wins ?? 0,
  losses: readRecord().losses ?? 0,
  bestTurns: readRecord().bestTurns ?? 0,
};

function freshUi() {
  return {
    screen: SCREEN_TITLE,
    selectedHand: -1,
    selectedAttacker: null,
    targeting: false,
    targetableUids: new Set(),
    playableIndexes: new Set(),
    costs: [],
    banner: '',
    bannerTone: '',
    thinking: false,
    events: [],
    record,
    enteringHand: -1,
    lungingUid: null,
    damagedUids: new Set(),
  };
}

let state = createGame(seed);
let ui = freshUi();
state.summary = gameSummary(state);

function announce(message) {
  status.textContent = message;
}

function refreshPlayable() {
  ui.playableIndexes = new Set();
  ui.costs = [];
  if (state.active !== 'you' || state.over || ui.screen !== SCREEN_PLAY) return;
  state.you.hand.forEach((cardId, index) => {
    const card = CARD_BY_ID.get(cardId);
    ui.costs[index] = cardCost(state, card);
    if (canPlayCard(state, 'you', index)) ui.playableIndexes.add(index);
  });
}

function clearSelection() {
  ui.selectedHand = -1;
  ui.selectedAttacker = null;
  ui.targeting = false;
  ui.targetableUids = new Set();
}

function soundsFor(events) {
  for (const event of events) {
    if (event.kind === 'played' || event.kind === 'summon' || event.kind === 'spell') audio.playCard();
    else if (event.kind === 'attack') audio.attack();
    else if (event.kind === 'heroDamage') audio.damage();
    else if (event.kind === 'heal') audio.heal();
    else if (event.kind === 'draw') audio.draw();
    else if (event.kind === 'over' && event.result === 'win') audio.win();
    else if (event.kind === 'over' && event.result === 'loss') audio.lose();
  }
}

function afterEvents(events) {
  ui.events = events;
  soundsFor(events);
  const attackEvent = events.find((event) => event.kind === 'attack');
  if (attackEvent) {
    ui.lungingUid = attackEvent.uid;
    ui.damagedUids = new Set();
    if (attackEvent.target.kind === 'creature') ui.damagedUids.add(attackEvent.target.uid);
    setTimeout(() => {
      ui.lungingUid = null;
      ui.damagedUids = new Set();
      paint();
    }, 450);
  }
  if (state.over) {
    state.summary = gameSummary(state);
    if (state.over === 'win') {
      record.wins += 1;
      if (!record.bestTurns || state.turn < record.bestTurns) record.bestTurns = state.turn;
    } else {
      record.losses += 1;
    }
    saveRecord(record);
    ui.screen = state.over === 'win' ? SCREEN_WIN : SCREEN_LOSS;
    ui.banner = '';
    announce(state.over === 'win' ? 'You win. The lantern is yours.' : 'You lose. Your flame gutters out.');
  }
  refreshPlayable();
  paint();
}

function paint() {
  renderer.draw(state, ui);
}

function startGame() {
  audio.unlock();
  state = createGame(Math.floor(Math.random() * 4294967296));
  ui = freshUi();
  ui.screen = SCREEN_PLAY;
  state.summary = gameSummary(state);
  ui.banner = 'Your turn — play a card, or end the turn.';
  announce('Playing. Your turn.');
  refreshPlayable();
  paint();
}

function tryPlayCard(handIndex) {
  if (!canPlayCard(state, 'you', handIndex)) return;
  const targets = cardTargets(state, 'you', handIndex);
  if (targets.length > 0) {
    ui.selectedHand = handIndex;
    ui.targeting = true;
    ui.targetableUids = new Set(targets.filter((t) => t.kind === 'creature').map((t) => t.uid));
    ui.banner = 'Choose a target.';
    ui.bannerTone = 'target';
    paint();
    return;
  }
  const events = playCard(state, 'you', handIndex, null);
  clearSelection();
  afterEvents(events);
}

function resolveTarget(target) {
  if (ui.selectedHand >= 0) {
    const events = playCard(state, 'you', ui.selectedHand, target);
    clearSelection();
    afterEvents(events);
    return;
  }
  if (ui.selectedAttacker !== null) {
    const events = stateAttack(state, 'you', ui.selectedAttacker, target);
    clearSelection();
    afterEvents(events);
  }
}

function tryAttack(attackerUid) {
  const targets = attackTargets(state, 'you', attackerUid);
  if (targets.length === 0) return;
  ui.selectedAttacker = attackerUid;
  ui.targeting = true;
  ui.targetableUids = new Set(targets.filter((t) => t.kind === 'creature').map((t) => t.uid));
  ui.banner = 'Choose what to strike — a Guard must fall first.';
  ui.bannerTone = 'target';
  paint();
}

function runFoeTurn() {
  ui.thinking = true;
  ui.banner = 'The Hollow Warden thinks…';
  ui.bannerTone = '';
  paint();
  const steps = planTurn(state, 'foe', 1.0, state.random);
  let index = 0;
  function nextStep() {
    if (index >= steps.length || state.over) {
      ui.thinking = false;
      if (!state.over) {
        ui.banner = 'Your turn — play a card, or end the turn.';
        announce('Your turn.');
      }
      refreshPlayable();
      paint();
      return;
    }
    const step = steps[index];
    index += 1;
    const events = executeStep(state, step);
    afterEvents(events);
    setTimeout(nextStep, AI_STEP_MS);
  }
  setTimeout(nextStep, AI_STEP_MS);
}

function endPlayerTurn() {
  if (state.active !== 'you' || state.over || ui.thinking) return;
  clearSelection();
  const events = endTurn(state);
  afterEvents(events);
  if (!state.over) runFoeTurn();
}

const renderer = createRenderer(root, {
  onHandClick(handIndex) {
    if (state.active !== 'you' || state.over || ui.thinking || ui.screen !== SCREEN_PLAY) return;
    audio.unlock();
    if (ui.selectedHand === handIndex) {
      clearSelection();
      paint();
      return;
    }
    if (ui.selectedAttacker !== null) clearSelection();
    tryPlayCard(handIndex);
  },
  onBoardClick(side, uid) {
    if (state.active !== 'you' || state.over || ui.thinking || ui.screen !== SCREEN_PLAY) return;
    audio.unlock();
    if (ui.targeting) {
      if (ui.targetableUids.has(uid)) {
        resolveTarget({ kind: 'creature', uid });
        return;
      }
      clearSelection();
      paint();
      return;
    }
    if (side === 'you') {
      if (ui.selectedAttacker === uid) {
        clearSelection();
        paint();
        return;
      }
      tryAttack(uid);
    }
  },
  onEndTurn() {
    audio.unlock();
    endPlayerTurn();
  },
  onConfirm() {
    audio.unlock();
    if (ui.screen === SCREEN_TITLE || ui.screen === SCREEN_WIN || ui.screen === SCREEN_LOSS) startGame();
    else if (ui.screen === SCREEN_PAUSED) {
      ui.screen = SCREEN_PLAY;
      paint();
    }
  },
});

// The heroes are also targets: clicking the Warden's lantern strikes it when
// an attacker or a damage spell is waiting for a target.
root.addEventListener('click', (event) => {
  const hero = event.target.closest('.hero');
  if (!hero || !ui.targeting) return;
  if (hero.classList.contains('foe')) resolveTarget({ kind: 'hero', side: 'foe' });
});

function runShot(name) {
  const scene = stageShot(name, seed);
  state = scene.state;
  state.summary = scene.summary;
  ui = freshUi();
  ui.screen = scene.screen;
  ui.banner = '';
  refreshPlayable();
  paint();
  window.__shotReady = true;
}

function runGame() {
  ui.screen = SCREEN_TITLE;
  ui.banner = '';
  refreshPlayable();
  paint();
  announce('Emberhold. Press Space or click to start.');

  function frame() {
    requestAnimationFrame(frame);
    const actions = input.takeActions();
    const pick = input.takeHandPick();
    if (actions & ACTION_PAUSE) {
      if (ui.screen === SCREEN_PLAY) {
        ui.screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (ui.screen === SCREEN_PAUSED) {
        ui.screen = SCREEN_PLAY;
        announce('Playing.');
      }
      paint();
    }
    if (actions & ACTION_CONFIRM) {
      if (ui.screen === SCREEN_TITLE || ui.screen === SCREEN_WIN || ui.screen === SCREEN_LOSS) startGame();
      else if (ui.screen === SCREEN_PAUSED) {
        ui.screen = SCREEN_PLAY;
        paint();
      } else if (ui.selectedHand >= 0 && !cardTargets(state, 'you', ui.selectedHand).length) {
        tryPlayCard(ui.selectedHand);
      } else if (ui.screen === SCREEN_PLAY && !ui.thinking && ui.selectedHand < 0 && ui.selectedAttacker === null) {
        endPlayerTurn();
      }
    }
    if (pick >= 0 && ui.screen === SCREEN_PLAY && state.active === 'you' && !state.over && !ui.thinking) {
      if (pick < state.you.hand.length) tryPlayCard(pick);
    }
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
