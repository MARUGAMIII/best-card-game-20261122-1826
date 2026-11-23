// Emberhold — keyboard and mouse, one place. Mouse clicks go through the
// renderer; this module reads keys: 1-7 pick a hand card, Space/Enter confirms
// or ends the turn, Esc pauses.
export const ACTION_CONFIRM = 1;
export const ACTION_END_TURN = 2;
export const ACTION_PAUSE = 4;

export function createInput(root) {
  let actions = 0;
  let handPick = -1;

  function onKeyDown(event) {
    if (event.repeat) return;
    if (event.key >= '1' && event.key <= '7') {
      handPick = Number.parseInt(event.key, 10) - 1;
      return;
    }
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      actions |= ACTION_CONFIRM;
    } else if (event.key === 'Escape') {
      actions |= ACTION_PAUSE;
    }
  }

  root.addEventListener('keydown', onKeyDown);
  root.setAttribute('tabindex', '0');

  return {
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeHandPick() {
      const pick = handPick;
      handPick = -1;
      return pick;
    },
  };
}
