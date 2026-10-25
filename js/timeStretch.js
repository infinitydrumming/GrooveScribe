// Infinity Drumming, 2026: slowing a song down (or speeding it up) without
// changing its pitch, to play along with it.
//
// A phase vocoder. The song is cut into overlapping windows (2048 samples, a
// new one every 512 samples of output); each is turned into its frequencies and
// laid down again, further apart to slow it down or closer together to speed it
// up, each frequency's phase carried on so it keeps its pitch. The bins around
// each peak follow the peak (identity phase locking, Laroche & Dolson 1999),
// which keeps the sound from going "phasey". At a drum hit the phases start
// again from the song's own (a phase reset), and that window is placed so the
// hit lands exactly when it should: hits stay sharp, and on the beat.
//
// Where in the song each window comes from is asked of the caller for each
// output frame (positionOfFrame), so the stretched song is exactly where the
// time map says at every moment, through any number of speed changes: the drums
// can't drift from it. Looping a part of the song, the map comes round to the
// loop's start at its end; no window then reaches past the end, or back before
// the start, so nothing from outside the loop is heard at the join.

/**
 * Samples in a window (about 46 ms; a new one every quarter of that on the
 * output), at a sample rate.
 */
export function windowSize(sampleRate) {
  if (sampleRate >= 32000) return 2048;
  if (sampleRate >= 16000) return 1024;
  return 512;
}
/** The most frames rendered at once. */
var MAX_RENDER = 8192;
/** A window cut short before a hit fades out over this many samples. */
var CUT_FADE = 32;
var TWO_PI = 2 * Math.PI;

function princarg(phase) {
  return phase - TWO_PI * Math.round(phase / TWO_PI);
}

// an in-place radix-2 FFT of `n` (a power of 2) complex values
function makeFft(n) {
  var cos = new Float64Array(n / 2);
  var sin = new Float64Array(n / 2);
  for (var i = 0; i < n / 2; i++) {
    cos[i] = Math.cos((TWO_PI * i) / n);
    sin[i] = Math.sin((TWO_PI * i) / n);
  }
  var reversed = new Uint32Array(n);
  for (var r = 0, bits = Math.log2(n); r < n; r++) {
    var rev = 0;
    for (var b = 0; b < bits; b++) rev |= ((r >> b) & 1) << (bits - 1 - b);
    reversed[r] = rev;
  }
  return function (re, im, inverse) {
    for (var a = 0; a < n; a++) {
      var swap = reversed[a];
      if (swap > a) {
        var tr = re[a];
        re[a] = re[swap];
        re[swap] = tr;
        var ti = im[a];
        im[a] = im[swap];
        im[swap] = ti;
      }
    }
    var sign = inverse ? -1 : 1;
    for (var size = 2; size <= n; size *= 2) {
      var half = size / 2;
      var step = n / size;
      for (var start = 0; start < n; start += size) {
        for (var j = 0; j < half; j++) {
          var c = cos[j * step];
          var s = sign * sin[j * step];
          var lo = start + j;
          var hi = lo + half;
          var xr = re[hi] * c + im[hi] * s;
          var xi = im[hi] * c - re[hi] * s;
          re[hi] = re[lo] - xr;
          im[hi] = im[lo] - xi;
          re[lo] += xr;
          im[lo] += xi;
        }
      }
    }
  };
}

function hannWindow(size) {
  var window = new Float64Array(size);
  for (var i = 0; i < size; i++) window[i] = 0.5 - 0.5 * Math.cos((TWO_PI * i) / size);
  return window;
}

/**
 * The drum hits (and other sharp attacks) in a song: the sample each starts on.
 * Its high frequencies (the change from one sample to the next) in blocks of
 * about 6 ms; a hit is a block at least 4 times (6 dB) as loud as the 50 ms
 * before it, and at least 40 ms after the last.
 * @param {Float32Array} samples  one channel
 * @param {number} sampleRate
 * @returns {number[]}
 */
export function findHits(samples, sampleRate) {
  var block = Math.max(32, Math.round(sampleRate * 0.006));
  var history = Math.max(2, Math.round(0.05 / (block / sampleRate)));
  var gap = Math.round(sampleRate * 0.04);
  var blocks = Math.floor(samples.length / block);
  var loudness = new Float64Array(blocks);
  var total = 0;
  for (var j = 0; j < blocks; j++) {
    var sum = 0;
    for (var i = j * block + 1; i < (j + 1) * block; i++) {
      var d = samples[i] - samples[i - 1];
      sum += d * d;
    }
    loudness[j] = sum;
    total += sum;
  }
  var floor = (total / Math.max(1, blocks)) * 0.05; // (not the hiss)
  var hits = [];
  var before = 0;
  for (var k = 0; k < blocks; k++) {
    if (k >= history) before -= loudness[k - history];
    var average = before / Math.min(Math.max(k, 1), history);
    var at = k * block;
    if (
      loudness[k] > floor &&
      loudness[k] > average * 4 &&
      (!hits.length || at - hits[hits.length - 1] >= gap)
    )
      hits.push(attackIn(samples, at, block));
    before += loudness[k];
  }
  return hits;
}

// where in a block the attack starts: the first big change from one sample to the next
function attackIn(samples, start, block) {
  var biggest = 0;
  for (var i = Math.max(1, start); i < start + block && i < samples.length; i++)
    biggest = Math.max(biggest, Math.abs(samples[i] - samples[i - 1]));
  for (var j = Math.max(1, start); j < start + block && j < samples.length; j++)
    if (Math.abs(samples[j] - samples[j - 1]) >= biggest * 0.3) return j;
  return start;
}

// the first of the (sorted) hits at or after `sample`
function firstHitFrom(hits, sample) {
  var low = 0;
  var high = hits.length;
  while (low < high) {
    var middle = (low + high) >> 1;
    if (hits[middle] < sample) low = middle + 1;
    else high = middle;
  }
  return low;
}

/**
 * A stretcher for a song's channels (1 or 2), from output frame `firstFrame`
 * on. `positionOfFrame(n)`: where in the song (in samples, fractions allowed,
 * before its start negative) output frame n is.
 * @param {Float32Array[]} channels
 * @param {number[]} hits  from findHits
 * @param {(frame: number) => number} positionOfFrame
 * @param {number} firstFrame
 * @param {number} [sampleRate]  (44100 if not given)
 * @param {{start: number, end: number}|null} [loop]  a part of the song played round
 *   and round (samples): positionOfFrame comes back to `start` at `end`
 */
export function createStretcher(channels, hits, positionOfFrame, firstFrame, sampleRate, loop) {
  var WINDOW = windowSize(sampleRate || 44100);
  var HOP = WINDOW / 4;
  var BINS = WINDOW / 2 + 1;
  var hann = hannWindow(WINDOW);
  var count = Math.min(2, channels.length);
  var length = channels[0].length;
  var fft = makeFft(WINDOW);
  var re = new Float64Array(WINDOW);
  var im = new Float64Array(WINDOW);
  var magnitude = [new Float64Array(BINS), new Float64Array(BINS)];
  var phase = [new Float64Array(BINS), new Float64Array(BINS)];
  var outPhase = [new Float64Array(BINS), new Float64Array(BINS)];
  var peakOf = new Int32Array(BINS);
  var peakPhase = new Float64Array(BINS);
  var room = WINDOW + MAX_RENDER;
  var state = {
    next: firstFrame, // the next output frame to give
    frame: Math.floor((firstFrame - WINDOW / 2) / HOP) + 1, // the next window
    lastPosition: NaN, // where the window before came from (samples)
    lastPhase: [new Float64Array(BINS), new Float64Array(BINS)],
    outPhase: outPhase,
    sums: [new Float64Array(room), new Float64Array(room)], // windows added, from `next` on
    weights: new Float64Array(room), // how much window each of those frames has
    hit: 0, // the next hit to look out for
    round: false, // the loop has come round: windows leave out what's before its start
  };

  // where window m comes from (a whole sample): a hit near its centre is placed
  // to land on time. A hit later in the window is left out of it (`cut`): the
  // window that places it plays it, and the windows before it would play it
  // early, a flam before the hit.
  function windowPosition(m) {
    var where = hitPosition(m);
    where.position = Math.round(where.position);
    var start = where.position - WINDOW / 2;
    var next = hits[state.hit];
    var cutAt = !where.reset && next !== undefined ? next : Infinity;
    if (loop && where.position < loop.end) cutAt = Math.min(cutAt, loop.end); // (the loop's end)
    where.cut = Math.max(0, Math.min(WINDOW, cutAt - start));
    where.from = 0;
    if (state.round) {
      if (start < loop.start) where.from = loop.start - start;
      else state.round = false;
    }
    return where;
  }

  function hitPosition(m) {
    var position = positionOfFrame(m * HOP);
    var before = positionOfFrame((m - 1) * HOP);
    var after = positionOfFrame((m + 1) * HOP);
    var low = (before + position) / 2;
    if (loop) {
      // (the windows either side of the loop coming round are a loop apart)
      if (before > position + HOP) before = 2 * position - after;
      if (after + HOP < position) after = 2 * position - before;
      low = (before + position) / 2;
      if (position + HOP < state.lastPosition) {
        // round again: the loop's first hit is this window's to place
        state.round = true;
        state.hit = firstHitFrom(hits, loop.start - 1);
        low = Math.min(low, loop.start - 1);
      }
    }
    while (state.hit < hits.length && hits[state.hit] < low) state.hit++;
    var hit = hits[state.hit];
    if (hit === undefined || hit >= (position + after) / 2)
      return { position: position, reset: false, cut: WINDOW };
    state.hit++;
    var rate = (after - before) / (2 * HOP) || 1;
    // the hit is heard (hit - position) / rate from the centre; as the window's
    // own copy, it comes (hit - from) from it: so start the copy from here
    return { position: hit - (hit - position) / rate, reset: true, cut: WINDOW };
  }

  // how much of sample i of a window counts: none before `from` or from `cut` on,
  // faded in after `from` and out before `cut`
  function kept(i, cut, from) {
    if (i < from || i >= cut) return 0;
    return Math.min(1, (cut - i) / CUT_FADE, from ? (i - from + 1) / CUT_FADE : 1);
  }

  // a channel's samples in the window, but for what's left out (kept)
  function windowed(data, target, start, cut, from) {
    for (var i = 0; i < WINDOW; i++) {
      var at = start + i;
      target[i] = at >= 0 && at < length ? data[at] * hann[i] * kept(i, cut, from) : 0;
    }
  }

  // the window's spectrum
  function analyse(center, cut, from) {
    windowed(channels[0], re, center - WINDOW / 2, cut, from);
    if (count == 2) windowed(channels[1], im, center - WINDOW / 2, cut, from);
    else im.fill(0);
    fft(re, im, false);
    // two real channels at once: left in the real part, right in the imaginary
    for (var k = 0; k < BINS; k++) {
      var nk = (WINDOW - k) % WINDOW;
      var lr = (re[k] + re[nk]) / 2;
      var li = (im[k] - im[nk]) / 2;
      magnitude[0][k] = Math.sqrt(lr * lr + li * li);
      phase[0][k] = Math.atan2(li, lr);
      if (count == 2) {
        var rr = (im[k] + im[nk]) / 2;
        var ri = -(re[k] - re[nk]) / 2;
        magnitude[1][k] = Math.sqrt(rr * rr + ri * ri);
        phase[1][k] = Math.atan2(ri, rr);
      }
    }
  }

  // whether bin k's magnitude is the biggest within 2 bins either way
  function isPeak(mags, k) {
    var from = Math.max(0, k - 2);
    var to = Math.min(BINS - 1, k + 2);
    for (var j = from; j <= to; j++) if (mags[j] > mags[k]) return false;
    return true;
  }

  // each bin's peak: its nearest
  function findPeaks(mags) {
    var last = -1;
    for (var k = 0; k < BINS; k++) {
      if (!isPeak(mags, k)) continue;
      // the bins since the last peak go to the nearer of the two
      var middle = last < 0 ? 0 : Math.floor((last + k) / 2) + 1;
      for (var b = last + 1; b <= k; b++) peakOf[b] = b < middle ? last : k;
      last = k;
    }
    for (var e = last + 1; e < BINS; e++) peakOf[e] = last < 0 ? e : last;
  }

  function newPhases(ch, hop, reset) {
    var now = phase[ch];
    var before = state.lastPhase[ch];
    var out = state.outPhase[ch];
    if (reset || hop <= 0) {
      out.set(now);
      return;
    }
    findPeaks(magnitude[ch]);
    for (var k = 0; k < BINS; k++) {
      if (peakOf[k] != k) continue;
      var expected = (TWO_PI * k * hop) / WINDOW;
      var frequency = (TWO_PI * k) / WINDOW + princarg(now[k] - before[k] - expected) / hop;
      peakPhase[k] = princarg(out[k] + frequency * HOP);
    }
    for (var j = 0; j < BINS; j++) {
      var p = peakOf[j];
      out[j] = p == j ? peakPhase[j] : princarg(peakPhase[p] + now[j] - now[p]);
    }
  }

  function synthesise(m, cut, from) {
    for (var k = 0; k < BINS; k++) {
      var l = magnitude[0][k];
      var lr = l * Math.cos(state.outPhase[0][k]);
      var li = l * Math.sin(state.outPhase[0][k]);
      var rr = 0;
      var ri = 0;
      if (count == 2) {
        var r = magnitude[1][k];
        rr = r * Math.cos(state.outPhase[1][k]);
        ri = r * Math.sin(state.outPhase[1][k]);
      }
      // the spectrum of left + i right, its other half from the symmetry
      re[k] = lr - ri;
      im[k] = li + rr;
      if (k > 0 && k < WINDOW / 2) {
        re[WINDOW - k] = lr + ri;
        im[WINDOW - k] = -li + rr;
      }
    }
    fft(re, im, true);
    var offset = m * HOP - WINDOW / 2 - state.next;
    for (var i = Math.max(0, -offset); i < WINDOW; i++) {
      var g = hann[i] / WINDOW;
      state.sums[0][offset + i] += re[i] * g;
      if (count == 2) state.sums[1][offset + i] += im[i] * g;
      // (a cut-short window doesn't count past its cut: the windows after it make up the sound)
      state.weights[offset + i] += hann[i] * hann[i] * kept(i, cut, from);
    }
  }

  function addWindow() {
    var m = state.frame;
    var where = windowPosition(m);
    analyse(where.position, where.cut, where.from);
    var hop = where.position - state.lastPosition;
    for (var ch = 0; ch < count; ch++) {
      newPhases(ch, hop, where.reset || isNaN(state.lastPosition));
      state.lastPhase[ch].set(phase[ch]);
    }
    synthesise(m, where.cut, where.from);
    state.lastPosition = where.position;
    state.frame++;
  }

  return {
    /** The next `frames` of output (at most MAX_RENDER), a Float32Array per channel. */
    render: function (frames) {
      while (state.frame * HOP - WINDOW / 2 < state.next + frames) addWindow();
      var out = [];
      var weights = state.weights;
      for (var ch = 0; ch < count; ch++) {
        var sums = state.sums[ch];
        var frame = new Float32Array(frames);
        // each frame as loud as the windows over it make it (1.5 where all four count)
        for (var i = 0; i < frames; i++) frame[i] = sums[i] / Math.max(weights[i], 0.25);
        out.push(frame);
        sums.copyWithin(0, frames);
        sums.fill(0, room - frames);
      }
      weights.copyWithin(0, frames);
      weights.fill(0, room - frames);
      state.next += frames;
      return out;
    },
    /** Where it is, to come back to (with restore) and render again. */
    snapshot: function () {
      return {
        next: state.next,
        frame: state.frame,
        lastPosition: state.lastPosition,
        hit: state.hit,
        round: state.round,
        lastPhase: state.lastPhase.map(copy),
        outPhase: state.outPhase.map(copy),
        sums: state.sums.map(function (sums) {
          return sums.slice(0, WINDOW); // (all there is past `next`)
        }),
        weights: state.weights.slice(0, WINDOW),
      };
    },
    restore: function (saved) {
      state.next = saved.next;
      state.frame = saved.frame;
      state.lastPosition = saved.lastPosition;
      state.hit = saved.hit;
      state.round = saved.round;
      state.lastPhase = saved.lastPhase.map(copy);
      state.outPhase = saved.outPhase.map(copy);
      state.sums = saved.sums.map(function (sums) {
        var all = new Float64Array(room);
        all.set(sums);
        return all;
      });
      state.weights = new Float64Array(room);
      state.weights.set(saved.weights);
    },
    /** The next output frame it gives. */
    get next() {
      return state.next;
    },
  };
}

function copy(array) {
  return array.slice();
}
