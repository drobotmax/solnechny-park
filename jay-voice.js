// Procedural jay alarm syllable: a ~300 Hz pulse train exciting ~2 kHz resonances.
// Acoustic reference and limits: docs/references/jay-voice.md.
(function (root) {
  'use strict';
  function rattle(sampleRate, random) {
    random = random || Math.random;
    var duration = 0.283 + random() * 0.205, pitch = 0.98 + random() * 0.04;
    var samples = new Float32Array(Math.ceil(duration * sampleRate));
    var phase = 1, y1 = [0, 0, 0], y2 = [0, 0, 0], peak = 0;
    var radii = [0.0014, 0.0008, 0.00055].map(function (decay) { return Math.exp(-1 / (sampleRate * decay)); });
    var strengths = [1, 0.30, 0.12];
    for (var i = 0; i < samples.length; i++) {
      var t = i / sampleRate, u = t / duration;
      var prf = u < 0.55 ? 270 + 50 * Math.sin(u / 0.55 * Math.PI / 2) : 320 - 20 * (u - 0.55) / 0.45;
      // Small deterministic flutter roughens the voiced pulses without a white-noise bed.
      phase += prf * pitch * (1 + 0.008 * Math.sin(t * 2 * Math.PI * 37)) / sampleRate;
      var impulse = 0;
      if (phase >= 1) { phase -= 1; impulse = 0.95 + random() * 0.1; }
      var carrier = (1984 + 70 * Math.sin(Math.PI * u) - 90 * u) * pitch, value = 0;
      for (var k = 0; k < 3; k++) {
        var r = radii[k], next = 2 * r * Math.cos(2 * Math.PI * carrier * (k + 1) / sampleRate) * y1[k] - r * r * y2[k] + impulse;
        y2[k] = y1[k]; y1[k] = next; value += next * strengths[k];
      }
      var attack = Math.min(1, t / 0.018), release = Math.min(1, (duration - t) / 0.055);
      var envelope = attack * attack * (3 - 2 * attack) * release * release * (3 - 2 * release) * (0.75 + 0.25 * Math.sin(Math.PI * u));
      samples[i] = value * envelope; peak = Math.max(peak, Math.abs(samples[i]));
    }
    // Eight-bit amplitude steps retain the park's sound style, with a harmonic source.
    for (var i = 0; i < samples.length; i++) samples[i] = Math.round(samples[i] / Math.max(peak, 0.001) * 0.85 * 127) / 127;
    return { samples: samples, duration: samples.length / sampleRate };
  }
  var api = { rattle: rattle };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.JayVoice = api;
})(typeof window !== 'undefined' ? window : globalThis);
