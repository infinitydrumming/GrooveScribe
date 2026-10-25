// Infinity Drumming, 2026: the "Play along with a song" pop-up.
//
// The player loads a song from their device (it never leaves it), says its
// tempo (typed, or tapped), and where its bar 1 is (tapped while it plays,
// clicked on its wave, then nudged a few ms), and whether play starts at bar 1
// or at the song's intro. This device remembers all that for each song, and the
// groove's link carries it (the song's name, tempo, bar 1 and start), so a
// student who loads the same song plays along in the same place.
// The steady clock that plays it all is in playAlong.js.

import {
  TAP_RESET,
  HIT_RANGE,
  tapTempo,
  nearestHit,
  wavePeaks,
  songTimeText,
  songTimeFromText,
  createSongPlayer,
} from './playAlong.js';
import { songBpm } from './practiceSettings.js';

/** Where this device keeps each song's settings. */
var STORAGE_KEY = 'infinityScribePlayAlong';
/** The most songs remembered (the oldest go). */
var MAX_STORED_SONGS = 40;
/** How much of the song the close-up wave shows, before and after bar 1 (s). */
var CLOSE_UP_BEFORE = 1;
var CLOSE_UP_AFTER = 3;
/** Listen starts this long before bar 1 (s). */
var LISTEN_LEAD = 2;
/** The speeds offered (percent of the song's own). */
var SPEEDS = [50, 60, 70, 75, 80, 90, 100];
var MIN_TEMPO = 30;
var MAX_TEMPO = 300;

/** @typedef {import('./practiceSettings.js').SongSetting} SongSetting */

function el(id) {
  return document.getElementById(id);
}

function input(id) {
  return /** @type {HTMLInputElement | null} */ (el(id));
}

function setText(id, text) {
  var node = el(id);
  if (node) node.textContent = text;
}

function show(id, shown) {
  var node = el(id);
  if (node) node.style.display = shown ? '' : 'none';
}

// --- this device's songs ---
function storedSongs() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') || {};
  } catch (err) {
    console.log('Play-along settings could not be read: ' + err);
    return {};
  }
}

function storeSong(key, entry) {
  var songs = storedSongs();
  songs[key] = entry;
  var keys = Object.keys(songs).sort(function (a, b) {
    return (songs[b].at || 0) - (songs[a].at || 0);
  });
  keys.slice(MAX_STORED_SONGS).forEach(function (old) {
    delete songs[old];
  });
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
  } catch (err) {
    console.log('Play-along settings kept for this visit only: ' + err);
  }
}

/** A song's name on this device: its file's name and its length. */
export function songKey(name, duration) {
  return name + '|' + Math.round(duration);
}

// one channel to look for hits in (the channels mixed)
function monoOf(buffer) {
  var mono = new Float32Array(buffer.length);
  for (var c = 0; c < buffer.numberOfChannels; c++) {
    var data = buffer.getChannelData(c);
    for (var i = 0; i < data.length; i++) mono[i] += data[i] / buffer.numberOfChannels;
  }
  return mono;
}

/** Where a song's first hit is (s): the first time it gets loud. */
export function firstHit(samples, sampleRate) {
  var peak = 0;
  for (var i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]));
  for (var j = 0; j < samples.length; j++)
    if (Math.abs(samples[j]) > peak * 0.1)
      return nearestHit(samples, sampleRate, j / sampleRate, HIT_RANGE);
  return 0;
}

function decode(ctx, data) {
  return new Promise(function (resolve, reject) {
    var decoding = ctx.decodeAudioData(data, resolve, reject); // (Safari wants the callbacks)
    if (decoding && decoding.then) decoding.then(resolve, reject);
  });
}

function readFile(file) {
  if (file.arrayBuffer) return file.arrayBuffer();
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () {
      resolve(reader.result);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * The pop-up and the song chip in the play bar.
 * deps:
 *   gu            the GrooveUtils (its playAlong clock, tempo, playing)
 *   meter()       the groove's time signature {top, bottom} (the wave's beat lines)
 *   changed()     the song's settings changed (the link)
 * @param {{gu: any, meter: () => {top: number, bottom: number}, changed: () => void}} deps
 */
export function createPlayAlongPanel(deps) {
  var gu = deps.gu;
  var song = null; // {name, buffer, mono, sampleRate, duration, key}
  /** @type {SongSetting|null} */
  var setting = null;
  /** @type {SongSetting|null} */
  var linked = null; // a link's song, until it is loaded
  var on = true;
  var volumes = { song: 1, drums: 1 };
  var taps = [];
  var preview = null; // Listen: {player, output}
  var overviewPeaks = null;
  var drawing = false;
  var wired = false;

  function ctx() {
    return typeof MIDI != 'undefined' && MIDI.Player ? MIDI.Player.ctx : null;
  }

  function engine() {
    return gu.playAlong;
  }

  // --- the song ---
  function loadFile(file) {
    if (!file) return;
    var audio = ctx();
    if (!audio) {
      setText('playAlongStatus', 'The drum sounds are still loading: try again in a moment.');
      return;
    }
    stopPlaying();
    setText('playAlongStatus', 'Loading ' + file.name + '…');
    readFile(file)
      .then(function (data) {
        return decode(audio, data);
      })
      .then(function (buffer) {
        useSong(file.name, buffer);
        setText('playAlongStatus', '');
      })
      .catch(function () {
        setText(
          'playAlongStatus',
          file.name + " couldn't be read as a song (try an MP3, M4A or WAV)."
        );
      });
  }

  function useSong(name, buffer) {
    var mono = monoOf(buffer);
    song = {
      name: name,
      buffer: buffer,
      mono: mono,
      sampleRate: buffer.sampleRate,
      duration: buffer.duration,
      key: songKey(name, buffer.duration),
    };
    overviewPeaks = null;
    var stored = storedSongs()[song.key];
    if (linked && linked.name == name) setting = Object.assign({}, linked);
    else if (stored)
      setting = { name: name, bpm: stored.bpm, bar1: stored.bar1, start: stored.start };
    else
      setting = {
        name: name,
        bpm: songBpm(gu.getTempo()) || 120,
        bar1: firstHit(mono, buffer.sampleRate),
        start: 'bar1',
      };
    volumes = stored ? { song: stored.song, drums: stored.drums } : { song: 1, drums: 1 };
    on = true;
    toEngine();
    settingsChanged();
  }

  function toEngine() {
    engine().setSong(on && song ? song.buffer : null, on && song ? setting : null);
    engine().setVolumes(volumes.song, volumes.drums);
    engine().onStart = function () {
      stopListening();
      animate(); // (the wave follows the song, if the pop-up is open)
    };
  }

  function stopPlaying() {
    stopListening();
    if (gu.isPlaying() || gu.isMIDIPaused) gu.stopMIDI_playback();
  }

  function settingsChanged() {
    if (song && setting)
      storeSong(song.key, {
        bpm: setting.bpm,
        bar1: setting.bar1,
        start: setting.start,
        song: volumes.song,
        drums: volumes.drums,
        at: Date.now(),
      });
    engine().setSetting(setting);
    refresh();
    deps.changed();
  }

  function removeSong() {
    stopPlaying();
    song = null;
    setting = null;
    linked = null;
    toEngine();
    refresh();
    deps.changed();
  }

  // --- tempo ---
  // the song's tempo; the groove's keeps its speed through the song (so a song
  // first set up plays at its own speed)
  function setBpm(bpm) {
    var speed = gu.getTempo() / setting.bpm;
    setting.bpm = bpm;
    setTempo(bpm * speed);
    settingsChanged();
  }

  function setTempo(tempo) {
    gu.setTempo(Math.min(MAX_TEMPO, Math.max(MIN_TEMPO, Math.round(tempo))));
    refreshSpeed();
  }

  // the song's speed: the groove's while playing along, else its own
  function playingSpeed() {
    return engine().playing ? gu.getTempo() / setting.bpm : 1;
  }

  // when a tap was (s), as the page's clock has it (not when it's handled)
  function tapTime(event) {
    return (event && event.timeStamp ? event.timeStamp : performance.now()) / 1000;
  }

  function tapBeat(event) {
    if (!setting) return;
    var now = tapTime(event);
    if (taps.length && now - taps[taps.length - 1] > TAP_RESET) taps = [];
    taps.push(now);
    setText('playAlongTapCount', taps.length > 1 ? taps.length + ' taps' : 'keep tapping');
    var tapped = tapTempo(taps);
    if (tapped && taps.length >= 3) setBpm(songBpm(tapped / playingSpeed()) || setting.bpm);
  }

  // --- bar 1 ---
  function setBar1(bar1) {
    var time = Math.max(0, Math.min(song.duration, Math.round(bar1 * 1000) / 1000));
    engine().moveBar1(time - setting.bar1); // (heard straight away while playing)
    setting.bar1 = time;
    settingsChanged();
  }

  // where in the song the sound being heard now (or `ago` s ago) is (s), or -1
  function heardPosition(ago) {
    var audio = ctx();
    var latency = gu.getReportedAudioLatencyMs() / 1000 + (ago || 0);
    if (preview) return preview.player.positionAt(audio.currentTime - latency);
    var position = engine().songPosition();
    return position < 0 ? -1 : position - latency * playingSpeed();
  }

  function tapOne(event) {
    if (!setting) return;
    var position = heardPosition(Math.max(0, performance.now() / 1000 - tapTime(event)));
    if (position < 0) {
      setText('playAlongHint', 'Press Listen (or play the groove), then tap on a 1.');
      return;
    }
    var hit = nearestHit(song.mono, song.sampleRate, position, HIT_RANGE);
    if (!preview) {
      // playing along: a 1 of any bar, so the bar 1 nearest the one set
      var bar = (deps.meter().top * 4) / deps.meter().bottom / (setting.bpm / 60);
      hit -= Math.round((hit - setting.bar1) / bar) * bar;
    }
    setBar1(hit);
  }

  function waveClicked(event, from, to, range) {
    if (!song) return;
    var canvas = /** @type {HTMLCanvasElement} */ (event.currentTarget);
    var box = canvas.getBoundingClientRect();
    var time = from + ((event.clientX - box.left) / box.width) * (to - from);
    setBar1(nearestHit(song.mono, song.sampleRate, time, range));
  }

  // --- Listen: the song alone, from just before bar 1 ---
  function listen() {
    if (preview) {
      stopListening();
      return;
    }
    var audio = ctx();
    if (!audio || !song) return;
    stopPlaying();
    if (audio.resume) audio.resume();
    var output = audio.createGain();
    output.gain.value = volumes.song;
    output.connect(audio.destination);
    var player = createSongPlayer(audio, song.buffer, output);
    player.play(audio.currentTime + 0.05, Math.max(0, setting.bar1 - LISTEN_LEAD), 1);
    preview = { player: player, output: output };
    setText('playAlongListen', 'Stop');
    animate();
  }

  function stopListening() {
    if (!preview) return;
    var audio = ctx();
    preview.player.stop(audio.currentTime, 0.05);
    preview = null;
    setText('playAlongListen', 'Listen');
  }

  // --- the waves ---
  function sizeCanvas(canvas) {
    var ratio = window.devicePixelRatio || 1;
    var width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    var height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width != width) canvas.width = width;
    if (canvas.height != height) canvas.height = height;
    return canvas.getContext && canvas.getContext('2d');
  }

  function drawPeaks(g, canvas, peaks) {
    var middle = canvas.height / 2;
    g.fillStyle = getComputedStyle(canvas).color;
    for (var x = 0; x < peaks.length; x++) {
      var half = Math.max(0.5, peaks[x] * middle);
      g.fillRect(x, middle - half, 1, half * 2);
    }
  }

  function drawLine(g, canvas, x, color, width) {
    g.fillStyle = color;
    g.fillRect(Math.round(x - width / 2), 0, width, canvas.height);
  }

  function drawWaves() {
    if (!song) return;
    var playing = heardPosition();
    drawOverview(playing);
    drawCloseUp(playing);
  }

  // the whole song, bar 1 and where it's playing
  function drawOverview(playing) {
    var overview = /** @type {HTMLCanvasElement | null} */ (el('playAlongOverview'));
    var g = overview && sizeCanvas(overview);
    if (!g) return;
    var ratio = window.devicePixelRatio || 1;
    if (!overviewPeaks || overviewPeaks.length != overview.width)
      overviewPeaks = wavePeaks(song.mono, song.sampleRate, 0, song.duration, overview.width);
    g.clearRect(0, 0, overview.width, overview.height);
    drawPeaks(g, overview, overviewPeaks);
    var scale = overview.width / song.duration;
    drawLine(g, overview, setting.bar1 * scale, '#c55000', 2 * ratio);
    if (playing >= 0) drawLine(g, overview, playing * scale, '#0b76db', 2 * ratio);
  }

  // close up on bar 1, with the song's beats at its tempo
  function drawCloseUp(playing) {
    var closeUp = /** @type {HTMLCanvasElement | null} */ (el('playAlongCloseUp'));
    var g = closeUp && sizeCanvas(closeUp);
    if (!g) return;
    var ratio = window.devicePixelRatio || 1;
    var from = setting.bar1 - CLOSE_UP_BEFORE;
    var to = setting.bar1 + CLOSE_UP_AFTER;
    var px = closeUp.width / (to - from);
    g.clearRect(0, 0, closeUp.width, closeUp.height);
    drawPeaks(g, closeUp, wavePeaks(song.mono, song.sampleRate, from, to, closeUp.width));
    var meter = deps.meter();
    var beat = 240 / meter.bottom / setting.bpm; // (s)
    for (var n = Math.ceil(-CLOSE_UP_BEFORE / beat); n * beat <= CLOSE_UP_AFTER; n++) {
      var bar = n % meter.top == 0;
      drawLine(
        g,
        closeUp,
        (n * beat + CLOSE_UP_BEFORE) * px,
        bar ? '#17345a' : '#a9b8ca',
        (bar ? 1.5 : 1) * ratio
      );
    }
    drawLine(g, closeUp, CLOSE_UP_BEFORE * px, '#c55000', 3 * ratio);
    if (playing >= from && playing <= to)
      drawLine(g, closeUp, (playing - from) * px, '#0b76db', 2 * ratio);
  }

  function animate() {
    if (drawing) return;
    drawing = true;
    var frame = function () {
      var open = el('playAlongConfiguration');
      if (!open || open.style.display != 'block' || (!preview && !engine().playing)) {
        drawing = false;
        drawWaves();
        return;
      }
      drawWaves();
      window.requestAnimationFrame(frame);
    };
    window.requestAnimationFrame(frame);
  }

  // --- what the pop-up and the chip show ---
  function refreshSpeed() {
    if (!setting) return;
    var tempo = gu.getTempo();
    setText(
      'playAlongSpeed',
      tempo +
        ' bpm: ' +
        Math.round((tempo / setting.bpm) * 100) +
        '% of the song' +
        (Math.abs(tempo - setting.bpm) > setting.bpm * 0.02
          ? ' (its pitch changes with its speed)'
          : '')
    );
  }

  function refresh() {
    var loaded = !!song;
    show('playAlongSettings', loaded);
    show('playAlongRemove', loaded);
    show('playAlongListen', loaded);
    setText(
      'playAlongSongName',
      loaded
        ? song.name + ' · ' + songTimeText(song.duration).replace(/\.\d+$/, '')
        : 'No song loaded'
    );
    var otherSong = !!linked && (!song || song.name != linked.name);
    setText(
      'playAlongLinked',
      otherSong
        ? 'This groove plays along with “' +
            linked.name +
            '”. Load it from your device to play along.'
        : ''
    );
    show('playAlongUseLink', otherSong && loaded);
    if (loaded) refreshSettings();
    refreshChip();
  }

  function refreshSettings() {
    var onBox = input('playAlongOn');
    if (onBox) onBox.checked = on;
    var bpm = input('playAlongBpm');
    if (bpm && document.activeElement !== bpm) bpm.value = String(setting.bpm);
    var bar1 = input('playAlongBar1');
    if (bar1 && document.activeElement !== bar1) bar1.value = songTimeText(setting.bar1);
    var start = input(setting.start == 'intro' ? 'playAlongStartIntro' : 'playAlongStartBar1');
    if (start) start.checked = true;
    setVolumeOutput('playAlongSongVolume', volumes.song);
    setVolumeOutput('playAlongDrumVolume', volumes.drums);
    refreshSpeed();
    drawWaves();
  }

  function setVolumeOutput(id, volume) {
    var slider = input(id);
    if (slider && document.activeElement !== slider)
      slider.value = String(Math.round(volume * 100));
    setText(id + 'Output', Math.round(volume * 100) + '%');
  }

  // the song in the play bar, by the tempo
  function refreshChip() {
    var chip = el('playAlongChip');
    var name = '';
    if (song) name = song.name;
    else if (linked) name = linked.name;
    if (!chip && name) {
      var tempo = el('tempoAndProgress' + gu.grooveUtilsUniqueIndex);
      if (!tempo || !tempo.parentNode) return;
      chip = document.createElement('button');
      chip.id = 'playAlongChip';
      chip.setAttribute('type', 'button');
      chip.addEventListener('click', open);
      tempo.parentNode.insertBefore(chip, tempo.nextSibling);
    }
    if (!chip) return;
    chip.style.display = name ? '' : 'none';
    chip.className = song && on ? 'playAlongOn' : '';
    if (!song) chip.title = 'Load “' + name + '” to play along';
    else chip.title = (on ? 'Playing along with ' : 'Not playing along with ') + name;
    chip.innerHTML = '<i class="fa fa-music"></i> <span class="playAlongChipName"></span>';
    chip.lastChild.textContent = name.replace(/\.[^.]+$/, '');
  }

  // --- the pop-up's controls ---
  function wire() {
    if (wired || !el('playAlongConfiguration')) return;
    wired = true;
    var on_ = function (id, type, handler) {
      var node = el(id);
      if (node) node.addEventListener(type, handler);
    };
    on_('playAlongFile', 'change', function (event) {
      var files = event.target.files;
      loadFile(files && files[0]);
      event.target.value = '';
    });
    on_('playAlongRemove', 'click', removeSong);
    on_('playAlongOn', 'change', function (event) {
      stopPlaying();
      on = event.target.checked;
      toEngine();
      refreshChip();
    });
    on_('playAlongBpm', 'change', function (event) {
      var bpm = songBpm(event.target.value);
      if (bpm) setBpm(bpm);
      else refresh();
    });
    on_('playAlongTapTempo', 'click', tapBeat);
    on_('playAlongBar1', 'change', function (event) {
      var time = songTimeFromText(event.target.value);
      if (time >= 0) setBar1(time);
      else refresh();
    });
    on_('playAlongNudgeDown', 'click', function () {
      setBar1(setting.bar1 - 0.01);
    });
    on_('playAlongNudgeUp', 'click', function () {
      setBar1(setting.bar1 + 0.01);
    });
    on_('playAlongTapOne', 'click', tapOne);
    on_('playAlongOverview', 'click', function (event) {
      var range = Math.max(HIT_RANGE, song ? song.duration / event.currentTarget.clientWidth : 0);
      waveClicked(event, 0, song ? song.duration : 0, range);
    });
    on_('playAlongCloseUp', 'click', function (event) {
      waveClicked(event, setting.bar1 - CLOSE_UP_BEFORE, setting.bar1 + CLOSE_UP_AFTER, HIT_RANGE);
    });
    ['playAlongStartBar1', 'playAlongStartIntro'].forEach(function (id) {
      on_(id, 'change', function () {
        var intro = input('playAlongStartIntro');
        setting.start = intro && intro.checked ? 'intro' : 'bar1';
        settingsChanged();
      });
    });
    on_('playAlongSongVolume', 'input', function (event) {
      volumes.song = event.target.value / 100;
      if (preview) preview.output.gain.value = volumes.song;
      engine().setVolumes(volumes.song, volumes.drums);
      settingsChanged();
    });
    on_('playAlongDrumVolume', 'input', function (event) {
      volumes.drums = event.target.value / 100;
      engine().setVolumes(volumes.song, volumes.drums);
      settingsChanged();
    });
    on_('playAlongUseLink', 'click', function () {
      setting = Object.assign({}, linked, { name: song.name });
      settingsChanged();
    });
    on_('playAlongListen', 'click', listen);
    on_('playAlongDone', 'click', close);
    var speeds = el('playAlongSpeeds');
    if (speeds)
      SPEEDS.forEach(function (percent) {
        var button = document.createElement('button');
        button.type = 'button';
        button.textContent = percent + '%';
        button.addEventListener('click', function () {
          setTempo((setting.bpm * percent) / 100);
        });
        speeds.appendChild(button);
      });
  }

  function open() {
    wire();
    var popup = el('playAlongConfiguration');
    if (!popup) return;
    popup.style.display = 'block';
    refresh();
    if (engine().playing) animate();
  }

  function close() {
    stopListening();
    var popup = el('playAlongConfiguration');
    if (popup) popup.style.display = 'none';
  }

  return {
    open: open,
    close: close,
    /** A link's song (or none): used when that song is loaded. */
    setLinkedSong: function (linkSong) {
      linked = linkSong ? Object.assign({}, linkSong) : null;
      if (linked && song && song.name == linked.name) {
        setting = Object.assign({}, linked);
        engine().setSetting(setting);
      }
      refresh();
    },
    /** The song for the groove's link: the one loaded, or the link's still to load. */
    linkSetting: function () {
      if (song && setting) return Object.assign({}, setting);
      return linked ? Object.assign({}, linked) : null;
    },
  };
}
