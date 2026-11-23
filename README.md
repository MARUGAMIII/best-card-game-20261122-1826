# best-card-game-20261122-1826

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/MARUGAMIII/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/MARUGAMIII/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

EMBERHOLD — Duel of the Lantern Court. A complete, original card game that plays offline in a desktop browser. You are the Keeper of the Lantern, duelling the Hollow Warden across a felt table for the last light of the court. Entered on [make.fun](https://make.fun/bounty/best-card-game-20261122-1826).

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

A complete, original card game that plays offline in a desktop browser. You are
the Keeper of the Lantern, duelling the Hollow Warden across a felt table for
the last light of the court.

## How to play

Serve the game and open it in a desktop browser:

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request: `game/index.html` and its ES modules are all
there is.

- **Goal:** reduce the Warden's lantern from 35 flame to 0 before yours goes out.
  The Warden moves second, so it opens with an extra card and a bonus mana on
  its first turn.
- **Mana:** grows by 1 each turn, up to 10, and refills every turn.
- **Cards:** 24 original cards in four factions — **Ember** (fire), **Tide**
  (water), **Thorn** (nature), **Gloom** (shadow). Creatures stay on the board
  with attack and health; spells resolve and are gone.
- **Resonance:** a card costs 1 less when it shares a faction with the last card
  you played this turn — chain a faction to play more.
- **Guard** creatures must be attacked first. **Swift** creatures can attack the
  turn they are played. Other creatures wait a turn.
- **Draw 2** cards at the start of your turn. An empty deck burns 2 flame each
  time you would draw (fatigue).
- **Mouse:** click a card to play it, click a creature then its target to
  attack, click End Turn. **Keyboard:** 1–7 pick a hand card, Space/Enter
  confirms or ends the turn, Esc pauses.

The Warden plays out loud: it weighs its cards, highlights what it plays, and
attacks where the trade is good — read its board and answer it.

## Files

- `game/index.html`, `game/style.css` — the table and its look.
- `game/src/config.js` — tuning numbers, factions, palette.
- `game/src/cards.js` — the 24 cards and their art motifs.
- `game/src/deck.js` — the seeded random source and the deck.
- `game/src/state.js` — turns, playing cards, combat, Resonance.
- `game/src/ai.js` — the Warden's brain and the screenshot autopilot.
- `game/src/render.js` — DOM cards, boards, heroes, screens, animation.
- `game/src/input.js` — keyboard and mouse.
- `game/src/audio.js` — synthesized WebAudio sounds (no audio files).
- `game/src/shots.js` — the `?shot=` scenes for the screenshots.
- `game/src/main.js` — boot and the game loop.
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json` with the vendored library.
- `screenshots/` — 4 real renders of the game: title, play, win, loss.

## Screenshots

Taken with headless Chromium from the game's own `?shot=` scenes
(`shots.json`): `1-title.jpg`, `2-play.jpg`, `3-win.jpg`, `4-loss.jpg`.

## License

MIT — see `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/bounty/best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>
