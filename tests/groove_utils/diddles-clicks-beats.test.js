import { describe, it, expect, beforeEach } from 'vitest';
import { newGrooveUtils, installMidiGlobal } from '../helpers/legacyLoader.js';

// Infinity Drumming, 2026: diddles (double strokes) on any drum or cymbal, the
// exactly timed clicks, notes beat by beat (quarter-note triplets in a 16ths
// groove...), and triplets in x/8 time.

// every note-on in a single-track MIDI data: URL, as { tick, key, velocity },
// plus the tick the track ends on
function midiEvents(midiUrl) {
  const bytes = Uint8Array.from(atob(midiUrl.split(',')[1]), (c) => c.charCodeAt(0));
  let p = 22;
  let tick = 0;
  let status = 0;
  let end = 0;
  const events = [];
  const vlq = () => {
    let v = 0;
    let b;
    do {
      b = bytes[p++];
      v = (v << 7) | (b & 0x7f);
    } while (b & 0x80);
    return v;
  };
  while (p < bytes.length) {
    tick += vlq();
    if (bytes[p] & 0x80) status = bytes[p++];
    if (status == 0xff) {
      const type = bytes[p++];
      const length = vlq();
      p += length;
      if (type == 0x2f) end = tick;
    } else if ((status & 0xf0) == 0xc0 || (status & 0xf0) == 0xd0) p += 1;
    else {
      const [key, velocity] = [bytes[p], bytes[p + 1]];
      p += 2;
      if ((status & 0xf0) == 0x90 && velocity > 0) events.push({ tick, key, velocity });
    }
  }
  return { events, end };
}

const SNARE = 38;
const SNARE_ACCENT = 22;
const HH = 42;
const KICK = 35;
const CLICKS = [76, 77];

let gu;
beforeEach(async () => {
  await installMidiGlobal();
  gu = await newGrooveUtils();
});
const groove = (query) => gu.getGrooveDataFromUrlString(query);
const play = (query) => midiEvents(gu.create_MIDIURLFromGrooveData(groove(query)));
// the ticks (the first bar starts one tick in) of the notes of some sounds
const ticks = (query, keys) =>
  play(query)
    .events.filter((event) => keys.includes(event.key))
    .map((event) => event.tick - 1);
// the hands voice of the music
const hands = (query) =>
  gu
    .createABCFromGrooveData(groove(query), 800)
    .split('V:Hands')[1]
    .split('\n')
    .slice(2)
    .join('\n')
    .split('V:Feet')[0]
    .trim();
const link = (query) => gu.getUrlStringFromGrooveData(groove(query));

describe('diddles', () => {
  const snareDiddle = (div, slots, at) => {
    const line = (ch) => '|' + '-'.repeat(at) + ch + '-'.repeat(slots - at - 1) + '|';
    return `?TimeSig=4/4&Div=${div}&Tempo=80&Measures=1&H=${line('-')}&S=${line('o')}&SD=${line('d')}&K=${line('-')}`;
  };

  it('play a note as two strokes at double the speed of its note setting', () => {
    expect(ticks(snareDiddle(8, 8, 2), [SNARE])).toEqual([128, 160]); // two 16ths
    expect(ticks(snareDiddle(16, 16, 4), [SNARE])).toEqual([128, 144]); // two 32nds
    expect(ticks(snareDiddle(32, 32, 8), [SNARE])).toEqual([128, 136]); // two 64ths
    expect(ticks(snareDiddle(12, 12, 3), [SNARE])).toEqual([128, 149]); // two 16th triplets
  });

  it('play the second stroke of an accented note unaccented', () => {
    const query = snareDiddle(16, 16, 4).replace('S=|----o', 'S=|----O');
    expect(play(query).events.map((event) => [event.tick - 1, event.key, event.velocity])).toEqual([
      [128, SNARE_ACCENT, 85],
      [144, SNARE, 85],
    ]);
  });

  it('double only the drums that have them', () => {
    const query =
      '?TimeSig=4/4&Div=16&Tempo=80&Measures=1&H=|x-x-x-x-x-x-x-x-|&HD=|d---------------|' +
      '&S=|----o-------o---|&SD=|------------d---|&K=|o-------o-------|';
    expect(ticks(query, [HH]).slice(0, 3)).toEqual([0, 16, 64]);
    expect(ticks(query, [KICK])).toEqual([0, 256]);
    expect(ticks(query, [SNARE])).toEqual([128, 384, 400]);
  });

  it('are written with one slash, on a note one grid note long', () => {
    expect(hands(snareDiddle(16, 16, 4))).toBe('z8 !/!c2z6 z8 z8 ||');
    expect(hands(snareDiddle(8, 8, 2))).toBe('z8 !/!c4z4 z8 z8 ||');
    expect(hands(snareDiddle(12, 12, 3))).toBe('z8 (3:3:3!/!c4z4z4 z8 z8 ||');
    // on a chord, once on its stem
    expect(
      hands(
        '?TimeSig=4/4&Div=16&Measures=1&H=|x-x-x-x-x-x-x-x-|&HD=|d---------------|&K=|o---------------|'
      )
    ).toMatch(/^!\/!\[\^g2F2\]z2\^g4 /);
  });

  it('travel in links on lines of their own, and come back', () => {
    const url = link(snareDiddle(16, 16, 4));
    expect(url).toContain('&SD=|----d-----------|');
    expect(link('?' + url.split('?')[1])).toBe(url);
    expect(link(snareDiddle(16, 16, 4).replace(/&SD=[^&]*/, ''))).not.toContain('SD=');
  });
});

describe('timed clicks', () => {
  const clicks = (query) => ticks(query, CLICKS);

  it('click triplets over a straight groove, and 8ths as before', () => {
    const straight = '?TimeSig=4/4&Div=16&Tempo=80&Measures=1&H=|x-x-x-x-x-x-x-x-|';
    expect(clicks(straight + '&MetronomeFreq=12').slice(0, 7)).toEqual([
      0, 43, 85, 128, 171, 213, 256,
    ]);
    expect(clicks(straight + '&MetronomeFreq=8')).toEqual([0, 64, 128, 192, 256, 320, 384, 448]);
  });

  it('swing 8ths over a triplet groove', () => {
    expect(
      clicks('?TimeSig=4/4&Div=12&Tempo=80&Measures=1&MetronomeFreq=8s&H=|x-xx-xx-xx-x|')
    ).toEqual([0, 85, 128, 213, 256, 341, 384, 469]);
  });

  it('click dotted quarter notes in 12/8', () => {
    expect(
      clicks('?TimeSig=12/8&Div=8&Tempo=80&Measures=1&MetronomeFreq=4d&H=|xxxxxxxxxxxx|')
    ).toEqual([0, 192, 384, 576]);
  });

  it('keep their setting in links', () => {
    const query = '?TimeSig=4/4&Div=16&Measures=1&MetronomeFreq=16s&H=|x-x-x-x-x-x-x-x-|';
    expect(groove(query).metronomeFrequency).toBe('16s');
    expect(link(query)).toContain('&MetronomeFreq=16s');
  });
});

describe('notes beat by beat (Mixed)', () => {
  const ssqq =
    '?TimeSig=4/4&Div=48&Tempo=80&Measures=1&Beats=ssqq' +
    '&H=|x-----x-----x-----x-----x-----------------------|' +
    '&S=|------------o-----------o-------o-------o-------|' +
    '&K=|o-----------------------o-----------------------|';

  it('write quarter-note triplets over beats 3 and 4 of a 16ths groove', () => {
    expect(hands(ssqq)).toBe('[^g4F4]^g4 [c4^g4]^g4 (3:3:3[c8^g8F8]c8c8 ||');
    expect(ticks(ssqq, [SNARE])).toEqual([128, 256, 341, 427]);
  });

  it("keep each bar's beats in links", () => {
    expect(groove(ssqq).beatNotes).toEqual(['ssqq']);
    expect(link(ssqq)).toContain('&Beats=ssqq');
    expect(link(ssqq.replace('Div=48', 'Div=16').replace(/&[HSK]=[^&]*/g, ''))).not.toContain(
      'Beats='
    );
  });

  it('guess each beat from its notes when an older link does not say', () => {
    const empty = '|' + '-'.repeat(48) + '|';
    const query =
      '?TimeSig=4/4&Div=48&Measures=1&H=|x--x--x--x--x---x---x---x-----------x-----x-----|' +
      `&S=${empty}&K=${empty}`;
    expect(groove(query).beatNotes).toEqual(['stee']);
    expect(hands(query)).toBe('^g2^g2^g2^g2 (3:3:3^g4^g4^g4 ^g8 ^g4^g4 ||');
  });

  it('count each beat its own way, every count of a 16ths beat as in 16ths', () => {
    const counts = (query) =>
      [...gu.createABCFromGrooveData(groove(query + '&Count=1'), 800).matchAll(/"([^"]+)"x/g)]
        .map((m) => m[1])
        .join(' ');
    expect(counts(ssqq)).toBe('1 e & a 2 e & a 3 a &');
    expect(
      counts(
        '?TimeSig=7/8&Div=48&Measures=1&Beats=ssssxss&H=|x-----x-----x-----x-----x-x-x-x-----x-----|'
      )
    ).toBe('1 & 2 & 3 & 4 & 5 & a 6 & 7 &');
    expect(
      counts('?TimeSig=6/8&Div=48&Measures=1&Beats=tteeee&H=|x---x---x---x-----x-----x-----|')
    ).toBe('1 a & 3 4 5 6');
  });
});

describe('beats of 8ths and 16ths, beat by beat', () => {
  // A bar of them is written exactly as the 8ths and 16ths note settings write
  // it: random bars (accents, ghost notes, flams, open hi-hats, diddles, counting)
  // in 4/4, 7/8, 6/8 and 5/8, next to a bar of other beats.
  const voiceBars = (abc, voice) =>
    abc
      .split('V:' + voice)[1]
      .split('\n')
      .slice(voice == 'Hands' ? 2 : 1)
      .join('')
      .split('V:')[0]
      .split('|')
      .map((bar) => bar.trim())
      .filter(Boolean);
  let seed = 11;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const tab = (length, chars, chance) =>
    Array.from({ length }, () =>
      random() < chance ? chars[Math.floor(random() * chars.length)] : '-'
    ).join('');
  const diddles = (line, chance) =>
    [...line].map((ch) => (ch != '-' && random() < chance ? 'd' : '-')).join('');

  it.each([
    ['4/4', 16, 16, 48, 3, 'ssss', 'ssqq'],
    ['4/4', 8, 8, 48, 6, 'eeee', 'ssqq'],
    ['7/8', 16, 14, 42, 3, 'sssssss', 'ssssxss'],
    ['6/8', 8, 6, 36, 6, 'eeeeee', 'tteeee'],
    ['5/8', 16, 10, 30, 3, 'sssss', 'sssxs'],
  ])('in %s at 1/%i', (sig, div, slots, mixedSlots, step, beats, otherBeats) => {
    const spread = (line) => {
      const out = Array(mixedSlots).fill('-');
      [...line].forEach((ch, i) => (out[i * step] = ch));
      return out.join('');
    };
    const empty = '-'.repeat(mixedSlots);
    for (let n = 0; n < 40; n++) {
      const lines = {
        H: tab(slots, 'xXo', 0.6),
        S: tab(slots, 'oOgf', 0.4),
        K: tab(slots, 'o', 0.3),
      };
      lines.SD = diddles(lines.S, 0.3);
      lines.HD = diddles(lines.H, 0.15);
      const count = random() < 0.5 ? '&Count=1' : '';
      let plain = `?TimeSig=${sig}&Div=${div}&Measures=1${count}`;
      let mixed = `?TimeSig=${sig}&Div=48&Measures=2${count}&Beats=${beats},${otherBeats}`;
      for (const name in lines) {
        plain += `&${name}=|${lines[name]}|`;
        mixed += `&${name}=|${spread(lines[name])}|${empty}|`;
      }
      const plainAbc = gu.createABCFromGrooveData(groove(plain), 800);
      const mixedAbc = gu.createABCFromGrooveData(groove(mixed), 800);
      for (const voice of ['Hands', 'Stickings'])
        expect(voiceBars(mixedAbc, voice)[0], plain).toBe(voiceBars(plainAbc, voice)[0]);
    }
  });
});

describe('triplets in x/8 time', () => {
  const sevenEight =
    '?TimeSig=7/8&Div=24&Tempo=80&Measures=1&H=|x-xx-xx-xx-xx-xx-xx-x|' +
    '&S=|---------------------|&K=|---------------------|';

  it('write 16th-note triplets in 7/8 in the classic 2+2+3 groups', () => {
    expect(hands(sevenEight)).toBe(
      '(3:3:3^g2z2^g2(3:3:3^g2z2^g2 (3:3:3^g2z2^g2(3:3:3^g2z2^g2 (3:3:3^g2z2^g2(3:3:3^g2z2^g2(3:3:3^g2z2^g2 ||'
    );
  });

  it('play them in a bar of seven 8th notes', () => {
    const { events, end } = play(sevenEight);
    expect(end).toBe(448);
    expect(events.filter((event) => event.key == HH).map((event) => event.tick - 1)).toEqual([
      0, 43, 64, 107, 128, 171, 192, 235, 256, 299, 320, 363, 384, 427,
    ]);
  });
});

describe('swing, beat by beat (Mixed)', () => {
  // Infinity Drumming, 2026: a Mixed bar's beats of 8ths and 16ths swing exactly as
  // the 8ths and 16ths note settings do; its triplet beats play straight.
  const spread = (line, step) => [...line].map((ch) => ch + '-'.repeat(step - 1)).join('');

  it.each([
    ['4/4', 8, 'eeee', 8, 6],
    ['4/4', 16, 'ssss', 16, 3],
    ['6/8', 8, 'eeeeee', 6, 6],
    ['6/8', 16, 'ssssss', 12, 3],
    ['6/4', 8, 'eeeeee', 12, 6],
  ])('in %s, like the 1/%i setting', (sig, div, beats, slots, step) => {
    for (const style of ['', '&SwingStyle=brazilian']) {
      const notes = 'o'.repeat(slots);
      const plain = `?TimeSig=${sig}&Div=${div}&Measures=1&Swing=30${style}&S=|${notes}|`;
      const mixed = `?TimeSig=${sig}&Div=48&Measures=1&Swing=30${style}&Beats=${beats}&S=|${spread(notes, step)}|`;
      const swung = ticks(plain, [SNARE]);
      expect(swung).not.toEqual(ticks(plain.replace('Swing=30', 'Swing=0'), [SNARE]));
      expect(ticks(mixed, [SNARE]).map(Math.round)).toEqual(swung.map(Math.round));
    }
  });

  it('plays triplet beats straight next to swung 8ths', () => {
    const snare = 'o-----o-----' + 'o---o---o---' + 'o-------o-------o-------';
    const query = (swing) =>
      `?TimeSig=4/4&Div=48&Measures=1&Swing=${swing}&Beats=etqq&S=|${snare}|`;
    const straight = ticks(query(0), [SNARE]);
    const swung = ticks(query(30), [SNARE]);
    expect(swung[1]).toBeGreaterThan(straight[1]); // the & of the 8ths beat is late
    expect(swung.slice(2)).toEqual(straight.slice(2)); // the triplets are not moved
  });
});

describe('tom rim clicks', () => {
  // Infinity Drumming, 2026: "r" in a tom line is a rim click: an x notehead on
  // the tom's line, played with the cross-stick sound.
  const XSTICK = 37;
  const TOM1 = 48;
  const FLOOR = 43;
  const query =
    '?TimeSig=4/4&Div=8&Measures=1&T1=|r-o-r-o-|&T4=|--r---r-|&H=|x-x-x-x-|&K=|o-------|';

  it('keeps "r" in the link and writes an x notehead on the tom line', () => {
    expect(link(query)).toContain('&T1=|r-o-r-o-|');
    expect(link(query)).toContain('&T4=|--r---r-|');
    const abc = gu.createABCFromGrooveData(groove(query), 800);
    expect(abc).toContain('%%map drum _e heads=Xhead print=e');
    expect(abc).toContain('%%map drum _A heads=Xhead print=A');
    expect(hands(query)).toMatch(/_e/);
    expect(hands(query)).toMatch(/_A/);
  });

  it('plays the cross-stick sound for a rim click, the tom for a normal hit', () => {
    expect(ticks(query, [XSTICK])).toHaveLength(4);
    expect(ticks(query, [TOM1])).toHaveLength(2);
    expect(ticks(query, [FLOOR])).toHaveLength(0);
  });

  it('still reads an "x" in a tom line (older links) as a plain tom hit', () => {
    const old = '?TimeSig=4/4&Div=8&Measures=1&T1=|x-x-x-x-|';
    expect(ticks(old, [TOM1])).toHaveLength(4);
    expect(ticks(old, [XSTICK])).toHaveLength(0);
  });
});
