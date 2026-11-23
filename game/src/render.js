// Emberhold — the table: DOM cards, boards, heroes and screens. The renderer
// paints a state; it never changes one. Cards slide, flip and snap with CSS
// transitions, damage floats up, the table shakes when a lantern is hit, and a
// win lands with falling embers.
import { FACTIONS, PALETTE } from './config.js';
import { CARD_BY_ID, motifSvg } from './cards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSS = 'loss';

const LANTERN_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 C14 5 17 7 17 11 a5 5 0 1 1 -10 0 C7 7 10 5 12 2 Z" fill="#ff7a3c"/><path d="M12 9 C13 10.5 14 11.5 14 13 a2 2 0 1 1 -4 0 C10 11.5 11 10.5 12 9 Z" fill="#ffd27a"/></svg>';
const MANA_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 L20 12 L12 22 L4 12 Z" fill="#57b8e8"/></svg>';

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function keywordBadges(card) {
  const badges = [];
  if (card.guard) badges.push('Guard');
  if (card.swift) badges.push('Swift');
  return badges;
}

/** One card face: cost gem, name, art, text, attack/health. */
export function cardElement(card, options = {}) {
  const faction = FACTIONS[card.faction];
  const node = el('div', `card faction-${card.faction}`);
  if (options.small) node.classList.add('small');
  if (options.playable) node.classList.add('playable');
  if (options.selected) node.classList.add('selected');
  if (options.targetable) node.classList.add('targetable');
  if (options.entering) node.classList.add('entering');
  if (options.lunging) node.classList.add('lunging');
  if (options.damaged) node.classList.add('damaged');
  if (options.disabled) node.classList.add('disabled');
  if (options.lunge) node.style.setProperty('--lunge', options.lunge);
  node.dataset.cardId = card.id;
  if (options.uid !== undefined) node.dataset.uid = String(options.uid);

  const cost = el('div', 'cost', String(options.cost ?? card.cost));
  const name = el('div', 'card-name', card.name);
  const art = el('div', 'art');
  art.style.background = `radial-gradient(circle at 50% 35%, ${faction.glow}33, ${faction.deep} 78%)`;
  art.innerHTML = motifSvg(card, faction.glow);
  const badges = keywordBadges(card);
  const text = el('div', 'card-text', card.text + (badges.length ? ` <span class="kw">${badges.join(' · ')}</span>` : ''));
  node.append(cost, name, art, text);
  if (card.type === 'creature') {
    node.append(el('div', 'attack', String(options.attack ?? card.attack)));
    node.append(el('div', 'health', String(options.health ?? card.health)));
  } else {
    node.append(el('div', 'spell-tag', 'SPELL'));
  }
  return node;
}

/** A face-down card back: the lantern emblem on felt. */
export function cardBackElement() {
  const node = el('div', 'card back');
  node.innerHTML = `<div class="back-emblem">${LANTERN_SVG}</div>`;
  return node;
}

function heroElement(side, state, label) {
  const player = state[side];
  const node = el('div', `hero ${side}`);
  const low = player.life <= 10;
  node.innerHTML = `
    <div class="hero-portrait">${LANTERN_SVG}</div>
    <div class="hero-info">
      <div class="hero-name">${label}</div>
      <div class="hero-life ${low ? 'low' : ''}"><span class="flame">${LANTERN_SVG}</span> ${Math.max(0, player.life)} <span class="hero-life-label">flame</span></div>
    </div>
    <div class="hero-mana" title="Mana">${MANA_SVG}<span>${player.mana}/${player.maxMana}</span></div>`;
  return node;
}

function manaPips(player) {
  const pips = el('div', 'mana-pips');
  for (let index = 0; index < 10; index += 1) {
    pips.append(el('span', `pip${index < player.mana ? ' full' : ''}${index < player.maxMana ? '' : ' empty'}`));
  }
  return pips;
}

export function createRenderer(root, callbacks) {
  const table = el('div', 'table');
  const foeRow = el('div', 'row foe-row');
  const foeBoard = el('div', 'board foe-board');
  const midRow = el('div', 'mid-row');
  const banner = el('div', 'banner');
  const logLine = el('div', 'log-line');
  const youBoard = el('div', 'board you-board');
  const youRow = el('div', 'row you-row');
  const endTurnButton = el('button', 'end-turn', 'End Turn ⏎');
  const floaters = el('div', 'floaters');
  midRow.append(banner, logLine);
  table.append(foeRow, foeBoard, midRow, youBoard, youRow, floaters);
  root.append(table);

  const titleScreen = el('div', 'overlay title-screen');
  const winScreen = el('div', 'overlay end-screen win-screen');
  const lossScreen = el('div', 'overlay end-screen loss-screen');
  const pauseScreen = el('div', 'overlay pause-screen');
  root.append(titleScreen, winScreen, lossScreen, pauseScreen);

  let lastStateKey = '';

  function renderHeroes(state) {
    foeRow.replaceChildren();
    foeRow.append(heroElement('foe', state, 'The Hollow Warden'));
    const foeHand = el('div', 'hand backs');
    for (let index = 0; index < state.foe.hand.length; index += 1) foeHand.append(cardBackElement());
    foeRow.append(foeHand);
    foeRow.append(el('div', 'deck-count', `Deck ${state.foe.deck.length}`));

    youRow.replaceChildren();
    youRow.append(heroElement('you', state, 'You, Keeper of the Lantern'));
    const hand = el('div', 'hand you-hand');
    youRow.append(hand);
    const controls = el('div', 'controls');
    controls.append(manaPips(state.you));
    controls.append(el('div', 'deck-count', `Deck ${state.you.deck.length}`));
    controls.append(endTurnButton);
    youRow.append(controls);
  }

  function renderBoards(state, ui) {
    foeBoard.replaceChildren();
    for (const creature of state.foe.board) {
      const card = CARD_BY_ID.get(creature.cardId);
      const node = cardElement(card, {
        small: true,
        uid: creature.uid,
        attack: creature.attack + creature.tempAttack,
        health: creature.health,
        targetable: ui.targetableUids.has(creature.uid),
        lunging: ui.lungingUid === creature.uid,
        lunge: '26px',
        damaged: ui.damagedUids.has(creature.uid),
      });
      node.addEventListener('click', () => callbacks.onBoardClick('foe', creature.uid));
      foeBoard.append(node);
    }
    for (let index = state.foe.board.length; index < 5; index += 1) foeBoard.append(el('div', 'slot empty'));

    youBoard.replaceChildren();
    for (const creature of state.you.board) {
      const card = CARD_BY_ID.get(creature.cardId);
      const node = cardElement(card, {
        small: true,
        uid: creature.uid,
        attack: creature.attack + creature.tempAttack,
        health: creature.health,
        targetable: ui.targetableUids.has(creature.uid),
        lunging: ui.lungingUid === creature.uid,
        lunge: '-26px',
        damaged: ui.damagedUids.has(creature.uid),
      });
      node.addEventListener('click', () => callbacks.onBoardClick('you', creature.uid));
      youBoard.append(node);
    }
    for (let index = state.you.board.length; index < 5; index += 1) youBoard.append(el('div', 'slot empty'));
  }

  function renderHand(state, ui) {
    const hand = table.querySelector('.you-hand');
    if (!hand) return;
    hand.replaceChildren();
    const active = state.active === 'you' && !state.over && ui.screen === SCREEN_PLAY;
    state.you.hand.forEach((cardId, index) => {
      const card = CARD_BY_ID.get(cardId);
      const cost = ui.costs?.[index] ?? card.cost;
      const node = cardElement(card, {
        cost,
        playable: active && ui.playableIndexes.has(index),
        selected: ui.selectedHand === index,
        entering: ui.enteringHand === index,
      });
      node.style.setProperty('--fan', String(index - (state.you.hand.length - 1) / 2));
      node.addEventListener('click', () => callbacks.onHandClick(index));
      hand.append(node);
    });
  }

  function showFloaters(events) {
    for (const event of events) {
      if (event.kind === 'heroDamage') {
        const target = event.side === 'you' ? table.querySelector('.hero.you') : table.querySelector('.hero.foe');
        if (target) {
          const floater = el('div', 'floater damage', `−${event.amount}`);
          target.append(floater);
          setTimeout(() => floater.remove(), 1100);
        }
        table.classList.remove('shake');
        void table.offsetWidth;
        table.classList.add('shake');
      } else if (event.kind === 'heal') {
        const target = event.side === 'you' ? table.querySelector('.hero.you') : table.querySelector('.hero.foe');
        if (target) {
          const floater = el('div', 'floater heal', `+${event.amount}`);
          target.append(floater);
          setTimeout(() => floater.remove(), 1100);
        }
      }
    }
  }

  function renderTitle(state, record) {
    titleScreen.innerHTML = `
      <div class="title-inner">
        <div class="title-lantern">${LANTERN_SVG}</div>
        <h1>EMBERHOLD</h1>
        <p class="subtitle">Duel of the Lantern Court</p>
        <div class="title-cards">
          ${['pyre-drake', 'leviathan', 'elder-treant', 'umbral-dragon'].map((id) => cardElement(CARD_BY_ID.get(id), { small: true }).outerHTML).join('')}
        </div>
        <p class="title-play">Click or press Space to play</p>
        <div class="howto">
          <div><b>Play cards</b> with mana — it grows each turn.</div>
          <div><b>Resonance:</b> a card costs 1 less when it shares a faction with the last card you played.</div>
          <div><b>Guard</b> must be attacked first. Reduce the Warden's lantern to 0 flame to win.</div>
        </div>
        <p class="record">Record: ${record.wins} wins — ${record.losses} losses · Best: ${record.bestTurns ? `${record.bestTurns} turns` : '—'}</p>
      </div>`;
  }

  function renderEnd(screen, state, record) {
    const isWin = screen === SCREEN_WIN;
    const node = isWin ? winScreen : lossScreen;
    const summary = state.summary;
    node.innerHTML = `
      <div class="end-inner">
        <h1>${isWin ? 'THE LANTERN IS YOURS' : 'YOUR FLAME GUTTERS OUT'}</h1>
        <p class="end-sub">${isWin ? 'The Hollow Warden bows, and the court is lit again.' : 'The Warden keeps the last light. The court goes dark.'}</p>
        <div class="end-stats">
          <div><span>${summary.turns}</span> turns</div>
          <div><span>${summary.cardsPlayed}</span> cards played</div>
          <div><span>${summary.yourLife} — ${summary.foeLife}</span> flame left</div>
        </div>
        <p class="end-play">Click or press Space to play again</p>
        <p class="record">Record: ${record.wins} wins — ${record.losses} losses</p>
      </div>`;
    if (isWin) {
      for (let index = 0; index < 36; index += 1) {
        const ember = el('span', 'ember');
        ember.style.left = `${(index * 37) % 100}%`;
        ember.style.animationDelay = `${(index % 12) * 0.18}s`;
        ember.style.setProperty('--drift', `${((index * 53) % 120) - 60}px`);
        node.append(ember);
      }
    }
  }

  function renderPause() {
    pauseScreen.innerHTML = `<div class="pause-inner"><h1>PAUSED</h1><p>Press Esc or click to continue</p></div>`;
  }

  function draw(state, ui) {
    // The key covers the game state AND the interface state (selection,
    // targeting, animations): a click that changes only the interface must
    // still repaint the cards it affects.
    const key = JSON.stringify([
      state.turn, state.active, state.you.life, state.foe.life, state.you.hand, state.foe.hand.length,
      state.you.board, state.foe.board, state.you.mana, state.over,
      ui.selectedHand, ui.selectedAttacker, [...ui.targetableUids], [...ui.playableIndexes],
      ui.costs, ui.lungingUid, [...ui.damagedUids], ui.enteringHand,
    ]);
    if (key !== lastStateKey) {
      lastStateKey = key;
      renderHeroes(state);
      renderBoards(state, ui);
      renderHand(state, ui);
    }
    banner.textContent = ui.banner ?? '';
    banner.className = `banner${ui.bannerTone ? ` ${ui.bannerTone}` : ''}`;
    logLine.textContent = state.log[state.log.length - 1] ?? '';
    endTurnButton.disabled = !(state.active === 'you' && !state.over && ui.screen === SCREEN_PLAY);
    endTurnButton.classList.toggle('thinking', Boolean(ui.thinking));
    endTurnButton.textContent = ui.thinking ? 'The Warden thinks…' : 'End Turn ⏎';
    titleScreen.classList.toggle('show', ui.screen === SCREEN_TITLE);
    winScreen.classList.toggle('show', ui.screen === SCREEN_WIN);
    lossScreen.classList.toggle('show', ui.screen === SCREEN_LOSS);
    pauseScreen.classList.toggle('show', ui.screen === SCREEN_PAUSED);
    if (ui.screen === SCREEN_TITLE) renderTitle(state, ui.record);
    if (ui.screen === SCREEN_WIN || ui.screen === SCREEN_LOSS) renderEnd(ui.screen, state, ui.record);
    if (ui.screen === SCREEN_PAUSED) renderPause();
    const shownEvents = ui.events;
    ui.events = null;
    if (shownEvents) showFloaters(shownEvents);
    table.classList.toggle('targeting', ui.targeting);
  }

  endTurnButton.addEventListener('click', () => callbacks.onEndTurn());
  titleScreen.addEventListener('click', () => callbacks.onConfirm());
  winScreen.addEventListener('click', () => callbacks.onConfirm());
  lossScreen.addEventListener('click', () => callbacks.onConfirm());
  pauseScreen.addEventListener('click', () => callbacks.onConfirm());

  return { draw, root, table };
}
