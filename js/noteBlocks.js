// Infinity Drumming, 2026: copy and paste a block of notes (any lines, any notes
// of them) chosen with a box dragged over the grid.
//
// The groove is held as text lines with a character a note slot, the link's
// lines (HH, Snare, Kick ...) and their flams' and diddles' lines (OrnH, OrnHd
// ...). A row of the grid is one of those lines with its flams and diddles, but
// the kick line holds two rows: the kick ('o'), the hi-hat foot ('x'), both ('X').
// A block keeps its notes' places relative to its first one, so a paste lands the
// same shape (across bars too) wherever it starts. Pasting replaces what's there
// in the rows it has, rests included; other rows are left as they are.

/** Each row of the grid: its line, its flams' and diddles' lines, and for the
 * kick line which of its two rows it is. */
var BLOCK_ROWS = {
  sticking: { line: 'Stickings', extras: [] },
  crash: { line: 'Crash', extras: ['OrnC', 'OrnCd'] },
  ride: { line: 'Ride', extras: ['OrnR', 'OrnRd'] },
  hh: { line: 'HH', extras: ['OrnH', 'OrnHd'] },
  tom1: { line: 'Tom1', extras: ['OrnT1', 'OrnT1d'] },
  tom2: { line: 'Tom2', extras: ['OrnT2', 'OrnT2d'] },
  snare: { line: 'Snare', extras: ['OrnS', 'OrnSd'] },
  tom4: { line: 'Tom4', extras: ['OrnT4', 'OrnT4d'] },
  kick: { line: 'Kick', extras: ['OrnK', 'OrnKd'], part: 'kick' },
  hhfoot: { line: 'Kick', extras: [], part: 'foot' },
};

// the kick line's character, as its two rows
function kickParts(char) {
  return { kick: char == 'o' || char == 'X', foot: char == 'x' || char == 'X' };
}
function kickChar(parts) {
  if (parts.kick && parts.foot) return 'X';
  if (parts.kick) return 'o';
  return parts.foot ? 'x' : '-';
}

function charAt(lines, line, index) {
  var chars = lines[line] || '';
  return index < chars.length ? chars.charAt(index) : '-';
}

function setChar(lines, line, index, char) {
  var chars = lines[line];
  if (chars === undefined || index >= chars.length) return;
  lines[line] = chars.slice(0, index) + char + chars.slice(index + 1);
}

/**
 * The notes of some cells of the grid, from the groove's lines.
 *
 * @param {Object<string, string>} lines  the groove's lines, a character a slot
 * @param {Array<{row: string, index: number}>} cells  rows of BLOCK_ROWS, slot numbers
 * @returns {{cells: Array<{row: string, offset: number, chars: Object<string, string>}>, span: number}}
 */
export function copyBlock(lines, cells) {
  var known = cells.filter(function (cell) {
    return BLOCK_ROWS[cell.row];
  });
  if (!known.length) return { cells: [], span: 0 };
  var first = Math.min.apply(
    null,
    known.map(function (cell) {
      return cell.index;
    })
  );
  var last = 0;
  var copied = known.map(function (cell) {
    var row = BLOCK_ROWS[cell.row];
    /** @type {Object<string, string>} */
    var chars = {};
    var char = charAt(lines, row.line, cell.index);
    if (row.part) chars[row.part] = kickParts(char)[row.part] ? '1' : '0';
    else chars[row.line] = char;
    row.extras.forEach(function (extra) {
      chars[extra] = charAt(lines, extra, cell.index);
    });
    last = Math.max(last, cell.index - first);
    return { row: cell.row, offset: cell.index - first, chars: chars };
  });
  return { cells: copied, span: last + 1 };
}

/**
 * Paste a block into the groove's lines (changed in place) from slot `at`.
 * `isOpen(slot)` says whether a slot can take notes (not past the end of a
 * shorter bar, say); notes for others, or past the groove's end, are left out.
 * Returns the cells written.
 *
 * @param {Object<string, string>} lines
 * @param {{cells: Array<{row: string, offset: number, chars: Object<string, string>}>}} block
 * @param {number} at
 * @param {function(number): boolean} [isOpen]
 * @returns {Array<{row: string, index: number}>}
 */
export function pasteBlock(lines, block, at, isOpen) {
  var written = [];
  block.cells.forEach(function (cell) {
    var row = BLOCK_ROWS[cell.row];
    if (!row) return;
    var index = at + cell.offset;
    var length = (lines[row.line] || '').length;
    if (index < 0 || index >= length || (isOpen && !isOpen(index))) return;
    if (row.part) {
      var parts = kickParts(charAt(lines, row.line, index));
      parts[row.part] = cell.chars[row.part] == '1';
      setChar(lines, row.line, index, kickChar(parts));
    } else setChar(lines, row.line, index, cell.chars[row.line]);
    row.extras.forEach(function (extra) {
      if (cell.chars[extra] !== undefined) setChar(lines, extra, index, cell.chars[extra]);
    });
    written.push({ row: cell.row, index: index });
  });
  return written;
}
