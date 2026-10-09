// Infinity Drumming, 2026: "My Grooves", grooves saved on this device.
//
// Kept in the browser's local storage (so not on another phone or computer, and
// gone if the browser's site data is cleared): newest first, one entry per groove
// link.  Each entry is { title, search, savedAt }, where `search` is the link's
// "?TimeSig=..." part that loadNewGroove() takes.

var STORAGE_KEY = 'infinityScribeMyGrooves';
var MAX_GROOVES = 100;

/** The saved grooves, newest first ([] if storage is unavailable or spoilt). */
export function loadMyGrooves(storage) {
  try {
    var list = JSON.parse((storage && storage.getItem(STORAGE_KEY)) || '[]');
    return Array.isArray(list)
      ? list.filter(function (entry) {
          return entry && typeof entry.search == 'string' && entry.search.charAt(0) == '?';
        })
      : [];
  } catch (err) {
    console.warn('My Grooves could not be read:', err);
    return [];
  }
}

function storeMyGrooves(storage, list) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_GROOVES)));
    return true;
  } catch (err) {
    console.warn('My Grooves could not be saved:', err);
    return false;
  }
}

/**
 * Save a groove (its title and full link) at the top of the list, replacing an
 * earlier save of the same groove.  Returns false if it couldn't be stored.
 */
export function saveMyGroove(storage, title, url, now) {
  var at = url.indexOf('?');
  if (at < 0) return false;
  var search = url.slice(at);
  var list = loadMyGrooves(storage).filter(function (entry) {
    return entry.search != search;
  });
  list.unshift({
    title: String(title || '').trim() || 'Untitled groove',
    search: search,
    savedAt: now,
  });
  return storeMyGrooves(storage, list);
}

/** Remove the groove at `index` of the list. */
export function removeMyGroove(storage, index) {
  var list = loadMyGrooves(storage);
  list.splice(index, 1);
  return storeMyGrooves(storage, list);
}

function escapeHTML(text) {
  return String(text).replace(/[&<>"']/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
}

/** The "My Grooves" part of the Grooves menu ('' when nothing is saved). */
export function myGroovesMenuHTML(list) {
  if (!list.length) return '';
  var html =
    '<ul class="grooveListUL myGroovesList">\n<li class="grooveListHeaderLI">My Grooves</li>\n';
  list.forEach(function (entry, index) {
    var date = new Date(entry.savedAt);
    var when = isNaN(date.getTime()) ? '' : date.toLocaleDateString();
    html +=
      '<li class="grooveListLI myGrooveLI" onClick="myGrooveWriter.loadMyGroove(' +
      index +
      ')">' +
      escapeHTML(entry.title) +
      (when ? ' <span class="myGrooveDate">' + escapeHTML(when) + '</span>' : '') +
      ' <span class="myGrooveRemove" title="Remove from My Grooves" onClick="event.stopPropagation(); myGrooveWriter.removeMyGroove(' +
      index +
      ');">&times;</span></li>\n';
  });
  return html + '</ul>\n';
}
