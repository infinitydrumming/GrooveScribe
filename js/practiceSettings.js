// Infinity Drumming, 2026: an exercise's practice settings, carried in its link.
//
// Everything a teacher sets up for an assignment besides the notes: the
// permutation figures, the auto speed-up, the count-in, the click's Solo and
// offset start, and which lines are muted in which bars.
// Only the settings that are on go into the link, so a plain groove's link is
// unchanged:
//   Perm=kick_16ths&PermSet=0011..&PlayEach=2   permutation, its ticked boxes
//                                               (in the options' order), × each
//   SpeedUp=5,2m  SpeedUp=5,16b,once,to120      bpm, every 2 minutes / 16 bars,
//                                               only once, stop at 120
//   CountIn=1  ClickSolo=1  ClickStart=AND
//   Mute=hh:1:2,kick:3                          a line muted in some bars (1-based)

/** The offset click starts (1 is the normal one). */
var CLICK_STARTS = ['1', 'E', 'AND', 'A', 'ROTATE', 'TI', 'TA'];
/** The lines that can be muted, as the mute buttons name them. */
export var MUTE_LINES = ['hh', 'snare', 'kick', 'hhfoot', 'tom1', 'tom2', 'tom4', 'crash', 'ride'];
/** The permutations that can be in a link. */
var PERMUTATION_TYPES = [
  'kick_16ths',
  'snare_16ths',
  'kick_snare_kick_lead',
  'kick_snare_snare_lead',
];

/**
 * @typedef {{type: string, boxes: string, playEach: number}} PermutationSetting
 *   boxes: each permutation option checkbox, in order, '1' ticked / '0' not
 * @typedef {{amount: number, every: number, unit: string, keepGoing: boolean, target: number}} SpeedUpSetting
 *   unit 'm' (minutes) or 'b' (bars); target 0 = no "Stop at"
 * @typedef {{permutation: (PermutationSetting|null), speedUp: (SpeedUpSetting|null),
 *   countIn: boolean, clickSolo: boolean, clickStart: string,
 *   mutes: Object<string, number[]>}} PracticeSettings
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
      ? Math.round(whole(every && every[1], 4, 64, 16) / 4) * 4
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

/**
 * The practice settings that are on, as link parameters ('&Perm=...&CountIn=1').
 * @param {PracticeSettings} settings
 */
export function practiceSettingsToUrl(settings) {
  if (!settings) return '';
  var url = '';
  var perm = settings.permutation;
  if (perm && PERMUTATION_TYPES.indexOf(perm.type) >= 0) {
    url += '&Perm=' + perm.type;
    if (perm.boxes) url += '&PermSet=' + perm.boxes;
    if (perm.playEach > 1) url += '&PlayEach=' + perm.playEach;
  }
  if (settings.speedUp) url += '&SpeedUp=' + speedUpToText(settings.speedUp);
  if (settings.countIn) url += '&CountIn=1';
  if (settings.clickSolo) url += '&ClickSolo=1';
  if (settings.clickStart && settings.clickStart != '1')
    url += '&ClickStart=' + settings.clickStart;
  var mutes = mutesToText(settings.mutes || {});
  if (mutes) url += '&Mute=' + mutes;
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
    };
  settings.speedUp = speedUpFromText(get('SpeedUp', ''));
  settings.countIn = get('CountIn', '0') == '1';
  settings.clickSolo = get('ClickSolo', '0') == '1';
  var start = String(get('ClickStart', '1')).toUpperCase();
  settings.clickStart = CLICK_STARTS.indexOf(start) >= 0 ? start : '1';
  settings.mutes = mutesFromText(get('Mute', ''));
  return settings;
}
