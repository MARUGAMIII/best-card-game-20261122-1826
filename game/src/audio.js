// Emberhold — every sound is synthesized with WebAudio: no audio files, no
// network, nothing to load. The context starts on the first gesture, so the
// game stays silent until the player plays.
export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (muted) return null;
    try {
      if (!context) context = new (window.AudioContext ?? window.webkitAudioContext)();
      if (context.state === 'suspended') void context.resume();
      return context;
    } catch {
      muted = true;
      return null;
    }
  }

  function tone(frequency, duration, type, gainValue, when = 0, slideTo = null) {
    const audio = ensure();
    if (!audio) return;
    const start = audio.currentTime + when;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slideTo !== null) oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(gainValue, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  return {
    unlock() {
      ensure();
    },
    click() {
      tone(660, 0.06, 'sine', 0.08);
    },
    playCard() {
      tone(320, 0.12, 'triangle', 0.14, 0, 520);
      tone(880, 0.08, 'sine', 0.06, 0.05);
    },
    attack() {
      tone(180, 0.14, 'sawtooth', 0.12, 0, 90);
    },
    damage() {
      tone(140, 0.2, 'square', 0.1, 0, 60);
    },
    heal() {
      tone(520, 0.16, 'sine', 0.1, 0, 780);
      tone(780, 0.2, 'sine', 0.08, 0.1, 1040);
    },
    draw() {
      tone(980, 0.05, 'sine', 0.05);
    },
    turn() {
      tone(440, 0.1, 'triangle', 0.09);
      tone(587, 0.12, 'triangle', 0.09, 0.08);
    },
    win() {
      [523, 659, 784, 1047].forEach((frequency, index) => tone(frequency, 0.28, 'triangle', 0.12, index * 0.13));
    },
    lose() {
      [392, 330, 262, 196].forEach((frequency, index) => tone(frequency, 0.3, 'sine', 0.1, index * 0.16));
    },
  };
}
