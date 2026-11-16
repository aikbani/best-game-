// LAMPION's sound: small WebAudio synth chimes only — no audio files, no
// network. The context is created on the first user gesture; until then every
// call is a silent no-op.

export function createAudio() {
  const audio = {
    muted: false,
    context: null,
    master: null,
  };

  audio.ensure = function ensure() {
    if (audio.context) {
      if (audio.context.state === 'suspended') audio.context.resume();
      return;
    }
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      audio.context = new Context();
      audio.master = audio.context.createGain();
      audio.master.gain.value = 0.22;
      audio.master.connect(audio.context.destination);
    } catch {
      audio.context = null;
    }
  };

  function tone(frequency, startAt, duration, type, volume) {
    if (!audio.context || audio.muted) return;
    const oscillator = audio.context.createOscillator();
    const gain = audio.context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(volume, startAt + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(audio.master);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.05);
  }

  /** A pentatonic chime that climbs with the combo. */
  audio.wishChime = function wishChime(combo) {
    if (!audio.context || audio.muted) return;
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    const note = scale[Math.min(scale.length - 1, combo % scale.length)];
    const now = audio.context.currentTime;
    tone(note, now, 0.5, 'sine', 0.5);
    tone(note * 2, now, 0.3, 'triangle', 0.12);
  };

  /** A warm low thrum for feeding the flame. */
  audio.emberHum = function emberHum() {
    if (!audio.context || audio.muted) return;
    const now = audio.context.currentTime;
    tone(220, now, 0.35, 'triangle', 0.3);
    tone(330, now + 0.05, 0.3, 'sine', 0.2);
  };

  /** A dull thud and a falling note when the lantern is hurt. */
  audio.hurtThud = function hurtThud() {
    if (!audio.context || audio.muted) return;
    const now = audio.context.currentTime;
    tone(140, now, 0.3, 'sawtooth', 0.25);
    tone(98, now + 0.08, 0.4, 'sine', 0.35);
  };

  /** A soft whoosh for a gust burst. */
  audio.gustWhoosh = function gustWhoosh() {
    if (!audio.context || audio.muted) return;
    const now = audio.context.currentTime;
    tone(420, now, 0.18, 'sine', 0.18);
    tone(640, now + 0.06, 0.22, 'sine', 0.14);
  };

  /** A rising arpeggio for reaching the moon. */
  audio.winArpeggio = function winArpeggio() {
    if (!audio.context || audio.muted) return;
    const now = audio.context.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((note, i) => tone(note, now + i * 0.13, 0.7, 'sine', 0.4));
  };

  /** A slow descending phrase for the end of a flight. */
  audio.overPhrase = function overPhrase() {
    if (!audio.context || audio.muted) return;
    const now = audio.context.currentTime;
    const notes = [392, 329.63, 261.63];
    notes.forEach((note, i) => tone(note, now + i * 0.22, 0.8, 'triangle', 0.3));
  };

  audio.toggleMute = function toggleMute() {
    audio.muted = !audio.muted;
    return audio.muted;
  };

  return audio;
}
