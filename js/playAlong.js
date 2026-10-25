// Infinity Drumming, 2026: playing along with a song.
//
// A song from the player's own device plays with the groove. The drums come in
// on the song's bar 1: either the song starts there with them, or it starts at
// its intro and the drums come in when bar 1 arrives. Both then stay locked to
// the one audio clock for the whole song.
//
// MIDI.js's player places its notes on the audio clock a chunk at a time, from
// whenever a timer happens to fire, so it wanders a few ms each round (13 ms
// early to 8 ms late over a minute, measured): fine on its own, not with a
// record. While a song is loaded, the steady clock here plays the rounds
// instead: every note goes on the audio clock from one fixed start, a moment
// ahead of time, and each round starts exactly where the one before ends.
// Scribe's own logic is untouched: the clock reports each note as MIDI.js does
// (the cursor, the rep counter, the practice timer...), and says a round has
// ended a moment early, so Scribe builds the next one (a speed-up, the groove /
// click cycle...) in time for it to go on the clock.
//
// The song's speed follows the groove's tempo (the groove's tempo / the song's),
// so a slower tempo slows the song down, and a speed-up or a tempo change speeds
// it up at the same bar line as the drums. Its pitch stays as it is (a phase
// vocoder, timeStretch.js), or goes down and up with its speed, like a record.
//
// Loop mode plays some bars of the song round and round, the groove starting on
// the loop's first bar. The song's place is counted on as if it played straight
// through and comes round to the loop's start at its end (loopedPosition), so
// the drums stay on the song's bars every time round.

import { createStretcher, findHits, windowSize } from './timeStretch.js';

/** How far ahead notes go on the audio clock (s). */
var LOOKAHEAD = 0.35;
/** How early Scribe hears that a round has ended (s): time to build the next one. */
var HANDOVER = 0.25;
/** How often the clock looks ahead (ms). */
var TICK_MS = 25;
/** From pressing play to the first sound (s): time to place the first notes
 * (and to start stretching the song). */
var START_DELAY = 0.15;
var STRETCHED_START_DELAY = 0.25;
/** How far ahead the stretched song is made (s), in pieces of so many frames. */
var STRETCH_AHEAD = 0.5;
var PIECE = 4096;
/** A piece starting this soon can't be made again (s). */
var PIECE_DUE = 0.03;
/** No note goes on the clock closer to now than this (s). */
var MARGIN = 0.005;
/** A note this late is left out (s): a missed note, rather than a flam. */
var TOO_LATE = 0.03;
/** A tempo change takes effect at a bar line at least this far ahead (s). */
var SWITCH_AHEAD = 0.06;
/** The song's fades (s): in, when stopped, and after the groove's last round. */
var FADE_IN = 0.005;
var FADE_OUT = 0.05;
var END_FADE = 1.5;

/** Starting at bar 1, the song starts this much before it (s), so its first hit is whole. */
var RUN_UP = 0.05;
/** A loop comes round on its first hit when there's one this close to its start (s). */
var SEAM_HIT = 0.006;
/** Taps further apart than this start a new tempo (s). */
export var TAP_RESET = 2;
/** How far a tapped or clicked bar 1 moves to the hit near it (s). */
export var HIT_RANGE = 0.06;

/** @typedef {import('./practiceSettings.js').SongSetting} SongSetting */

// --- Sums ---------------------------------------------------------------------

/**
 * The tempo of taps on the beat (their times, s, in order): the average beat of
 * the last 8, in bpm to one decimal; 0 for fewer than 2.
 * @param {number[]} taps
 */
export function tapTempo(taps) {
  var recent = taps.slice(-8);
  if (recent.length < 2) return 0;
  var beat = (recent[recent.length - 1] - recent[0]) / (recent.length - 1);
  return beat > 0 ? Math.round(600 / beat) / 10 : 0;
}

/**
 * When everything starts, from the moment the song's bar 1 plays (s).
 * `rate`: the song's speed (the groove's tempo / the song's); `leadIn`: how
 * long the drums play before bar 1 (a count-in), s. Returns when the song
 * starts and from where in it (s; a moment before the drums, from bar 1), and
 * when the drums start.
 * @param {SongSetting} song
 * @param {number} rate
 * @param {number} leadIn
 * @returns {{songAt: number, songFrom: number, drumsAt: number}}
 */
export function playAlongStart(song, rate, leadIn) {
  var drumsAt = leadIn ? -leadIn : 0;
  var songFrom = song.start == 'intro' ? 0 : Math.max(0, song.bar1 + drumsAt * rate - RUN_UP);
  return { songAt: (songFrom - song.bar1) / rate, songFrom: songFrom, drumsAt: drumsAt };
}

/**
 * Where in the song (s) it is at `time`, from its changes of speed: each from
 * time `at` on plays from `from` in the song at `rate` (in time order). Before
 * the first, the song is still to start (negative: that far before its start).
 * @param {Array<{at: number, from: number, rate: number}>} changes
 * @param {number} time
 */
export function songPositionAt(changes, time) {
  if (!changes.length) return 0;
  var change = changes[0];
  for (var i = 1; i < changes.length && changes[i].at <= time; i++) change = changes[i];
  return change.from + (time - change.at) * change.rate;
}

/**
 * Where a song is, looping some of it: a place counted past the loop's end has
 * come round again from its start (s). `loop`: {start, end} (s), or null.
 * @param {number} position
 * @param {{start: number, end: number}|null} loop
 */
export function loopedPosition(position, loop) {
  if (!loop || position < loop.end) return position;
  return loop.start + ((position - loop.start) % (loop.end - loop.start));
}

/**
 * The part of a song to loop (s): from the start of bar `from` to the end of
 * bar `to` (bar 1 at the song's bar 1, `barSeconds` a bar), or null for none.
 * @param {SongSetting} setting
 * @param {number} barSeconds
 */
export function songLoop(setting, barSeconds) {
  var bars = setting && setting.loop;
  if (!bars || !isFinite(barSeconds) || barSeconds <= 0) return null;
  return {
    start: setting.bar1 + (bars.from - 1) * barSeconds,
    end: setting.bar1 + bars.to * barSeconds,
  };
}

/**
 * Where the song comes round (s): the loop moved onto its first hit, when one is
 * that close to its start, so the join falls just before a hit at both ends.
 * @param {{start: number, end: number}} loop
 * @param {number[]} hits  (samples)
 * @param {number} sampleRate
 */
export function loopSeam(loop, hits, sampleRate) {
  var nearest = Infinity;
  hits.forEach(function (hit) {
    var away = hit / sampleRate - loop.start;
    if (Math.abs(away) <= SEAM_HIT && Math.abs(away) < Math.abs(nearest)) nearest = away;
  });
  return nearest == Infinity ? loop : { start: loop.start + nearest, end: loop.end + nearest };
}

// the loudness of `length` samples from `from`
function energy(samples, from, length) {
  var sum = 0;
  for (var i = from; i < from + length; i++) sum += samples[i] * samples[i];
  return sum;
}

/**
 * The hit nearest `time` in a song (s): where its loudness rises most within
 * `range` either side (to the ms), or `time` itself where nothing there is a hit
 * (silence, a note dying away, a held chord).
 * @param {Float32Array|number[]} samples  one channel
 * @param {number} sampleRate
 * @param {number} time
 * @param {number} range
 */
export function nearestHit(samples, sampleRate, time, range) {
  var frame = Math.max(1, Math.round(sampleRate * 0.005));
  var step = Math.max(1, Math.round(sampleRate * 0.001));
  var first = Math.max(frame, Math.floor((time - range) * sampleRate));
  var last = Math.min(samples.length - frame, Math.ceil((time + range) * sampleRate));
  var best = 0;
  var bestAt = time;
  var loudest = 0;
  for (var i = first; i <= last; i += step) {
    var after = energy(samples, i, frame);
    var rise = after - energy(samples, i - frame, frame);
    loudest = Math.max(loudest, after);
    if (rise > best) {
      best = rise;
      bestAt = i / sampleRate;
    }
  }
  // a hit comes out of something much quieter than itself
  if (best < loudest * 0.3) bestAt = time;
  return Math.round(bestAt * 1000) / 1000;
}

/**
 * The loudest sample in each of `count` columns from `from` to `to` (s), for
 * drawing the song's wave.
 * @param {Float32Array|number[]} samples
 * @param {number} sampleRate
 * @param {number} from
 * @param {number} to
 * @param {number} count
 */
export function wavePeaks(samples, sampleRate, from, to, count) {
  var peaks = [];
  var perColumn = ((to - from) * sampleRate) / count;
  var stride = Math.max(1, Math.floor(perColumn / 64)); // (enough to find the peak)
  for (var column = 0; column < count; column++) {
    var start = Math.max(0, Math.floor(from * sampleRate + column * perColumn));
    var end = Math.min(samples.length, Math.floor(from * sampleRate + (column + 1) * perColumn));
    var peak = 0;
    for (var i = start; i < end; i += stride) peak = Math.max(peak, Math.abs(samples[i]));
    peaks.push(peak);
  }
  return peaks;
}

/** A time in a song as "1:02.345" (to the ms). */
export function songTimeText(seconds) {
  var ms = Math.round(Math.max(0, seconds) * 1000);
  var minutes = Math.floor(ms / 60000);
  var rest = ((ms % 60000) / 1000).toFixed(3);
  return minutes + ':' + (rest.length < 6 ? '0' : '') + rest;
}

/** "1:02.345", "62.345" or "62" as seconds, or NaN. */
export function songTimeFromText(text) {
  var parts = /^\s*(?:(\d+):)?(\d+(?:\.\d*)?)\s*$/.exec(String(text));
  if (!parts) return NaN;
  return (
    Math.round(((parts[1] ? parseInt(parts[1], 10) * 60 : 0) + parseFloat(parts[2])) * 1000) / 1000
  );
}

// --- The song -----------------------------------------------------------------

/**
 * Plays a decoded song on the audio clock at a speed that can change at set
 * times, and knows where in it it is at any time.
 * @param {any} ctx  an AudioContext
 * @param {any} buffer  the song (an AudioBuffer)
 * @param {any} output  where it plays to (an AudioNode)
 */
export function createSongPlayer(ctx, buffer, output) {
  var live = []; // [{source, gain}]: the newest is the one playing
  /** @type {Array<{at: number, from: number, rate: number}>} */
  var changes = [];
  var loop = null;

  function positionAt(time) {
    return loopedPosition(songPositionAt(changes, time), loop);
  }

  return {
    duration: buffer.duration,
    positionAt: positionAt,
    // from `from` in the song (before its start if negative) at `at`, at `rate`,
    // round and round `around` ({start, end}, s) if given
    play: function (at, from, rate, around) {
      var offset = from;
      if (from < 0) {
        at -= from / rate; // (it waits for its start)
        offset = 0;
      }
      var source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = rate;
      loop = around || null;
      if (loop) {
        source.loop = true; // (the browser comes round exactly where positionAt does)
        source.loopStart = loop.start;
        source.loopEnd = loop.end;
      }
      var gain = ctx.createGain();
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(1, at + FADE_IN);
      source.connect(gain);
      gain.connect(output);
      source.start(at, Math.min(offset, buffer.duration));
      live.push({ source: source, gain: gain });
      changes = [{ at: at, from: offset, rate: rate }];
    },
    setRate: function (at, rate) {
      var playing = live[live.length - 1];
      if (!playing || rate == changes[changes.length - 1].rate) return;
      playing.source.playbackRate.setValueAtTime(rate, at);
      changes.push({ at: at, from: songPositionAt(changes, at), rate: rate }); // (counted on)
    },
    // the speed changes from `at` on are not to happen
    cancelRatesFrom: function (at) {
      var playing = live[live.length - 1];
      if (playing) playing.source.playbackRate.cancelScheduledValues(at);
      changes = changes.filter(function (change, i) {
        return i == 0 || change.at < at;
      });
    },
    // fades out over `fade` from `at`
    stop: function (at, fade) {
      live.forEach(function (playing) {
        try {
          playing.gain.gain.cancelScheduledValues(at);
          playing.gain.gain.setValueAtTime(playing.gain.gain.value, at);
          playing.gain.gain.linearRampToValueAtTime(0, at + fade);
          playing.source.stop(at + fade);
        } catch (err) {
          console.log('The song had already stopped: ' + err);
        }
      });
      live = [];
    },
  };
}

/**
 * The same, keeping the song's pitch at any speed: it is stretched a moment
 * ahead (timeStretch.js) and played in short pieces, one straight after
 * another on the audio clock. A speed change in the part already made makes
 * it again from there. `hits`: the song's hits (findHits), kept sharp.
 * @param {any} ctx
 * @param {any} buffer
 * @param {any} output
 * @param {number[]} hits
 */
function createStretchedSongPlayer(ctx, buffer, output, hits) {
  var rate = buffer.sampleRate;
  var size = windowSize(rate);
  var channels = [];
  for (var c = 0; c < Math.min(2, buffer.numberOfChannels); c++)
    channels.push(buffer.getChannelData(c));
  /** @type {Array<{at: number, from: number, rate: number}>} */
  var changes = [];
  var loop = null;
  var start = 0; // when output frame 0 plays (s)
  var stretcher = null;
  var gain = null;
  var pieces = []; // [{from (frame), source, saved (the stretcher before it)}]
  var made = 0; // frames made so far

  function positionAt(time) {
    return loopedPosition(songPositionAt(changes, time), loop);
  }

  function frameTime(frame) {
    return start + frame / rate;
  }

  // the song stretched up to `now` + STRETCH_AHEAD, each piece on the clock
  function makeMore(now) {
    while (stretcher && frameTime(made) < now + STRETCH_AHEAD) {
      if (positionAt(frameTime(made)) > buffer.duration + size / rate) return; // (the song's end)
      var saved = stretcher.snapshot();
      var data = stretcher.render(PIECE);
      var audio = ctx.createBuffer(data.length, PIECE, rate);
      data.forEach(function (samples, channel) {
        audio.getChannelData(channel).set(samples);
      });
      var source = ctx.createBufferSource();
      source.buffer = audio;
      source.connect(gain);
      var at = frameTime(made);
      if (at >= now) source.start(at);
      else source.start(now, Math.min(now - at, audio.duration)); // (late: in step all the same)
      pieces.push({ from: made, source: source, saved: saved });
      made += PIECE;
    }
    while (pieces.length > 1 && frameTime(pieces[1].from) < now - 1) pieces.shift();
  }

  function dropPiece(piece) {
    try {
      piece.source.stop(0);
      piece.source.disconnect(0);
    } catch (err) {
      console.log('A piece of the song had already gone: ' + err);
    }
  }

  // the song's speed changes from `at` on: what's made from there is made again
  function remakeFrom(at) {
    if (!stretcher) return;
    var now = ctx.currentTime;
    var frame = (at - start) * rate;
    // (a piece's stretcher has looked half a window past its start)
    var k = 0;
    while (k + 1 < pieces.length && pieces[k + 1].from <= frame - size / 2) k++;
    while (k < pieces.length && frameTime(pieces[k].from) < now + PIECE_DUE) k++;
    if (k >= pieces.length) return;
    stretcher.restore(pieces[k].saved);
    made = pieces[k].from;
    pieces.splice(k).forEach(dropPiece);
    makeMore(now);
  }

  return {
    duration: buffer.duration,
    positionAt: positionAt,
    play: function (at, from, speed, around) {
      var offset = from;
      if (from < 0) {
        at -= from / speed; // (it waits for its start)
        offset = 0;
      }
      start = Math.ceil(at * rate) / rate; // (on a frame: the pieces join exactly)
      changes = [{ at: start, from: offset, rate: speed }];
      loop = around || null;
      gain = ctx.createGain();
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(1, start + FADE_IN);
      gain.connect(output);
      stretcher = createStretcher(
        channels,
        hits,
        function (n) {
          return positionAt(frameTime(n)) * rate;
        },
        0,
        rate,
        loop && { start: loop.start * rate, end: loop.end * rate }
      );
      pieces = [];
      made = 0;
      makeMore(ctx.currentTime);
    },
    setRate: function (at, speed) {
      if (!stretcher || speed == changes[changes.length - 1].rate) return;
      changes.push({ at: at, from: songPositionAt(changes, at), rate: speed }); // (counted on)
      remakeFrom(at);
    },
    cancelRatesFrom: function (at) {
      changes = changes.filter(function (change, i) {
        return i == 0 || change.at < at;
      });
      remakeFrom(at);
    },
    stop: function (at, fade) {
      if (!gain) return;
      gain.gain.cancelScheduledValues(at);
      gain.gain.setValueAtTime(gain.gain.value, at);
      gain.gain.linearRampToValueAtTime(0, at + fade);
      pieces.forEach(function (piece) {
        if (frameTime(piece.from) >= at + fade) dropPiece(piece);
        else piece.source.stop(at + fade);
      });
      pieces = [];
      stretcher = null;
    },
    // (the clock's tick: more of the song, ahead of time)
    tick: function (now) {
      makeMore(now);
    },
  };
}

// --- The steady clock -----------------------------------------------------------

// A round's notes as MIDI.js counts them: ms from the start, which starts at 0.5
function roundNotes(data) {
  var notes = [];
  var now = 0.5;
  for (var n = 0; n < data.length; n++) {
    now += data[n][1];
    var event = data[n][0].event;
    if (event.type == 'channel' && (event.subtype == 'noteOn' || event.subtype == 'noteOff'))
      notes.push({
        now: now,
        early: 0, // played this much (ms) before its time
        channel: event.channel,
        note: event.noteNumber,
        velocity: event.velocity,
        message: event.subtype == 'noteOn' ? 144 : 128,
        source: null,
        timer: null,
        told: false,
      });
  }
  return { notes: notes, end: now, lead: firstBarOnTime(notes) };
}

// Scribe's rounds start with a blank tick (MIDI.js skips a first note without
// one), which puts the first bar's notes a tick late: the bars after it are on
// time (the tick comes off the first bar's end), as is a count-in's end. Those
// notes are played a tick early, so every bar is on the song's beat. Returns
// the tick (ms), 0 without one.
function firstBarOnTime(notes) {
  var blank = notes[0];
  var lead = blank ? blank.now - 0.5 : 0;
  if (!blank || blank.message != 128 || blank.note != 60 || !(lead > 0 && lead < 30)) return 0;
  for (var i = 1; i < notes.length; i++) {
    var note = notes[i];
    if (note.channel == 0 && note.note == 60 && note.message == 128) break; // the bar's end
    note.early = lead;
  }
  return lead;
}

function newRound(data, bpm, start) {
  var parsed = roundNotes(data);
  return {
    data: data,
    bpm: bpm,
    start: start, // when it starts on the audio clock (s)
    notes: parsed.notes,
    end: parsed.end, // its length as MIDI.js has it (ms, from 0.5)
    length: (parsed.end - 0.5) / 1000, // (s)
    lead: parsed.lead, // its blank tick (ms)
    placed: 0, // its notes on the clock so far
    cut: Infinity, // a tempo change: its notes from here (ms) are left out
    ended: false, // Scribe has heard it ended
  };
}

function noteTime(round, note) {
  return round.start + (note.now - 0.5 - note.early) / 1000;
}

// one channel to find the hits in (the channels mixed)
function monoOf(buffer) {
  if (buffer.numberOfChannels < 2) return buffer.getChannelData(0);
  var left = buffer.getChannelData(0);
  var right = buffer.getChannelData(1);
  var mono = new Float32Array(left.length);
  for (var i = 0; i < mono.length; i++) mono[i] = (left[i] + right[i]) / 2;
  return mono;
}

// how far from a bar line a note can be and still be on it: the MIDI's whole
// ticks round the bar lines a little (as in tempoSwitch.js)
function onTheLine(barMs) {
  return Math.min(10, Math.max(2, barMs / 150));
}

/**
 * The play-along's steady clock. While a song is on it plays the rounds in
 * place of MIDI.Player, with the same calls (start, resume, pause, stop, loop,
 * playing), and plays the song with them.
 *
 * env:
 *   ctx()        the audio context (MIDI.Player.ctx)
 *   midi()       MIDI.js (noteOn / noteOff / channels / setVolume)
 *   round()      the round MIDI.Player has loaded: {data, bpm}
 *   leadsIn()    whether that round leads in to bar 1 (a count-in)
 *   tell(data)   a note played (or a round's end), as MIDI.js reports it
 *   songEnded()  the song has played to its end
 * @param {{ctx: () => any, midi: () => any, round: () => {data: any[], bpm: number},
 *   leadsIn: () => boolean, tell: (data: any) => void, songEnded: () => void}} env
 */
export function createPlayAlong(env) {
  var engine = {
    playing: false,
    currentTime: 0,
  };
  var song = null; // {buffer, setting, output (its volume), drums (their volume), loop}
  var player = null; // the song playing (createSongPlayer)
  var rounds = [];
  var shouldLoop = false;
  var handover = null; // while Scribe hears a round has ended: {started, stopped}
  var paused = null; // {at, position}
  var pendingSwitch = null; // a tempo change still to come
  var ticker = null;

  function clock() {
    return env.ctx().currentTime;
  }

  function songHits() {
    if (!song.hits) song.hits = findHits(monoOf(song.buffer), song.buffer.sampleRate);
    return song.hits;
  }

  // a player for the song: keeping its pitch, or like a record
  function newPlayer() {
    var ctx = env.ctx();
    if (!song.keepPitch) return createSongPlayer(ctx, song.buffer, song.output);
    return createStretchedSongPlayer(ctx, song.buffer, song.output, songHits());
  }

  // where the song comes round, looping (null: it plays straight through)
  function seam() {
    return song.loop ? loopSeam(song.loop, songHits(), song.buffer.sampleRate) : null;
  }

  function startDelay() {
    return song.keepPitch ? STRETCHED_START_DELAY : START_DELAY;
  }
  function rateFor(bpm) {
    return bpm / song.setting.bpm;
  }

  // --- notes on the clock ---
  function placeNotes(round, now) {
    while (round.placed < round.notes.length) {
      var note = round.notes[round.placed];
      var at = noteTime(round, note);
      if (note.now >= round.cut || at > now + LOOKAHEAD) return;
      placeNote(round, note, at, now);
      round.placed++;
    }
  }

  function placeNote(round, note, at, now) {
    var midi = env.midi();
    var channel = midi.channels && midi.channels[note.channel];
    if (!channel || channel.mute) return;
    if (at >= now - TOO_LATE) {
      var when = Math.max(at, now + MARGIN);
      note.source =
        note.message == 144
          ? midi.noteOn(note.channel, note.note, note.velocity, when)
          : midi.noteOff(note.channel, note.note, when);
    }
    if (!note.told && note.now < round.end)
      note.timer = window.setTimeout(
        function () {
          tellNote(round, note);
        },
        Math.max(0, (at - now) * 1000)
      );
  }

  function report(round, note, now) {
    var midi = env.midi();
    var offset = (midi.Player && midi.Player.MIDIOffset) || 0;
    engine.currentTime = now;
    env.tell({
      channel: note.channel,
      note: note.note - offset,
      now: now,
      end: round.end,
      message: note.message,
      velocity: note.velocity,
    });
  }

  function tellNote(round, note) {
    note.timer = null;
    note.told = true;
    report(round, note, note.now);
  }

  // takes a note off the clock (it hasn't sounded yet)
  function unplace(note) {
    if (note.timer) window.clearTimeout(note.timer);
    note.timer = null;
    if (note.source) {
      try {
        note.source.stop(0);
        note.source.disconnect(0);
      } catch (err) {
        console.log('A note had already gone: ' + err);
      }
    }
    note.source = null;
  }

  // the notes from `time` on come off the clock, to go on again later
  function unplaceFrom(round, time) {
    for (var i = 0; i < round.placed; i++) {
      if (noteTime(round, round.notes[i]) < time) continue;
      unplace(round.notes[i]);
      if (i < round.placed) round.placed = i;
    }
  }

  function unplaceAll(time) {
    rounds.forEach(function (round) {
      unplaceFrom(round, time);
    });
  }

  // --- rounds ---
  // the song changes speed as each round from `after` on starts at another tempo
  function applyRates(after) {
    for (var i = 1; i < rounds.length; i++)
      if (rounds[i].start > after && rounds[i].bpm != rounds[i - 1].bpm)
        player.setRate(rounds[i].start, rateFor(rounds[i].bpm));
  }

  function queueRound(data, bpm, start) {
    var round = newRound(data, bpm, start);
    var last = rounds[rounds.length - 1];
    rounds.push(round);
    if (player && last && last.bpm != bpm) player.setRate(start, rateFor(bpm));
    placeNotes(round, clock());
    return round;
  }

  // Scribe hears the round has ended, a moment early: it builds the next one
  // (MIDI.Player.start) or stops
  function endRound(round) {
    round.ended = true;
    round.notes.forEach(function (note) {
      if (!note.timer) return;
      window.clearTimeout(note.timer);
      tellNote(round, note); // (its last notes are reported a moment early too)
    });
    var last = round.notes[round.notes.length - 1] || {
      channel: 0,
      note: 60,
      velocity: 0,
      message: 128,
    };
    handover = { started: false, stopped: false };
    report(round, last, round.end);
    var heard = handover;
    handover = null;
    if (heard.started) return;
    if (!heard.stopped && shouldLoop) queueRound(round.data, round.bpm, round.start + round.length);
    else finish(round);
  }

  // the groove has stopped by itself: the song fades out after its last round
  function finish(round) {
    engine.playing = false;
    stopTicking();
    if (player) player.stop(round.start + round.length, END_FADE);
    player = null;
    rounds = [];
  }

  function tick() {
    if (!engine.playing) return;
    var now = clock();
    rounds.forEach(function (round) {
      placeNotes(round, now);
    });
    for (var i = 0; i < rounds.length; i++) {
      var round = rounds[i];
      if (!round.ended && now >= round.start + round.length - HANDOVER) endRound(round);
      if (!engine.playing) return;
    }
    while (rounds.length > 1 && rounds[0].ended && rounds[0].start + rounds[0].length < now - 1)
      rounds.shift();
    if (player && player.tick) player.tick(now);
    if (player && player.positionAt(now) >= player.duration) env.songEnded();
  }

  function startTicking() {
    stopTicking();
    ticker = window.setInterval(tick, TICK_MS);
  }
  function stopTicking() {
    if (ticker) window.clearInterval(ticker);
    ticker = null;
  }

  function setDrumVolume(volume) {
    var midi = env.midi();
    if (midi && midi.setVolume) midi.setVolume(0, Math.round(127 * volume));
  }

  // --- MIDI.Player's calls ---
  engine.loop = function (doOrDont) {
    shouldLoop = !!doOrDont;
  };

  engine.start = function () {
    if (handover) {
      // Scribe built the next round: it starts exactly as the last one ends
      handover.started = true;
      handover.stopped = false;
      engine.playing = true;
      var last = rounds[rounds.length - 1];
      var loaded = env.round();
      queueRound(loaded.data, loaded.bpm, last.start + last.length);
      return;
    }
    cutEverything();
    begin();
  };

  function begin() {
    engine.onStart();
    var now = clock();
    var loaded = env.round();
    var rate = rateFor(loaded.bpm);
    var first = newRound(loaded.data, loaded.bpm, 0);
    // a count-in lasts its blank tick longer than its bar: the groove starts
    // as its last tick does
    if (env.leadsIn()) first.length -= first.lead / 1000;
    // (looping, the groove starts on the loop's first bar)
    var from = song.loop ? { bar1: song.loop.start, start: 'bar1' } : song.setting;
    var plan = playAlongStart(from, rate, env.leadsIn() ? first.length : 0);
    var bar1At = now + startDelay() - Math.min(plan.songAt, plan.drumsAt);
    first.start = bar1At + plan.drumsAt;
    rounds = [first];
    engine.playing = true;
    paused = null;
    setDrumVolume(song.drums);
    player = newPlayer();
    player.play(bar1At + plan.songAt, plan.songFrom, rate, seam());
    placeNotes(first, now);
    startTicking();
  }

  engine.resume = function () {
    if (handover || !paused || !rounds.length) {
      engine.start();
      return;
    }
    var at = clock() + startDelay();
    var shift = at - paused.at;
    rounds.forEach(function (round) {
      round.start += shift;
    });
    player = newPlayer();
    var position = paused.position;
    player.play(
      position < 0 ? at - position / paused.rate : at,
      Math.max(0, position),
      paused.rate,
      seam()
    );
    applyRates(at); // (a round built before the pause at another tempo)
    paused = null;
    engine.playing = true;
    tick();
    startTicking();
  };

  engine.pause = function () {
    if (!engine.playing) return;
    var now = clock();
    undoSwitch(now);
    var round = playingRoundAt(now) || rounds[0];
    paused = {
      at: now,
      position: player ? player.positionAt(now) : 0,
      rate: round ? rateFor(round.bpm) : 1,
      bpm: round ? round.bpm : 0,
    };
    unplaceAll(now);
    if (player) player.stop(now, FADE_OUT);
    player = null;
    rounds = rounds.filter(function (r) {
      return r.start + r.length > now;
    });
    engine.playing = false;
    stopTicking();
  };

  engine.stop = function () {
    if (handover) {
      handover.stopped = true;
      handover.started = false;
      engine.playing = false;
      return;
    }
    cutEverything();
  };

  function cutEverything() {
    var now = clock();
    if (pendingSwitch) window.clearTimeout(pendingSwitch.timer);
    pendingSwitch = null;
    unplaceAll(now);
    if (player) player.stop(now, FADE_OUT);
    player = null;
    rounds = [];
    paused = null;
    engine.playing = false;
    engine.currentTime = 0;
    stopTicking();
  }

  // --- tempo changes while playing ---
  function playingRoundAt(now) {
    for (var i = rounds.length - 1; i >= 0; i--) if (rounds[i].start <= now) return rounds[i];
    return null;
  }

  // the first bar line of the round at least SWITCH_AHEAD ahead
  function nextBarLine(round, oldBarMs, newBarMs, after) {
    var oldLine = 0.5;
    var newLine = 0.5;
    for (var bar = 1; bar < oldBarMs.length; bar++) {
      oldLine += oldBarMs[bar - 1];
      newLine += newBarMs[bar - 1];
      var at = round.start + (oldLine - 0.5) / 1000;
      if (at > after) return { bar: bar, oldLine: oldLine, newLine: newLine, at: at };
    }
    return null;
  }

  /**
   * Plays the round again from its next bar line at a new tempo (`data`, the
   * same round at `bpm`); the song changes speed there too. Returns false when
   * no bar line is left in the round (its end takes the new tempo anyway).
   * `onSwitched(bar)` is called when it has.
   */
  engine.switchTempoAtNextBar = function (data, bpm, oldBarMs, newBarMs, onSwitched) {
    var now = clock();
    undoSwitch(now);
    var round = playingRoundAt(now);
    if (!round || round.ended || oldBarMs.length != newBarMs.length) return false;
    var line = nextBarLine(round, oldBarMs, newBarMs, now + SWITCH_AHEAD);
    if (!line || line.at > round.start + round.length - HANDOVER - SWITCH_AHEAD) return false;
    var next = newRound(data, bpm, line.at - (line.newLine - 0.5) / 1000);
    var from = line.newLine - onTheLine(newBarMs[line.bar - 1]);
    while (next.placed < next.notes.length && next.notes[next.placed].now < from) next.placed++;
    round.cut = line.oldLine - onTheLine(oldBarMs[line.bar - 1]);
    round.ended = true; // (its end is never reached)
    for (var i = 0; i < round.placed; i++)
      if (round.notes[i].now >= round.cut) unplace(round.notes[i]);
    rounds.push(next);
    if (player) player.setRate(line.at, rateFor(bpm));
    placeNotes(next, now);
    pendingSwitch = {
      round: round,
      next: next,
      at: line.at,
      timer: window.setTimeout(
        function () {
          pendingSwitch = null;
          if (onSwitched) onSwitched(line.bar);
        },
        (line.at - now) * 1000
      ),
    };
    return true;
  };

  // a tempo change still to come is not to happen (another replaces it, or a pause)
  function undoSwitch(now) {
    var plan = pendingSwitch;
    pendingSwitch = null;
    if (!plan || now >= plan.at - MARGIN) return;
    window.clearTimeout(plan.timer);
    plan.next.notes.forEach(unplace);
    rounds.splice(rounds.indexOf(plan.next), 1);
    plan.round.cut = Infinity;
    plan.round.ended = false;
    if (player) player.cancelRatesFrom(plan.at);
    placeNotes(plan.round, now);
  }

  /**
   * Bar 1 has moved `delta` (s) in the song: the drums move with it, straight
   * away (to nudge them into place while playing along).
   */
  engine.moveBar1 = function (delta) {
    if (!engine.playing || !delta || !rounds.length) return;
    var now = clock();
    undoSwitch(now);
    var round = playingRoundAt(now) || rounds[0];
    var shift = delta / rateFor(round.bpm);
    unplaceAll(now + MARGIN);
    rounds.forEach(function (r) {
      r.start += shift;
    });
    if (player) {
      player.cancelRatesFrom(now);
      applyRates(now);
    }
    tick();
  };

  // --- the song ---
  /**
   * Plays along with this song (a decoded AudioBuffer) from now on, or with
   * none (null). Stop playing first.
   * @param {any} buffer
   * @param {SongSetting|null} setting
   */
  engine.setSong = function (buffer, setting) {
    cutEverything();
    if (!buffer || !setting) {
      if (song) setDrumVolume(1);
      song = null;
      return;
    }
    var ctx = env.ctx();
    var output = ctx.createGain();
    output.connect(ctx.destination);
    song = {
      buffer: buffer,
      setting: setting,
      output: output,
      drums: 1,
      keepPitch: true,
      hits: null,
      loop: null,
    };
  };

  /** Whether the song keeps its pitch when it's slower or faster (from the next play). */
  engine.setKeepPitch = function (on) {
    if (song) song.keepPitch = !!on;
  };

  /** The song's settings changed (its tempo, bar 1, start). */
  engine.setSetting = function (setting) {
    if (song) song.setting = setting;
  };

  /**
   * The part of the song to loop ({start, end}, s; songLoop), or null to play it
   * straight through (from the next play).
   */
  engine.setLoop = function (loop) {
    if (song) song.loop = loop || null;
  };

  /** The song's and the drums' volumes (0-1, or more to boost). */
  engine.setVolumes = function (songVolume, drumVolume) {
    if (!song) return;
    song.output.gain.value = songVolume;
    song.drums = drumVolume;
    if (engine.playing) setDrumVolume(drumVolume);
  };

  /** Where in the song it is now (s), or -1 when it isn't playing. */
  engine.songPosition = function () {
    return player && engine.playing ? player.positionAt(clock()) : -1;
  };

  /** Called as play starts (the song's own Listen stops). */
  engine.onStart = function () {};

  /** Whether a song is on (the clock plays the rounds). */
  engine.isOn = function () {
    return !!song;
  };

  return engine;
}
