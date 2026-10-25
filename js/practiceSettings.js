// Infinity Drumming, 2026: an exercise's practice settings, carried in its link.
//
// Everything a teacher sets up for an assignment besides the notes: the
// permutation figures, the auto speed-up, the count-in, the click's Solo and
// offset start, and which lines are muted in which bars.
// Only the settings that are on go into the link, so a plain groove's link is
// unchanged:
//   Perm=kick_16ths&PermSet=0011..&PlayEach=2   permutation, its ticked boxes
//                                               (in the options' order), × each
//   PermBars=3-6,9                              just these bars of the run
//   PlayBars=1-2  PlayBars=B                    just these bars (or sections) of a groove
//   Ostinato=2                                  the figures go over the first
//                                               2 bars (1 if not given)
//   FatBack=1                                   kick figures without the kicks
//                                               on the snare's backbeat
//   SpeedUp=5,2m  SpeedUp=5,16b,once,to120      bpm, every 2 minutes / 16 bars,
//                                               only once, stop at 120
//   CountIn=1  ClickSolo=1  ClickStart=AND
//   Mute=hh:1:2,kick:3                          a line muted in some bars (1-based)
//   Song=Name.mp3&SongBPM=92.4&SongBar1=3.215   a song to play along with: its file's
//   &SongStart=intro                            name, tempo, bar 1 (s) and start

/** The most bars between speed-ups (the speed-up pop-up's bars box). */
export var MAX_SPEED_UP_BARS = 999;
/** The offset click starts (1 is the normal one). */
var CLICK_STARTS = ['1', 'E', 'AND', 'A', 'ROTATE', 'TI', 'TA'];
/** The lines that can be muted, as the mute buttons name them. */
export var MUTE_LINES = ['hh', 'snare', 'kick', 'hhfoot', 'tom1', 'tom2', 'tom4', 'crash', 'ride'];
/** The song tempos allowed (bpm). */
var MIN_SONG_BPM = 20;
var MAX_SONG_BPM = 300;
/** The permutations that can be in a link. */
var PERMUTATION_TYPES = [
  'kick_16ths',
  'snare_16ths',
  'kick_snare_kick_lead',
  'kick_snare_snare_lead',
];

/**
 * @typedef {{type: string, boxes: string, playEach: number, bars: string, fatBack?: boolean,
 *   ostinato?: number, trade?: (TradeSetting|null)}} PermutationSetting
 *   boxes: each permutation option checkbox, in order, '1' ticked / '0' not;
 *   bars: the bars of the run to practise ("3-6, 9"), '' for all;
 *   fatBack: a kick permutation leaves out the kicks on the snare's backbeat;
 *   ostinato: the groove's first bars the figures go over (links from before
 *   October 2026 have 1: their permutations played bar 1 only);
 *   trade: grooves or fills traded with the figures (Infinity Drumming, 2026)
 * @typedef {{bars: number, times: number, after: boolean}} TradeSetting
 *   the groove's bars after the ostinato's, played `times` times before (or
 *   after) each bar of the run; links: "Trade=2x3a" (2 bars, 3 times, after)
 * @typedef {{amount: number, every: number, unit: string, keepGoing: boolean, target: number}} SpeedUpSetting
 *   unit 'm' (minutes) or 'b' (bars); target 0 = no "Stop at"
 * @typedef {{name: string, bpm: number, bar1: number, start: string}} SongSetting
 *   a song to play along with (playAlong.js; Infinity Drumming, 2026): its file's
 *   name (the song itself stays on the player's device), its tempo (bpm, one
 *   decimal), where its bar 1 is (s, to the ms) and where play starts ('bar1', or
 *   'intro': from the song's start, the drums in on bar 1)
 * @typedef {{permutation: (PermutationSetting|null), speedUp: (SpeedUpSetting|null),
 *   countIn: boolean, clickSolo: boolean, clickStart: string,
 *   mutes: Object<string, number[]>, playBars?: string, song?: (SongSetting|null)}} PracticeSettings
 *   playBars: the bars of a groove to practise ("1-3, 6"), '' for all;
 *   song: only when the link has one
 */

/** @returns {PracticeSettings} every setting off */
export function emptyPracticeSettings() {
  return {
    permutation: null,
    speedUp: null,
    countIn: false,
    clickSolo: false,
    clickStart: '1',
    mutes: {},
    playBars: '',
  };
}

function whole(value, min, max, fallback) {
  var n = parseInt(value, 10);
  if (isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/** The speed-up as link text ("5,2m", "5,16b,once,to120"). */
function speedUpToText(speedUp) {
  var text = speedUp.amount + ',' + speedUp.every + speedUp.unit;
  if (!speedUp.keepGoing) text += ',once';
  if (speedUp.target) text += ',to' + speedUp.target;
  return text;
}

/** @returns {SpeedUpSetting|null} */
function speedUpFromText(text) {
  if (!text) return null;
  var parts = String(text).split(',');
  var every = /^(\d+)([mb])$/.exec(parts[1] || '');
  var speedUp = {
    amount: whole(parts[0], 1, 100, 5),
    unit: every ? every[2] : 'm',
    every: 0,
    keepGoing: parts.indexOf('once') < 0,
    target: 0,
  };
  speedUp.every =
    speedUp.unit == 'b'
      ? whole(every && every[1], 1, MAX_SPEED_UP_BARS, 16)
      : whole(every && every[1], 1, 20, 2);
  parts.forEach(function (part) {
    if (/^to\d+$/.test(part)) speedUp.target = whole(part.slice(2), 30, 300, 0);
  });
  return speedUp;
}

/** The mutes as link text ("hh:1:2,kick:3"), '' when nothing is muted. */
function mutesToText(mutes) {
  return MUTE_LINES.filter(function (line) {
    return mutes[line] && mutes[line].length;
  })
    .map(function (line) {
      return [line].concat(mutes[line]).join(':');
    })
    .join(',');
}

function mutesFromText(text) {
  /** @type {Object<string, number[]>} */
  var mutes = {};
  String(text || '')
    .split(',')
    .forEach(function (entry) {
      var parts = entry.split(':');
      if (MUTE_LINES.indexOf(parts[0]) < 0) return;
      var bars = parts
        .slice(1)
        .map(function (bar) {
          return parseInt(bar, 10);
        })
        .filter(function (bar) {
          return bar >= 1 && bar <= 64;
        });
      if (bars.length) mutes[parts[0]] = bars;
    });
  return mutes;
}

// "3-6, 9" as a link has it ("3-6,9"), and back
// (bars in an order, "1x4 2 1x4 3", go as "1x4_2_1x4_3"; Infinity Drumming, 2026)
function barsToUrl(bars) {
  return String(bars).replace(/,\s*/g, ',').replace(/\s+/g, '_');
}
// ordered: the alphabet's bars, which can be in an order
function barsFromUrl(text, ordered) {
  if (ordered && /[x_]/.test(String(text)))
    return String(text)
      .replace(/[^0-9,x_-]/g, '')
      .replace(/[_,]+/g, ' ')
      .trim();
  return String(text || '')
    .replace(/[^0-9A-Fa-f,-]/g, '') // (a groove's sections by letter too)
    .split(',')
    .filter(Boolean)
    .join(', ');
}

/**
 * The permutation as link parameters ('&Perm=...&PermSet=...'), '' for none.
 * @param {PermutationSetting|null} perm
 */
function permutationToUrl(perm) {
  if (!perm || PERMUTATION_TYPES.indexOf(perm.type) < 0) return '';
  var url = '&Perm=' + perm.type;
  if (perm.boxes) url += '&PermSet=' + perm.boxes;
  if (perm.playEach > 1) url += '&PlayEach=' + perm.playEach;
  if (perm.bars) url += '&PermBars=' + barsToUrl(perm.bars);
  if (perm.fatBack) url += '&FatBack=1';
  if (perm.ostinato > 1) url += '&Ostinato=' + perm.ostinato;
  if (perm.trade && perm.trade.bars) url += '&Trade=' + tradeToText(perm.trade);
  return url;
}

/** @param {TradeSetting} trade */
function tradeToText(trade) {
  return trade.bars + (trade.times > 1 ? 'x' + trade.times : '') + (trade.after ? 'a' : '');
}

/** @returns {TradeSetting|null} */
function tradeFromText(text) {
  var trade = /^(\d+)(?:x(\d+))?(a?)$/i.exec(String(text || '').trim());
  if (!trade) return null;
  return {
    bars: whole(trade[1], 1, 4, 1),
    times: whole(trade[2] || '1', 1, 8, 1),
    after: trade[3] !== '',
  };
}

/** A song tempo to one decimal, or 0 if it isn't one in range. */
export function songBpm(value) {
  var bpm = parseFloat(value);
  if (!(bpm >= MIN_SONG_BPM && bpm <= MAX_SONG_BPM)) return 0;
  return Math.round(bpm * 10) / 10;
}

/** @param {SongSetting} song */
function songToUrl(song) {
  return (
    '&Song=' +
    encodeURIComponent(song.name) +
    '&SongBPM=' +
    song.bpm +
    '&SongBar1=' +
    Math.round(song.bar1 * 1000) / 1000 +
    (song.start == 'intro' ? '&SongStart=intro' : '')
  );
}

/** @returns {SongSetting|null} */
function songFromUrl(get) {
  var name = String(get('Song', '') || '').replace(/\+/g, ' ');
  try {
    name = decodeURIComponent(name);
  } catch (err) {
    console.log('A song name kept as it was: ' + err);
  }
  name = name.slice(0, 200);
  var bpm = songBpm(get('SongBPM', ''));
  if (!name || !bpm) return null;
  var bar1 = parseFloat(get('SongBar1', '0'));
  return {
    name: name,
    bpm: bpm,
    bar1: bar1 >= 0 && bar1 < 3600 ? Math.round(bar1 * 1000) / 1000 : 0,
    start: String(get('SongStart', '')).toLowerCase() == 'intro' ? 'intro' : 'bar1',
  };
}

/**
 * The practice settings that are on, as link parameters ('&Perm=...&CountIn=1').
 * @param {PracticeSettings} settings
 */
export function practiceSettingsToUrl(settings) {
  if (!settings) return '';
  var url = permutationToUrl(settings.permutation);
  if (settings.playBars) url += '&PlayBars=' + barsToUrl(settings.playBars);
  if (settings.speedUp) url += '&SpeedUp=' + speedUpToText(settings.speedUp);
  if (settings.countIn) url += '&CountIn=1';
  if (settings.clickSolo) url += '&ClickSolo=1';
  if (settings.clickStart && settings.clickStart != '1')
    url += '&ClickStart=' + settings.clickStart;
  var mutes = mutesToText(settings.mutes || {});
  if (mutes) url += '&Mute=' + mutes;
  if (settings.song && settings.song.name) url += songToUrl(settings.song);
  return url;
}

/**
 * The practice settings in a link.
 * @param {(name: string, fallback: any) => any} get  a link parameter (any case), or fallback
 * @returns {PracticeSettings}
 */
export function practiceSettingsFromUrl(get) {
  var settings = emptyPracticeSettings();
  var type = get('Perm', '');
  if (PERMUTATION_TYPES.indexOf(type) >= 0)
    settings.permutation = {
      type: type,
      boxes: String(get('PermSet', '')).replace(/[^01]/g, ''),
      playEach: whole(get('PlayEach', '1'), 1, 16, 1),
      bars: barsFromUrl(get('PermBars', ''), true),
      fatBack: get('FatBack', '0') == '1',
      ostinato: whole(get('Ostinato', '1'), 1, 99, 1),
    };
  var trade = settings.permutation && tradeFromText(get('Trade', ''));
  if (trade) settings.permutation.trade = trade;
  settings.speedUp = speedUpFromText(get('SpeedUp', ''));
  settings.countIn = get('CountIn', '0') == '1';
  settings.clickSolo = get('ClickSolo', '0') == '1';
  var start = String(get('ClickStart', '1')).toUpperCase();
  settings.clickStart = CLICK_STARTS.indexOf(start) >= 0 ? start : '1';
  settings.mutes = mutesFromText(get('Mute', ''));
  settings.playBars = barsFromUrl(get('PlayBars', ''));
  var song = songFromUrl(get);
  if (song) settings.song = song;
  return settings;
}
